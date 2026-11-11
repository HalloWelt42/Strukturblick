// Abgleich zwischen Editor und Sitzung: Änderungen in beide Richtungen übersetzen, ohne den ganzen Text zu kopieren.
// Der Editor trennt Zeilen nur an "\n" (siehe ZEILENTRENNER), damit seine Positionen den UTF-16-Stellen im Text der
// Sitzung gleichen, auch bei "\r\n".

import { ChangeSet, type Text } from "@codemirror/state";
import type { TextAenderung } from "../../../kern";

/** Einziger Zeilentrenner im Editor; "\r" bleibt Teil der Zeile wie im Text der Sitzung. */
export const ZEILENTRENNER = "\n";

/** Änderungen einer Editor-Transaktion, bezogen auf den Text davor (geordnet, ohne Überlappung). */
export function aenderungenAus(changes: ChangeSet): TextAenderung[] {
  const liste: TextAenderung[] = [];
  changes.iterChanges((von, bis, _neuVon, _neuBis, eingefuegt) => {
    liste.push({ von, bis, einfuegen: eingefuegt.sliceString(0, eingefuegt.length, ZEILENTRENNER) });
  });
  return liste;
}

/** Änderungen der Sitzung als Änderungsmenge für den Editor; wirft RangeError, wenn sie nicht zum Text passen. */
export function changesAus(aenderungen: readonly TextAenderung[], laenge: number): ChangeSet {
  return ChangeSet.of(aenderungen.map((a) => ({ from: a.von, to: a.bis, insert: a.einfuegen })), laenge, ZEILENTRENNER);
}

/** Vergleicht den Editortext mit dem Text der Sitzung Stück für Stück, ohne eine Kopie des Ganzen anzulegen. */
export function gleich(doc: Text, text: string): boolean {
  if (doc.length !== text.length) return false;
  let pos = 0;
  for (const it = doc.iter(); !it.next().done; ) {
    if (!text.startsWith(it.value, pos)) return false;
    pos += it.value.length;
  }
  return pos === text.length;
}
