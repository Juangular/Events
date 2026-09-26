import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')

  if (mode === 'production') {
    const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
    const missing = requiredEnvVars.filter((name) => !env[name])
    if (missing.length > 0) {
      throw new Error(`Faltan variables de entorno obligatorias para producción: ${missing.join(', ')}`)
    }
  }

  return {
    plugins: [react()],
  }
})
