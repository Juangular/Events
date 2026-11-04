const USER_AGENT = 'plan-lima-ingest/1.0 (agregación de eventos gratuitos de Lima; repositorio público del proyecto)'

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchHtml(url: string, attempts = 2): Promise<string> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml',
          'accept-language': 'es-PE,es;q=0.9',
        },
        signal: AbortSignal.timeout(20_000),
        redirect: 'follow',
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} para ${url}`)
      return await response.text()
    } catch (error) {
      lastError = error
      if (attempt < attempts) await sleep(1_500 * attempt)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
