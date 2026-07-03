// Node-ausführbarer Selbsttest der Tabellen-Logik (kein vitest im Projekt).
// Bewusst ausserhalb von src/, damit svelte-check diese Datei nicht prüft.
//
// Ausführen (aus dem Ordner frontend/): node tests/run-selbsttest.mjs
// Das Helferskript baut die betroffenen Quellen mit dem Projekt-tsc nach JS
// und führt danach diese Prüfungen aus. Grund: Der Import-Baum berührt
// api/http.ts mit TypeScript-Parameter-Eigenschaften, die der reine
// Typ-Streifer von Node nicht versteht - der echte Compiler schon.
//
// Deckt ab: Round-Trip wurzel<->zeilen, Duplikat-Zeilen/-Spalten (Treffer und
// korrekte Nicht-Treffer) sowie die client-seitigen Serialisierungspfade
// json/ndjson (ohne Backend) und den xlsx-Fehlerpfad.

import { strict as assert } from 'node:assert'

import {
  zeilenAusWurzel,
  wurzelAusZeilen,
  type TabellenZeile,
} from '../src/lib/dienste/tabellenZeilen'
import {
  findeDoppelteZeilen,
  findeDoppelteSpalten,
} from '../src/lib/dienste/tabellenDuplikate'
import { zeilenAlsText, SerialisierungsFehler } from '../src/lib/dienste/tabellenSerialisierung'

// Node-Laufzeit ohne @types/node: schlanke Sicht auf process.exitCode.
const laufzeit = globalThis as unknown as { process: { exitCode?: number } }

let bestanden = 0
function pruefe(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      bestanden += 1
      console.log(`ok  - ${name}`)
    })
    .catch((fehler) => {
      console.error(`FAIL - ${name}`)
      console.error(fehler)
      laufzeit.process.exitCode = 1
    })
}

