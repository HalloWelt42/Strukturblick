// Tabellen als Text für Menschen: Markdown und eine HTML-Seite. Beide zeigen die Hauptliste als Tabelle (Listen in den
// Einträgen nach der gewählten Weise) und Felder außerhalb der Liste als zweite Tabelle "Angaben". Zahlen stehen
// rechtsbündig. Es bleibt Text: Typen gehen verloren, null wird eine leere Zelle.

import type { Tabellierung } from "./tabellieren";

export interface Texttabelle {
  readonly titel: string;
  readonly spalten: readonly string[];
  readonly zeilen: readonly (readonly unknown[])[];
}

const alsText = (w: unknown): string => (w === null || w === undefined ? "" : typeof w === "object" ? JSON.stringify(w) : String(w));
const istZahlenspalte = (t: Texttabelle, i: number): boolean => t.zeilen.some((z) => typeof z[i] === "number") && t.zeilen.every((z) => z[i] === null || z[i] === undefined || typeof z[i] === "number");

export function ausTabellierung(titel: string, t: Tabellierung): Texttabelle {
  return { titel, spalten: t.spalten.map((s) => s.name), zeilen: t.zeilen };
}

// ----- Markdown -----

const mdZelle = (s: string): string => s.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");

function mdTabelle(t: Texttabelle): string[] {
  const kopf = t.spalten.map(mdZelle);
  const zeilen = t.zeilen.map((z) => t.spalten.map((_, i) => mdZelle(alsText(z[i]))));
  const breite = kopf.map((k, i) => Math.max(3, k.length, ...zeilen.map((z) => z[i].length)));
  const rechts = t.spalten.map((_, i) => istZahlenspalte(t, i));
  const zeile = (zellen: readonly string[]) => `| ${zellen.map((c, i) => (rechts[i] ? c.padStart(breite[i]) : c.padEnd(breite[i]))).join(" | ")} |`;
  return [zeile(kopf), `|${breite.map((b, i) => (rechts[i] ? `${"-".repeat(b + 1)}:` : "-".repeat(b + 2))).join("|")}|`, ...zeilen.map(zeile)];
}

export function markdownSchreiben(tabellen: readonly Texttabelle[]): string {
  const teile = tabellen.map((t) => [...(tabellen.length > 1 ? [`## ${t.titel}`, ""] : []), ...mdTabelle(t)].join("\n"));
  return teile.join("\n\n") + "\n";
}

// ----- HTML -----

const maskieren = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const STIL = `body { font-family: system-ui, sans-serif; margin: 2rem; color: #1a1a1a; }
h2 { font-size: 1.2rem; margin: 2rem 0 0.5rem; }
table { border-collapse: collapse; font-size: 0.95rem; }
th, td { padding: 0.35rem 0.7rem; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
th { background: #f3f3f3; }
td.zahl, th.zahl { text-align: right; font-variant-numeric: tabular-nums; }`;

export function htmlSchreiben(titel: string, tabellen: readonly Texttabelle[]): string {
  const koerper = tabellen.map((t) => {
    const rechts = t.spalten.map((_, i) => istZahlenspalte(t, i));
    const kl = (i: number) => (rechts[i] ? ' class="zahl"' : "");
    const kopf = `<tr>${t.spalten.map((s, i) => `<th${kl(i)}>${maskieren(s)}</th>`).join("")}</tr>`;
    const zeilen = t.zeilen.map((z) => `    <tr>${t.spalten.map((_, i) => `<td${kl(i)}>${maskieren(alsText(z[i])).replace(/\r?\n/g, "<br>")}</td>`).join("")}</tr>`);
    return `<h2>${maskieren(t.titel)}</h2>\n<table>\n  <thead>${kopf}</thead>\n  <tbody>\n${zeilen.join("\n")}\n  </tbody>\n</table>`;
  });
  return `<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<title>${maskieren(titel)}</title>\n<style>\n${STIL}\n</style>\n</head>\n<body>\n${koerper.join("\n")}\n</body>\n</html>\n`;
}
