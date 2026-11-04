import { chromium, type Browser, type BrowserContext } from 'playwright'

const CHALLENGE_TITLE = /human verification|just a moment|attention required/i
const CHALLENGE_BODY = /Human Verification|gokuProps|awsWafCookieDomainList/i

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
      const title = await page.title()
      if (!CHALLENGE_TITLE.test(title)) {
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

export async function fetchHtmlViaBrowser(url: string): Promise<string> {
  if (solvedContext) {
    const html = await attemptFetch(solvedContext, url)
    if (html) return html
    await solvedContext.close().catch(() => {})
    solvedContext = null
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
    if (attempt < 5) await sleep(2_000 * attempt)
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
