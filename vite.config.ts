import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const igpProxy = {
  '/igp-api': {
    target: 'https://ultimosismo.igp.gob.pe',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/igp-api/, ''),
  },
  '/cenvul-api': {
    target: 'https://cenvul.igp.gob.pe',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/cenvul-api/, ''),
  },
  '/ptwc-api': {
    target: 'https://www.tsunami.gov',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ptwc-api/, ''),
  },
  '/ide-api': {
    target: 'https://ide.igp.gob.pe',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ide-api/, ''),
  },
  '/iris-api': {
    target: 'https://service.iris.edu',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/iris-api/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: igpProxy, port: 5173 },
  preview: { proxy: igpProxy, port: 4173 },
})
