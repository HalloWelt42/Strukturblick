// Erzeuger für Testdaten (entwuerfe/testdaten.html): je Feld einer, mit beschriebenen Einstellungen (Art, Vorgabe,
// Erklärung), damit Spezifikation, Tafel und Inspektor aus derselben Quelle entstehen. Ein Erzeuger liefert einen Wert
// aus Zufall und Kontext; Person und Wohnort gelten je Datensatz, damit Name, E-Mail, Postleitzahl, Ort und Vorwahl
// zusammenpassen. Objekt und Liste tragen nur Aufbau, ihre Werte setzt die Spezifikation zusammen.

import type { Zufall } from "./zufall";
import { DOMAINS, MOBILVORWAHLEN, NACHNAMEN, STRASSEN, VORNAMEN, WOERTER } from "./daten";

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

export interface Gewichtet {
  readonly wert: string;
  readonly gewicht: number;
}
export type Einstellwert = string | number | boolean | readonly Gewichtet[];
export type Einstellungen = Readonly<Record<string, Einstellwert>>;

export type Einstellart =
  | { readonly art: "zahl"; readonly min?: number; readonly max?: number; readonly ganz?: boolean }
  | { readonly art: "text" }
  | { readonly art: "datum" }
  | { readonly art: "wahl"; readonly werte: readonly { readonly wert: string; readonly titel: string }[] }
  | { readonly art: "werte" };

export interface Einstellung {
  readonly schluessel: string;
  readonly titel: string;
  readonly erklaerung: string;
  readonly art: Einstellart;
  readonly vorgabe: Einstellwert;
}

export interface Person {
  readonly vorname: string;
  readonly nachname: string;
}
export interface Wohnort {
  readonly ort: string;
  readonly plz: string;
  readonly vorwahl: string;
}

export interface Kontext {
  readonly zufall: Zufall;
  /** Der wievielte Wert dieses Felds (ab 0), für laufende Nummern */
  readonly folge: number;
  /** Person und Wohnort des Datensatzes (beim ersten Abruf gezogen) */
  person(): Person;
  wohnort(): Wohnort;
}

export interface Erzeuger {
  readonly kennung: string;
  readonly titel: string;
  readonly beschreibung: string;
  /** "wert": liefert selbst; "objekt" und "liste": Aufbau, Inhalt aus den Feldern darunter */
  readonly art: "wert" | "objekt" | "liste";
  readonly einstellungen: readonly Einstellung[];
  /** Kurzform der Einstellungen für die Tafel ("Muster K-#####", "ab 20001") */
  marken(e: Einstellungen): string[];
  erzeugen(e: Einstellungen, k: Kontext): Json;
}

// ----- Einstellungen lesen ------------------------------------------------------------------------------------------

const zahlVon = (e: Einstellungen, s: string): number => (typeof e[s] === "number" ? (e[s] as number) : Number(e[s]) || 0);
const textVon = (e: Einstellungen, s: string): string => String(e[s] ?? "");
const jaVon = (e: Einstellungen, s: string): boolean => e[s] === true;
const werteVon = (e: Einstellungen, s: string): readonly Gewichtet[] => (Array.isArray(e[s]) ? (e[s] as readonly Gewichtet[]) : []);

const wahl = (schluessel: string, titel: string, erklaerung: string, werte: [string, string][], vorgabe?: string): Einstellung => ({
  schluessel, titel, erklaerung, art: { art: "wahl", werte: werte.map(([wert, t]) => ({ wert, titel: t })) }, vorgabe: vorgabe ?? werte[0][0],
});
const zahl = (schluessel: string, titel: string, erklaerung: string, vorgabe: number, art: Partial<{ min: number; max: number; ganz: boolean }> = {}): Einstellung => ({
  schluessel, titel, erklaerung, art: { art: "zahl", ...art }, vorgabe,
});
const text = (schluessel: string, titel: string, erklaerung: string, vorgabe: string): Einstellung => ({ schluessel, titel, erklaerung, art: { art: "text" }, vorgabe });
const datum = (schluessel: string, titel: string, erklaerung: string, vorgabe: string): Einstellung => ({ schluessel, titel, erklaerung, art: { art: "datum" }, vorgabe });
const titelVon = (erz: Einstellung, wert: Einstellwert): string => (erz.art.art === "wahl" ? (erz.art.werte.find((w) => w.wert === wert)?.titel ?? String(wert)) : String(wert));

// ----- Schreibweisen ------------------------------------------------------------------------------------------------

