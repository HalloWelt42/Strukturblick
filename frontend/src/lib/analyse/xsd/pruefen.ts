// XML gegen XML Schema prüfen mit libxml2 (WebAssembly, erst beim ersten Prüfen geladen). Importe und Includes löst ein
// eigener Dateigeber auf: zuerst nach vollem Pfad (Schema-Paket als ZIP), sonst nach Dateinamen (Ordner der Ablage).
// Externe Entities und Netz gibt es nicht; libxml2 sieht nur die übergebenen Dateien. Ergebnis wie bei JSON Schema:
// Befunde mit Stelle im Index, deutscher Meldung, Soll und Ist.

import { KEIN, knotenAn, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { knotenZu } from "../../kern/pfade";
import type { Befund, Pruefung } from "../validieren";
import { dateiname, Dateisuche, normal, type Schemadatei } from "./dateien";
import { deuten, schemaGrund } from "./meldungen";

export type { Schemadatei } from "./dateien";

export type XsdPruefung = Pruefung & { readonly fehlend?: readonly string[] };

type Bibliothek = typeof import("libxml2-wasm");
let bibliothek: Promise<Bibliothek> | null = null;

/** Die Dateien der laufenden Prüfung; der Dateigeber ist einmal angemeldet und liest von hier */
const aktuell = { dateien: new Dateisuche<Uint8Array>(), angefragt: [] as string[], fehlend: new Set<string>() };
const offen = new Map<number, { daten: Uint8Array; pos: number }>();
let naechsteDatei = 1;

const finden = (anfrage: string): Uint8Array | undefined => aktuell.dateien.finden(anfrage);

async function laden(): Promise<Bibliothek> {
  bibliothek ??= import("libxml2-wasm").then((b) => {
    b.xmlRegisterInputProvider({
      match: (f) => {
        aktuell.angefragt.push(f);
        if (finden(f)) return true;
        if (/\.xsd$/i.test(f)) aktuell.fehlend.add(dateiname(f));
        return false;
      },
      open: (f) => {
        const daten = finden(f);
        if (!daten) return undefined;
        const id = naechsteDatei++;
        offen.set(id, { daten, pos: 0 });
        return id;
      },
      read: (fd, puffer) => {
        const o = offen.get(fd);
        if (!o) return -1;
        const n = Math.min(puffer.length, o.daten.length - o.pos);
        puffer.set(o.daten.subarray(o.pos, o.pos + n));
        o.pos += n;
        return n;
      },
      close: (fd) => offen.delete(fd),
    });
    return b;
  });
  return bibliothek;
}

/** Zeilenanfänge des Texts für die Umrechnung Zeile zu Stelle */
function zeilenanfaenge(t: string): number[] {
  const a = [0];
  for (let i = t.indexOf("\n"); i !== -1; i = t.indexOf("\n", i + 1)) a.push(i + 1);
  return a;
}

/** XPath von libxml2 (/a/b[2]/c) als Zeiger in den Index von Strukturblick (Wiederholungen sind Listen) */
function zeigerAusXpath(index: Strukturindex, text: string, xpath: string): { zeiger: string; knoten: number } {
  let zeiger = "";
  let k = 0;
  for (const schritt of xpath.split("/").filter(Boolean)) {
    const m = /^(.*?)(?:\[(\d+)\])?$/.exec(schritt);
    const teil = (m?.[1] ?? schritt).replace(/^\*\[local-name\(\)='([^']*)'.*$/, "$1").replace(/~/g, "~0").replace(/\//g, "~1");
    let weiter = knotenZu(index, text, `${zeiger}/${teil}`);
    if (weiter === KEIN) {
      // Name mit Präfix im Dokument, ohne im XPath: einen Kind-Schlüssel suchen, der so endet
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) {
        const s = text.slice(index.schluesselVon[c], index.schluesselBis[c]);
        if (index.schluesselVon[c] !== KEIN && (s === teil || s.endsWith(`:${teil}`))) { weiter = c; zeiger = `${zeiger}/${s.replace(/~/g, "~0").replace(/\//g, "~1")}`; break; }
      }
      if (weiter === KEIN) return { zeiger, knoten: k };
    } else zeiger = `${zeiger}/${teil}`;
    k = weiter;
    if (m?.[2] && index.art[k] === KnotenArt.liste) {
      const stelle = Number(m[2]) - 1;
      const eintrag = knotenZu(index, text, `${zeiger}/${stelle}`);
      if (eintrag === KEIN) return { zeiger, knoten: k };
      zeiger = `${zeiger}/${stelle}`;
      k = eintrag;
    }
  }
  return { zeiger, knoten: k };
}

