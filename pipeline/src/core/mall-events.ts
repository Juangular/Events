import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { classifyCategory } from './category'
import { looksFree } from './gates'
import { conditionalOrPaid, collectPages, pageText, registrationLink, sameSiteUrl, type ListingPage } from './source-page'
import { firstSentence, isValidHttpsUrl, normalizeTimeText, parseSpanishMonth, stripAccents, timeRangeFromIso, toIsoDate } from './text'

export interface MallConfig { key: string; name: string; base: string; district: string }

export function mallListing(html: string, url: string): ListingPage {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $('.em-event h3 a[href]').each((_, el) => {
    const detail = sameSiteUrl($(el).attr('href') ?? '', url, /^\/eventos\/[^/]+\/$/)
    if (detail) urls.add(detail)
  })
  if (!urls.size && !/no (?:hay|se encontraron) eventos/i.test(pageText(html))) throw new Error(`Listado de eventos no reconocido: ${url}`)
  let next: string | undefined
  const page = Number(new URL(url).searchParams.get('pno') ?? 1)
  $('a[href*="pno="]').each((_, el) => {
    const candidate = sameSiteUrl($(el).attr('href') ?? '', url, /^\/eventos\/$/, true)
    if (candidate && Number(new URL(candidate).searchParams.get('pno')) === page + 1) next = candidate
  })
  return { urls: [...urls], next }
}

export function weeklyOccurrences(start: string, end: string, description: string, fallbackTime: string): Array<{ date: string; time: string }> {
  const body = stripAccents(description).toLowerCase()
  const matches = [...body.matchAll(/todos?(?:\s+los)?\s+((?:(?:lunes|martes|miercoles|jueves|viernes|sabados?|domingos?)(?:\s*(?:,|y|e)\s*)?)+)/g)]
  const weekdays = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const result = new Map<string, Set<string>>()
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]!
    const names = match[1] ?? ''
    const segment = body.slice(match.index, matches[index + 1]?.index ?? body.length)
    const clock = segment.match(/(?:desde|a las|a partir de)\s*(\d{1,2}:\d{2}\s*(?:[ap]\. ?\s*m\.?|[ap]\.?\s*m\.?)?)/i)?.[1]?.trim()
    const time = clock ? normalizeTimeText(clock) || clock : fallbackTime
    const date = new Date(`${start}T12:00:00Z`)
    for (let days = 0; days < 366 && date.toISOString().slice(0, 10) <= end; days++, date.setUTCDate(date.getUTCDate() + 1)) {
      const name = weekdays[date.getUTCDay()]!
      if (!names.includes(name)) continue
      const key = date.toISOString().slice(0, 10)
      if (!result.has(key)) result.set(key, new Set())
      result.get(key)!.add(time)
    }
  }
  return [...result].sort(([a], [b]) => a.localeCompare(b)).map(([date, times]) => ({ date, time: [...times].join(' / ') }))
}

export function parseMallEvent(html: string, url: string, config: MallConfig): CandidateEvent[] {
  const $ = cheerio.load(html)
  const root = $('.em-event-single').first()
  if (!root.length) throw new Error(`Ficha Events Manager no reconocida: ${url}`)
  const title = $('h1').first().text().trim()
  const description = pageText(root.find('.em-event-content').html() ?? '')
  const tags = root.find('.em-event-tags').text().trim()
  const priceText = `${tags} ${description}`
  if (!title || !description || !looksFree(priceText) || conditionalOrPaid(priceText)) return []
  const dates = [...root.find('.em-event-date').text().matchAll(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/gi)].map((match) => {
    const month = parseSpanishMonth(match[2] ?? '')
    return month ? toIsoDate(Number(match[3]), month, Number(match[1])) : null
  })
  const start = dates[0]
  const end = dates[1] || start
  if (!start || !end) throw new Error(`Fecha de actividad no reconocida: ${url}`)
  const clocks = [...root.find('.em-event-time').text().matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((match) => `${match[1]!.padStart(2, '0')}:${match[2]}`)
  const time = clocks[0] ? timeRangeFromIso(`${start}T${clocks[0]}`, clocks[1] ? `${start}T${clocks[1]}` : undefined) : 'Consultar horario'
  const registrationUrl = registrationLink(root.find('.em-event-content').html() ?? '', url)
  const requiresRegistration = /previa inscrip|registro previo|inscripci[oó]n obligatoria/i.test(description)
  if (requiresRegistration && !registrationUrl) return []
  const image = root.find('.em-item-image img').first()
  const imageUrl = image.attr('data-src') || image.attr('src')
  const venue = root.find('.em-event-where a').first().text().trim()
  const occurrences = weeklyOccurrences(start, end, description, time)
  const categoryText = `${title} ${root.find('.em-event-categories').text()}`
  const fallback = /saxof|violin|piano|musical|karaoke|orquesta|cumbia/i.test(categoryText) ? 'Música' : 'Familiar'
  const candidate: CandidateEvent = {
    title, description: firstSentence(description, 2400), category: classifyCategory(categoryText, fallback), modality: 'Presencial',
    startDate: start, endDate: end === start ? undefined : end, time,
    place: venue ? `${config.name} — ${venue}` : config.name, district: config.district,
    organizer: config.name, source: config.name, sourceUrl: url, requiresRegistration, registrationUrl, tags: [],
    imageUrl: imageUrl && isValidHttpsUrl(imageUrl) ? imageUrl : undefined, freeSignal: true, priceRaw: priceText,
    needsReview: !clocks.length || (start !== end && !occurrences.length && !/todos los d[ií]as|diari[oa]/i.test(description)),
    raw: { source: config.key, url, date: root.find('.em-event-date').text().trim(), schedule: description },
  }
  if (!occurrences.length) return [candidate]
  return occurrences.map(({ date, time: occurrenceTime }) => ({ ...candidate, startDate: date, endDate: undefined, time: occurrenceTime, needsReview: !clocks.length }))
}

export function mallSource(config: MallConfig): SourceAdapter {
  return { key: config.key, label: `${config.name} — eventos gratuitos`, collect: () => collectPages({
    key: config.key, url: `${config.base}/eventos/`, listing: mallListing,
    detail: (html, url) => parseMallEvent(html, url, config),
  }) }
}
