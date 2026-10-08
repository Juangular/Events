import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeSiteUrl(value: string | undefined) {
  if (!value) return undefined

  const siteUrl = value.trim().replace(/\/+$/, '')
  return /^https:\/\/(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,}(?::\d{1,5})?$/i.test(siteUrl)
    ? siteUrl
    : undefined
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL)

  if (mode === 'production') {
    const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    const missing = requiredEnvVars.filter((name) => !env[name])
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno obligatorias para producción: ${missing.join(', ')}`)
    }
    if (env.VITE_SITE_URL && !siteUrl) {
      throw new Error('VITE_SITE_URL debe ser un origen HTTPS sin ruta, query ni credenciales')
    }
  }

  return {
    plugins: [
      react(),
      {
        name: 'plan-lima-static-seo',
        transformIndexHtml(html) {
          if (!siteUrl) return html

          const canonicalUrl = `${siteUrl}/`
          const htmlWithCanonical = html
            .replace('content="/"', `content="${canonicalUrl}"`)
            .replaceAll('content="/og-image.svg"', `content="${siteUrl}/og-image.svg"`)
            .replace('</head>', `    <link rel="canonical" href="${canonicalUrl}" />\n  </head>`)

          return htmlWithCanonical.replace(
            /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
            (match, opening, json, closing) => {
              try {
                const website = JSON.parse(json) as Record<string, unknown>
                website.url = canonicalUrl
                return `${opening}\n      ${JSON.stringify(website)}\n    ${closing}`
              } catch {
                return match
              }
            },
          )
        },
      },
    ],
  }
})
