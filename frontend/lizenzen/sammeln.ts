// Lizenzen der ausgelieferten Bausteine (STB-29): Beim Bau entsteht lizenzen.txt neben der App. Sie enthält die eigene
// Lizenz, dann je Paket aus dem Produktionsbaum (npm ls --omit=dev) Name, Fassung, Lizenz und den Lizenztext, dazu die
// Teile, die in WebAssembly eingebettet sind und keine eigene Paketangabe haben (jq mit decNumber, Oniguruma, SQLite).
// Gesammelt wird lieber zu viel als zu wenig: der ganze Produktionsbaum, nicht nur, was im Bündel landet.

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

const LIZENZDATEI = /^(licen[cs]e|copying|notice)(\.(md|txt))?$/i;

interface Paket {
  readonly name: string;
  readonly fassung: string;
  readonly lizenz: string;
  readonly text: string;
}

function paketLesen(ordner: string): Paket | null {
  const datei = join(ordner, "package.json");
  if (!existsSync(datei)) return null;
  const p = JSON.parse(readFileSync(datei, "utf8")) as { name: string; version?: string; license?: string | { type: string } };
  const lizenz = typeof p.license === "string" ? p.license : (p.license?.type ?? "siehe Lizenztext");
  const texte = readdirSync(ordner).filter((f) => LIZENZDATEI.test(f)).map((f) => readFileSync(join(ordner, f), "utf8").trim());
  return { name: p.name, fassung: p.version ?? "", lizenz, text: texte.join("\n\n") || "(kein Lizenztext im Paket)" };
}

/** Eingebettete Teile ohne eigenes Paket: Dateien in diesem Ordner, Kopfzeile je Datei */
const EINGEBETTET: readonly { readonly titel: string; readonly datei: string }[] = [
  { titel: "jq (in jq-wasm eingebettet), mit decNumber und Teilen von Lucent", datei: "jq-COPYING.txt" },
  { titel: "Oniguruma (in jq-wasm eingebettet, reguläre Ausdrücke)", datei: "oniguruma-COPYING.txt" },
  { titel: "SQLite (in sql.js eingebettet)", datei: "sqlite-HINWEIS.txt" },
];

export function lizenzenSammeln(projekt: string): string {
  const strich = "=".repeat(78);
  const eigene = readFileSync(join(projekt, "..", "LICENSE"), "utf8").trim();
  const ordner = execSync("npm ls --omit=dev --all --parseable", { cwd: projekt, encoding: "utf8" })
    .split("\n")
    .filter((z) => z.includes("node_modules"));
  const pakete = [...new Map(ordner.map((o) => paketLesen(o)).filter((p) => p !== null).map((p) => [`${p.name}@${p.fassung}`, p])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const teile = [
    `Strukturblick: Lizenzen\n\nStrukturblick selbst steht unter der folgenden Lizenz. Danach folgen die Lizenzen aller mitgelieferten Bausteine\nanderer Urheber, deren Hinweise mit jeder Kopie weitergegeben werden.\n\n${strich}\nStrukturblick\n${strich}\n\n${eigene}`,
    ...pakete.map((p) => `${strich}\n${p.name} ${p.fassung} (${p.lizenz})\n${strich}\n\n${p.text}`),
    ...EINGEBETTET.map((e) => `${strich}\n${e.titel}\n${strich}\n\n${readFileSync(join(projekt, "lizenzen", e.datei), "utf8").trim()}`),
  ];
  return teile.join("\n\n\n") + "\n";
}

/** Vite-Baustein: legt lizenzen.txt beim Bau neben die Startseite und liefert sie beim Entwickeln unter derselben Adresse */
export function lizenzenPlugin(projekt: string): Plugin {
  return {
    name: "lizenzen-sammeln",
    configureServer(server) {
      server.middlewares.use("/lizenzen.txt", (_anfrage, antwort) => {
        antwort.setHeader("Content-Type", "text/plain; charset=utf-8");
        antwort.end(lizenzenSammeln(projekt));
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "lizenzen.txt", source: lizenzenSammeln(projekt) });
    },
  };
}
