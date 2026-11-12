// Markdown-Tabellen als Strukturindex: Eine Tabelle ist eine Liste von Objekten (Kopfzeile gibt die Namen, wie bei CSV).
// Steht nur eine Tabelle im Text, ist sie die Wurzel; bei mehreren ist die Wurzel ein Objekt, die Tabellen heißen nach
// ihrer Überschrift (sonst "Tabelle n"). Text um die Tabellen herum bleibt unberührt. Alle Werte sind Text.

import { IndexBauer, KEIN, KnotenArt } from "../../kern/strukturindex";
import type { Diagnose, Leseergebnis } from "../vertrag";
import { tabellenFinden, zellen, type Tabellenfund } from "./zeilen";

type Schluessel = { von: number; bis: number; dekodiert?: string };

/** Mehr Warnungen zur Zellenzahl werden nicht gesammelt */
const WARNUNGEN = 20;

/** Schlüssel der Kopfzellen; leere und doppelte bekommen einen eigenen Namen */
function kopfschluessel(t: string, f: Tabellenfund): Schluessel[] {
  const vergeben = new Map<string, number>();
  return zellen(t, f.kopf).map((z, i) => {
    const roh = z.dekodiert ?? t.slice(z.inhaltVon, z.inhaltBis);
    const name = roh || `Spalte ${i + 1}`;
    const n = (vergeben.get(name) ?? 0) + 1;
    vergeben.set(name, n);
    const endgueltig = n === 1 ? name : `${name} ${n}`;
    return { von: z.inhaltVon, bis: z.inhaltBis, dekodiert: endgueltig === t.slice(z.inhaltVon, z.inhaltBis) ? undefined : endgueltig };
  });
}

function tabelleBauen(bauer: IndexBauer, t: string, f: Tabellenfund, eltern: number, schluessel: Schluessel | undefined, diagnosen: Diagnose[]): void {
  const kopf = kopfschluessel(t, f);
  const letzte = f.zeilen.length ? f.zeilen[f.zeilen.length - 1] : f.trenner;
  const liste = bauer.knoten(KnotenArt.liste, eltern, f.kopf.von, schluessel);
  for (const z of f.zeilen) {
    const objekt = bauer.knoten(KnotenArt.objekt, liste, z.von);
    const c = zellen(t, z);
    c.forEach((zelle, i) => {
      const s: Schluessel = kopf[i] ?? { von: zelle.von, bis: zelle.von, dekodiert: `Spalte ${i + 1}` };
      bauer.blatt(KnotenArt.text, objekt, zelle.von, zelle.bis, s, { von: zelle.inhaltVon, bis: zelle.inhaltBis, dekodiert: zelle.dekodiert });
    });
    bauer.schliessen(objekt, z.bis);
    if (c.length !== kopf.length && diagnosen.length < WARNUNGEN) diagnosen.push({ schwere: "warnung", meldung: `Die Zeile hat ${c.length} ${c.length === 1 ? "Zelle" : "Zellen"}, die Kopfzeile ${kopf.length}`, von: z.von, bis: z.bis });
  }
  bauer.schliessen(liste, letzte.bis);
}

export function lesenMarkdown(t: string): Leseergebnis {
  const funde = tabellenFinden(t);
  const diagnosen: Diagnose[] = [];
  if (!funde.length) return { index: null, diagnosen: [{ schwere: "fehler", meldung: "Keine Tabelle gefunden (Kopfzeile, darunter eine Trennzeile wie |---|---|)", von: 0, bis: Math.min(t.length, 1) }], merkmale: { tabellen: 0 } };
  const bauer = new IndexBauer();
  if (funde.length === 1) {
    tabelleBauen(bauer, t, funde[0], KEIN, undefined, diagnosen);
  } else {
    const wurzel = bauer.knoten(KnotenArt.objekt, KEIN, 0);
    const vergeben = new Map<string, number>();
    funde.forEach((f, i) => {
      const roh = f.titel ? t.slice(f.titel.von, f.titel.bis) : `Tabelle ${i + 1}`;
      const n = (vergeben.get(roh) ?? 0) + 1;
      vergeben.set(roh, n);
      const name = n === 1 ? roh : `${roh} ${n}`;
      const s: Schluessel = f.titel ? { von: f.titel.von, bis: f.titel.bis, dekodiert: name === roh ? undefined : name } : { von: f.kopf.von, bis: f.kopf.von, dekodiert: name };
      tabelleBauen(bauer, t, f, wurzel, s, diagnosen);
    });
    bauer.schliessen(wurzel, t.length);
  }
  return { index: bauer.fertig(), diagnosen, merkmale: { tabellen: funde.length } };
}
