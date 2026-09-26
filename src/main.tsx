import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import './styles.css'

const siteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')
if (siteUrl) {
  const canonical = document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = `${siteUrl}/`
  document.head.appendChild(canonical)

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
  if (ogUrl) ogUrl.content = `${siteUrl}/`

  const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
  if (ogImage) ogImage.content = `${siteUrl}/og-image.svg`

  const twitterImage = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')
  if (twitterImage) twitterImage.content = `${siteUrl}/og-image.svg`

  const structuredData = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]')
  if (structuredData) {
    try {
      const website = JSON.parse(structuredData.textContent ?? '{}') as Record<string, unknown>
      website.url = `${siteUrl}/`
      structuredData.textContent = JSON.stringify(website)
    } catch {
      console.warn('No se pudo actualizar el structured data')
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
