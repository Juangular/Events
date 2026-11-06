import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { htmlToText } from '../core/html'
import { classifyCategory } from '../core/category'
import { looksFree } from '../core/gates'
import { dateFromIso, firstSentence, isValidHttpsUrl, isoDateInLima, timeRangeFromIso } from '../core/text'

const BASE_URL = 'https://www.miraflores.gob.pe'
const LIST_URL = `${BASE_URL}/eventos-municipales/`
const ORGANIZER = 'Municipalidad Distrital de Miraflores'
const DISTRICT = 'Miraflores'
const RESERVED_SLUGS = new Set(['feed', 'hoy', 'lista', 'mes', 'page', 'tag', 'etiqueta', 'wp-json', 'wp-admin'])

interface JsonLdEvent {
  '@type'?: string | string[]
  name?: string
  description?: string
  url?: string
  startDate?: string
  endDate?: string
  location?: { name?: string }
}

function isEventNode(value: unknown): value is JsonLdEvent {
  if (!value || typeof value !== 'object') return false
  const type = (value as JsonLdEvent)['@type']
  const types = Array.isArray(type) ? type : type ? [type] : []
  return types.some((item) => typeof item === 'string' && item.includes('Event'))
}

function parseJsonLdEvents(html: string): JsonLdEvent[] {
  const events: JsonLdEvent[] = []
  const $ = cheerio.load(html)
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim()
    if (!raw) return
    try {
      const data = JSON.parse(raw) as unknown
      const nodes = Array.isArray(data) ? data : [data]
      for (const node of nodes) {
        if (isEventNode(node)) events.push(node)
        const graph = (node as { '@graph'?: unknown[] })['@graph']
        if (Array.isArray(graph)) {
          for (const item of graph) if (isEventNode(item)) events.push(item)
        }
      }
    } catch {
      // JSON-LD malformado: se ignora el bloque
    }
  })
  return events
}

function monthPageUrls(): string[] {
  const [year, month] = isoDateInLima().split('-').map(Number)
  const urls: string[] = []
  for (let offset = 0; offset < 3; offset += 1) {
    const total = (year ?? 2026) * 12 + ((month ?? 1) - 1) + offset
    const y = Math.floor(total / 12)
    const m = total % 12 + 1
    urls.push(`${LIST_URL}mes/${y}-${String(m).padStart(2, '0')}/`)
  }
  return urls
}

function discoverEventUrls(html: string): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $('a[href*="/eventos-municipales/"]').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    const match = href.match(/\/eventos-municipales\/([a-z0-9-]+)\/?$/i)
    if (!match || !match[1] || RESERVED_SLUGS.has(match[1])) return
    const url = new URL(href, BASE_URL).toString()
    if (isValidHttpsUrl(url)) urls.add(url)
  })
  return [...urls]
}

function parsePlace(text: string): string | null {
  const venuePattern = /parque|centro|teatro|sala|auditorio|museo|galer|plaza|biblioteca|casa|instituto|universidad|colegio|coliseo|estadio|complejo|club|malec[oó]n|paseo|jir[oó]n|av\.|calle/i
  for (const match of text.matchAll(/\b(en (?:el|la) [^.,;]{3,80})(?:,|\.)/gi)) {
    const value = match[1]?.trim() ?? ''
    if (value && venuePattern.test(value) && !/horario|fecha|distrito|año|mañana|tarde|mediod[ií]a/i.test(value)) return value
  }
  return null
}

export const mirafloresSource: SourceAdapter = {
  key: 'miraflores',
  label: 'Municipalidad de Miraflores — eventos gratuitos',

  async collect(): Promise<CandidateEvent[]> {
    const listingPages = [LIST_URL, `${LIST_URL}lista/`, ...monthPageUrls()]
    const detailUrls = new Set<string>()
    let lastError: unknown

    for (const page of listingPages) {
      try {
        for (const url of discoverEventUrls(await fetchHtml(page))) detailUrls.add(url)
      } catch (error) {
        lastError = error
        console.warn(`[miraflores] Listado no disponible ${page}:`, error instanceof Error ? error.message : error)
      }
      await sleep(350)
    }
    if (detailUrls.size === 0 && lastError) throw lastError
    if (detailUrls.size === 0) {
      console.log('[miraflores] sin eventos publicados en la agenda oficial')
      return []
    }

    const candidates: CandidateEvent[] = []
    let structureHits = 0
    let structureMisses = 0

    for (const url of detailUrls) {
      await sleep(350)
      let detail: string
      try {
        detail = await fetchHtml(url)
      } catch (error) {
        console.warn(`[miraflores] Detalle no disponible ${url}:`, error instanceof Error ? error.message : error)
        continue
      }

      const event = parseJsonLdEvents(detail)[0]
      const $ = cheerio.load(detail)
      const htmlTitle = $('h1.tribe-events-single-event-title').first().text().replace(/\s+/g, ' ').trim()
      if (!event && !htmlTitle) {
        structureMisses += 1
        continue
      }
      if (event?.startDate) structureHits += 1

      const title = (event?.name ?? htmlTitle).trim()
      const startDate = dateFromIso(event?.startDate)
      const endDate = dateFromIso(event?.endDate)
      const bodyText = htmlToText($('#tribe-events-content').first().html() ?? '')
      const fullText = `${title} ${event?.description ?? ''} ${bodyText}`
      if (!title || !startDate || !looksFree(fullText)) continue

      const time = event?.startDate ? timeRangeFromIso(event.startDate, event.endDate) : 'Consultar horario'
      const parsedPlace = event?.location?.name?.trim() || parsePlace(`${event?.description ?? ''} ${bodyText}`)
      const place = parsedPlace ?? 'Sede en Miraflores — ver fuente oficial'
      const registration = $('a[href]').map((_, el) => $(el).attr('href') ?? '').get()
        .find((href) => /forms\.gle|docs\.google\.com\/forms|forms\.office\.com/i.test(href))

      candidates.push({
        title,
        description: firstSentence(bodyText || event?.description || `${title}, evento de la Municipalidad de Miraflores.`, 1000),
        category: classifyCategory(title, 'Cultura'),
        modality: 'Presencial',
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        time,
        place,
        district: DISTRICT,
        organizer: ORGANIZER,
        source: 'Municipalidad de Miraflores',
        sourceUrl: url,
        registrationUrl: registration && isValidHttpsUrl(registration) ? registration : undefined,
        requiresRegistration: Boolean(registration),
        qualityIssues: parsedPlace ? [] : ['place:missing'],
        tags: [],
        freeSignal: true,
        priceRaw: 'Gratis',
        raw: { source: 'miraflores', url, jsonLd: Boolean(event?.startDate) },
      })
    }

    if (structureHits === 0 && structureMisses > 0) {
      throw new Error(`estructura de Miraflores no reconocida: ${structureMisses} páginas de evento sin JSON-LD/fecha`)
    }
    console.log(`[miraflores] detalles=${detailUrls.size} estructura_ok=${structureHits} candidatos=${candidates.length}`)
    return candidates
  },
}
