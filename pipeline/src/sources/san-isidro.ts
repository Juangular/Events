import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { htmlToText } from '../core/html'
import { classifyCategory } from '../core/category'
import { looksFree } from '../core/gates'
import { firstSentence, isValidHttpsUrl, normalizeTimeText, toIsoDate } from '../core/text'

const LISTING_URL = 'https://www.gob.pe/institucion/munisanisidro-lima/campa%C3%B1as'
const ORGANIZER = 'Municipalidad Distrital de San Isidro'
const DISTRICT = 'San Isidro'
const ACTIVITY_PATTERN = /presentaci[oó]n|concierto|exposici[oó]n|cine|teatro|taller|feria|charla|conferencia|club|cuentacuentos|cuenta cuentos|karaoke|masterclass|deporte|bailo|zumba|yoga|f[uú]tbol|v[oó]ley|b[aá]squet|boxeo|karate|judo|atletismo|coral|retreta|homenaje|funci[oó]n|espect[aá]culo|show|visita|recorrido|festival|concurso|competencia/i
const REJECT_PATTERN = /evento finalizado|actividad con costo|entradas a la venta|boleto de entrada|tarifa de ingreso|costo de entrada|concejo municipal|predial|arbitrios|zonificaci[oó]n|petici[oó]n de cambio/i

interface CampaignDates {
  start: string
  end?: string
}

function parseDates(raw: string): CampaignDates | null {
  const text = raw.replace(/\s+/g, ' ').trim()
  const single = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (single) {
    const start = toIsoDate(Number(single[3]), Number(single[2]), Number(single[1]))
    return start ? { start } : null
  }
  const range = text.match(/^Del\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+al\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/i)
  if (range) {
    const start = toIsoDate(Number(range[3]), Number(range[2]), Number(range[1]))
    const end = toIsoDate(Number(range[6]), Number(range[5]), Number(range[4]))
    return start && end ? { start, end } : null
  }
  return null
}

function campaignUrls(html: string): string[] {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $('a.text-primary.card__mock').each((_, element) => {
    const href = $(element).attr('href') ?? ''
    if (!/\/institucion\/munisanisidro-lima\/campa.*\/\d+/i.test(href)) return
    const url = new URL(href, LISTING_URL).toString()
    if (isValidHttpsUrl(url)) urls.add(url)
  })
  return [...urls].slice(0, 20)
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

export const sanIsidroSource: SourceAdapter = {
  key: 'san-isidro',
  label: 'Municipalidad de San Isidro — campañas y eventos gratuitos',

  async collect(): Promise<CandidateEvent[]> {
    const firstPage = await fetchHtml(LISTING_URL)
    const urls = campaignUrls(firstPage)
    const candidates: CandidateEvent[] = []

    for (const url of urls) {
      await sleep(350)
      let detail: string
      try {
        detail = await fetchHtml(url)
      } catch (error) {
        console.warn(`[san-isidro] Detalle no disponible ${url}:`, error instanceof Error ? error.message : error)
        continue
      }

      const $ = cheerio.load(detail)
      const title = $('h1').first().text().replace(/\s+/g, ' ').trim()
      const fields = $('dl dd').map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get().filter(Boolean)
      const bodyText = $('.page__content')
        .map((_, element) => htmlToText($(element).html() ?? ''))
        .get()
        .sort((a, b) => b.length - a.length)[0] ?? ''
      const fullText = `${title} ${bodyText}`
      if (!title || fields.length < 3 || !looksFree(fullText) || REJECT_PATTERN.test(fullText) || !ACTIVITY_PATTERN.test(fullText)) continue

      const dates = parseDates(fields[0] ?? '')
      if (!dates) continue
      const place = fields[1] ?? ''
      const time = normalizeTimeText(fields[2] ?? '') ?? fields[2] ?? 'Consultar horario'
      if (!place) continue

      const registration = registrationUrl($)
      const image = $('img.campaign-cover-img').first().attr('src')
      candidates.push({
        title,
        description: firstSentence(bodyText || `${title} en ${place}.`, 1000),
        category: classifyCategory(title, 'Cultura'),
        modality: 'Presencial',
        startDate: dates.start,
        endDate: dates.end && dates.end !== dates.start ? dates.end : undefined,
        time,
        place,
        district: DISTRICT,
        organizer: ORGANIZER,
        source: 'Municipalidad de San Isidro',
        sourceUrl: url,
        registrationUrl: registration,
        requiresRegistration: Boolean(registration),
        tags: [],
        imageUrl: image && isValidHttpsUrl(image) ? image : undefined,
        freeSignal: true,
        priceRaw: 'Gratis',
        raw: { source: 'san-isidro', url, date: fields[0], place: fields[1], time: fields[2] },
      })
    }

    console.log(`[san-isidro] enlaces=${urls.length} candidatos=${candidates.length}`)
    return candidates
  },
}
