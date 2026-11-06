import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { findLimaDistrict } from '../core/gates'
import { collectPages, mainEvent, pageText, registrationLink, sameSiteUrl, structuredCandidate, type ListingPage } from '../core/source-page'
import { isoDateInLima } from '../core/text'

export function runningListing(html: string, url: string): ListingPage {
  const $ = cheerio.load(html)
  const cards = $('article.tribe-events-calendar-list__event')
  if (!cards.length && !/no (?:hay|se han encontrado|se encontraron) eventos/i.test(pageText(html))) throw new Error('Agenda Running4Peru no reconocida')
  const cutoff = new Date(`${isoDateInLima()}T12:00:00Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() + 90)
  const lastDate = cutoff.toISOString().slice(0, 10)
  const urls = new Set<string>()
  let withinHorizon = false
  cards.each((_, el) => {
    const date = $(el).find('time[datetime]').first().attr('datetime')?.slice(0, 10)
    if (date && date > lastDate) return
    withinHorizon = true
    if (!$(el).find('.free').length || !findLimaDistrict($(el).text())) return
    const detail = sameSiteUrl($(el).find('h3 a').attr('href') ?? '', url, /^\/eventos\/[^/]+\/?$/)
    if (detail) urls.add(detail)
  })
  const href = $('a[rel="next"]').first().attr('href')
  const next = withinHorizon && href ? sameSiteUrl(href, url, /^\/eventos\/lista\/(?:p(?:%C3%A1|á)gina\/\d+\/)?$/i, true) : null
  return { urls: [...urls], next: next || undefined }
}

export function parseRunningEvent(html: string, url: string): CandidateEvent[] {
  const $ = cheerio.load(html)
  const content = $('.tribe-events-single-event-description').first().html() ?? ''
  const event = mainEvent(html, url)
  const candidate = structuredCandidate(event, { source: 'Running4Peru', url,
    description: pageText(content) || undefined, registrationUrl: registrationLink(content, url), fallbackCategory: 'Deportes' })
  return candidate ? [candidate] : []
}

export const running4PeruSource: SourceAdapter = {
  key: 'running4peru', label: 'Running4Peru — eventos gratuitos en Lima (90 días)',
  collect: () => collectPages({ key: 'running4peru', url: 'https://www.running4peru.com/eventos',
    listing: runningListing, detail: parseRunningEvent, delayMs: 10_000, browserFallback: true }),
}
