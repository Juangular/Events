import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { findLimaDistrict } from '../core/gates'
import { collectPages, mainEvent, pageText, registrationLink, sameSiteUrl, structuredCandidate, type ListingPage } from '../core/source-page'

export function entradaLibreListing(html: string, url: string): ListingPage {
  const $ = cheerio.load(html)
  const cards = $('article.elini-ev')
  if (!cards.length && !/0 planes|no (?:hay|encontramos) (?:eventos|planes)/i.test(pageText(html))) throw new Error('Listado EntradaLibre no reconocido')
  const urls = new Set<string>()
  cards.each((_, el) => {
    // The national listing also includes cities outside Lima.
    if (!findLimaDistrict(pageText($(el).find('.meta').html() ?? ''))) return
    const detail = sameSiteUrl($(el).find('h3 a').attr('href') ?? '', url, /^\/event\/[^/]+\/$/)
    if (detail) urls.add(detail)
  })
  const page = Number(new URL(url).searchParams.get('pg') ?? 1)
  let next: string | undefined
  $('a[href*="pg="]').each((_, el) => {
    const candidate = sameSiteUrl($(el).attr('href') ?? '', url, /^\/event(?:os)?\/$/, true)
    if (candidate && Number(new URL(candidate).searchParams.get('pg')) === page + 1) next = candidate
  })
  return { urls: [...urls], next }
}

export function parseEntradaLibreEvent(html: string, url: string): CandidateEvent[] {
  const $ = cheerio.load(html)
  const event = mainEvent(html, url)
  const candidate = structuredCandidate(event, { source: 'EntradaLibre', url,
    registrationUrl: registrationLink($('article.elfi-cab').html() ?? '', url) })
  return candidate ? [candidate] : []
}

export const entradaLibreSource: SourceAdapter = {
  key: 'entrada-libre', label: 'EntradaLibre — agenda cultural (revisión de fuente original)',
  collect: () => collectPages({ key: 'entrada-libre', url: 'https://entradalibre.me/eventos/', listing: entradaLibreListing, detail: parseEntradaLibreEvent }),
}
