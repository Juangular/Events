import * as cheerio from 'cheerio'
import type { CandidateEvent, Category, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { htmlToText } from '../core/html'
import { classifyCategory } from '../core/category'
import { looksFree } from '../core/gates'
import { firstSentence, isValidHttpsUrl, isoDateInLima, normalizeTimeText, parseSpanishMonth, toIsoDate } from '../core/text'

interface MunicipalConfig {
  key: string
  label: string
  slug: string
  district: string
  organizer: string
  source: string
  fallbackCategory: Category
  listings: string[]
}

interface EventDates {
  start: string
  end?: string
  inferredStart: boolean
}

const ACTIVITY_PATTERN = /presentaci[oó]n|concierto|exposici[oó]n|cine|documental|teatro|taller|feria|charla|conferencia|club|karaoke|masterclass|deporte|bailo|zumba|yoga|f[uú]tbol|v[oó]ley|b[aá]squet|boxeo|karate|judo|atletismo|coral|retreta|homenaje|funci[oó]n|espect[aá]culo|show|visita|recorrido|festival|concurso|competencia|rob[oó]tica|social run/i
const REJECT_PATTERN = /evento finalizado|proceso finalizado|actividad con costo|entradas a la venta|boleto de entrada|tarifa de ingreso|costo de entrada|concejo municipal|predial|arbitrios|zonificaci[oó]n|petici[oó]n de cambio/i
const TIME_RANGE = /(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)\s*(?:a|–|-|—)\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i

const CONFIGS: MunicipalConfig[] = [
  {
    key: 'muni-lima',
    label: 'Municipalidad Metropolitana de Lima — eventos gratuitos',
    slug: 'munilima',
    district: 'Cercado de Lima',
    organizer: 'Municipalidad Metropolitana de Lima',
    source: 'Municipalidad de Lima',
    fallbackCategory: 'Cultura',
    listings: ['https://www.gob.pe/institucion/munilima/noticias'],
  },
  {
    key: 'surco',
    label: 'Municipalidad de Santiago de Surco — eventos gratuitos',
    slug: 'munisantiagodesurco',
    district: 'Santiago de Surco',
    organizer: 'Municipalidad Distrital de Santiago de Surco',
    source: 'Municipalidad de Surco',
    fallbackCategory: 'Cultura',
    listings: ['https://www.gob.pe/institucion/munisantiagodesurco/noticias'],
  },
  {
    key: 'san-miguel',
    label: 'Municipalidad de San Miguel — eventos gratuitos',
    slug: 'munisanmiguel',
    district: 'San Miguel',
    organizer: 'Municipalidad Distrital de San Miguel',
    source: 'Municipalidad de San Miguel',
    fallbackCategory: 'Cultura',
    listings: [
      'https://www.gob.pe/institucion/munisanmiguel/campa%C3%B1as',
      'https://www.gob.pe/institucion/munisanmiguel/noticias',
    ],
  },
  {
    key: 'pueblo-libre',
    label: 'Municipalidad de Pueblo Libre — eventos gratuitos',
    slug: 'munipueblolibre-lima',
    district: 'Pueblo Libre',
    organizer: 'Municipalidad Distrital de Pueblo Libre',
    source: 'Municipalidad de Pueblo Libre',
    fallbackCategory: 'Cultura',
    listings: [
      'https://www.gob.pe/institucion/munipueblolibre-lima/campa%C3%B1as',
      'https://www.gob.pe/institucion/munipueblolibre-lima/noticias',
    ],
  },
]

function parsePublicationDate(html: string): string | null {
  const match = html.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i)
  if (!match) return null
  const month = parseSpanishMonth(match[2] ?? '')
  if (!month) return null
  return toIsoDate(Number(match[3]), month, Number(match[1]))
}

