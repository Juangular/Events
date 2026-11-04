import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { fetchHtml, sleep } from '../core/http'
import { classifyCategory } from '../core/category'
import { looksFree } from '../core/gates'
import { firstSentence, isValidHttpsUrl, normalizeTimeText, parseSpanishMonth, toIsoDate } from '../core/text'

const LISTING_URL = 'https://lum.cultura.pe/actividades'
const BASE_URL = 'https://lum.cultura.pe'
const ORGANIZER = 'Lugar de la Memoria (LUM) — Ministerio de Cultura'
const PLACE = 'Lugar de la Memoria (LUM)'
const DISTRICT = 'Miraflores'

const DATE_LINE =
  /^(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s*\(([^)]*)\))?\s*$/i
const DATE_RANGE_LINE =
  /^del\s+(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s*\(([^)]*)\))?\s*$/i

interface ListingPost {
  href: string
  title: string
  postDate: string | null
  image?: string
  bodyText: string
}

function htmlToLines(html: string): string[] {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
  const decoded = cheerio.load(`<div id="__root">${withBreaks}</div>`)('#__root').text()
  return decoded
    .split(/\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0 && line !== '\u00a0')
}

function parseListing(html: string): ListingPost[] {
  const $ = cheerio.load(html)
  const posts: ListingPost[] = []
  $('.views-row').each((_, row) => {
    const link = $(row).find('.views-field-title a').first().length
      ? $(row).find('.views-field-title a').first()
      : $(row).find('a[href^="/actividades/"]').first()
    const href = link.attr('href')
    if (!href) return
    const dateAttr = $(row).find('span[property="dc:date"]').attr('content') ?? ''
    const postDate = /^\d{4}-\d{2}-\d{2}/.test(dateAttr) ? (dateAttr.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null) : null
    const image = $(row).find('img').attr('src')
    posts.push({
      href,
      title: link.text().trim() || 'Agenda LUM',
      postDate,
      image: image && isValidHttpsUrl(image) ? image : undefined,
      bodyText: $(row).text(),
    })
  })
  return posts
}

interface ParsedActivity {
  title: string
  startDate: string
  endDate?: string
  time?: string
  room?: string
  description: string
}

function parseActivities(lines: string[], year: number, postMonth: number): ParsedActivity[] {
  const activities: ParsedActivity[] = []

  const dateIndexes: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (DATE_LINE.test(line) || DATE_RANGE_LINE.test(line)) dateIndexes.push(i)
  }

  for (let k = 0; k < dateIndexes.length; k += 1) {
    const i = dateIndexes[k] ?? 0
    const end = (dateIndexes[k + 1] ?? lines.length) - 1
    const line = lines[i] ?? ''

    let startDate: string | null = null
    let endDate: string | undefined
    const single = line.match(DATE_LINE)
    const range = line.match(DATE_RANGE_LINE)
    if (range) {
      const month = parseSpanishMonth(range[3] ?? '')
      const eventYear = month !== null && month < postMonth ? year + 1 : year
      if (month === null) continue
      startDate = toIsoDate(eventYear, month, Number(range[1]))
      endDate = toIsoDate(eventYear, month, Number(range[2])) ?? undefined
    } else if (single) {
      const month = parseSpanishMonth(single[2] ?? '')
      const eventYear = month !== null && month < postMonth ? year + 1 : year
      if (month === null) continue
      startDate = toIsoDate(eventYear, month, Number(single[1]))
    }
    if (!startDate) continue

    let title = ''
    for (let t = i - 1; t >= 0; t -= 1) {
      const candidate = lines[t] ?? ''
      if (candidate.length > 0) {
        title = candidate
        break
      }
    }

    let time: string | undefined
    let room: string | undefined
    const segmentLines: string[] = []
    for (let j = i + 1; j <= end; j += 1) {
      const text = lines[j] ?? ''
      if (text.length > 0) segmentLines.push(text)
    }

    const isLastBlock = k === dateIndexes.length - 1
    if (!isLastBlock && segmentLines.length > 0) {
      segmentLines.pop()
    }

    const descriptionLines: string[] = []
    for (const text of segmentLines) {
      if (!time && normalizeTimeText(text)) {
        time = normalizeTimeText(text) ?? undefined
        continue
      }
      if (/^dirigido a/i.test(text)) continue
      if (!room) {
        room = text
        continue
      }
      descriptionLines.push(text)
    }

    activities.push({
      title: title || `Actividad LUM del ${startDate}`,
      startDate,
      endDate: endDate && endDate !== startDate ? endDate : undefined,
      time,
      room,
      description: descriptionLines.join('\n\n'),
    })
  }

  return activities
}

export const lumSource: SourceAdapter = {
  key: 'lum',
  label: 'Lugar de la Memoria (LUM) — actividades gratuitas',

  async collect(): Promise<CandidateEvent[]> {
    const listingHtml = await fetchHtml(LISTING_URL)
    const cutoff = new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const posts = parseListing(listingHtml).filter((post) => !post.postDate || post.postDate >= cutoff)

    const candidates: CandidateEvent[] = []
    for (const post of posts.slice(0, 4)) {
      if (!looksFree(post.bodyText)) continue
      const url = post.href.startsWith('http') ? post.href : `${BASE_URL}${post.href}`
      if (!isValidHttpsUrl(url)) continue

      await sleep(500)
      let detailHtml: string
      try {
        detailHtml = await fetchHtml(url)
      } catch (error) {
        console.warn(`[lum] Detalle no disponible para ${url}:`, error instanceof Error ? error.message : error)
        continue
      }

      const $ = cheerio.load(detailHtml)
      const bodyHtml = $('div.field-name-body').first().html() ?? ''
      const lines = htmlToLines(bodyHtml)
      const postYear = Number(post.postDate?.slice(0, 4) ?? new Date().getUTCFullYear())
      const postMonth = Number(post.postDate?.slice(5, 7) ?? new Date().getUTCMonth() + 1)
      const activities = parseActivities(lines, postYear, postMonth)

      for (const activity of activities) {
        const description =
          activity.description.length > 0
            ? firstSentence(activity.description, 900)
            : `Actividad del Lugar de la Memoria con ingreso libre y gratuito. ${post.title}.`
        candidates.push({
          title: activity.title,
          description,
          category: classifyCategory(`${activity.title} ${description}`, 'Cultura'),
          modality: 'Presencial',
          startDate: activity.startDate,
          endDate: activity.endDate,
          time: activity.time ?? 'Consultar horario',
          place: activity.room ? `${PLACE} — ${activity.room}` : PLACE,
          district: DISTRICT,
          organizer: ORGANIZER,
          source: 'LUM — Ministerio de Cultura',
          sourceUrl: url,
          requiresRegistration: false,
          tags: [],
          imageUrl: post.image,
          freeSignal: true,
          priceRaw: 'Gratis',
          raw: { source: 'lum', post: post.href, postTitle: post.title, activity: activity.title },
        })
      }
    }

    return candidates
  },
}
