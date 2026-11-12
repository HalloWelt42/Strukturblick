// Themen des Lexikons (STB-50, Muster der Hilfe aus früheren Projekten): eine Markdown-Datei je Thema unter ./themen/
// mit Kopf (Frontmatter):
//   ---
//   titel: JSON Pointer und jq-Pfade
//   unterzeile: Zwei Schreibweisen für den Weg zu einem Wert
//   bereich: Pfade und Abfragen
//   symbol: fa-route
//   stichworte: pfad, zeiger, rfc 6901
//   reihenfolge: 10
//   quellen: RFC 6901 (https://www.rfc-editor.org/rfc/rfc6901)
//   ---
// Vite liest die Dateien beim Bauen ein; der Rumpf wird mit marked zu HTML und durch DOMPurify geführt. Überschriften
// zweiter und dritter Ebene bekommen Anker (Tiefenlinks thema#abschnitt). Die Dateien sind eigene, mitgelieferte Inhalte,
// kein Nutzertext; nur deshalb darf das Fenster sie als HTML zeigen.

import { marked } from "marked";
import DOMPurify from "dompurify";
import { ankerAus } from "./anker";

export interface Thema {
  readonly anker: string;
  readonly titel: string;
  readonly unterzeile: string;
  readonly bereich: string;
  readonly symbol: string;
  readonly stichworte: readonly string[];
  readonly reihenfolge: number;
  /** Grundlage und Quellen als HTML (Markdown im Kopf, Links erlaubt); leer, wenn keine */
  readonly quellen: string;
  readonly html: string;
  /** Abschnitte mit Anker für das Inhaltsverzeichnis des Themas */
  readonly abschnitte: readonly { readonly anker: string; readonly titel: string }[];
}

/** Reihenfolge der Bereiche in der Themenliste */
export const BEREICHE = ["Anfang", "Arbeitsplatz", "Pfade und Abfragen", "Formate", "Prüfen", "Ansichten", "Werkzeuge", "Begriffe"] as const;

const KOPF = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function kopfLesen(quelle: string): { meta: Record<string, string>; rumpf: string } {
  const t = KOPF.exec(quelle);
  if (!t) return { meta: {}, rumpf: quelle };
  const meta: Record<string, string> = {};
  for (const zeile of t[1].split(/\r?\n/)) {
    const i = zeile.indexOf(":");
    if (i > 0) meta[zeile.slice(0, i).trim()] = zeile.slice(i + 1).trim();
  }
  return { meta, rumpf: t[2] };
}

function rendern(markdown: string): { html: string; abschnitte: { anker: string; titel: string }[] } {
  const roh = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
  const sauber = DOMPurify.sanitize(roh, { ADD_ATTR: ["target", "rel"] });
  const abschnitte: { anker: string; titel: string }[] = [];
  const vergeben = new Set<string>();
  const html = sauber.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_t, ebene: string, innen: string) => {
    let anker = ankerAus(innen) || "abschnitt";
    for (let n = 2; vergeben.has(anker); n++) anker = `${ankerAus(innen)}-${n}`;
    vergeben.add(anker);
    if (ebene === "2") abschnitte.push({ anker, titel: innen.replace(/<[^>]+>/g, "") });
    return `<h${ebene} id="lx-${anker}">${innen}</h${ebene}>`;
  });
  return { html, abschnitte };
}

const rohdateien = import.meta.glob("./themen/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const themen = new Map<string, Thema>();
for (const [pfad, quelle] of Object.entries(rohdateien)) {
  const anker = pfad.replace(/^.*\//, "").replace(/\.md$/, "");
  const { meta, rumpf } = kopfLesen(quelle);
  const { html, abschnitte } = rendern(rumpf);
  themen.set(anker, {
    anker,
    titel: meta.titel ?? anker,
    unterzeile: meta.unterzeile ?? "",
    bereich: meta.bereich ?? "Anfang",
    symbol: meta.symbol ?? "fa-circle-info",
    stichworte: (meta.stichworte ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    reihenfolge: Number(meta.reihenfolge) || 999,
    quellen: meta.quellen ? DOMPurify.sanitize(marked.parseInline(meta.quellen, { async: false }) as string, { ADD_ATTR: ["target", "rel"] }) : "",
    html,
    abschnitte,
  });
}

const sortiert: readonly Thema[] = [...themen.values()].sort((a, b) => {
  const ba = BEREICHE.indexOf(a.bereich as (typeof BEREICHE)[number]);
  const bb = BEREICHE.indexOf(b.bereich as (typeof BEREICHE)[number]);
  return (ba < 0 ? 99 : ba) - (bb < 0 ? 99 : bb) || a.reihenfolge - b.reihenfolge || a.titel.localeCompare(b.titel, "de");
});

export const thema = (anker: string): Thema | null => themen.get(anker) ?? null;
export const alleThemen = (): readonly Thema[] => sortiert;

// Für die Suche: je Thema die Texte seiner Textknoten aus einem einmal gebauten, losgelösten DOM. So zählt die Suche
// genau die Vorkommen, die das Fenster später hervorhebt.
const knotenSpeicher = new Map<string, string[]>();

function textknoten(anker: string): string[] {
  const vorhanden = knotenSpeicher.get(anker);
  if (vorhanden) return vorhanden;
  const t = themen.get(anker);
  if (!t || typeof document === "undefined") return [];
  const el = document.createElement("div");
  el.innerHTML = t.html;
  const laeufer = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const texte: string[] = [];
  while (laeufer.nextNode()) texte.push(laeufer.currentNode.nodeValue ?? "");
  knotenSpeicher.set(anker, texte);
  return texte;
}

/** Zahl der Vorkommen eines Begriffs im Text eines Themas (knotenweise, wie die Hervorhebung) */
export function trefferZahl(anker: string, begriff: string): number {
  const nadel = begriff.trim().toLowerCase();
  if (!nadel) return 0;
  let n = 0;
  for (const text of textknoten(anker)) {
    const klein = text.toLowerCase();
    for (let i = klein.indexOf(nadel); i !== -1; i = klein.indexOf(nadel, i + nadel.length)) n++;
  }
  return n;
}
