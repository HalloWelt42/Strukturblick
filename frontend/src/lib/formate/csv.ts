// CSV: Tabellen als Text. Der Baum ist eine Liste mit einem Objekt je Datensatz; jede Zelle ist ein Text, dessen
// Schlüssel auf die Zelle der Kopfzeile zeigt. Zellen bleiben immer Texte (Leitgedanke 6). Der Dialekt (Trennzeichen,
// Kopfzeile, Zeilenende) wird erkannt oder per Leseoption gewählt und beim Schreiben einer Zelle beibehalten.

import { IndexBauer, KEIN, KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { Formatfehler, type Diagnose, type Format, type Leseergebnis, type Leseoptionen, type Merkmale, type NeuerWert, type TextAenderung } from "./vertrag";
import { dialektProben, siehtNachKopfzeileAus, trennzeichenAusOption, type Zeilenende } from "./csv/dialekt";
import { Zerleger } from "./csv/zerleger";
import { zeilenweise } from "./entfernen";

/** Höchstzahl der Einzelwarnungen zu abweichender Zellenzahl; danach folgt eine Sammelmeldung. */
const MAX_ZELLENZAHL_WARNUNGEN = 20;

const LF = 10;
const CR = 13;

const anzeigeTrennzeichen = (t: string): string => (t === "\t" ? "Tabulator" : `"${t}"`);

function lesen(text: string, optionen: Leseoptionen = {}): Leseergebnis {
  const diagnosen: Diagnose[] = [];
  const start = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  const probe = dialektProben(text, start);

  const wahl = trennzeichenAusOption(optionen.trennzeichen);
  if (wahl.ungueltig) {
    diagnosen.push({ schwere: "warnung", meldung: "Das gewählte Trennzeichen ist ungültig; es wird selbst erkannt.", von: 0, bis: 0 });
  }
  const trennzeichen = wahl.trennzeichen ?? probe.trennzeichen ?? ",";
  const zeilenende: Zeilenende = probe.zeilenende ?? "lf";
  const zerleger = new Zerleger(text, trennzeichen.charCodeAt(0));

  const bauer = new IndexBauer();
  const wurzel = bauer.knoten(KnotenArt.liste, KEIN, 0);
  const n = text.length;
  let p = start;
  let zeile = 1;

  /** Springt über leere Zeilen; gibt false am Textende zurück. */
  const naechsterDatensatz = (): boolean => {
    for (;;) {
      if (p >= n) return false;
      const c = text.charCodeAt(p);
      if (c === CR) {
        p += p + 1 < n && text.charCodeAt(p + 1) === LF ? 2 : 1;
        zeile++;
      } else if (c === LF) {
        p++;
        zeile++;
      } else return true;
    }
  };

  /** Liest den Datensatz an `p`, meldet Fehler darin und rückt vor; gibt die Zeilennummer seines Anfangs zurück. */
  const datensatzLesen = (): number => {
    const anfang = zeile;
    zerleger.lesen(p);
    if (zerleger.offenesAnfuehrungszeichen >= 0) {
      const von = zerleger.offenesAnfuehrungszeichen;
      diagnosen.push({ schwere: "fehler", meldung: `Zeile ${anfang}: Das Anführungszeichen wird nicht geschlossen; die Zelle gilt bis zum Trennzeichen als Text.`, von, bis: zellEnde(zerleger, von) });
    }
    if (zerleger.restVon >= 0) {
      diagnosen.push({ schwere: "warnung", meldung: `Zeile ${anfang}: Nach dem schließenden Anführungszeichen folgen noch Zeichen.`, von: zerleger.restVon, bis: zerleger.restBis });
    }
    p = zerleger.weiter;
    zeile += zerleger.umbrueche;
    return anfang;
  };

  // Erster Datensatz: Kopfzeile oder schon Daten.
  let kopf: { von: number; bis: number; dekodiert?: string }[] = [];
  let kopfzeile = false;
  let ersterIstDaten = false;
  let ersteZeile = 1;
  let spalten = 0;
  if (naechsterDatensatz()) {
    ersteZeile = datensatzLesen();
    const zellen = Array.from({ length: zerleger.anzahl }, (_, i) => zerleger.inhalt(i));
    kopfzeile = typeof optionen.kopfzeile === "boolean" ? optionen.kopfzeile : siehtNachKopfzeileAus(zellen);
    spalten = zerleger.anzahl;
    if (kopfzeile) {
      kopf = kopfAus(zerleger, zellen, diagnosen);
    } else {
      ersterIstDaten = true;
    }
  }

  // Wiederverwendete Hüllen für Schlüssel und Inhalt: der Bauer liest die Felder sofort aus.
  const schluessel: { von: number; bis: number; dekodiert?: string } = { von: 0, bis: 0 };
  const inhalt: { von: number; bis: number; dekodiert?: string } = { von: 0, bis: 0 };
  const ersatznamen: string[] = [];
  let zeilen = 0;
  let abweichend = 0;
  let sammelVon = 0;
  let sammelBis = 0;

  const datensatzBauen = (nummer: number): void => {
    const z = zerleger;
    const objekt = bauer.knoten(KnotenArt.objekt, wurzel, z.von[0]);
    for (let i = 0; i < z.anzahl; i++) {
      let s: { von: number; bis: number; dekodiert?: string } | undefined = kopf[i];
      if (s === undefined) {
        // Ohne Kopfzeile (oder jenseits ihrer Spalten) heißt die Spalte "Spalte n"; der Schlüssel liegt auf der Zelle.
        schluessel.von = z.von[i];
        schluessel.bis = z.bis[i];
        schluessel.dekodiert = ersatznamen[i] ??= `Spalte ${i + 1}`;
        s = schluessel;
      }
      inhalt.von = z.inhaltVon[i];
      inhalt.bis = z.inhaltBis[i];
      inhalt.dekodiert = z.dekodiert[i];
      bauer.blatt(KnotenArt.text, objekt, z.von[i], z.bis[i], s, inhalt);
    }
    bauer.schliessen(objekt, z.ende);
    zeilen++;
    if (z.anzahl !== spalten) {
      abweichend++;
      if (abweichend <= MAX_ZELLENZAHL_WARNUNGEN) {
        const meldung = `Zeile ${nummer} hat ${z.anzahl} ${z.anzahl === 1 ? "Zelle" : "Zellen"}, erwartet sind ${spalten}.`;
        diagnosen.push({ schwere: "warnung", meldung, von: z.von[0], bis: z.ende });
      } else if (abweichend === MAX_ZELLENZAHL_WARNUNGEN + 1) {
        sammelVon = z.von[0];
        sammelBis = z.ende;
      }
    }
  };

  if (ersterIstDaten) datensatzBauen(ersteZeile);
  while (naechsterDatensatz()) datensatzBauen(datensatzLesen());
  bauer.schliessen(wurzel, n);

  if (abweichend > MAX_ZELLENZAHL_WARNUNGEN) {
    const rest = abweichend - MAX_ZELLENZAHL_WARNUNGEN;
    diagnosen.push({ schwere: "warnung", meldung: `${rest} weitere ${rest === 1 ? "Zeile weicht" : "Zeilen weichen"} in der Zahl der Zellen ab.`, von: sammelVon, bis: sammelBis });
  }

  const merkmale: Merkmale = { trennzeichen, kopfzeile, zeilenende, zeilen, spalten };
  return { index: bauer.fertig(), diagnosen, merkmale };
}

/** Ende der Zelle, die bei `von` beginnt (für die Spanne einer Diagnose). */
function zellEnde(z: Zerleger, von: number): number {
  for (let i = 0; i < z.anzahl; i++) if (z.von[i] === von) return Math.max(z.bis[i], von + 1);
  return von + 1;
}

/** Schlüssel aus der Kopfzeile: Spanne der Kopfzelle, dekodiert, wenn sie Anführungszeichen hatte. */
function kopfAus(z: Zerleger, namen: readonly string[], diagnosen: Diagnose[]): { von: number; bis: number; dekodiert?: string }[] {
  const gesehen = new Set<string>();
  const kopf: { von: number; bis: number; dekodiert?: string }[] = [];
  for (let i = 0; i < z.anzahl; i++) {
    const name = namen[i];
    kopf.push(z.istGequotet(i) ? { von: z.von[i], bis: z.bis[i], dekodiert: name } : { von: z.von[i], bis: z.bis[i] });
    if (gesehen.has(name)) {
      diagnosen.push({ schwere: "warnung", meldung: `Der Spaltenname "${name}" kommt mehrfach vor; Zeiger erreichen nur die erste dieser Spalten.`, von: z.von[i], bis: Math.max(z.bis[i], z.von[i] + 1) });
    }
    gesehen.add(name);
  }
  return kopf;
}

// ----- Erkennen -----------------------------------------------------------------------------------------------------

const YAML_ZEILE = /^\s*(-\s|---|[\w"'][^,;\t|]*:\s)/;

function erkennen(text: string, dateiname?: string): number {
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (i < text.length && /\s/.test(text[i])) i++;
  const probe = dialektProben(text, i);
  let wert = probe.trennzeichen === null ? 0 : probe.zeilen >= 2 ? 0.9 * probe.anteil * probe.anteil : 0.2;
  // YAML mit Kommas in den Werten soll nicht als CSV gelten.
  const erste = text.slice(i, i + 4096).split(/\r\n|\r|\n/, 20).filter((z) => z.trim() !== "");
  if (erste.length > 0 && erste.filter((z) => YAML_ZEILE.test(z)).length * 2 > erste.length) wert = Math.min(wert, 0.3);
  if (dateiname?.toLowerCase().endsWith(".txt")) wert = Math.min(wert, 0.6);
  const c = text[i];
  if (c === "{" || c === "[") wert = Math.min(wert, 0.1);
  return wert;
}

// ----- Schreiben ----------------------------------------------------------------------------------------------------

function alsText(neu: NeuerWert): string {
  switch (neu.art) {
    case "text":
      return neu.wert;
    case "zahl":
      return neu.roh;
    case "wahrheitswert":
      return neu.wert ? "true" : "false";
    case "nichts":
      return "";
  }
}

function wertSchreiben(text: string, index: Strukturindex, k: number, neu: NeuerWert, merkmale: Merkmale): TextAenderung {
  const eltern = k > 0 && k < index.anzahl ? index.eltern[k] : KEIN;
  if (eltern === KEIN || index.art[k] !== KnotenArt.text || index.art[eltern] !== KnotenArt.objekt) {
    throw new Formatfehler("In CSV lassen sich nur einzelne Zellen ändern.");
  }
  const wahl = trennzeichenAusOption(typeof merkmale.trennzeichen === "string" ? merkmale.trennzeichen : undefined);
  const trennzeichen = wahl.trennzeichen ?? ",";
  const wert = alsText(neu);
  const warGequotet = index.inhaltVon[k] !== index.von[k];
  // Eine leere einzige Zelle ergäbe eine leere Zeile, und die zählt nicht als Datensatz.
  const alleinLeer = wert === "" && index.kinder[eltern] === 1;
  const braucht = warGequotet || alleinLeer || wert.includes(trennzeichen) || wert.includes('"') || wert.includes("\n") || wert.includes("\r");
  const einfuegen = braucht ? `"${wert.replaceAll('"', '""')}"` : wert;
  return { von: index.von[k], bis: index.bis[k], einfuegen };
}

export const CSV_FORMAT: Format = {
  kennung: "csv",
  name: "CSV",
  endungen: ["csv", "tsv", "txt"],
  sprache: "text",
  faehigkeiten: { kommentare: false, tabellarisch: true, typen: false },
  leseoptionen: [
    {
      kennung: "trennzeichen",
      name: "Trennzeichen",
      werte: [
        { wert: ",", name: "Komma" },
        { wert: ";", name: "Semikolon" },
        { wert: "\t", name: "Tab" },
        { wert: "|", name: "Senkrechter Strich" },
      ],
    },
    { kennung: "kopfzeile", name: "Erste Zeile", werte: [{ wert: true, name: "Kopfzeile" }, { wert: false, name: "Daten" }] },
  ],
  erkennen,
  lesen,
  eintraegeEntfernen: (text, index, liste, stellen) => zeilenweise(text, index, liste, stellen),
  wertSchreiben,
};
