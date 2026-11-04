import * as cheerio from 'cheerio'

export function htmlToText(html: string): string {
  const withSpaces = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
  return cheerio.load(`<div>${withSpaces}</div>`)('div').text().replace(/\s+/g, ' ').trim()
}
