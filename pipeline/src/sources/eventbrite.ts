import * as cheerio from 'cheerio'
import type { CandidateEvent, Modality, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { classifyCategory, EVENTBRITE_CATEGORY_MAP } from '../core/category'
import { districtAlias, looksPaid } from '../core/gates'
import { dateFromIso, firstSentence, isValidHttpsUrl, timeRangeFromIso } from '../core/text'

const SEARCH_PAGE_SETS: string[][] = [
  [
    'https://www.eventbrite.com/d/peru--lima/free--events/',
    'https://www.eventbrite.com/d/peru--lima/free--events/?page=2',
  ],
  [
    'https://www.eventbrite.com.pe/d/peru--lima/free--events/',
    'https://www.eventbrite.com.pe/d/peru--lima/free--events/?page=2',
  ],
]

interface JsonLdEvent {
  '@type'?: string | string[]
  name?: string
  description?: string
  startDate?: string
  endDate?: string
  url?: string
  image?: string | string[] | { url?: string }
  eventAttendanceMode?: string
  location?: {
    name?: string
    address?: {
      addressLocality?: string
      addressRegion?: string
    }
  }
  organizer?: { name?: string }
  offers?:
    | {
        lowPrice?: string | number
        highPrice?: string | number
      }
    | Array<{ lowPrice?: string | number; highPrice?: string | number }>
}

interface CardMeta {
  category?: string
}

function isEventJsonLd(value: unknown): value is JsonLdEvent {
  if (!value || typeof value !== 'object') return false
  const type = (value as JsonLdEvent)['@type']
  const types = Array.isArray(type) ? type : type ? [type] : []
  return types.some((t) => typeof t === 'string' && t.includes('Event'))
}

function parseJsonLdEvents(html: string): JsonLdEvent[] {
  const events: JsonLdEvent[] = []
  const $ = cheerio.load(html)
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text().trim()
    if (!raw) return
    try {
      const data = JSON.parse(raw) as unknown
      const nodes = Array.isArray(data) ? data : [data]
      for (const node of nodes) {
        if (isEventJsonLd(node)) events.push(node)
        const itemList = node as { itemListElement?: Array<{ item?: unknown }> }
        if (itemList && typeof itemList === 'object' && Array.isArray(itemList.itemListElement)) {
          for (const entry of itemList.itemListElement) {
            if (entry && isEventJsonLd(entry.item)) events.push(entry.item)
          }
        }
      }
    } catch {
      // JSON-LD malformado: se ignora el bloque
    }
  })
  return events
}

