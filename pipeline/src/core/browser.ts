import { chromium, type BrowserContext } from 'playwright'

let contextPromise: Promise<BrowserContext> | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getContext(): Promise<BrowserContext> {
  if (!contextPromise) {
    contextPromise = (async () => {
      let browser
      try {
        browser = await chromium.launch({
          headless: true,
          args: ['--disable-blink-features=AutomationControlled'],
        })
      } catch (error) {
        throw new Error(
          `No se pudo iniciar Chromium: ${error instanceof Error ? error.message : error}. Ejecuta "npx playwright install chromium" en pipeline/`,
        )
      }
      return browser.newContext()
    })()
  }
  return contextPromise
}

export async function fetchHtmlViaBrowser(url: string): Promise<string> {
  const context = await getContext()
  const page = await context.newPage()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    for (let i = 0; i < 15; i += 1) {
      const title = await page.title()
      if (!/human verification/i.test(title)) break
      await sleep(2_000)
    }
    return await page.content()
  } finally {
    await page.close()
  }
}

export async function closeBrowser(): Promise<void> {
  if (!contextPromise) return
  try {
    const context = await contextPromise
    const browser = context.browser()
    await context.close()
    if (browser) await browser.close()
  } finally {
    contextPromise = null
  }
}