export async function xsdPruefen(index: Strukturindex | null, text: string, haupt: Schemadatei, weitere: readonly Schemadatei[]): Promise<XsdPruefung> {
  const start = performance.now();
  const b = await laden();
  const kodieren = (s: string) => new TextEncoder().encode(s);
  aktuell.dateien = new Dateisuche(weitere.map((d) => [d.pfad, kodieren(d.text)] as const));
  aktuell.angefragt = [];
  aktuell.fehlend = new Set();

  let schema: InstanceType<Bibliothek["XmlDocument"]> | null = null;
  let pruefer: InstanceType<Bibliothek["XsdValidator"]> | null = null;
  let dokument: InstanceType<Bibliothek["XmlDocument"]> | null = null;
  try {
    try {
      schema = b.XmlDocument.fromString(haupt.text, { url: `schema/${normal(haupt.pfad)}` });
      pruefer = b.XsdValidator.fromDoc(schema);
    } catch (e) {
      const fehlend = [...aktuell.fehlend];
      const grund = e instanceof b.XmlLibError ? [...new Set(e.details.map((d) => schemaGrund(d.message)))].slice(0, 3).join("; ") : String(e);
      return { ok: false, fehler: fehlend.length ? `Das Schema lässt sich nicht laden: ${fehlend.length === 1 ? "Ein importiertes Schema fehlt" : `${fehlend.length} importierte Schemas fehlen`} (${fehlend.slice(0, 5).join(", ")}). Ablegen im selben Ordner oder als Schema-Paket laden.` : `Das Schema lässt sich nicht laden: ${grund}`, fehlend };
    }
    try {
      dokument = b.XmlDocument.fromString(text);
    } catch {
      return { ok: false, fehler: "Das Dokument ist kein wohlgeformtes XML; erst die Fehler beheben (Fuß, Editor)." };
    }
    let details: { message: string; line: number; col: number; level: number; xpath?: string }[] = [];
    try {
      pruefer.validate(dokument);
    } catch (e) {
      if (!(e instanceof b.XmlLibError)) throw e;
      details = e.details;
    }
    const anfaenge = zeilenanfaenge(text);
    const befunde: Befund[] = details.map((d) => {
      const g = deuten(d.message);
      const ort = index && d.xpath ? zeigerAusXpath(index, text, d.xpath) : null;
      // Ohne XPath: das erste Element auf der gemeldeten Zeile
      const zeilenStart = anfaenge[Math.max(0, d.line - 1)] ?? 0;
      const knoten = ort ? ort.knoten : index ? knotenAn(index, zeilenStart + (/^\s*/.exec(text.slice(zeilenStart, zeilenStart + 200))?.[0].length ?? 0)) : KEIN;
      const pos = knoten !== KEIN && index ? index.von[knoten] : zeilenStart;
      const zeile = anfaenge.filter((a) => a <= pos).length;
      return { art: d.level === 1 ? "warnung" : "fehler", zeiger: ort?.zeiger ?? "", knoten, zeile, spalte: pos - anfaenge[zeile - 1] + 1, meldung: g.meldung, erwartet: g.erwartet, gefunden: g.gefunden, regel: g.regel, imSchema: g.element ? `Element ${g.element}` : "", vorschlag: g.vorschlag };
    });
    befunde.sort((x, y) => x.zeile - y.zeile || x.spalte - y.spalte);
    return { ok: true, befunde, dauer: performance.now() - start };
  } finally {
    dokument?.dispose();
    pruefer?.dispose();
    schema?.dispose();
  }
}

/** Schema, auf das das Dokument selbst verweist (xsi:schemaLocation oder xsi:noNamespaceSchemaLocation), als Dateinamen */
export function verwiesenesSchema(text: string): string | null {
  const kopf = text.slice(0, 8000);
  const ohne = /noNamespaceSchemaLocation\s*=\s*["']([^"']+)["']/.exec(kopf)?.[1];
  if (ohne) return dateiname(ohne.trim());
  const mit = /schemaLocation\s*=\s*["']([^"']+)["']/.exec(kopf)?.[1];
  const paare = mit?.trim().split(/\s+/) ?? [];
  return paare.length >= 2 ? dateiname(paare[1]) : null;
}