function normalizeEventUrl(url: string | undefined): string | null {
  if (!url || !isValidHttpsUrl(url)) return null
  try {
    const parsed = new URL(url)
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function imageFrom(event: JsonLdEvent): string | undefined {
  const image = event.image
  let url: string | undefined
  if (typeof image === 'string') url = image
  else if (Array.isArray(image)) url = image.find((item) => typeof item === 'string')
  else if (image && typeof image === 'object' && typeof image.url === 'string') url = image.url
  if (!url || !isValidHttpsUrl(url)) return undefined
  return url.replace('w=512', 'w=1200')
}

function offersPrice(event: JsonLdEvent): { low: number; high: number } | null {
  const offers = Array.isArray(event.offers) ? event.offers[0] : event.offers
  if (!offers) return null
  const low = Number(offers.lowPrice ?? NaN)
  const high = Number(offers.highPrice ?? NaN)
  if (Number.isNaN(low) && Number.isNaN(high)) return null
  return { low: Number.isNaN(low) ? high : low, high: Number.isNaN(high) ? low : high }
}

function modalityFrom(event: JsonLdEvent): Modality {
  const mode = event.eventAttendanceMode ?? ''
  return mode.includes('Online') ? 'Virtual' : 'Presencial'
}

function parseSearchPage(html: string): { events: JsonLdEvent[]; cards: Map<string, CardMeta> } {
  const events = parseJsonLdEvents(html)
  const cards = new Map<string, CardMeta>()
  const $ = cheerio.load(html)
  $('a[data-event-id]').each((_, el) => {
    const href = normalizeEventUrl($(el).attr('href'))
    if (!href) return
    cards.set(href, { category: $(el).attr('data-event-category') })
  })
  return { events, cards }
}

export const eventbriteSource: SourceAdapter = {
  key: 'eventbrite',
  label: 'Eventbrite Lima (eventos gratuitos)',

  async collect(): Promise<CandidateEvent[]> {
    const stubs = new Map<string, { event: JsonLdEvent; card?: CardMeta }>()
    let lastError: unknown

    for (const pages of SEARCH_PAGE_SETS) {
      try {
        for (const pageUrl of pages) {
          const html = await fetchHtml(pageUrl, { browserFallback: true })
          const { events, cards } = parseSearchPage(html)
          if (events.length === 0) {
            console.warn(
              `[eventbrite] 0 eventos parseados en ${pageUrl} (ld+json: ${(html.match(/application\/ld\+json/g) || []).length}, tamaño: ${html.length})`,
            )
          }
          for (const event of events) {
            const url = normalizeEventUrl(event.url)
            if (!url) continue
            if (!stubs.has(url)) stubs.set(url, { event, card: cards.get(url) })
          }
          await sleep(500)
        }
        if (stubs.size > 0) break
      } catch (error) {
        lastError = error
        console.warn(
          `[eventbrite] Búsqueda no disponible en ${pages[0]}:`,
          error instanceof Error ? error.message : error,
        )
      }
    }
    if (stubs.size === 0 && lastError) throw lastError

    const candidates: CandidateEvent[] = []
    for (const [url, stub] of stubs) {
      await sleep(500)
      let detail: JsonLdEvent = stub.event
      try {
        const detailEvents = parseJsonLdEvents(await fetchHtml(url, { browserFallback: true }))
        detail = detailEvents.find((event) => normalizeEventUrl(event.url) === url) ?? detailEvents[0] ?? stub.event
      } catch (error) {
        console.warn(`[eventbrite] Detalle no disponible para ${url}:`, error instanceof Error ? error.message : error)
      }

      const price = offersPrice(detail) ?? offersPrice(stub.event)
      const isFree = price ? price.low === 0 && price.high === 0 : false
      const name = (detail.name ?? stub.event.name ?? '').trim()
      if (!name) continue

      const startDate = dateFromIso(detail.startDate ?? stub.event.startDate) ?? ''
      const endDate = dateFromIso(detail.endDate ?? stub.event.endDate) ?? undefined
      const locality = detail.location?.address?.addressLocality ?? stub.event.location?.address?.addressLocality ?? ''
      const venue = detail.location?.name ?? stub.event.location?.name ?? 'Lima'
      const description = firstSentence(detail.description ?? stub.event.description ?? `${name} en ${venue}, Lima.`)
      const cardCategory = stub.card?.category ? EVENTBRITE_CATEGORY_MAP[stub.card.category] : undefined

      candidates.push({
        title: name,
        description,
        category: cardCategory ?? classifyCategory(`${name} ${description}`),
        modality: modalityFrom(detail),
        startDate,
        endDate: endDate && endDate !== startDate ? endDate : undefined,
        time: timeRangeFromIso(detail.startDate ?? stub.event.startDate, detail.endDate ?? stub.event.endDate),
        place: modalityFrom(detail) === 'Virtual' ? 'Sesión virtual' : venue,
        district: modalityFrom(detail) === 'Virtual' || !locality ? undefined : districtAlias(locality),
        organizer: detail.organizer?.name ?? stub.event.organizer?.name ?? 'Organizador de Eventbrite',
        source: 'Eventbrite',
        sourceUrl: url,
        registrationUrl: url,
        requiresRegistration: true,
        tags: [],
        imageUrl: imageFrom(detail) ?? imageFrom(stub.event),
        freeSignal: isFree,
        priceRaw: price ? (isFree ? 'Gratis' : `US$ ${price.low} a US$ ${price.high}`) : undefined,
        raw: { source: 'eventbrite', url, offersLow: price?.low, offersHigh: price?.high },
      })
    }

    return candidates.filter((candidate) => candidate.startDate.length > 0 && !looksPaid(candidate.priceRaw ?? ''))
  },
}
