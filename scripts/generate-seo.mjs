import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const siteUrl = process.env.VITE_SITE_URL?.replace(/\/$/, '')
const publicDir = resolve('public')

await mkdir(publicDir, { recursive: true })

if (!siteUrl) {
  console.warn('VITE_SITE_URL no está configurado: no se generará sitemap.xml.')
  await writeFile(resolve(publicDir, 'robots.txt'), 'User-agent: *\nAllow: /\n')
} else {
  await writeFile(resolve(publicDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`)
  await writeFile(resolve(publicDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`)
}
