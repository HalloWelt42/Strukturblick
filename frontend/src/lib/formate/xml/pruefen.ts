// Prüfungen über dem gelesenen XML-Dokument, die keine Lesestelle brauchen: Namensräume (jedes Präfix muss im
// Gültigkeitsbereich erklärt sein, ein Präfix darf nicht auf leer gesetzt werden) und in XML 1.0 verbotene
// Steuerzeichen. Beides macht ein Dokument nach den XML-Regeln fehlerhaft.

import type { Diagnose } from "../vertrag";
import type { Element } from "./dom";

/** Mehr Diagnosen werden nicht gesammelt */
const DIAGNOSEN = 200;
const VORGEGEBEN = new Set(["xml", "xmlns"]);

function melden(diagnosen: Diagnose[], meldung: string, von: number, bis: number): void {
  if (diagnosen.length < DIAGNOSEN) diagnosen.push({ schwere: "fehler", meldung, von, bis });
}

const praefix = (name: string): string | null => (name.includes(":") ? name.slice(0, name.indexOf(":")) : null);

export function namensraeumePruefen(wurzel: Element, diagnosen: Diagnose[]): void {
  // Stapel ohne Rekursion: Element mit den Präfixen, die bei ihm gelten
  const stapel: { el: Element; bekannt: ReadonlySet<string> }[] = [{ el: wurzel, bekannt: VORGEGEBEN }];
  while (stapel.length) {
    const { el, bekannt: aussen } = stapel.pop()!;
    let bekannt = aussen;
    for (const a of el.attribute) {
      if (!a.name.startsWith("xmlns:")) continue;
      const p = a.name.slice(6);
      if ((a.dekodiert ?? "") === "" && a.bis - a.von <= 2) melden(diagnosen, `Das Präfix ${p} darf nicht auf leer gesetzt werden`, a.nameVon, a.bis);
      if (bekannt === aussen) bekannt = new Set(aussen);
      (bekannt as Set<string>).add(p);
    }
    const ep = praefix(el.name);
    if (ep !== null && !bekannt.has(ep)) melden(diagnosen, `Das Präfix ${ep} ist nicht erklärt`, el.nameVon, el.nameBis);
    for (const a of el.attribute) {
      const ap = praefix(a.name);
      if (ap !== null && !bekannt.has(ap)) melden(diagnosen, `Das Präfix ${ap} ist nicht erklärt`, a.nameVon, a.nameBis);
    }
    for (const k of el.kinder) if (k.art === "element") stapel.push({ el: k, bekannt });
  }
}

/** Steuerzeichen, die XML 1.0 nirgends erlaubt (außer Tabulator, Zeilenvorschub, Wagenrücklauf) */
export function steuerzeichenPruefen(t: string, diagnosen: Diagnose[]): void {
  const verboten = /[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g;
  let n = 0;
  for (const m of t.matchAll(verboten)) {
    melden(diagnosen, `Steuerzeichen U+${m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")} ist in XML nicht erlaubt`, m.index, m.index + 1);
    if (++n >= 5) break;
  }
}
