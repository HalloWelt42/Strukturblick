// XML in einen schlanken Dokumentbaum mit allen Textstellen lesen: Elemente, Attribute, Textstücke (auch CDATA).
// Kommentare, Verarbeitungsanweisungen und DOCTYPE werden übersprungen. Entities: die fünf vordefinierten und
// Zeichenreferenzen. Ein falsches Ende-Tag schließt bis zum passenden offenen Element; was am Ende offen ist, wird
// gemeldet. Ohne Rekursion (eigener Stapel), damit tiefe Dokumente den Aufrufstapel nicht sprengen.

import type { Diagnose } from "../vertrag";
import { namensraeumePruefen, steuerzeichenPruefen } from "./pruefen";

export interface Attribut {
  readonly name: string;
  readonly nameVon: number;
  readonly nameBis: number;
  /** ganzer Wert samt Anführungszeichen */
  readonly von: number;
  readonly bis: number;
  /** nur wenn er vom Textausschnitt abweicht (Entities) */
  readonly dekodiert?: string;
}

export interface Textstueck {
  readonly art: "text";
  readonly von: number;
  readonly bis: number;
  readonly dekodiert?: string;
  /** Nur Leerraum: zählt zwischen Elementen nicht */
  readonly leer: boolean;
}

export interface Element {
  readonly art: "element";
  readonly name: string;
  readonly nameVon: number;
  readonly nameBis: number;
  readonly von: number;
  bis: number;
  /** Zwischen Start- und Ende-Tag; bei <a/> beide gleich dem Ende */
  readonly inhaltVon: number;
  inhaltBis: number;
  readonly attribute: Attribut[];
  readonly kinder: (Element | Textstueck)[];
  /** <a/> ohne Ende-Tag */
  leer: boolean;
}

export interface Dokument {
  readonly wurzel: Element | null;
  readonly diagnosen: Diagnose[];
}

const NAME = /^[A-Za-z_:À-￿][A-Za-z0-9_:.\-·À-￿]*/;
const ENTITIES: Readonly<Record<string, string>> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };
/** Mehr Diagnosen werden nicht gesammelt */
const DIAGNOSEN = 200;

