import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { districtAlias, isLimaDistrict } from '../core/gates'
import { currentWeekInLima, type Week } from '../core/week'
import { isValidHttpsUrl, parseSpanishMonth } from '../core/text'

const HOME_URL = 'https://appweb.ipd.gob.pe/academia/web/'
const SCHEDULE_URL = 'https://appweb.ipd.gob.pe/academia/web/ajax/tableHorario'
const REGISTRATION_URL = 'https://appweb.ipd.gob.pe/academia/web/ficha-preinscripcion'
const ORGANIZER = 'Instituto Peruano del Deporte (IPD)'

interface Season {
  label: string
  startMonth: number
  endMonth: number
  year: number
}

interface ComplexOption {
  id: string
  name: string
  districtId: string
}

interface DisciplineOption {
  id: string
  complexId: string
  name: string
}

interface ScheduleRule {
  age: string
  days: string
  hours: string
}

function parseSeason(html: string): Season | null {
  const match = html.match(/Temporada\s+([A-ZÁÉÍÓÚ]+)\s+(\d{4})\s*\(\s*([a-záéíóú]+)\s*-\s*([a-záéíóú]+)\s*\)/i)
  if (!match) return null
  const startMonth = parseSpanishMonth(match[3] ?? '')
  const endMonth = parseSpanishMonth(match[4] ?? '')
  if (!startMonth || !endMonth) return null
  return {
    label: `Temporada ${match[1]} ${match[2]} (${match[3]} - ${match[4]})`,
    startMonth,
    endMonth,
    year: Number(match[2]),
  }
}

function isSeasonActive(season: Season, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return year === season.year && month >= season.startMonth && month <= season.endMonth
}

