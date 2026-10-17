import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, type Plugin } from 'vite'

// Backend-Port: start.sh setzt STRUKTURBLICK_API_PORT, falls 6000 belegt ist
// und das Backend auf einen freien Port ausweicht. Default bleibt 6000.
const apiPort = process.env.STRUKTURBLICK_API_PORT ?? '6000'
const apiZiel = `http://localhost:${apiPort}`

// Fassung der Oberfläche aus der einzigen Quelle version.json; weicht die des Backends ab,
// lädt die Oberfläche von selbst neu (src/lib/zustand/fassung.svelte.ts).
const VERSIONSDATEI = fileURLToPath(new URL('../version.json', import.meta.url))
const fassung = (JSON.parse(readFileSync(VERSIONSDATEI, 'utf-8')) as { version: string }).version

/**
 * Die eingebaute Fassung gilt je Start des Entwicklungsservers. Wechselt version.json (neuer
 * Stand geholt), startet der Server neu, damit Oberfläche und Backend dieselbe Fassung melden.
 */
function fassungBeobachten(): Plugin {
  return {
    name: 'strukturblick-fassung',
    configureServer(server) {
      server.watcher.add(VERSIONSDATEI)
      server.watcher.on('change', (datei) => {
        if (resolve(datei) === VERSIONSDATEI) void server.restart()
      })
    },
  }
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(fassung),
  },
  plugins: [svelte(), fassungBeobachten()],
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
