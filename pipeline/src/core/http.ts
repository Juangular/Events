import { fetchHtmlViaBrowser } from './browser'

const BROWSER_HEADERS: Record<string, string> = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'es-PE,es;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
}

const CHALLENGE_PATTERN = /Human Verification|gokuProps|awsWafCookieDomainList/i

const browserHosts = new Set<string>()

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchDirect(url: string, attempts = 2): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(20_000),
        redirect: 'follow',
      })
      if (!response.ok) {
        const body = (await response.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)
        throw new Error(`HTTP ${response.status} para ${url} · cuerpo: ${body}`)
      }
      const html = await response.text()
      if (CHALLENGE_PATTERN.test(html)) {
        throw new Error(`Reto anti-bot para ${url}`)
      }
      return html
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(1_500 * attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function fetchHtml(url: string): Promise<string> {
  const host = new URL(url).hostname
  if (browserHosts.has(host)) return fetchHtmlViaBrowser(url)

  try {
    return await fetchDirect(url)
  } catch (directError) {
    try {
      const html = await fetchHtmlViaBrowser(url)
      browserHosts.add(host)
      return html
    } catch (browserError) {
      const direct = directError instanceof Error ? directError.message : String(directError)
      const viaBrowser = browserError instanceof Error ? browserError.message : String(browserError)
      throw new Error(`${direct} · fallback navegador: ${viaBrowser}`)
    }
  }
}
