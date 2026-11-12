// XML als Strukturindex, nach festen Regeln (die Lesart von Strukturblick):
// - Die Wurzel ist ein Objekt mit einem Feld: dem Wurzelelement.
// - Ein Element mit Attributen oder Kind-Elementen wird ein Objekt; Attribute heißen "@name", Text darin "#text".
// - Ein Element nur mit Text (oder leer) wird Text; Inhalt ist der Text zwischen den Tags, Entities aufgelöst.
// - Gleichnamige Geschwister werden eine Liste unter ihrem Namen (in der Reihenfolge des ersten Auftretens).
// XML kennt keine Typen; alle Werte sind Text.

import { IndexBauer, KEIN, KnotenArt } from "../../kern/strukturindex";
import type { Leseergebnis } from "../vertrag";
import { xmlLesen, type Element, type Textstueck } from "./dom";

export const ATTRIBUT = "@";
export const TEXT = "#text";

type Schluessel = { von: number; bis: number; dekodiert?: string };

/** Text eines Elements ohne Kind-Elemente: Inhalt zwischen den Tags, dekodiert, wenn er vom Ausschnitt abweicht */
function textInhalt(t: string, el: Element): { von: number; bis: number; dekodiert?: string } {
  const stuecke = el.kinder.filter((k): k is Textstueck => k.art === "text");
  const roh = t.slice(el.inhaltVon, el.inhaltBis);
  const gelesen = stuecke.map((s) => s.dekodiert ?? t.slice(s.von, s.bis)).join("");
  return { von: el.inhaltVon, bis: el.inhaltBis, dekodiert: gelesen === roh ? undefined : gelesen };
}

function bauen(bauer: IndexBauer, t: string, el: Element, eltern: number, schluessel: Schluessel | undefined): void {
  const kinder = el.kinder.filter((k) => k.art === "element" || !k.leer);
  if (!el.attribute.length && !kinder.some((k) => k.art === "element")) {
    bauer.blatt(KnotenArt.text, eltern, el.von, el.bis, schluessel, textInhalt(t, el));
    return;
  }
  const k = bauer.knoten(KnotenArt.objekt, eltern, el.von, schluessel);
  for (const a of el.attribute) {
    bauer.blatt(KnotenArt.text, k, a.von, a.bis, { von: a.nameVon, bis: a.nameBis, dekodiert: ATTRIBUT + a.name }, { von: a.von + 1, bis: a.bis - 1, dekodiert: a.dekodiert });
  }
  // Gruppen gleichen Namens in der Reihenfolge des ersten Auftretens; Text zählt als Gruppe "#text"
  const gruppen = new Map<string, (Element | Textstueck)[]>();
  for (const c of kinder) {
    const name = c.art === "element" ? c.name : TEXT;
    const g = gruppen.get(name);
    if (g) g.push(c);
    else gruppen.set(name, [c]);
  }
  for (const g of gruppen.values()) {
    const einzeln = (c: Element | Textstueck, e: number, s: Schluessel | undefined) => {
      if (c.art === "element") bauen(bauer, t, c, e, s);
      else bauer.blatt(KnotenArt.text, e, c.von, c.bis, s, { von: c.von, bis: c.bis, dekodiert: c.dekodiert });
    };
    const erster = g[0];
    const s: Schluessel = erster.art === "element" ? { von: erster.nameVon, bis: erster.nameBis } : { von: erster.von, bis: erster.von, dekodiert: TEXT };
    if (g.length === 1) {
      einzeln(erster, k, s);
      continue;
    }
    const liste = bauer.knoten(KnotenArt.liste, k, erster.von, s);
    for (const c of g) einzeln(c, liste, undefined);
    bauer.schliessen(liste, g[g.length - 1].bis);
  }
  bauer.schliessen(k, el.bis);
}

export function lesenXml(t: string): Leseergebnis {
  const { wurzel, diagnosen } = xmlLesen(t);
  const merkmale = { kommentare: t.includes("<!--"), wurzel: wurzel?.name ?? "" };
  if (!wurzel) return { index: null, diagnosen, merkmale };
  const bauer = new IndexBauer();
  const k = bauer.knoten(KnotenArt.objekt, KEIN, 0);
  bauen(bauer, t, wurzel, k, { von: wurzel.nameVon, bis: wurzel.nameBis });
  bauer.schliessen(k, t.length);
  return { index: bauer.fertig(), diagnosen, merkmale };
}
