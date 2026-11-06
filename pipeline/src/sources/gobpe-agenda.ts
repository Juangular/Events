import { createRequire } from 'node:module'
import * as cheerio from 'cheerio'
import type { CandidateEvent, Category, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { classifyCategory } from '../core/category'
import { districtAlias, isLimaDistrict, looksFree } from '../core/gates'
import { firstSentence, isValidHttpsUrl, normalizeText, normalizeTimeText, parseSpanishMonth, toIsoDate } from '../core/text'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>

const COLLECTION_URL = 'https://www.gob.pe/es/institucion/cultura/colecciones/44-agenda-cultural'
const SOURCE_LABEL = 'Agenda Cultural — Ministerio de Cultura'
const WEEK_RANGE = /del\s+lunes\s+(\d{1,2})\s+al\s*\n?\s*domingo\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i
const DAY_RANGE = /^(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?\s+(\d{1,2})\s+al\s+(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?\s+(\d{1,2})\.?$/i
const DAY_TOKEN = /(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?\s+(\d{1,2})/gi
const FULL_DATE = /^(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i
const WEEKDAY_RANGE = /^(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+a\s+(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)(?:\s*\([^)]*\))?\.?$/i
const TIME_RANGE = /(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)\s*(?:a|–|-|—)\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
const TIME_SINGLE = /\b(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i
const FREE_LINE = /^(?:ingreso|entrada)\s+libre|^gratuito|^actividad gratuita/i
const PAID_LINE = /actividad con costo|entradas a la venta|ticketmaster|teleticket|boleto de entrada|tarifa de ingreso|costo cubre|previa coordinación de horarios y precios/i
const AUDIENCE_LINE = /^p[uú]blico\b|^todas las edades|^grupos con|^j[oó]venes|^ni[ñn]as|^mayores de/i
const ORGANIZER_LINE = /^organizan?:/i
const INFO_LINE = /^inscripciones|^informes|^para m[aá]s informaci[oó]n|^mayor informaci[oó]n|^conoce la programaci[oó]n|^entradas|^el costo|^los interesados|^consultas/i
const CONTACT_LINE = /whatsapp|@cultura\.gob\.pe|central telef[oó]nica|https?:\/\/|www\.|(?:\(\d{2,3}\)\s*)?\d{3}\s+\d{4}(?:\s+anexo\s+\d+)?/i
const VIRTUAL_LINE = /v[ií]a google meet|zoom|transmisi[oó]n en vivo/i
const VENUE_HINT = /museo|biblioteca|centro cultural|teatro|sala|parque|zona arqueol[oó]gica|hall|terraza|malec[oó]n|paseo|plaza|galer[ií]a|fortaleza|huaca/i
const ADDRESS_HINT = /av\.|avenida|jir[oó]n|jr\.?|calle|malec[oó]n|paseo|plaza|cuadra|cdra\.?|urb\.|sector/i
const INSTITUTION_LINE = /^museo|^ministerio de cultura|^biblioteca nacional|^zona arqueol[oó]gica|^direcci[oó]n desconcentrada|^gran teatro nacional|^orquesta sinf[oó]nica|^coro nacional/i
const LABEL_LINE = /^(?:exposici[oó]n|exposici[oó]n museogr[aá]fica|talleres|taller|espect[aá]culos|espect[aá]culo|museos|festividad|conversatorios|conversatorio|cine|conciertos|teatro|conferencia|visitas guiadas|visita guiada|visita escolar|proyecciones audiovisuales|mediaci[oó]n en vivo para grupos|otros)$/i
const CATEGORY_WORDS = ['Exposición', 'Talleres', 'Espectáculos', 'Museos', 'Festividad', 'Conversatorios', 'Cine', 'Conciertos', 'Teatro', 'Conferencia']
const KNOWN_DISTRICTS: Array<[RegExp, string]> = [
  [/sala de cine armando robles godoy/i, 'San Borja'],
  [/gran teatro nacional/i, 'San Borja'],
  [/biblioteca institucional del ministerio de cultura/i, 'San Borja'],
  [/javier prado este\s+n\s+2465/i, 'San Borja'],
  [/javier prado este\s+n\s+2225/i, 'San Borja'],
  [/sala de exposiciones francisco laso/i, 'San Borja'],
  [/museo de sitio pucllana/i, 'Miraflores'],
]

interface WeekContext {
  start: string
  end: string
  month: number
  year: number
  startDay: number
}

interface DateInfo {
  start: string
  end?: string
  indices: Set<number>
}

interface Block {
  lines: string[]
  week: WeekContext
}

interface TitleChoice {
  indices: number[]
  score: number
}

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function isJustified(line: string): boolean {
  return / {2,}/.test(line)
}

function parseWeekHeader(text: string): WeekContext | null {
  const match = text.match(WEEK_RANGE)
  if (!match) return null
  const month = parseSpanishMonth(match[3] ?? '')
  const year = Number(match[4])
  const startDay = Number(match[1])
  const endDay = Number(match[2])
  if (!month) return null
  const start = toIsoDate(year, month, startDay)
  const end = toIsoDate(year, month, endDay)
  if (!start || !end) return null
  return { start, end, month, year, startDay }
}

function splitBlocks(lines: string[], week: WeekContext): Block[] {
  const blocks: Block[] = []
  let current: string[] = []
  let skip = 0
  for (const raw of lines) {
    const line = cleanLine(raw)
    if (skip > 0) {
      skip -= 1
      continue
    }
    if (line.startsWith('Agenda Cultural del')) {
      if (current.length > 0) blocks.push({ lines: current, week })
      current = []
      skip = 3
      continue
    }
    if (line.length > 0) current.push(line)
  }
  if (current.length > 0) blocks.push({ lines: current, week })
  return blocks
}

function monthForDay(day: number, week: WeekContext): { month: number; year: number } {
  if (day >= week.startDay) return { month: week.month, year: week.year }
  return week.month === 12 ? { month: 1, year: week.year + 1 } : { month: week.month + 1, year: week.year }
}

function datesFromDayNumbers(firstDay: number, lastDay: number, week: WeekContext): { start: string; end?: string } | null {
  const first = monthForDay(firstDay, week)
  const last = monthForDay(lastDay, week)
  const start = toIsoDate(first.year, first.month, firstDay)
  const end = toIsoDate(last.year, last.month, lastDay)
  if (!start) return null
  return { start, end: end ?? undefined }
}

function parseDateAt(lines: string[], index: number, week: WeekContext): DateInfo | null {
  const line = cleanLine(lines[index] ?? '')
  if (/^\d{1,2}$/.test(line) && /^(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?$/i.test(cleanLine(lines[index + 1] ?? ''))) {
    const date = datesFromDayNumbers(Number(line), Number(line), week)
    return date ? { ...date, indices: new Set([index, index + 1]) } : null
  }

  const range = line.match(DAY_RANGE)
  if (range) {
    const date = datesFromDayNumbers(Number(range[1]), Number(range[2]), week)
    return date ? { ...date, indices: new Set([index]) } : null
  }

  if (line.length <= 60) {
    const days = [...line.matchAll(DAY_TOKEN)].map((match) => Number(match[1]))
    if (days.length >= 2) {
      const date = datesFromDayNumbers(days[0] ?? 0, days[days.length - 1] ?? 0, week)
      return date ? { ...date, indices: new Set([index]) } : null
    }
  }

  const full = line.match(FULL_DATE)
  if (full) {
    const month = parseSpanishMonth(full[2] ?? '')
    const year = full[3] ? Number(full[3]) : week.year
    if (!month) return null
    const start = toIsoDate(year, month, Number(full[1]))
    return start ? { start, indices: new Set([index]) } : null
  }

  if (WEEKDAY_RANGE.test(line)) return { start: week.start, end: week.end, indices: new Set([index]) }
  return null
}

function findDate(lines: string[], week: WeekContext): DateInfo | null {
  for (let index = 0; index < lines.length; index += 1) {
    const date = parseDateAt(lines, index, week)
    if (date) return date
  }
  return null
}

function findDistrict(lines: string[]): string | undefined {
  for (const line of lines) {
    if (!/\d/.test(line) && !ADDRESS_HINT.test(line)) continue
    for (const token of line.split(/[,.;()]/)) {
      const value = cleanLine(token)
      const status = isLimaDistrict(value)
      if (status === 'ok' || status === 'alias') return districtAlias(value)
    }
  }
  const text = normalizeText(lines.join(' '))
  for (const [pattern, district] of KNOWN_DISTRICTS) {
    if (pattern.test(text)) return district
  }
  return undefined
}

function extractTime(lines: string[]): string {
  for (const line of lines) {
    const range = line.match(TIME_RANGE)
    if (range) {
      const normalized = normalizeTimeText(`${range[1]} a ${range[2]}`)
      if (normalized) return normalized
    }
  }
  for (const line of lines) {
    const single = line.match(TIME_SINGLE)
    if (single?.[1]) {
      const normalized = normalizeTimeText(single[1])
      if (normalized) return normalized
    }
  }
  if (lines.some((line) => /m[uú]ltiples horarios/i.test(line))) return 'Múltiples horarios'
  return 'Consultar horario'
}

function extractCategory(lines: string[], title: string, description: string): Category {
  for (const line of lines) {
    for (const word of CATEGORY_WORDS) {
      if (line.toLowerCase() === word.toLowerCase()) return classifyCategory(title, classifyCategory(word, 'Cultura'))
    }
  }
  return classifyCategory(title, 'Cultura')
}

function isMetadataLine(line: string, index: number, dateInfo: DateInfo | null): boolean {
  if (dateInfo?.indices.has(index)) return true
  return (
    FREE_LINE.test(line) ||
    PAID_LINE.test(line) ||
    AUDIENCE_LINE.test(line) ||
    ORGANIZER_LINE.test(line) ||
    INFO_LINE.test(line) ||
    CONTACT_LINE.test(line) ||
    VIRTUAL_LINE.test(line) ||
    LABEL_LINE.test(line) ||
    TIME_SINGLE.test(line) ||
    /^horario/i.test(line) ||
    /^m[uú]ltiples horarios/i.test(line)
  )
}

function findOrganizer(lines: string[], placeIndices: Set<number>): { value: string; indices: Set<number> } {
  const indices = new Set<number>()
  let value = ''
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (ORGANIZER_LINE.test(line)) {
      indices.add(index)
      value = line.replace(ORGANIZER_LINE, '').trim()
      continue
    }
    if (!placeIndices.has(index) && INSTITUTION_LINE.test(line) && !ADDRESS_HINT.test(line) && !/\d/.test(line)) {
      value = line
      indices.clear()
      indices.add(index)
      if (/(?:\be|y|de|del|la|el)$/i.test(line)) {
        const next = lines[index + 1] ?? ''
        if (next && next.length < 80 && !/\d/.test(next) && !placeIndices.has(index + 1)) {
          value = `${line} ${next}`
          indices.add(index + 1)
        }
      }
    }
  }

  if (!value) {
    const firstPlaceLine = [...placeIndices].sort((a, b) => a - b)[0]
    if (firstPlaceLine !== undefined && INSTITUTION_LINE.test(lines[firstPlaceLine] ?? '')) {
      value = lines[firstPlaceLine] ?? ''
      indices.add(firstPlaceLine)
    }
  }
  return { value: value || 'Ministerio de Cultura', indices }
}

function findPlace(lines: string[], isVirtual: boolean, dateInfo: DateInfo): { value: string; indices: Set<number> } {
  const indices = new Set<number>()
  if (isVirtual) return { value: 'Sesión virtual', indices }

  let addressIndex = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (ADDRESS_HINT.test(line) && (/\d/.test(line) || /\d/.test(lines[index + 1] ?? '')) && !CONTACT_LINE.test(line)) {
      addressIndex = index
      break
    }
  }
  if (addressIndex < 0) return { value: '', indices }

  const start = Math.max(0, addressIndex - 2)
  const placeLines: string[] = []
  for (let index = start; index <= addressIndex; index += 1) {
    const line = lines[index] ?? ''
    if (index < addressIndex && isMetadataLine(line, index, dateInfo)) {
      placeLines.length = 0
      indices.clear()
      continue
    }
    if (index < addressIndex && (isJustified(line) || /\.$/.test(line))) {
      placeLines.length = 0
      indices.clear()
      continue
    }
    placeLines.push(line)
    indices.add(index)
  }

  const next = lines[addressIndex + 1] ?? ''
  if (!/\d/.test(lines[addressIndex] ?? '') && /^[a-záéíóú]+\s+n\.[°º]/i.test(next)) {
    placeLines.push(next)
    indices.add(addressIndex + 1)
  }
  return { value: placeLines.join(' '), indices }
}

function lineTitleScore(line: string): number {
  let score = 0
  if (/["“”¿?¡!]/.test(line) || line.includes(':')) score += 2
  if (line.length >= 4 && line.length <= 140 && !/\.$/.test(line)) score += 1
  if (/\.$/.test(line) && !/["“”]/.test(line)) score -= 2
  if (isJustified(line)) score -= 1
  return score
}

function chooseTitle(lines: string[], excluded: Set<number>, dateInfo: DateInfo | null): TitleChoice | null {
  const candidates: TitleChoice[] = []
  const dateIndex = dateInfo ? Math.min(...dateInfo.indices) : -1

  for (let start = 0; start < lines.length; start += 1) {
    if (excluded.has(start)) continue
    for (let length = 1; length <= 4; length += 1) {
      const end = start + length - 1
      if (end >= lines.length) break
      if (length === 4 && end !== dateIndex - 1) continue
      const indices: number[] = []
      let valid = true
      let score = 0
      let words = 0
      for (let index = start; index <= end; index += 1) {
        if (excluded.has(index)) {
          valid = false
          break
        }
        const line = lines[index] ?? ''
        score += lineTitleScore(line)
        words += line.split(' ').length
        indices.push(index)
      }
      if (!valid || words > 45) continue
      if (dateIndex >= 0 && end === dateIndex - 1) score += 6
      const text = indices.map((index) => lines[index]).join(' ')
      if (/^[“"]/.test(text) && /[”"]/.test(text)) score += 3
      candidates.push({ indices, score })
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.indices[0]! - b.indices[0]!)
  return candidates[0] && candidates[0].score > 0 ? candidates[0] : null
}

function extractRegistration(lines: string[]): { url?: string; required: boolean } {
  for (const line of lines) {
    const match = line.match(/https:\/\/[^\s]+/)
    if (match && /forms\.gle|docs\.google\.com\/forms|joinnus\.com/i.test(match[0])) {
      const url = match[0].replace(/[),.;]+$/, '')
      if (isValidHttpsUrl(url)) return { url, required: true }
    }
  }
  return { required: false }
}

function parseActivity(block: Block): CandidateEvent | null {
  const { lines, week } = block
  const fullText = lines.join(' ')
  const priceLine = lines.find((line) => FREE_LINE.test(line))
  if (!priceLine || !looksFree(priceLine) || PAID_LINE.test(fullText)) return null

  const isVirtual = lines.some((line) => VIRTUAL_LINE.test(line))
  const district = isVirtual ? undefined : findDistrict(lines)
  if (!isVirtual && !district) return null

  const dateInfo = findDate(lines, week) ?? {
    start: week.start,
    end: week.end,
    indices: new Set<number>(),
  }
  if (!dateInfo.start) return null

  const place = findPlace(lines, isVirtual, dateInfo)
  const organizer = findOrganizer(lines, place.indices)

  const excluded = new Set<number>([...organizer.indices, ...place.indices])
  for (let index = 0; index < lines.length; index += 1) {
    if (isMetadataLine(lines[index] ?? '', index, dateInfo)) excluded.add(index)
  }

  const titleChoice = chooseTitle(lines, excluded, dateInfo)
  if (!titleChoice) return null
  for (const index of titleChoice.indices) excluded.add(index)
  const title = titleChoice.indices.map((index) => lines[index]).join(' ').trim()
  if (title.length < 4 || title.length > 180) return null

  const descriptionLines = lines.filter((_, index) => !excluded.has(index))
  const description = firstSentence(descriptionLines.join(' '), 1000)
  if (!description) return null

  const registration = extractRegistration(lines)
  const category = extractCategory(lines, title, description)

  return {
    title,
    description,
    category,
    modality: isVirtual ? 'Virtual' : 'Presencial',
    startDate: dateInfo.start,
    endDate: dateInfo.end && dateInfo.end !== dateInfo.start ? dateInfo.end : undefined,
    time: extractTime(lines),
    place: place.value || organizer.value,
    district,
    organizer: organizer.value,
    source: SOURCE_LABEL,
    sourceUrl: '',
    registrationUrl: registration.url,
    requiresRegistration: registration.required,
    tags: [],
    freeSignal: true,
    priceRaw: priceLine,
    raw: { source: 'gobpe-agenda', price: priceLine, date: dateInfo.start },
  }
}

async function findLatestPdfUrl(): Promise<{ pdfUrl: string; pageUrl: string }> {
  const collectionHtml = await fetchHtml(COLLECTION_URL)
  const $ = cheerio.load(collectionHtml)
  let pageUrl = ''
  $('a[href*="/informes-publicaciones/"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (!pageUrl && /agenda-cultural/.test(href)) {
      pageUrl = href.startsWith('http') ? href : `https://www.gob.pe${href}`
    }
  })
  if (!pageUrl) throw new Error('No se encontró la agenda cultural en la colección de gob.pe')

  await sleep(500)
  const pageHtml = await fetchHtml(pageUrl)
  const pdfMatch = pageHtml.match(/https:\/\/cdn\.www\.gob\.pe\/uploads\/document\/file\/[^"'\s>]+\.pdf[^"'\s>]*/)
  if (!pdfMatch) throw new Error(`No se encontró el PDF en ${pageUrl}`)
  return { pdfUrl: pdfMatch[0], pageUrl }
}

export const gobpeAgendaSource: SourceAdapter = {
  key: 'gobpe-agenda',
  label: 'Agenda Cultural del Ministerio de Cultura (gob.pe)',

  async collect(): Promise<CandidateEvent[]> {
    const { pdfUrl, pageUrl } = await findLatestPdfUrl()
    console.log(`[gobpe-agenda] PDF: ${pdfUrl}`)

    const response = await fetch(pdfUrl, { signal: AbortSignal.timeout(60_000) })
    if (!response.ok) throw new Error(`HTTP ${response.status} descargando ${pdfUrl}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const { text } = await pdfParse(buffer)

    const week = parseWeekHeader(text)
    if (!week) throw new Error('No se pudo leer el rango semanal de la agenda')

    const lines = text.split('\n').filter((line) => cleanLine(line).length > 0)
    const blocks = splitBlocks(lines, week)
    const candidates: CandidateEvent[] = []
    for (const block of blocks) {
      const candidate = parseActivity(block)
      if (candidate) {
        candidate.sourceUrl = pageUrl
        candidates.push(candidate)
      }
    }

    console.log(`[gobpe-agenda] semana ${week.start}..${week.end} · bloques=${blocks.length} candidatos=${candidates.length}`)
    return candidates
  },
}
