// Themen des Lexikons: Markdown-Dateien mit Frontmatter (title, subtitle,
// category, icon) unter themen/*.md. Vite liest sie roh ein, das Frontmatter
// wird zeilenbasiert geparst und der Rumpf mit marked zu HTML gerendert.
// Eine Datei pro Thema - EINE Quelle.

import { marked } from 'marked'

export interface LexikonThema {
  key: string
  title: string
  subtitle: string
  category: string
  icon: string
  markdown: string
  html: string
}

/** Frontmatter (--- ... ---) vom Markdown-Rumpf trennen. */
function parseFrontmatter(quelle: string): { meta: Record<string, string>; body: string } {
  const treffer = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(quelle)
  if (treffer === null || treffer[1] === undefined || treffer[2] === undefined) {
    return { meta: {}, body: quelle }
  }
  const meta: Record<string, string> = {}
  for (const zeile of treffer[1].split(/\r?\n/)) {
    const doppelpunkt = zeile.indexOf(':')
    if (doppelpunkt <= 0) continue
    const schluessel = zeile.slice(0, doppelpunkt).trim()
    const wert = zeile
      .slice(doppelpunkt + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (schluessel !== '') meta[schluessel] = wert
  }
  return { meta, body: treffer[2] }
}

const rohDateien = import.meta.glob<string>('./themen/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Feste Reihenfolge der Themen; nicht gelistete folgen alphabetisch. */
const REIHENFOLGE: string[] = [
  'json',
  'json5-jsonc',
  'ndjson',
  'yaml',
  'anker-alias',
  'toml',
  'xml',
  'attribut',
  'namensraum',
  'mixed-content',
  'csv',
  'dialekt',
  'kopfzeile',
  'kodierung',
  'json-pointer',
  'jsonpath',
  'xpath',
  'json-schema',
  'xsd',
  'schema-inferenz',
  'validierung',
  'mustererkennung',
  'uuid',
  'verlustwarnung',
  'round-trip',
]

const themen: Record<string, LexikonThema> = {}

for (const [pfad, quelle] of Object.entries(rohDateien)) {
  const key = pfad.replace(/^.*\//, '').replace(/\.md$/, '')
  const { meta, body } = parseFrontmatter(quelle)
  themen[key] = {
    key,
    title: meta['title'] ?? key,
    subtitle: meta['subtitle'] ?? '',
    category: meta['category'] ?? 'Allgemein',
    icon: meta['icon'] ?? 'fa-circle-info',
    markdown: body.trim(),
    html: marked.parse(body, { async: false, gfm: true }),
  }
}

/** Ein Thema holen (oder null, wenn unbekannt). */
export function holeThema(key: string): LexikonThema | null {
  return themen[key] ?? null
}

/** Alle Themen in fester Reihenfolge, nicht gelistete alphabetisch dahinter. */
export function listeThemen(): LexikonThema[] {
  return Object.values(themen).sort((a, b) => {
    const ia = REIHENFOLGE.indexOf(a.key)
    const ib = REIHENFOLGE.indexOf(b.key)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    return a.title.localeCompare(b.title, 'de')
  })
}
