import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En GitHub Pages la app vive en /AW-SistemCounting/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/AW-SistemCounting/' : '/',
  plugins: [react()],
  server: { port: 5180, host: true },
}))
