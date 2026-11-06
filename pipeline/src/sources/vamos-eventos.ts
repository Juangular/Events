import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { collectPages, eventNodes, mainEvent, pageText, registrationLink, sameSiteUrl, structuredCandidate, type ListingPage } from '../core/source-page'
import { isValidHttpsUrl } from '../core/text'

export function vamosListing(html: string, url: string): ListingPage {
  const $ = cheerio.load(html)
  const urls = new Set<string>()
  $('a[href*="/event/"]').each((_, el) => {
    // Recommendations and affiliate advertisements on /gratis are not necessarily free.
    if (!/\bgratis\b|ingreso libre/i.test(pageText($(el).html() ?? ''))) return
    const detail = sameSiteUrl($(el).attr('href') ?? '', url, /^\/event\/[^/]+\/?$/)
    if (detail) urls.add(detail)
  })
  if (!urls.size && !/^0 eventos gratis/i.test($('h1').text().trim())) throw new Error('Listado gratuito de Vamos no reconocido')
  return { urls: [...urls] }
}

export function parseVamosEvent(html: string, url: string): CandidateEvent[] {
  const $ = cheerio.load(html)
  if (!eventNodes(html).length && $('h1').length && $('.whitespace-pre-wrap').length) {
    console.log(`[vamos-eventos] ficha sin fecha Event verificable, omitida: ${url}`)
    return []
  }
  const event = mainEvent(html, url)
  const description = pageText($('.whitespace-pre-wrap').first().html() ?? '')
  const candidate = structuredCandidate(event, { source: 'Vamos Eventos', url, description: description || undefined,
    registrationUrl: registrationLink($('h1').parent().html() ?? '', url) })
  if (!candidate) return []
  let originalUrl: string | undefined
  $('a[href]').each((_, el) => {
    if (!originalUrl && /publicaci[oó]n original/i.test($(el).text())) {
      const href = $(el).attr('href') ?? ''
      if (isValidHttpsUrl(href)) originalUrl = href
    }
  })
  candidate.raw = { ...candidate.raw as Record<string, unknown>, originalUrl }
  return [candidate]
}

export const vamosEventosSource: SourceAdapter = {
  key: 'vamos-eventos', label: 'Vamos Eventos — Lima gratis (revisión de fuente original)',
  collect: () => collectPages({ key: 'vamos-eventos', url: 'https://www.vamoseventos.com/lima/gratis',
    listing: vamosListing, detail: parseVamosEvent, browserFallback: true, delayMs: 1000 }),
}
