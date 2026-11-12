// XML beim Konvertieren, in beide Richtungen.
// Ziel XML: genau ein Wurzelelement (sonst alles unter <daten>), Felder mit @ werden Attribute, #text wird Text, Listen
// werden wiederholte Elemente, null ein leeres Element; Namen, die XML nicht erlaubt, werden angepasst. Die
// Verlustkarte nennt jede dieser Stellen.
// Quelle XML: Attribute sind Felder mit @, und ein Element, das mal einmal, mal mehrmals vorkommt, ist mal einzeln, mal
// Liste; beides sagt die Karte.

import type { Verlustpunkt } from "./konvertieren";
import { istObjekt } from "./tabellieren";

export const WURZEL = "daten";
export const EINTRAG = "eintrag";

const NAME = /^[A-Za-z_][A-Za-z0-9_.-]*(?::[A-Za-z_][A-Za-z0-9_.-]*)?$/;
const anzahl = (n: number): string => n.toLocaleString("de-DE");
const und = (teile: readonly string[]): string => (teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}` : (teile[0] ?? ""));
const maskieren = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const attributMaskieren = (s: string): string => maskieren(s).replaceAll('"', "&quot;");

class Schreiber {
  readonly zeilen: string[] = ['<?xml version="1.0" encoding="UTF-8"?>'];
  readonly umbenannt = new Map<string, string>();
  nullWerte = 0;
  leereListen = 0;
  typen: string[] = [];
  listenInListen = 0;

  name(roh: string): string {
    if (NAME.test(roh)) return roh;
    let n = roh.replace(/[^A-Za-z0-9_.-]/g, "_");
    if (!/^[A-Za-z_]/.test(n)) n = `_${n}`;
    this.umbenannt.set(roh, n);
    return n;
  }

  skalar(w: unknown): string {
    if ((typeof w === "number" || typeof w === "boolean") && this.typen.length < 3 && !this.typen.includes(String(w))) this.typen.push(String(w));
    return maskieren(String(w));
  }

  element(rohName: string, w: unknown, tiefe: number): void {
    const name = this.name(rohName);
    const einzug = "  ".repeat(tiefe);
    if (Array.isArray(w)) {
      if (!w.length) this.leereListen++;
      for (const x of w) {
        if (Array.isArray(x)) {
          this.listenInListen++;
          this.element(rohName, { [EINTRAG]: x.length ? x : [null] }, tiefe);
        } else this.element(rohName, x, tiefe);
      }
      return;
    }
    if (w === null || w === undefined) {
      this.nullWerte++;
      this.zeilen.push(`${einzug}<${name}/>`);
      return;
    }
    if (!istObjekt(w)) {
      this.zeilen.push(`${einzug}<${name}>${this.skalar(w)}</${name}>`);
      return;
    }
    const attribute: string[] = [];
    const kinder: [string, unknown][] = [];
    let text: string | null = null;
    for (const [k, v] of Object.entries(w)) {
      if (k.startsWith("@") && k.length > 1 && !istObjekt(v) && !Array.isArray(v)) attribute.push(` ${this.name(k.slice(1))}="${attributMaskieren(v === null ? "" : String(v))}"`);
      else if (k === "#text" && !istObjekt(v) && !Array.isArray(v)) text = v === null ? "" : this.skalar(v);
      else kinder.push([k, v]);
    }
    const kopf = `${einzug}<${name}${attribute.join("")}`;
    if (!kinder.length) {
      this.zeilen.push(text === null ? `${kopf}/>` : `${kopf}>${text}</${name}>`);
      return;
    }
    this.zeilen.push(`${kopf}>${text ?? ""}`);
    for (const [k, v] of kinder) this.element(k, v, tiefe + 1);
    this.zeilen.push(`${einzug}</${name}>`);
  }
}

export function xmlAus(wert: unknown): { text: string; verluste: Verlustpunkt[] } {
  const s = new Schreiber();
  const verluste: Verlustpunkt[] = [];
  const schluessel = istObjekt(wert) ? Object.keys(wert) : [];
  if (schluessel.length === 1 && !Array.isArray((wert as Record<string, unknown>)[schluessel[0]])) s.element(schluessel[0], (wert as Record<string, unknown>)[schluessel[0]], 0);
  else {
    verluste.push({ satz: "XML braucht genau ein Wurzelelement", text: `Alles steht deshalb unter \`<${WURZEL}>\`${Array.isArray(wert) ? `, jeder Eintrag als \`<${EINTRAG}>\`` : ""}.` });
    s.element(WURZEL, Array.isArray(wert) ? { [EINTRAG]: wert } : wert, 0);
  }
  if (s.typen.length) verluste.push({ satz: "Typen gehen verloren: Zahlen werden Text", text: `In XML ist jeder Wert Text. ${und(s.typen.map((t) => `\`${t}\``))} kommen als Zeichen an; ein Schema kann die Typen wieder festlegen.` });
  if (s.nullWerte) verluste.push({ satz: "null wird ein leeres Element", text: `${anzahl(s.nullWerte)} ${s.nullWerte === 1 ? "Stelle steht" : "Stellen stehen"} als \`<name/>\` da und sehen aus wie ein leerer Text.` });
  if (s.leereListen) verluste.push({ satz: "Leere Listen fallen weg", text: `${anzahl(s.leereListen)} leere ${s.leereListen === 1 ? "Liste hat" : "Listen haben"} kein Element; das Feld fehlt dann ganz.` });
  if (s.listenInListen) verluste.push({ satz: "Listen in Listen", text: `Innere Listen stehen als \`<${EINTRAG}>\` im äußeren Element (${anzahl(s.listenInListen)}-mal).` });
  if (s.umbenannt.size) {
    const beispiele = [...s.umbenannt].slice(0, 3).map(([a, b]) => `\`${a}\` wird \`${b}\``);
    verluste.push({ satz: `${anzahl(s.umbenannt.size)} ${s.umbenannt.size === 1 ? "Name ist" : "Namen sind"} in XML nicht erlaubt`, text: `Sie heißen jetzt anders: ${und(beispiele)}${s.umbenannt.size > 3 ? " und weitere" : ""}.` });
  }
  return { text: s.zeilen.join("\n") + "\n", verluste };
}

