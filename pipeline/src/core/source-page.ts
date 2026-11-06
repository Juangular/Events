import * as cheerio from 'cheerio'
import type { CandidateEvent, Category } from '../types'
import { classifyCategory } from './category'
import { findLimaDistrict, isLimaDistrict, looksFree, looksPaid } from './gates'
import { htmlToText } from './html'
import { fetchHtml, sleep } from './http'
import { dateFromIso, firstSentence, isValidHttpsUrl, normalizeText, timeRangeFromIso } from './text'

export function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function pageText(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, noscript, nav, .adsbygoogle').remove()
  return htmlToText($.html())
}

export function conditionalOrPaid(value: string): boolean {
  return looksPaid(value) || /por compras|compra minima|compras minimas|consumo minimo|previa compra|presenta (?:tu |una? )?(?:boleta|ticket) de compra|donacion obligatoria/.test(normalizeText(value))
}

export function sameSiteUrl(href: string, base: string, path: RegExp, keepQuery = false): string | null {
  try {
    const url = new URL(href, base)
    if (url.protocol !== 'https:' || url.origin !== new URL(base).origin || url.username || url.password || !path.test(url.pathname)) return null
    url.hash = ''
    if (!keepQuery) url.search = ''
    return url.toString()
  } catch { return null }
}

export function eventNodes(html: string): Record<string, unknown>[] {
  const $ = cheerio.load(html)
  const nodes: Record<string, unknown>[] = []
  function visit(value: unknown, depth = 0): void {
    if (depth > 10) return
    if (Array.isArray(value)) { value.forEach((item) => visit(item, depth + 1)); return }
    const node = object(value)
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
    if (types.some((type) => typeof type === 'string' && /Event$/.test(type))) nodes.push(node)
    if (node['@graph']) visit(node['@graph'], depth + 1)
    if (node.itemListElement) visit(node.itemListElement, depth + 1)
    if (node.item) visit(node.item, depth + 1)
  }
  $('script[type="application/ld+json"]').each((_, el) => {
    try { visit(JSON.parse($(el).text())) } catch { /* Other metadata may be malformed. */ }
  })
  return nodes
}

