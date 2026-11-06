import * as cheerio from 'cheerio'
import type { CandidateEvent, SourceAdapter } from '../types'
import { classifyCategory } from '../core/category'
import { collectPages, conditionalOrPaid, pageText, registrationLink, sameSiteUrl } from '../core/source-page'
import { firstSentence, normalizeTimeText, parseSpanishMonth, toIsoDate } from '../core/text'

const URL = 'https://granteatronacional.pe/eventos'

export function parseGtnEvent(html: string, url: string): CandidateEvent[] {
  const $ = cheerio.load(html)
  const root = $('.node--type-evento').first()
  if (!root.length) throw new Error(`Ficha GTN no reconocida: ${url}`)
  const title = root.find('h1').text().trim()
  const subtitle = root.find('.subtitulo').text().trim()
  const content = root.find('.formato').clone()
  content.find('script, style, .zaumentar').remove()
  const description = pageText(content.html() ?? '')
  // Parking may be free even when the performance is paid: require an admission signal.
  const free = /gratis/i.test(root.find('.categoria').text()) || /ingreso\s+gratuito|entrada\s+libre/i.test(description)
  if (!free || conditionalOrPaid(description)) return []
  const dateMatch = root.find('.infechas').text().match(/(\d{1,2})\s+([a-záéíóú]+)\s+(\d{4})/i)
  const month = parseSpanishMonth(dateMatch?.[2] ?? '')
  const startDate = dateMatch && month ? toIsoDate(Number(dateMatch[3]), month, Number(dateMatch[1])) : null
  if (!title || !startDate) throw new Error(`Fecha/título GTN no reconocido: ${url}`)
  const clock = content.find('p').first().text().match(/\d{1,2}:\d{2}\s*[ap]\. ?\s*m\.?|\d{1,2}:\d{2}\s*[ap]\.?\s*m\.?/i)?.[0]
  const time = clock ? normalizeTimeText(clock) : null
  const requiresRegistration = /previa inscrip|inscripciones desde|requiere inscrip/i.test(description)
  let registrationUrl = registrationLink(content.html() ?? '', url)
  content.find('li').each((_, el) => {
    if (!registrationUrl && /inscrip/i.test($(el).text())) {
      const href = $(el).find('a[href^="https://"]').first().attr('href')
      if (href) registrationUrl = href
    }
  })
  if (requiresRegistration && !registrationUrl) {
    console.log(`[gran-teatro-nacional] inscripción aún sin enlace: ${title}`)
    return []
  }
  return [{
    title: subtitle ? `${title}: ${subtitle}` : title, description: firstSentence(description, 2400),
    category: classifyCategory(`${title} ${subtitle} ${description}`, 'Cultura'), modality: 'Presencial', startDate,
    time: time || 'Consultar horario', place: 'Gran Teatro Nacional', district: 'San Borja',
    organizer: 'Gran Teatro Nacional — Ministerio de Cultura', source: 'Gran Teatro Nacional', sourceUrl: url,
    requiresRegistration, registrationUrl, tags: [], freeSignal: true, priceRaw: description, needsReview: !time,
    // /sites/* images are disallowed by this site's robots.txt; use the frontend fallback.
    raw: { source: 'gran-teatro-nacional', url, date: root.find('.infechas').text().trim() },
  }]
}

export const granTeatroNacionalSource: SourceAdapter = {
  key: 'gran-teatro-nacional', label: 'Gran Teatro Nacional — agenda oficial',
  collect: () => collectPages({ key: 'gran-teatro-nacional', url: URL, detail: parseGtnEvent, listing: (html, url) => {
    const $ = cheerio.load(html)
    const urls = new Set<string>()
    $('main a[href]').each((_, el) => {
      const detail = sameSiteUrl($(el).attr('href') ?? '', url, /^\/evento\/[^/]+\/?$/)
      if (detail) urls.add(detail)
    })
    if (!urls.size && !/no hay (?:eventos|espect[aá]culos)/i.test(pageText(html))) throw new Error('Agenda GTN no reconocida')
    return { urls: [...urls] }
  } }),
}
