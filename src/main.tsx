import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const siteUrl = import.meta.env.VITE_SITE_URL?.replace(/\/$/, '')
if (siteUrl) {
  const canonical = document.createElement('link')
  canonical.rel = 'canonical'
  canonical.href = `${siteUrl}/`
  document.head.appendChild(canonical)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