/** Was beim Umwandeln aus XML zu wissen ist: Attribute als Felder und Elemente, die mal einzeln, mal Liste sind */
export function xmlQuellVerluste(wert: unknown, zielName: string): Verlustpunkt[] {
  const arten = new Map<string, { liste: number; einzeln: number }>();
  let attribute = 0;
  const stapel: unknown[] = [wert];
  while (stapel.length) {
    const w = stapel.pop();
    if (Array.isArray(w)) { stapel.push(...w); continue; }
    if (!istObjekt(w)) continue;
    for (const [k, v] of Object.entries(w)) {
      if (k.startsWith("@")) attribute++;
      const a = arten.get(k) ?? { liste: 0, einzeln: 0 };
      if (Array.isArray(v)) a.liste++;
      else a.einzeln++;
      arten.set(k, a);
      stapel.push(v);
    }
  }
  const punkte: Verlustpunkt[] = [];
  const gemischt = [...arten].filter(([k, a]) => a.liste && a.einzeln && !k.startsWith("@")).sort((x, y) => y[1].einzeln - x[1].einzeln);
  if (gemischt.length) {
    const [k, a] = gemischt[0];
    punkte.push({ satz: `\`${k}\` ist mal Liste, mal einzeln`, text: `Kommt ein Element nur einmal vor, wird es in ${zielName} keine Liste: \`${k}\` steht ${anzahl(a.einzeln)}-mal einzeln und ${anzahl(a.liste)}-mal als Liste.${gemischt.length > 1 ? ` Ebenso ${und(gemischt.slice(1, 4).map(([n]) => `\`${n}\``))}${gemischt.length > 4 ? " und weitere" : ""}.` : ""}` });
  }
  if (attribute) punkte.push({ satz: "Attribute werden Felder", text: `Attribute stehen als Felder mit @ (etwa \`@nr\`), Text neben ihnen als \`#text\`; Namensräume bleiben Teil der Namen.` });
  return punkte;
}
