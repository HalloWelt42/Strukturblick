// Textänderungen anwenden und umkehren. Eine Änderungsmenge besteht aus Ersetzungen [von, bis) -> einfuegen, die sich
// auf denselben Ausgangstext beziehen und sich nicht überlappen. Die Umkehrung bezieht sich auf den neuen Text.

import type { TextAenderung } from "./format";

export type { TextAenderung };

export class Aenderungsfehler extends Error {}

/** Sortiert und prüft auf Überlappung; gibt eine neue Liste zurück. */
export function ordnen(aenderungen: readonly TextAenderung[], laenge: number): TextAenderung[] {
  const sortiert = [...aenderungen].sort((a, b) => a.von - b.von || a.bis - b.bis);
  let ende = 0;
  for (const a of sortiert) {
    if (a.von < 0 || a.bis < a.von || a.bis > laenge) throw new Aenderungsfehler(`Änderung ${a.von} bis ${a.bis} liegt außerhalb des Textes (${laenge})`);
    if (a.von < ende) throw new Aenderungsfehler(`Änderungen überlappen bei ${a.von}`);
    ende = a.bis;
  }
  return sortiert;
}

export interface Angewendet {
  readonly text: string;
  readonly aenderungen: readonly TextAenderung[];   // geordnet, bezogen auf den alten Text
  readonly umkehrung: readonly TextAenderung[];     // bezogen auf den neuen Text
}

export function anwenden(text: string, aenderungen: readonly TextAenderung[]): Angewendet {
  const geordnet = ordnen(aenderungen, text.length);
  const teile: string[] = [];
  const umkehrung: TextAenderung[] = [];
  let pos = 0;
  let versatz = 0;
  for (const a of geordnet) {
    teile.push(text.slice(pos, a.von), a.einfuegen);
    const neuVon = a.von + versatz;
    umkehrung.push({ von: neuVon, bis: neuVon + a.einfuegen.length, einfuegen: text.slice(a.von, a.bis) });
    versatz += a.einfuegen.length - (a.bis - a.von);
    pos = a.bis;
  }
  teile.push(text.slice(pos));
  return { text: teile.join(""), aenderungen: geordnet, umkehrung };
}

/** Bildet eine Position im alten Text auf den neuen Text ab (nach einer Einfügung an der Stelle: dahinter). */
export function abbilden(position: number, aenderungen: readonly TextAenderung[]): number {
  let versatz = 0;
  for (const a of aenderungen) {
    if (a.von >= position && !(a.von === position && a.bis === position)) break;
    if (position < a.bis) return a.von + versatz + a.einfuegen.length;
    versatz += a.einfuegen.length - (a.bis - a.von);
  }
  return position + versatz;
}