/** Zahl mit fester Zahl Nachkommastellen deutsch: Tausenderpunkt, Komma */
export function deutsch(x: number, stellen: number): string {
  const [ganz, nach] = Math.abs(x).toFixed(stellen).split(".");
  const gruppen = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${x < 0 ? "-" : ""}${gruppen}${nach ? `,${nach}` : ""}`;
}

const TAG_MS = 86_400_000;
const isoTag = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const tagMs = (iso: string): number => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Date.UTC(2020, 0, 1);
};

/** Für E-Mail-Adressen: Umlaute ausgeschrieben, nur a-z */
const adressteil = (s: string): string =>
  s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/ı/g, "i").normalize("NFKD").replace(/[^a-z]/g, "");

const ziffern = (z: Zufall, n: number, ersteNichtNull = true): string => {
  let s = "";
  for (let i = 0; i < n; i++) s += String(i === 0 && ersteNichtNull ? z.ganz(1, 9) : z.ganz(0, 9));
  return s;
};

// ----- Die Erzeuger -------------------------------------------------------------------------------------------------

const NUMMER: Erzeuger = {
  kennung: "nummer",
  titel: "Laufende Nummer mit Muster",
  beschreibung: "Zählt hoch und setzt die Zahl in ein Muster: # steht für eine Ziffer, mehr # füllen mit Nullen auf. Immer eindeutig.",
  art: "wert",
  einstellungen: [
    text("muster", "Muster", "# steht für eine Ziffer (K-##### wird K-00001); nur # und Als Zahl ergibt eine Zahl", "#"),
    zahl("start", "ab", "Erste Nummer", 1, { ganz: true }),
    zahl("schritt", "Schritt", "Abstand zwischen zwei Nummern", 1, { ganz: true, min: 1 }),
    wahl("als", "Als", "Zahl nur, wenn das Muster nur aus # besteht", [["text", "Text"], ["zahl", "Zahl"]]),
  ],
  marken: (e) => [`Muster ${textVon(e, "muster")}`, `ab ${zahlVon(e, "start")}`, ...(zahlVon(e, "schritt") !== 1 ? [`Schritt ${zahlVon(e, "schritt")}`] : []), "eindeutig"],
  erzeugen(e, k) {
    const n = zahlVon(e, "start") + zahlVon(e, "schritt") * k.folge;
    const muster = textVon(e, "muster") || "#";
    if (textVon(e, "als") === "zahl" && /^#+$/.test(muster)) return n;
    return muster.replace(/#+/, (m) => String(n).padStart(m.length, "0"));
  },
};

const NAME: Erzeuger = {
  kennung: "name",
  titel: "Name",
  beschreibung: "Häufige Vor- und Nachnamen; je Datensatz eine Person, E-Mail-Adressen passen dazu.",
  art: "wert",
  einstellungen: [wahl("teil", "Teil", "Was im Feld steht", [["voll", "Vor- und Nachname"], ["vorname", "Vorname"], ["nachname", "Nachname"]])],
  marken: (e) => [titelVon(NAME.einstellungen[0], e.teil ?? "voll")],
  erzeugen(e, k) {
    const p = k.person();
    const teil = textVon(e, "teil");
    return teil === "vorname" ? p.vorname : teil === "nachname" ? p.nachname : `${p.vorname} ${p.nachname}`;
  },
};

const PLZ: Erzeuger = {
  kennung: "plz",
  titel: "Postleitzahl",
  beschreibung: "Fünf Ziffern als Text, damit die führende Null bleibt; passt zu Ort und Vorwahl im selben Datensatz.",
  art: "wert",
  einstellungen: [
    zahl("von", "Gebiet von", "Erste zwei Ziffern, ab denen Orte gewählt werden (01 bis 99)", 1, { min: 1, max: 99, ganz: true }),
    zahl("bis", "Gebiet bis", "Erste zwei Ziffern, bis zu denen Orte gewählt werden", 99, { min: 1, max: 99, ganz: true }),
  ],
  marken: (e) => [`Gebiet ${String(zahlVon(e, "von")).padStart(2, "0")} bis ${String(zahlVon(e, "bis")).padStart(2, "0")}`, "führende Null bleibt"],
  erzeugen: (_e, k) => k.wohnort().plz,
};

const ORT: Erzeuger = {
  kennung: "ort",
  titel: "Ort zur Postleitzahl",
  beschreibung: "Der Ort des Datensatzes; passt zu Postleitzahl und Vorwahl.",
  art: "wert",
  einstellungen: [],
  marken: () => ["passt zur Postleitzahl"],
  erzeugen: (_e, k) => k.wohnort().ort,
};

const STRASSE: Erzeuger = {
  kennung: "strasse",
  titel: "Straße",
  beschreibung: "Gebräuchliche Straßennamen, wahlweise mit Hausnummer.",
  art: "wert",
  einstellungen: [wahl("hausnummer", "Hausnummer", "Hausnummer anhängen", [["ja", "mit"], ["nein", "ohne"]])],
  marken: (e) => [textVon(e, "hausnummer") === "nein" ? "ohne Hausnummer" : "mit Hausnummer"],
  erzeugen(e, k) {
    const s = k.zufall.wahl(STRASSEN);
    if (textVon(e, "hausnummer") === "nein") return s;
    return `${s} ${k.zufall.ganz(1, 120)}${k.zufall.ja(0.1) ? k.zufall.wahl(["a", "b", "c"]) : ""}`;
  },
};

const EMAIL: Erzeuger = {
  kennung: "email",
  titel: "E-Mail",
  beschreibung: "Aus dem Namen der Person (lena.hartmann@...); Domains mit der Endung .example gehören niemandem.",
  art: "wert",
  einstellungen: [
    text("domain", "Domain", "Teil nach dem @; leer: verschiedene Domains mit der Endung .example", DOMAINS[0]),
    wahl("eindeutig", "Eindeutig", "Jede Adresse bekommt ihre laufende Zahl angehängt (lena.hartmann1@...), damit keine doppelt vorkommt", [["nein", "nein"], ["ja", "ja"]]),
  ],
  marken: (e) => [`Domain ${textVon(e, "domain") || "gemischt"}`, ...(textVon(e, "eindeutig") === "ja" ? ["eindeutig"] : [])],
  erzeugen(e, k) {
    const p = k.person();
    const domain = textVon(e, "domain") || k.zufall.wahl(DOMAINS);
    const zahlTeil = textVon(e, "eindeutig") === "ja" ? String(k.folge + 1) : "";
    return `${adressteil(p.vorname)}.${adressteil(p.nachname)}${zahlTeil}@${domain}`;
  },
};

const TELEFON: Erzeuger = {
  kennung: "telefon",
  titel: "Telefonnummer",
  beschreibung: "Festnetz mit der Vorwahl des Orts oder Mobilnummer.",
  art: "wert",
  einstellungen: [
    wahl("netz", "Netz", "Festnetz nimmt die Vorwahl des Orts", [["festnetz", "Festnetz"], ["mobil", "Mobil"]]),
    wahl("schreibweise", "Schreibweise", "Wie die Nummer geschrieben wird", [["leerzeichen", "0341 5583214"], ["strich", "0341/5583214"], ["international", "+49 341 5583214"]]),
  ],
  marken: (e) => [textVon(e, "netz") === "mobil" ? "Mobil" : "Festnetz", titelVon(TELEFON.einstellungen[1], e.schreibweise ?? "leerzeichen")],
  erzeugen(e, k) {
    const vorwahl = textVon(e, "netz") === "mobil" ? k.zufall.wahl(MOBILVORWAHLEN) : k.wohnort().vorwahl;
    const nummer = ziffern(k.zufall, textVon(e, "netz") === "mobil" ? 7 : k.zufall.ganz(6, 7));
    const s = textVon(e, "schreibweise");
    if (s === "strich") return `${vorwahl}/${nummer}`;
    if (s === "international") return `+49 ${vorwahl.slice(1)} ${nummer}`;
    return `${vorwahl} ${nummer}`;
  },
};

const DATUM: Erzeuger = {
  kennung: "datum",
  titel: "Datum",
  beschreibung: "Ein Tag zwischen zwei Daten, gleich verteilt.",
  art: "wert",
  einstellungen: [
    datum("von", "von", "Frühester Tag (JJJJ-MM-TT)", "2020-01-01"),
    datum("bis", "bis", "Spätester Tag (JJJJ-MM-TT)", "2026-12-31"),
    wahl("schreibweise", "Schreibweise", "ISO wie JSON Schema date, oder deutsch", [["iso", "2024-03-01"], ["deutsch", "01.03.2024"]]),
  ],
  marken: (e) => [`von ${textVon(e, "von")}`, `bis ${textVon(e, "bis")}`, `Schreibweise ${titelVon(DATUM.einstellungen[2], e.schreibweise ?? "iso")}`],
  erzeugen(e, k) {
    const a = tagMs(textVon(e, "von"));
    const b = tagMs(textVon(e, "bis"));
    const iso = isoTag(a + k.zufall.ganz(0, Math.max(0, Math.round((b - a) / TAG_MS))) * TAG_MS);
    return textVon(e, "schreibweise") === "deutsch" ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso;
  },
};

const ZEITPUNKT: Erzeuger = {
  kennung: "zeitpunkt",
  titel: "Zeitpunkt",
  beschreibung: "Datum mit Uhrzeit in ISO-Form (wie JSON Schema date-time), in UTC.",
  art: "wert",
  einstellungen: [datum("von", "von", "Frühester Tag", "2020-01-01"), datum("bis", "bis", "Spätester Tag", "2026-12-31")],
  marken: (e) => [`von ${textVon(e, "von")}`, `bis ${textVon(e, "bis")}`, "UTC"],
  erzeugen(e, k) {
    const a = tagMs(textVon(e, "von"));
    const b = tagMs(textVon(e, "bis")) + TAG_MS - 1000;
    return new Date(a + Math.floor(k.zufall.zahl() * Math.max(1, (b - a) / 1000)) * 1000).toISOString().replace(".000Z", "Z");
  },
};

const ZAHL: Erzeuger = {
  kennung: "zahl",
  titel: "Zahl oder Betrag",
  beschreibung: "Gleich verteilt zwischen zwei Grenzen, mit fester Zahl Nachkommastellen.",
  art: "wert",
  einstellungen: [
    zahl("von", "von", "Kleinster Wert", 0),
    zahl("bis", "bis", "Größter Wert", 100),
    zahl("stellen", "Nachkommastellen", "0 für ganze Zahlen", 0, { min: 0, max: 6, ganz: true }),
    wahl("schreibweise", "Schreibweise", "Zahl im Format oder als Text", [["zahl", "Zahl"], ["text", "Text 1087.15"], ["deutsch", "Text 1.087,15"]]),
  ],
  marken(e) {
    const s = zahlVon(e, "stellen");
    const d = textVon(e, "schreibweise") === "deutsch";
    const zeigen = (x: number) => (d ? deutsch(x, s) : x.toFixed(s));
    return [`${zeigen(zahlVon(e, "von"))} bis ${zeigen(zahlVon(e, "bis"))}`, ...(d ? ["Tausenderpunkt"] : textVon(e, "schreibweise") === "text" ? ["als Text"] : [])];
  },
  erzeugen(e, k) {
    const s = zahlVon(e, "stellen");
    const f = 10 ** s;
    const a = Math.ceil(Math.min(zahlVon(e, "von"), zahlVon(e, "bis")) * f);
    const b = Math.floor(Math.max(zahlVon(e, "von"), zahlVon(e, "bis")) * f);
    const x = k.zufall.ganz(a, Math.max(a, b)) / f;
    const w = textVon(e, "schreibweise");
    return w === "deutsch" ? deutsch(x, s) : w === "text" ? x.toFixed(s) : x;
  },
};

const WAHRHEIT: Erzeuger = {
  kennung: "wahrheit",
  titel: "Ja oder nein",
  beschreibung: "Wahrheitswert mit einem Anteil für Ja.",
  art: "wert",
  einstellungen: [
    zahl("anteil", "Anteil ja (%)", "Wie oft Ja herauskommt", 50, { min: 0, max: 100 }),
    wahl("schreibweise", "Schreibweise", "Wahrheitswert oder Text", [["wahrheit", "true/false"], ["text", "\"true\"/\"false\""], ["ja-nein", "ja/nein"]]),
  ],
  marken: (e) => [`${zahlVon(e, "anteil")} % ja`, titelVon(WAHRHEIT.einstellungen[1], e.schreibweise ?? "wahrheit")],
  erzeugen(e, k) {
    const j = k.zufall.ja(zahlVon(e, "anteil") / 100);
    const s = textVon(e, "schreibweise");
    return s === "ja-nein" ? (j ? "ja" : "nein") : s === "text" ? String(j) : j;
  },
};

const AUSWAHL: Erzeuger = {
  kennung: "auswahl",
  titel: "Auswahl aus Werten",
  beschreibung: "Feste Werte mit Gewicht: ein Wert mit Gewicht 3 kommt dreimal so oft wie einer mit 1.",
  art: "wert",
  einstellungen: [
    { schluessel: "werte", titel: "Werte", erklaerung: "Je Zeile ein Wert, nach = das Gewicht (Leipzig=12)", art: { art: "werte" }, vorgabe: [{ wert: "a", gewicht: 1 }, { wert: "b", gewicht: 1 }] },
    wahl("als", "Als", "Zahl nur, wenn alle Werte Zahlen sind", [["text", "Text"], ["zahl", "Zahl"]]),
  ],
  marken: (e) => {
    const w = werteVon(e, "werte");
    return [`${w.length} ${w.length === 1 ? "Wert" : "Werte"}`, ...w.slice(0, 3).map((x) => x.wert), ...(w.length > 3 ? ["..."] : [])];
  },
  erzeugen(e, k) {
    const w = werteVon(e, "werte");
    if (!w.length) return null;
    const x = k.zufall.gewichtet(w.map((g) => ({ wert: g.wert, gewicht: g.gewicht })));
    return textVon(e, "als") === "zahl" && x.trim() !== "" && Number.isFinite(Number(x)) ? Number(x) : x;
  },
};

const TEXT: Erzeuger = {
  kennung: "text",
  titel: "Text aus Wörtern",
  beschreibung: "Neutrale Wörter, der erste groß geschrieben.",
  art: "wert",
  einstellungen: [zahl("von", "Wörter von", "Wenigste Wörter", 1, { min: 1, ganz: true }), zahl("bis", "Wörter bis", "Meiste Wörter", 4, { min: 1, ganz: true })],
  marken: (e) => [`${zahlVon(e, "von")} bis ${zahlVon(e, "bis")} Wörter`],
  erzeugen(e, k) {
    const n = k.zufall.ganz(Math.max(1, zahlVon(e, "von")), Math.max(1, zahlVon(e, "bis")));
    const w = Array.from({ length: n }, () => k.zufall.wahl(WOERTER)).join(" ");
    return w.charAt(0).toUpperCase() + w.slice(1);
  },
};

const KONSTANTE: Erzeuger = {
  kennung: "konstante",
  titel: "Fester Wert",
  beschreibung: "Immer derselbe Wert.",
  art: "wert",
  einstellungen: [text("wert", "Wert", "Der Wert in jedem Datensatz", ""), wahl("als", "Als", "Art des Werts", [["text", "Text"], ["zahl", "Zahl"], ["wahrheit", "Wahrheitswert"], ["null", "null"]])],
  marken: (e) => [textVon(e, "als") === "null" ? "null" : `"${textVon(e, "wert")}"`],
  erzeugen(e) {
    const w = textVon(e, "wert");
    const als = textVon(e, "als");
    if (als === "null") return null;
    if (als === "zahl") return Number(w) || 0;
    if (als === "wahrheit") return w === "true" || w === "ja";
    return w;
  },
};

const UUID: Erzeuger = {
  kennung: "uuid",
  titel: "UUID",
  beschreibung: "Zufällige Kennung (Version 4), aus dem Startwert wiederholbar.",
  art: "wert",
  einstellungen: [],
  marken: () => ["Version 4"],
  erzeugen(_e, k) {
    const h = Array.from({ length: 32 }, () => k.zufall.ganz(0, 15).toString(16));
    h[12] = "4";
    h[16] = (8 + k.zufall.ganz(0, 3)).toString(16);
    const s = h.join("");
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  },
};

const OBJEKT: Erzeuger = {
  kennung: "objekt",
  titel: "Objekt",
  beschreibung: "Fasst die Felder darunter zusammen.",
  art: "objekt",
  einstellungen: [],
  marken: () => ["Felder darunter"],
  erzeugen: () => ({}),
};

const LISTE: Erzeuger = {
  kennung: "liste",
  titel: "Liste",
  beschreibung: "Eine Liste; ihre Einträge beschreibt das Feld mit [] darunter.",
  art: "liste",
  einstellungen: [zahl("von", "Länge von", "Wenigste Einträge", 1, { min: 0, ganz: true }), zahl("bis", "Länge bis", "Meiste Einträge", 3, { min: 0, ganz: true })],
  marken: (e) => [`${zahlVon(e, "von")} bis ${zahlVon(e, "bis")} Einträge`],
  erzeugen: () => [],
};

export const ERZEUGER: readonly Erzeuger[] = [NUMMER, NAME, PLZ, ORT, STRASSE, EMAIL, TELEFON, DATUM, ZEITPUNKT, ZAHL, WAHRHEIT, AUSWAHL, TEXT, KONSTANTE, UUID, OBJEKT, LISTE];

export const erzeuger = (kennung: string): Erzeuger => ERZEUGER.find((e) => e.kennung === kennung) ?? KONSTANTE;

/** Einstellungen eines Erzeugers mit Vorgaben für Fehlendes */
export function mitVorgaben(erz: Erzeuger, e: Einstellungen = {}): Einstellungen {
  return Object.fromEntries(erz.einstellungen.map((s) => [s.schluessel, e[s.schluessel] ?? s.vorgabe]));
}

/** Gebiet der Postleitzahl (erste zwei Ziffern) aus den Einstellungen des Erzeugers plz */
export const plzGebiet = (e: Einstellungen): { von: number; bis: number } => ({ von: zahlVon(e, "von"), bis: zahlVon(e, "bis") });

export { jaVon };