function parseDates(text: string, published: string | null): EventDates | null {
  const publicationYear = Number(published?.slice(0, 4) ?? isoDateInLima().slice(0, 4))
  const publicationMonth = Number(published?.slice(5, 7) ?? 1)

  const range = text.match(/del\s+(\d{1,2})\s+de\s+([a-záéíóú]+)\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i)
  if (range) {
    const startMonth = parseSpanishMonth(range[2] ?? '')
    const endMonth = parseSpanishMonth(range[4] ?? '')
    if (!startMonth || !endMonth) return null
    const startYear = range[5] ? Number(range[5]) : publicationYear
    const start = toIsoDate(startYear, startMonth, Number(range[1]))
    const end = toIsoDate(endMonth < startMonth ? startYear + 1 : startYear, endMonth, Number(range[3]))
    return start && end ? { start, end, inferredStart: false } : null
  }

  const closing = text.match(/hasta el\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i)
  if (closing && published) {
    const month = parseSpanishMonth(closing[2] ?? '')
    if (!month) return null
    const year = closing[3] ? Number(closing[3]) : publicationYear
    const end = toIsoDate(month < publicationMonth ? year + 1 : year, month, Number(closing[1]))
    return end ? { start: published, end, inferredStart: true } : null
  }

  const single = text.match(/(?:el\s+)?(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/i)
  if (single) {
    const month = parseSpanishMonth(single[2] ?? '')
    if (!month) return null
    const year = single[3] ? Number(single[3]) : publicationYear
    const start = toIsoDate(month < publicationMonth ? year + 1 : year, month, Number(single[1]))
    return start ? { start, inferredStart: false } : null
  }
  return null
}

function parsePlace(text: string): string | null {
  for (const match of text.matchAll(/\b(en (?:el|la) [^.,;]{3,80})(?:,|\.)/gi)) {
    const value = match[1]?.trim() ?? ''
    if (value && !/horario|fecha|distrito|año|mañana|tarde|mediod[ií]a/i.test(value)) return value
  }
  return null
}

function parseTime(text: string): { value: string; inferred: boolean } {
  const range = text.match(TIME_RANGE)
  if (range) {
    const value = normalizeTimeText(`${range[1]} a ${range[2]}`)
    if (value) return { value, inferred: false }
  }
  const single = text.match(/\ba las\s+(\d{1,2}(?::\d{2})?\s*[ap]\.?\s*m\.?)/i)
  if (single?.[1]) {
    const withMinutes = single[1].replace(/^(\d{1,2})(\s*[ap])/, '$1:00$2')
    const value = normalizeTimeText(withMinutes)
    if (value) return { value, inferred: false }
  }
  return { value: 'Consultar horario en la fuente oficial', inferred: true }
}

function newsUrls(html: string, config: MunicipalConfig): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  const pattern = new RegExp(`/institucion/${config.slug}/(?:noticias|campa[^/]*)/\\d+`, 'i')
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    if (!pattern.test(href)) return
    const base = config.listings[0] ?? ''
    const url = new URL(href, base).toString()
    if (isValidHttpsUrl(url)) urls.add(url)
  })
  return [...urls]
}

function registrationUrl($: cheerio.CheerioAPI): string | undefined {
  let result: string | undefined
  $('a[href]').each((_, element) => {
    if (result) return
    const href = $(element).attr('href') ?? ''
    if (/forms\.gle|docs\.google\.com\/forms|forms\.office\.com|passline|ticketslima/i.test(href) && isValidHttpsUrl(href)) result = href
  })
  return result
}

function createMunicipalSource(config: MunicipalConfig): SourceAdapter {
  return {
    key: config.key,
    label: config.label,

    async collect(): Promise<CandidateEvent[]> {
      const urls = new Set<string>()
      let lastError: unknown
      for (const listing of config.listings) {
        try {
          for (const url of newsUrls(await fetchHtml(listing), config)) urls.add(url)
        } catch (error) {
          lastError = error
          console.warn(`[${config.key}] Listado no disponible ${listing}:`, error instanceof Error ? error.message : error)
        }
        await sleep(300)
      }
      if (urls.size === 0 && lastError) throw lastError

      const candidates: CandidateEvent[] = []
      for (const url of urls) {
        await sleep(350)
        let detail: string
        try {
          detail = await fetchHtml(url)
        } catch (error) {
          console.warn(`[${config.key}] Detalle no disponible ${url}:`, error instanceof Error ? error.message : error)
          continue
        }

        const published = parsePublicationDate(detail)
        const $ = cheerio.load(detail)
        const title = $('h1').first().text().replace(/\s+/g, ' ').trim()
        const abstract = $('.institution-document__abstract').first().text().replace(/\s+/g, ' ').trim()
        const feedContent = htmlToText($('.description.feed-content').first().html() ?? '')
        const bodyText = feedContent || $('.page__content')
          .map((_, element) => htmlToText($(element).html() ?? ''))
          .get()
          .sort((a, b) => b.length - a.length)[0] || ''
        const fullText = `${title} ${abstract} ${bodyText}`
        if (!title || !looksFree(fullText) || REJECT_PATTERN.test(fullText) || !ACTIVITY_PATTERN.test(fullText)) continue

        const dates = parseDates(`${abstract} ${bodyText}`, published)
        const place = parsePlace(`${abstract} ${bodyText}`)
        if (!dates || !place) continue
        const time = parseTime(`${abstract} ${bodyText}`)
        const registration = registrationUrl($)
        const image = $('img.feed-cover-img, img.campaign-cover-img').first().attr('src')
        const needsReview = dates.inferredStart || time.inferred
        const description = firstSentence(
          `${bodyText || abstract}${dates.inferredStart ? ' La fuente no indica fecha de inicio; se muestra desde la publicación de la nota hasta el cierre informado.' : ''}`,
          1000,
        )

        candidates.push({
          title,
          description,
          category: classifyCategory(fullText, config.fallbackCategory),
          modality: 'Presencial',
          startDate: dates.start,
          endDate: dates.end && dates.end !== dates.start ? dates.end : undefined,
          time: time.value,
          place,
          district: config.district,
          organizer: config.organizer,
          source: config.source,
          sourceUrl: url,
          registrationUrl: registration,
          requiresRegistration: Boolean(registration),
          needsReview,
          tags: [],
          imageUrl: image && isValidHttpsUrl(image) ? image : undefined,
          freeSignal: true,
          priceRaw: 'Gratis',
          raw: { source: config.key, url, published, inferredStart: dates.inferredStart },
        })
      }

      console.log(`[${config.key}] enlaces=${urls.size} candidatos=${candidates.length}`)
      return candidates
    },
  }
}

export const municipalSources: SourceAdapter[] = CONFIGS.map(createMunicipalSource)