async function main(): Promise<void> {
  // ----- tabellenZeilen: Round-Trip ---------------------------------------
  await pruefe('zeilenAusWurzel bildet flache Zeilen mit fehlenden Zellen als undefined', () => {
    const wurzel = [
      { a: 1, b: 'x' },
      { a: 2 },
      { b: 'y', c: true },
    ]
    const spalten = ['a', 'b', 'c']
    const zeilen = zeilenAusWurzel(wurzel, spalten)
    assert.deepEqual(zeilen[0], { a: 1, b: 'x', c: undefined })
    assert.deepEqual(zeilen[1], { a: 2, b: undefined, c: undefined })
    assert.deepEqual(zeilen[2], { a: undefined, b: 'y', c: true })
  })

  await pruefe('wurzelAusZeilen lässt undefined-Zellen weg, behält null', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, b: undefined as never, c: null },
    ]
    const wurzel = wurzelAusZeilen(zeilen, ['a', 'b', 'c'])
    assert.deepEqual(wurzel, [{ a: 1, c: null }])
  })

  await pruefe('Round-Trip wurzel -> zeilen -> wurzel bleibt strukturgleich', () => {
    const wurzel = [
      { name: 'Anna', alter: 30, tags: ['a', 'b'] },
      { name: 'Bert', alter: 25 },
    ]
    const spalten = ['name', 'alter', 'tags']
    const zurueck = wurzelAusZeilen(zeilenAusWurzel(wurzel, spalten), spalten)
    assert.deepEqual(zurueck, [
      { name: 'Anna', alter: 30, tags: ['a', 'b'] },
      { name: 'Bert', alter: 25 },
    ])
  })

  await pruefe('zeilenAusWurzel bei Nicht-Liste ergibt leere Zeilenliste', () => {
    assert.deepEqual(zeilenAusWurzel({ a: 1 }, ['a']), [])
    assert.deepEqual(zeilenAusWurzel(null, ['a']), [])
  })

  await pruefe('wurzelAusZeilen respektiert die Spaltenreihenfolge', () => {
    const zeilen: TabellenZeile[] = [{ a: 1, b: 2 }]
    const wurzel = wurzelAusZeilen(zeilen, ['b', 'a']) as Record<string, unknown>[]
    assert.deepEqual(Object.keys(wurzel[0]), ['b', 'a'])
  })

  // ----- tabellenDuplikate: Zeilen ----------------------------------------
  await pruefe('findeDoppelteZeilen findet Gruppen und ignoriert Einzelzeilen', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
      { a: 1, b: 'x' },
      { a: 3, b: 'z' },
      { a: 1, b: 'x' },
    ]
    const gruppen = findeDoppelteZeilen(zeilen, ['a', 'b'])
    assert.equal(gruppen.length, 1)
    assert.deepEqual(gruppen[0].indizes, [0, 2, 4])
  })

  await pruefe('findeDoppelteZeilen: keine Fehltreffer bei durchweg verschiedenen Daten', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1 },
      { a: 2 },
      { a: 3 },
    ]
    assert.deepEqual(findeDoppelteZeilen(zeilen, ['a']), [])
  })

  await pruefe('findeDoppelteZeilen: nur betrachtete Spalten zählen', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, b: 'x' },
      { a: 1, b: 'y' },
    ]
    // Über nur Spalte a sind beide gleich, über a+b nicht.
    assert.deepEqual(findeDoppelteZeilen(zeilen, ['a']), [{ indizes: [0, 1] }])
    assert.deepEqual(findeDoppelteZeilen(zeilen, ['a', 'b']), [])
  })

  await pruefe('findeDoppelteZeilen unterscheidet fehlende Zelle von null', () => {
    const zeilen: TabellenZeile[] = [
      { a: null },
      {}, // a fehlt
    ]
    assert.deepEqual(findeDoppelteZeilen(zeilen, ['a']), [])
  })

  // ----- tabellenDuplikate: Spalten ---------------------------------------
  await pruefe('findeDoppelteSpalten findet identische Spalte und zeigt auf Vorlage', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, b: 9, kopie: 1 },
      { a: 2, b: 8, kopie: 2 },
    ]
    const doppel = findeDoppelteSpalten(zeilen, ['a', 'b', 'kopie'])
    assert.deepEqual(doppel, [{ spalte: 'kopie', gleichWie: 'a' }])
  })

  await pruefe('findeDoppelteSpalten: keine Fehltreffer bei unterschiedlichen Spalten', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]
    assert.deepEqual(findeDoppelteSpalten(zeilen, ['a', 'b']), [])
  })

  await pruefe('findeDoppelteSpalten: mehrere Kopien zeigen alle auf dieselbe Vorlage', () => {
    const zeilen: TabellenZeile[] = [
      { a: 1, k1: 1, k2: 1 },
      { a: 2, k1: 2, k2: 2 },
    ]
    const doppel = findeDoppelteSpalten(zeilen, ['a', 'k1', 'k2'])
    assert.deepEqual(doppel, [
      { spalte: 'k1', gleichWie: 'a' },
      { spalte: 'k2', gleichWie: 'a' },
    ])
  })

  // ----- tabellenSerialisierung: client-seitige Pfade ---------------------
  await pruefe('zeilenAlsText json liefert eingerücktes JSON', async () => {
    const zeilen: TabellenZeile[] = [{ a: 1, b: 'x' }]
    const text = await zeilenAlsText(zeilen, ['a', 'b'], 'json')
    assert.equal(text, JSON.stringify([{ a: 1, b: 'x' }], null, 2))
  })

  await pruefe('zeilenAlsText ndjson: je Datensatz eine kompakte JSON-Zeile', async () => {
    const zeilen: TabellenZeile[] = [
      { a: 1 },
      { a: 2, b: 'y' },
    ]
    const text = await zeilenAlsText(zeilen, ['a', 'b'], 'ndjson')
    assert.equal(text, '{"a":1}\n{"a":2,"b":"y"}')
  })

  await pruefe('zeilenAlsText xlsx wirft SerialisierungsFehler', async () => {
    await assert.rejects(
      () => zeilenAlsText([{ a: 1 }], ['a'], 'xlsx'),
      SerialisierungsFehler,
    )
  })
}

main().then(() => {
  console.log(`\n${bestanden} Prüfungen bestanden.`)
})
