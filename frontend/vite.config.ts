import { readFileSync } from 'node:fs'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Backend-Port: start.sh setzt STRUKTURBLICK_API_PORT, falls 6000 belegt ist
// und das Backend auf einen freien Port ausweicht. Default bleibt 6000.
const apiPort = process.env.STRUKTURBLICK_API_PORT ?? '6000'
const apiZiel = `http://localhost:${apiPort}`

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8'),
) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [svelte()],
  server: {
    port: 6001,
    strictPort: true,
    proxy: {
      '/api': {
        target: apiZiel,
        changeOrigin: true,
      },
      '/docs': {
        target: apiZiel,
        changeOrigin: true,
      },
      '/openapi.json': {
        target: apiZiel,
        changeOrigin: true,
      },
    },
  },
})
