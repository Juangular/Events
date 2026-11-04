import * as cheerio from 'cheerio'
import type { CandidateEvent, Category, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { htmlToText } from '../core/html'
import { classifyCategory } from '../core/category'
import { looksFree } from '../core/gates'
import { currentWeekInLima } from '../core/week'
import { firstSentence, isValidHttpsUrl, isoDateInLima, normalizeTimeText, parseSpanishMonth, toIsoDate } from '../core/text'

const LISTING_URL = 'https://www.gob.pe/institucion/munibarranco/noticias'
const ORGANIZER = 'Municipalidad Distrital de Barranco'
const DISTRICT = 'Barranco'
const ACTIVITY_PATTERN = /bailoterapia|clases|taller|deporte|yoga|zumba|baile|actividad f[ií]sica|concierto|exposici[oó]n|feria|teatro|cine|show|presentaci[oó]n/i
const SPORT_PATTERN = /bailoterapia|deporte|yoga|zumba|baile|actividad f[ií]sica|f[uú]tbol|v[oó]ley|b[aá]squet|boxeo|karate|judo|atletismo/i
const TIME_RANGE = /(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)\s*(?:a|–|-|—)\s*(\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?)/i

function parsePublicationDate(html: string): string | null {
  const match = html.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i)
  if (!match) return null
  const month = parseSpanishMonth(match[2] ?? '')
  if (!month) return null
  return toIsoDate(Number(match[3]), month, Number(match[1]))
}

function parseRecurrence(text: string): string | null {
  const range = text.match(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+a\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i)
  if (range) {
    const value = `${range[1]} a ${range[2]}`
    return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
  }
  const weekly = text.match(/todos los\s+(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)s?\b/i)
  if (weekly) return `Todos los ${weekly[1]}`
  if (/s[aá]bados?\s+y\s+domingos?/i.test(text)) return 'Sábados y domingos'
  return null
}

function parsePlace(text: string): string | null {
  const match = text.match(/\b(en (?:el|la) [^.,;]{3,80}),/i)
  return match?.[1]?.trim() ?? null
}

function parseTime(text: string): string | null {
  const match = text.match(TIME_RANGE)
  if (!match) return null
  return normalizeTimeText(`${match[1]} a ${match[2]}`)
}

function newsUrls(html: string): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $('a[href*="/institucion/munibarranco/noticias/"]').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    if (!/\/noticias\/\d+/i.test(href)) return
    const url = new URL(href, LISTING_URL).toString()
    if (isValidHttpsUrl(url)) urls.add(url)
  })
  return [...urls].slice(0, 12)
}

function registrationUrl($: cheerio.CheerioAPI): string | undefined {
  let result: string | undefined
  $('a[href]').each((_, element) => {
    if (result) return
    const href = $(element).attr('href') ?? ''
    if (/forms\.gle|docs\.google\.com\/forms|forms\.office\.com/i.test(href) && isValidHttpsUrl(href)) result = href
  })
  return result
}

export const barrancoSource: SourceAdapter = {
  key: 'barranco',
  label: 'Municipalidad de Barranco — actividades gratuitas recientes',

  async collect(): Promise<CandidateEvent[]> {
    const html = await fetchHtml(LISTING_URL)
    const urls = newsUrls(html)
    const week = currentWeekInLima()
    const cutoff = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const candidates: CandidateEvent[] = []

    for (const url of urls) {
      await sleep(350)
      let detail: string
      try {
        detail = await fetchHtml(url)
      } catch (error) {
        console.warn(`[barranco] Detalle no disponible ${url}:`, error instanceof Error ? error.message : error)
        continue
      }

      const published = parsePublicationDate(detail)
      if (!published || published < cutoff || published > isoDateInLima()) continue

      const $ = cheerio.load(detail)
      const title = $('h1').first().text().replace(/\s+/g, ' ').trim()
      const bodyText = htmlToText($('.description.feed-content').first().html() ?? '')
      const fullText = `${title} ${bodyText}`
      if (!title || !bodyText || !looksFree(fullText) || !ACTIVITY_PATTERN.test(fullText)) continue

      const recurrence = parseRecurrence(bodyText)
      const place = parsePlace(bodyText)
      if (!recurrence || !place) continue
      const time = parseTime(bodyText)
      const registration = registrationUrl($)
      const image = $('img.feed-cover-img').first().attr('src')
      const category: Category = SPORT_PATTERN.test(fullText) ? 'Deportes' : classifyCategory(fullText, 'Cultura')

      candidates.push({
        title,
        description: `${firstSentence(bodyText, 800)} Actividad recurrente vigente para la semana del ${week.start} al ${week.end}, confirmada por la Municipalidad de Barranco el ${published}.`,
        category,
        modality: 'Presencial',
        startDate: week.start,
        endDate: week.end,
        time: `${recurrence}${time ? ` · ${time}` : ''}`,
        place,
        district: DISTRICT,
        organizer: ORGANIZER,
        source: 'Municipalidad de Barranco',
        sourceUrl: url,
        registrationUrl: registration,
        requiresRegistration: Boolean(registration),
        tags: [],
        imageUrl: image && isValidHttpsUrl(image) ? image : undefined,
        freeSignal: true,
        priceRaw: 'Gratis',
        raw: { source: 'barranco', url, published, recurrence },
      })
    }

    console.log(`[barranco] enlaces=${urls.length} candidatos=${candidates.length}`)
    return candidates
  },
}
