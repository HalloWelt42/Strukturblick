// Bau von Strukturblick 2.0. Die Fassung kommt aus ../version.json (eine Quelle); die Bauart wählt VITE_BAUART:
// "server" (pi5b, Vorgabe) oder "eigenstaendig" (GitHub Pages, alles im Browser). Relative Pfade, damit die
// eigenständige Bauart unter jedem Unterpfad läuft.
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";

const fassung = JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8")) as { version: string; voll?: string };

export default defineConfig({
  base: "./",
  plugins: [svelte()],
  define: {
    __APP_FASSUNG__: JSON.stringify(fassung.voll ?? fassung.version),
  },
  worker: { format: "es" },
  server: { port: 6011, strictPort: true, host: "0.0.0.0" },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