function parseDistricts(html: string): Map<string, string> {
  const districts = new Map<string, string>()
  const pattern = /if\(\s*"14"\s*==\s*idDepartamentoHorario[\s\S]*?value=(\d+)>([^<]+)<\/option>/g
  for (const match of html.matchAll(pattern)) {
    if (match[1] && match[2]) districts.set(match[1], match[2].trim())
  }
  return districts
}

function parseComplexes(html: string): Map<string, ComplexOption> {
  const complexes = new Map<string, ComplexOption>()
  const pattern = /if\("(\d+)"\s*==\s*idDistritoHorario\)\{[\s\S]*?value=(\d+)[^>]*>([^<]+)<\/option>/g
  for (const match of html.matchAll(pattern)) {
    const districtId = match[1]
    const id = match[2]
    const name = match[3]?.trim()
    if (districtId && id && name) complexes.set(id, { id, name, districtId })
  }
  return complexes
}

function parseDisciplines(html: string): DisciplineOption[] {
  const disciplines = new Map<string, DisciplineOption>()
  const pattern = /if\("(\d+)"\s*==\s*idComplejoDeportivo\)\{[\s\S]*?var nombreDis = "([^"]+)"[\s\S]*?value = (\d+)/g
  for (const match of html.matchAll(pattern)) {
    const complexId = match[1]
    const name = match[2]?.trim()
    const id = match[3]
    if (complexId && name && id) disciplines.set(id, { id, complexId, name })
  }
  return [...disciplines.values()]
}

function displayDistrict(value: string): string {
  const connectors = new Set(['de', 'del', 'la', 'las', 'los', 'y'])
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => (connectors.has(word) ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join(' ')
}

function validDistrict(name: string | undefined): string | undefined {
  if (!name) return undefined
  const status = isLimaDistrict(name)
  return status === 'ok' || status === 'alias' ? displayDistrict(districtAlias(name)) : undefined
}

async function fetchSchedule(id: string, flag: number): Promise<string | null> {
  const body = new URLSearchParams({
    idComplejoDisciplina: id,
    flag: '0',
    flagDiscapacidad: String(flag),
  })
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(SCHEDULE_URL, {
        method: 'POST',
        headers: {
          'user-agent': 'plan-lima-ingest/1.0',
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
          accept: 'text/html,*/*;q=0.8',
        },
        body,
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.text()
    } catch (error) {
      if (attempt === 2) {
        console.warn(`[ipd-academia] Horario ${id} no disponible:`, error instanceof Error ? error.message : error)
        return null
      }
      await sleep(700)
    }
  }
  return null
}

function parseSchedule(html: string): ScheduleRule[] {
  const $ = cheerio.load(`<table>${html}</table>`)
  const rules: ScheduleRule[] = []
  $('#bodyHorario tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length < 3) return
    const age = $(cells[0]).text().replace(/\s+/g, ' ').trim()
    const days = $(cells[1]).find('div').map((__, el) => $(el).text().trim()).get().filter(Boolean)
    const hours = $(cells[2]).find('div').map((__, el) => $(el).text().trim()).get().filter(Boolean)
    if (!age || days.length === 0 || days.length !== hours.length) return

    for (let index = 0; index < days.length; index += 1) {
      const day = days[index] ?? ''
      const hour = hours[index] ?? ''
      const match = hour.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
      if (!match) continue
      const start = Number(match[1]) * 60 + Number(match[2])
      const end = Number(match[3]) * 60 + Number(match[4])
      if (end <= start) continue
      rules.push({ age, days: day, hours: hour })
    }
  })
  return rules
}

async function discoverSeasonUrls(): Promise<string[]> {
  const html = await fetchHtml(HOME_URL)
  const urls = new Set<string>()
  for (const match of html.matchAll(/href="([^"]*horarios-disponibles[^"]*)"/g)) {
    const href = match[1]
    if (!href) continue
    const url = new URL(href, HOME_URL).toString()
    if (isValidHttpsUrl(url)) urls.add(url)
  }
  return [...urls]
}

export const ipdAcademiaSource: SourceAdapter = {
  key: 'ipd-academia',
  label: 'Academia IPD — talleres deportivos gratuitos',

  async collect(): Promise<CandidateEvent[]> {
    const urls = await discoverSeasonUrls()
    if (urls.length === 0) throw new Error('No se encontraron temporadas en Academia IPD')

    const week = currentWeekInLima()
    const candidates: CandidateEvent[] = []

    for (const url of urls) {
      const flag = url.includes('horarios-disponibles/1/') ? 1 : 0
      const html = await fetchHtml(url)
      const season = parseSeason(html)
      if (!season || !isSeasonActive(season)) continue
      if (!/talleres gratuitos/i.test(html)) continue

      const districts = parseDistricts(html)
      const complexes = parseComplexes(html)
      const disciplines = parseDisciplines(html).filter((discipline) => {
        const complex = complexes.get(discipline.complexId)
        return complex && validDistrict(districts.get(complex.districtId))
      })

      for (const discipline of disciplines) {
        await sleep(250)
        const scheduleHtml = await fetchSchedule(discipline.id, flag)
        if (!scheduleHtml) continue
        const rules = parseSchedule(scheduleHtml)
        if (rules.length === 0) continue

        const complex = complexes.get(discipline.complexId)
        if (!complex) continue
        const district = validDistrict(districts.get(complex.districtId))
        if (!district) continue

        const time = rules.length <= 3
          ? rules.map((rule) => `${rule.days} ${rule.hours}`).join(' · ')
          : 'Varios horarios por edad'
        const byAge = new Map<string, string[]>()
        for (const rule of rules) {
          const entries = byAge.get(rule.age) ?? []
          entries.push(`${rule.days} ${rule.hours}`)
          byAge.set(rule.age, entries)
        }
        const scheduleText = [...byAge.entries()].map(([age, entries]) => `${age}: ${entries.join(' · ')}`).join(' | ')
        const title = `Academia IPD — ${discipline.name} en ${complex.name}`

        candidates.push({
          title,
          description: `${discipline.name} en ${complex.name}, ${district}. ${season.label}. Clases gratuitas con vacantes publicadas para la semana del ${week.start} al ${week.end}. Horarios por edad: ${scheduleText}. Preinscripción en línea requerida.`,
          category: 'Deportes',
          modality: 'Presencial',
          startDate: week.start,
          endDate: week.end,
          time,
          place: complex.name,
          district,
          organizer: ORGANIZER,
          source: 'Academia IPD',
          sourceUrl: url,
          registrationUrl: REGISTRATION_URL,
          requiresRegistration: true,
          tags: ['deportes', 'academia-ipd'],
          freeSignal: true,
          priceRaw: 'Gratis',
          raw: { source: 'ipd-academia', disciplineId: discipline.id, flag, season: season.label, rules },
        })
      }
    }

    console.log(`[ipd-academia] semana ${week.start}..${week.end} · candidatos=${candidates.length}`)
    return candidates
  },
}
