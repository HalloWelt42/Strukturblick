// Schlüssel jeder Ebene alphabetisch ordnen, für die Formate in FORMATIERBAR. Gerechnet wird über dem Strukturindex:
// Die Einträge eines Objekts tauschen ihre Plätze, der Text zwischen den Plätzen (Kommas, Einrückung, Kommentare) bleibt
// an seiner Stelle. Werte bleiben Rohtext. Ohne Rekursion (eigener Stapel), damit tiefe Texte nicht abstürzen.

import { istBehaelter, KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import type { Umbau } from "./formatieren";

const ANF = 34; // "

interface Rahmen {
  readonly k: number;
  readonly kinder: readonly number[];    // in Textreihenfolge: die Plätze
  readonly folge: readonly number[];     // wer auf welchem Platz steht
  platz: number;
}

function kinderVon(index: Strukturindex, k: number): number[] {
  const kinder: number[] = [];
  for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) kinder.push(c);
  return kinder;
}

/** Anfang eines Eintrags im Text: Schlüssel samt Anführungszeichen, bei Listeneinträgen der Wert. */
function anfang(index: Strukturindex, text: string, c: number): number {
  const s = index.schluesselVon[c];
  if (s === KEIN || s >= index.von[c]) return index.von[c];
  return s > 0 && text.charCodeAt(s - 1) === ANF ? s - 1 : s;
}

/** Text mit sortierten Schlüsseln; unverändert, wenn schon alles sortiert ist. */
export function schluesselSortieren(text: string, index: Strukturindex): Umbau {
  if (index.anzahl === 0) return { ok: false, fehler: "Das Dokument ist leer" };
  const ordnung = new Intl.Collator("de", { numeric: true });
  const teile: string[] = [text.slice(0, index.von[0])];
  const stapel: Rahmen[] = [];

  const betreten = (k: number): void => {
    const kinder = kinderVon(index, k);
    if (kinder.length === 0) {
      teile.push(text.slice(index.von[k], index.bis[k]));
      return;
    }
    const folge = index.art[k] === KnotenArt.objekt
      ? [...kinder].sort((a, b) => ordnung.compare(schluessel(index, text, a) ?? "", schluessel(index, text, b) ?? ""))
      : kinder;
    teile.push(text.slice(index.von[k], anfang(index, text, kinder[0])));
    stapel.push({ k, kinder, folge, platz: 0 });
  };

  betreten(0);
  while (stapel.length > 0) {
    const r = stapel[stapel.length - 1];
    if (r.platz === r.kinder.length) {
      teile.push(text.slice(index.bis[r.kinder[r.kinder.length - 1]], index.bis[r.k]));
      stapel.pop();
      continue;
    }
    if (r.platz > 0) teile.push(text.slice(index.bis[r.kinder[r.platz - 1]], anfang(index, text, r.kinder[r.platz])));
    const m = r.folge[r.platz++];
    teile.push(text.slice(anfang(index, text, m), index.von[m]));
    if (istBehaelter(index.art[m])) betreten(m);
    else teile.push(text.slice(index.von[m], index.bis[m]));
  }
  teile.push(text.slice(index.bis[0]));
  return { ok: true, text: teile.join("") };
}