const REFERENZ = /^&(#x[0-9a-fA-F]+|#\d+|[A-Za-z_][\w.-]*);/;

/**
 * Entities auflösen: die fünf vordefinierten und Zeichenreferenzen. In der DTD erklärte bleiben stehen (Warnung, sie
 * werden absichtlich nicht ausgewertet), unbekannte und ein & ohne Referenz sind Fehler.
 */
export function entitiesAufloesen(roh: string, von: number, diagnosen: Diagnose[], erklaert: ReadonlySet<string> = new Set()): string | undefined {
  if (!roh.includes("&")) return undefined;
  const melden = (schwere: "fehler" | "warnung", meldung: string, a: number, laenge: number) => {
    if (diagnosen.length < DIAGNOSEN) diagnosen.push({ schwere, meldung, von: von + a, bis: von + a + laenge });
  };
  let aus = "";
  let pos = 0;
  for (let a = roh.indexOf("&"); a !== -1; a = roh.indexOf("&", pos)) {
    aus += roh.slice(pos, a);
    const m = REFERENZ.exec(roh.slice(a, a + 64));
    if (!m) {
      melden("fehler", "Ein & muss als &amp; stehen", a, 1);
      aus += "&";
      pos = a + 1;
      continue;
    }
    const name = m[1];
    let ersatz: string | null = null;
    if (name[0] === "#") {
      const cp = name[1] === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      if (cp > 0 && cp <= 0x10ffff) ersatz = String.fromCodePoint(cp);
      else melden("fehler", `Zeichenreferenz ${m[0]} zeigt auf kein Zeichen`, a, m[0].length);
    } else if (ENTITIES[name] !== undefined) ersatz = ENTITIES[name];
    else if (erklaert.has(name)) melden("warnung", `Entity ${m[0]} aus der DTD wird nicht aufgelöst`, a, m[0].length);
    else melden("fehler", `Unbekannte Entity ${m[0]}`, a, m[0].length);
    aus += ersatz ?? m[0];
    pos = a + m[0].length;
  }
  return aus + roh.slice(pos);
}

export function xmlLesen(t: string): Dokument {
  const diagnosen: Diagnose[] = [];
  const melden = (schwere: "fehler" | "warnung", meldung: string, von: number, bis: number) => {
    if (diagnosen.length < DIAGNOSEN) diagnosen.push({ schwere, meldung, von, bis: Math.max(von, bis) });
  };
  const stapel: Element[] = [];
  const erklaert = new Set<string>();
  let wurzel: Element | null = null;
  let i = 0;

  const textAnhaengen = (von: number, bis: number, cdata: boolean) => {
    if (bis <= von) return;
    const roh = t.slice(von, bis);
    const leer = !cdata && roh.trim() === "";
    const oben = stapel[stapel.length - 1];
    if (!oben) {
      if (!leer) melden("fehler", "Text außerhalb des Wurzelelements", von, bis);
      return;
    }
    oben.kinder.push({ art: "text", von, bis, dekodiert: cdata ? undefined : entitiesAufloesen(roh, von, diagnosen, erklaert), leer });
  };

  while (i < t.length) {
    const lt = t.indexOf("<", i);
    if (lt === -1) {
      textAnhaengen(i, t.length, false);
      break;
    }
    textAnhaengen(i, lt, false);
    if (t.startsWith("<!--", lt)) {
      const e = t.indexOf("-->", lt + 4);
      if (e === -1) { melden("fehler", "Kommentar ohne Ende (--> fehlt)", lt, t.length); break; }
      const doppelt = t.indexOf("--", lt + 4);
      if (doppelt < e || (e - 1 >= lt + 4 && t[e - 1] === "-")) melden("fehler", "-- ist in einem Kommentar nicht erlaubt", Math.min(doppelt, e - 1), Math.min(doppelt, e - 1) + 2);
      i = e + 3;
    } else if (t.startsWith("<![CDATA[", lt)) {
      const e = t.indexOf("]]>", lt + 9);
      if (e === -1) { melden("fehler", "CDATA ohne Ende (]]> fehlt)", lt, t.length); break; }
      textAnhaengen(lt + 9, e, true);
      i = e + 3;
    } else if (t.startsWith("<?", lt)) {
      const e = t.indexOf("?>", lt + 2);
      if (e === -1) { melden("fehler", "Verarbeitungsanweisung ohne Ende (?> fehlt)", lt, t.length); break; }
      if (/^<\?xml\s/i.test(t.slice(lt, lt + 6)) && t.slice(0, lt).replace(/^\ufeff/, "") !== "") melden("fehler", "Die XML-Deklaration muss ganz am Anfang stehen", lt, e + 2);
      i = e + 2;
    } else if (t.startsWith("<!", lt)) {
      // DOCTYPE, auch mit innerem Teil in eckigen Klammern
      let tiefe = 0;
      let j = lt + 2;
      for (; j < t.length; j++) {
        if (t[j] === "[") tiefe++;
        else if (t[j] === "]") tiefe--;
        else if (t[j] === ">" && tiefe <= 0) break;
      }
      for (const m of t.slice(lt, j).matchAll(/<!ENTITY\s+(?:%\s+)?([^\s>]+)/g)) erklaert.add(m[1]);
      i = j + 1;
    } else if (t[lt + 1] === "/") {
      const m = NAME.exec(t.slice(lt + 2, lt + 2 + 512));
      const name = m?.[0] ?? "";
      const e = t.indexOf(">", lt);
      const ende = e === -1 ? t.length : e + 1;
      const k = stapel.map((x) => x.name).lastIndexOf(name);
      if (k === -1) melden("fehler", `Ende-Tag </${name}> ohne passendes Start-Tag`, lt, ende);
      else {
        for (let j = stapel.length - 1; j > k; j--) {
          melden("fehler", `<${stapel[j].name}> ist nicht geschlossen`, stapel[j].von, stapel[j].nameBis);
          stapel[j].inhaltBis = stapel[j].bis = lt;
        }
        const el = stapel[k];
        el.inhaltBis = lt;
        el.bis = ende;
        stapel.length = k;
      }
      i = ende;
    } else {
      const m = NAME.exec(t.slice(lt + 1, lt + 1 + 512));
      if (!m) {
        melden("fehler", "Nach < fehlt ein Name", lt, lt + 1);
        textAnhaengen(lt, lt + 1, false);
        i = lt + 1;
        continue;
      }
      const name = m[0];
      const attribute: Attribut[] = [];
      let j = lt + 1 + name.length;
      let leer = false;
      for (;;) {
        while (j < t.length && /\s/.test(t[j])) j++;
        if (t[j] === ">") { j++; break; }
        if (t.startsWith("/>", j)) { j += 2; leer = true; break; }
        const a = NAME.exec(t.slice(j, j + 512));
        if (!a) {
          const e = t.indexOf(">", j);
          melden("fehler", j >= t.length ? `<${name}> endet nicht` : `Unerwartetes Zeichen ${t[j]} im Tag <${name}>`, j, j + 1);
          j = e === -1 ? t.length : e + 1;
          leer = t[e - 1] === "/";
          break;
        }
        const nameVon = j;
        j += a[0].length;
        while (/\s/.test(t[j] ?? "")) j++;
        if (t[j] !== "=") { melden("fehler", `Attribut ${a[0]} ohne Wert`, nameVon, j); continue; }
        j++;
        while (/\s/.test(t[j] ?? "")) j++;
        const q = t[j];
        if (q !== '"' && q !== "'") {
          melden("fehler", `Wert von ${a[0]} ohne Anführungszeichen`, j, j + 1);
          while (j < t.length && !/[\s>]/.test(t[j]) && !t.startsWith("/>", j)) j++;
          continue;
        }
        const e = t.indexOf(q, j + 1);
        if (e === -1) { melden("fehler", `Wert von ${a[0]} ohne Ende`, j, t.length); j = t.length; break; }
        if (attribute.some((x) => x.name === a[0])) melden("fehler", `Doppeltes Attribut ${a[0]}`, nameVon, nameVon + a[0].length);
        const lt2 = t.indexOf("<", j + 1);
        if (lt2 !== -1 && lt2 < e) melden("fehler", `< ist im Wert von ${a[0]} nicht erlaubt`, lt2, lt2 + 1);
        attribute.push({ name: a[0], nameVon, nameBis: nameVon + a[0].length, von: j, bis: e + 1, dekodiert: entitiesAufloesen(t.slice(j + 1, e), j + 1, diagnosen, erklaert) });
        j = e + 1;
      }
      const el: Element = { art: "element", name, nameVon: lt + 1, nameBis: lt + 1 + name.length, von: lt, bis: j, inhaltVon: j, inhaltBis: j, attribute, kinder: [], leer };
      const oben = stapel[stapel.length - 1];
      if (oben) oben.kinder.push(el);
      else if (wurzel) melden("fehler", "Nach dem Wurzelelement folgt ein weiteres", lt, j);
      else wurzel = el;
      if (!leer && (oben || wurzel === el)) stapel.push(el);
      i = j;
    }
  }
  for (const el of stapel.reverse()) {
    melden("fehler", `<${el.name}> ist nicht geschlossen`, el.von, el.nameBis);
    el.inhaltBis = el.bis = t.length;
  }
  if (!wurzel) melden("fehler", "Kein Wurzelelement gefunden", 0, Math.min(t.length, 1));
  else namensraeumePruefen(wurzel, diagnosen);
  steuerzeichenPruefen(t, diagnosen);
  return { wurzel, diagnosen };
}
