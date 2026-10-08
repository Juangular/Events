import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

function normalizeSiteUrl(value) {
  if (!value) return undefined

  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return undefined
    return url.origin
  } catch {
    return undefined
  }
}

const configuredSiteUrl = process.env.VITE_SITE_URL?.trim()
const siteUrl = normalizeSiteUrl(configuredSiteUrl)
const publicDir = resolve('public')

await mkdir(publicDir, { recursive: true })

if (!siteUrl) {
  console.warn(configuredSiteUrl
    ? 'VITE_SITE_URL debe ser un origen HTTPS válido: no se generará sitemap.xml.'
    : 'VITE_SITE_URL no está configurado: no se generará sitemap.xml.')
  await unlink(resolve(publicDir, 'sitemap.xml')).catch(() => {})
  await writeFile(resolve(publicDir, 'robots.txt'), 'User-agent: *\nAllow: /\n')
} else {
  await writeFile(resolve(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`)
  await writeFile(resolve(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
}