export function mainEvent(html: string, url: string): Record<string, unknown> {
  const $ = cheerio.load(html)
  const canonical = sameSiteUrl($('link[rel="canonical"]').attr('href') ?? url, url, /^\//) ?? url
  const key = (value: string) => value.replace(/\/$/, '')
  const nodes = eventNodes(html)
  const node = nodes.find((item) => key(text(item.url)) === key(canonical)) ?? (nodes.length === 1 ? nodes[0] : undefined)
  if (!node) throw new Error(`Estructura Event principal no reconocida: ${url}`)
  return node
}

export function registrationLink(html: string, base: string): string | undefined {
  const $ = cheerio.load(html)
  let found: string | undefined
  $('a[href]').each((_, el) => {
    const label = normalizeText($(el).text())
    if (found || !/inscri|registr|reserv/.test(label) || /publica|organiza|tu evento/.test(label)) return
    try {
      const url = new URL($(el).attr('href') ?? '', base)
      if (isValidHttpsUrl(url.toString()) && !url.username && !url.password && !url.hash && url.pathname !== '/eventos' && url.pathname !== '/eventos/') found = url.toString()
    } catch { /* Ignore invalid external links. */ }
  })
  return found
}

export function structuredCandidate(event: Record<string, unknown>, options: {
  source: string; url: string; description?: string; priceText?: string; registrationUrl?: string; fallbackCategory?: Category
}): CandidateEvent | null {
  const title = pageText(text(event.name))
  const startIso = text(event.startDate)
  const endIso = text(event.endDate)
  const startDate = dateFromIso(startIso)
  const description = pageText(options.description || text(event.description))
  if (!title || !startDate || !description || /Cancelled|Postponed/.test(text(event.eventStatus))) return null
  const offers = (Array.isArray(event.offers) ? event.offers : [event.offers]).map(object)
  const prices = offers.flatMap((offer) => [offer.price, offer.lowPrice, offer.highPrice]).filter((price) => price !== undefined && price !== null && price !== '')
  if (prices.some((price) => (typeof price !== 'string' && typeof price !== 'number') || !String(price).trim() || !Number.isFinite(Number(price)) || Number(price) !== 0)) return null
  const priceText = `${options.priceText ?? ''} ${description}`
  if (conditionalOrPaid(priceText)) return null
  const freeSignal = event.isAccessibleForFree === true || (prices.length > 0 && prices.every((price) => Number(price) === 0)) || looksFree(priceText)
  if (!freeSignal) return null
  const location = object(event.location)
  const address = object(location.address)
  const locality = text(address.addressLocality)
  const region = text(address.addressRegion)
  const country = text(address.addressCountry)
  if (country && !/^(pe|peru)$/i.test(normalizeText(country))) return null
  if (region && !/^lima(?: metropolitana)?$/i.test(region)) return null
  const locationText = normalizeText(`${locality} ${text(address.streetAddress)} ${text(location.name)}`)
  if (/\b(callao|ica|arequipa|huancayo|junin|chiclayo|piura|trujillo|cusco|huaral|chimbote|pucallpa|tacna)\b/.test(locationText)) return null
  if (isLimaDistrict(locality) === 'outside') return null
  const district = findLimaDistrict(`${locality} ${text(address.streetAddress)} ${text(location.name)}`)
  const requiresRegistration = /previa inscrip|registro previo|para inscribirte|inscripcion obligatoria|requiere inscripcion/.test(normalizeText(description))
  if (requiresRegistration && !options.registrationUrl) return null
  return {
    title, description: firstSentence(description, 2400), category: classifyCategory(title, options.fallbackCategory ?? 'Cultura'),
    modality: /OnlineEventAttendanceMode/.test(text(event.eventAttendanceMode)) ? 'Virtual' : 'Presencial',
    startDate, endDate: dateFromIso(endIso) && dateFromIso(endIso) !== startDate ? dateFromIso(endIso)! : undefined, time: timeRangeFromIso(startIso, endIso),
    place: text(location.name) || text(address.streetAddress) || 'Consultar lugar', district,
    organizer: text(object(event.organizer).name) || options.source, source: options.source, sourceUrl: options.url,
    requiresRegistration, registrationUrl: options.registrationUrl, tags: [],
    imageUrl: isValidHttpsUrl(text(event.image)) ? text(event.image) : undefined,
    freeSignal, priceRaw: options.priceText || (prices.length ? 'Gratis (precio publicado: 0)' : undefined),
    // Aggregated metadata is a discovery lead, not a verified organizer announcement.
    needsReview: true, raw: { scrapedUrl: options.url, provenance: 'aggregator', startDate: startIso, endDate: endIso, priceText },
  }
}

export interface ListingPage { urls: string[]; next?: string }

export async function collectPages(config: {
  key: string; url: string; listing: (html: string, url: string) => ListingPage;
  detail: (html: string, url: string) => CandidateEvent[];
  delayMs?: number; browserFallback?: boolean
}): Promise<CandidateEvent[]> {
  const delay = config.delayMs ?? 600
  const fetchPage = async (url: string) => {
    await sleep(delay)
    return fetchHtml(url, { browserFallback: config.browserFallback, minIntervalMs: delay })
  }
  const pages = new Set<string>()
  const details = new Set<string>()
  let next: string | undefined = config.url
  while (next && !pages.has(next)) {
    if (pages.size >= 20) throw new Error(`[${config.key}] Límite de 20 páginas alcanzado; revisar paginación`)
    pages.add(next)
    const listing = config.listing(await fetchPage(next), next)
    listing.urls.forEach((url) => details.add(url))
    console.log(`[${config.key}] listado ${pages.size}: ${listing.urls.length} fichas, acumuladas=${details.size}`)
    if (details.size > 500) throw new Error(`[${config.key}] Límite de 500 fichas alcanzado; revisar listado`)
    if (listing.next && new URL(listing.next).origin !== new URL(config.url).origin) throw new Error('Paginación externa rechazada')
    next = listing.next
  }
  const candidates: CandidateEvent[] = []
  let processed = 0
  for (const url of details) {
    if (new URL(url).origin !== new URL(config.url).origin) throw new Error('Ficha externa rechazada')
    candidates.push(...config.detail(await fetchPage(url), url))
    processed++
    if (processed % 20 === 0) console.log(`[${config.key}] procesadas ${processed}/${details.size} fichas`)
  }
  console.log(`[${config.key}] páginas=${pages.size} fichas=${details.size} candidatos=${candidates.length}`)
  return candidates
}
