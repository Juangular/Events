import { chromium, type Browser, type BrowserContext } from 'playwright'

const CHALLENGE_TITLE = /human verification|just a moment|attention required|robot challenge screen|vercel security checkpoint/i
const CHALLENGE_BODY = /Human Verification|gokuProps|awsWafCookieDomainList|Vercel Security Checkpoint|Robot Challenge Screen|\.well-known\/sgcaptcha\/\?r=/i

let browserPromise: Promise<Browser> | null = null
let solvedContext: BrowserContext | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
        args: ['--disable-blink-features=AutomationControlled'],
      })
      .catch((error) => {
        browserPromise = null
        throw new Error(
          `No se pudo iniciar Chromium: ${error instanceof Error ? error.message : error}. Ejecuta "npx playwright install chromium" en pipeline/`,
        )
      })
  }
  return browserPromise
}

async function attemptFetch(context: BrowserContext, url: string): Promise<string | null> {
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    let cleared = false
    for (let i = 0; i < 8; i += 1) {
      // A verification page can redirect while we inspect it; keep the same session alive.
      const state = await page.evaluate<{ title: string; html: string; url: string }>('({ title: document.title, html: document.documentElement.outerHTML, url: location.href })').catch(() => null)
      if (state?.title.trim() && !CHALLENGE_TITLE.test(state.title) && !CHALLENGE_BODY.test(state.html) && !state.url.includes('/.well-known/sgcaptcha/')) {
        cleared = true
        break
      }
      await sleep(2_000)
    }
    if (!cleared) {
      console.warn(`[browser] reto anti-bot persistente en ${url} · título: ${await page.title()}`)
      return null
    }
    await page.waitForLoadState('load', { timeout: 15_000 }).catch(() => {})
    await sleep(2_500)
    const html = await page.content()
    return CHALLENGE_BODY.test(html) ? null : html
  } finally {
    await page.close()
  }
}

export async function fetchHtmlViaBrowser(url: string, minIntervalMs = 0): Promise<string> {
  if (solvedContext) {
    const html = await attemptFetch(solvedContext, url)
    if (html) return html
    await solvedContext.close().catch(() => {})
    solvedContext = null
    if (minIntervalMs) await sleep(minIntervalMs)
  }

  const browser = await getBrowser()
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const context = await browser.newContext()
    try {
      const html = await attemptFetch(context, url)
      if (html) {
        solvedContext = context
        return html
      }
    } catch (error) {
      console.warn(`[browser] error en intento ${attempt} para ${url}:`, error instanceof Error ? error.message : error)
    } finally {
      if (solvedContext !== context) await context.close().catch(() => {})
    }
    if (attempt < 5) await sleep(Math.max(2_000 * attempt, minIntervalMs))
  }
  throw new Error(`Reto anti-bot no resuelto tras 5 intentos: ${url}`)
}

export async function closeBrowser(): Promise<void> {
  const browser = await browserPromise?.catch(() => null)
  if (solvedContext) {
    await solvedContext.close().catch(() => {})
    solvedContext = null
  }
  if (browser) await browser.close().catch(() => {})
  browserPromise = null
}
