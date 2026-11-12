// Bau von Strukturblick 2.0. Die Fassung kommt aus ../version.json (eine Quelle): eingebaut ins Skript und als Meta in
// die Startseite; der Server meldet die der ausgelieferten Startseite, weicht sie ab, lädt ein offener Tab von selbst
// neu. Die Bauart wählt VITE_BAUART: "server" (pi5b, mit Anmeldung und Ablage) oder "eigenstaendig" (GitHub Pages,
// alles im Browser). Die Basis ist absolut, damit Deeplinks (/dokument/...) die Bausteine finden: "/" auf dem Server,
// auf Pages der Unterpfad des Repos aus STRUKTURBLICK_BASIS (setzt der Bau für Pages, siehe .github/workflows/pages.yml).
import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lizenzenPlugin } from "./lizenzen/sammeln.ts";

const FASSUNG = (JSON.parse(readFileSync(new URL("../version.json", import.meta.url), "utf8")) as { version: string }).version;
const fassungEinsetzen = {
  name: "fassung-einsetzen",
  transformIndexHtml: (html: string) => html.replace("</head>", `  <meta name="app-fassung" content="${FASSUNG}" />\n  </head>`),
};

export default defineConfig({
  base: process.env.STRUKTURBLICK_BASIS ?? "/",
  plugins: [svelte(), fassungEinsetzen, lizenzenPlugin(fileURLToPath(new URL(".", import.meta.url)))],
  define: {
    __APP_FASSUNG__: JSON.stringify(FASSUNG),
  },
  // Die Oberfläche des Appkerns kommt als Svelte-Quelltext; Vite bündelt sie nicht vor
  optimizeDeps: { exclude: ["appkern-oberflaeche"] },
  worker: { format: "es" },
  // Beim Entwickeln leitet Vite /api an das Backend (Port 8470); im Betrieb liefert das Backend die Oberfläche selbst aus
  server: { port: 6011, strictPort: true, host: "0.0.0.0", proxy: { "/api": { target: "http://127.0.0.1:8470", changeOrigin: false } } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
