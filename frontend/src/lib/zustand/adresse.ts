// Adressen (STB-48): wo man ist, als sauberer Pfad unter der Basis der Bauart, damit Neuladen, Zurück und geteilte
// Links genau dorthin führen. Maßgeblich ist die (kurze) Kennung des Dokuments, der Name steht nur zum Lesen dabei:
//
//   /                                         der zuletzt offene Stand (Arbeitsstand der Ablage)
//   /ablage                                   die Seite Ablage
//   /dokument/3f9c2a71/bestellungen-json/code?ziel=php&grenzen=attribute&stelle=/bestellungen/0
//
// Hier steht nur das Übersetzen zwischen Adresse und Ort, ohne Browser; das Verfolgen der Adresse macht die Schale.

import type { Dokumentkopf } from "../dienste/ablage";

export type Werte = Readonly<Record<string, string>>;

export type Ort =
  | { readonly seite: "arbeitsplatz" }
  | { readonly seite: "ablage" }
  | {
      readonly seite: "dokument";
      /** kurze Kennung (eindeutiger Anfang der vollen) */
      readonly kennung: string;
      readonly name: string;
      /** Kennung der Ansicht oder des Werkzeugs; "" heißt: wie zuletzt */
      readonly platz: string;
      /** gewählte Stelle als JSON Pointer */
      readonly stelle: string | null;
      /** Einstellungen der Ansicht oder des Werkzeugs */
      readonly werte: Werte;
    };

/** Wie Ansichten und Werkzeuge ihre Einstellungen in die Adresse geben und aus ihr nehmen */
export interface Adresskontext {
  /** kurze Kennung eines Dokuments der Ablage */
  kurz(kennung: string): string;
  /** Dokument zu einer kurzen (oder vollen) Kennung */
  dokument(kurz: string): Dokumentkopf | null;
}

export interface Adressierbar {
  /** Einstellungen, die von der Vorgabe abweichen (Vorgaben fehlen in der Adresse) */
  adresseWerte(k: Adresskontext): Werte;
  /** Einstellungen aus einer Adresse übernehmen: Fehlendes wird Vorgabe, Unbekanntes bleibt Vorgabe */
  adresseUebernehmen(w: Werte, k: Adresskontext): void | Promise<void>;
}

const STELLE = "stelle";
const MINDESTLAENGE = 8;

/** Lesbarer Teil des Pfads aus dem Namen: "Bestellungen 2026.json" wird "bestellungen-2026-json" */
export function namensteil(name: string): string {
  const umlaute: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  return (
    name
      .toLowerCase()
      .replace(/[äöüß]/g, (z) => umlaute[z])
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dokument"
  );
}

/** Kürzester Anfang der Kennung (mindestens 8 Zeichen), den kein anderes Dokument teilt */
export function kurzeKennung(kennung: string, alle: readonly string[]): string {
  for (let n = MINDESTLAENGE; n < kennung.length; n++) {
    const anfang = kennung.slice(0, n);
    if (anfang.endsWith("-")) continue;
    if (!alle.some((k) => k !== kennung && k.startsWith(anfang))) return anfang;
  }
  return kennung;
}

/** Volle Kennung zu einer kurzen: genau gleich oder als eindeutiger Anfang; sonst null */
export function kennungFinden(kurz: string, alle: readonly string[]): string | null {
  if (alle.includes(kurz)) return kurz;
  if (kurz.length < MINDESTLAENGE) return null;
  const treffer = alle.filter((k) => k.startsWith(kurz));
  return treffer.length === 1 ? treffer[0] : null;
}

/** Basis der Bauart mit Schrägstrich am Ende ("/" auf dem Server, "/Strukturblick/" auf Pages) */
const basisVon = (basis: string): string => (basis.endsWith("/") ? basis : `${basis}/`);

/** Wert für die Adresse: lesbar, nur was in einer Suche nötig ist, wird kodiert ("/" und ":" bleiben) */
const kodieren = (s: string): string => encodeURIComponent(s).replace(/%2F/g, "/").replace(/%3A/g, ":");

function dekodieren(s: string): string | null {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

export function ortLesen(pfad: string, suche: string, basis: string): Ort {
  const b = basisVon(basis);
  const rest = pfad.startsWith(b) ? pfad.slice(b.length) : pfad === b.slice(0, -1) ? "" : null;
  if (rest === null) return { seite: "arbeitsplatz" };
  const teile = rest.split("/").filter(Boolean).map(dekodieren);
  if (teile.some((t) => t === null)) return { seite: "arbeitsplatz" };
  const [seite, kennung, name, platz] = teile as string[];
  if (seite === "ablage") return { seite: "ablage" };
  if (seite !== "dokument" || !kennung) return { seite: "arbeitsplatz" };
  const werte: Record<string, string> = {};
  let stelle: string | null = null;
  for (const paar of suche.replace(/^\?/, "").split("&").filter(Boolean)) {
    const i = paar.indexOf("=");
    const schluessel = dekodieren(i < 0 ? paar : paar.slice(0, i));
    const wert = dekodieren(i < 0 ? "" : paar.slice(i + 1));
    if (schluessel === null || wert === null) continue;
    if (schluessel === STELLE) stelle = wert;
    else werte[schluessel] = wert;
  }
  return { seite: "dokument", kennung, name: name ?? "", platz: platz ?? "", stelle, werte };
}

export function adresseBauen(ort: Ort, basis: string): string {
  const b = basisVon(basis);
  if (ort.seite === "arbeitsplatz") return b;
  if (ort.seite === "ablage") return `${b}ablage`;
  const pfad = [ort.kennung, namensteil(ort.name), ...(ort.platz ? [ort.platz] : [])].map(encodeURIComponent).join("/");
  const paare = [
    ...Object.entries(ort.werte).map(([s, w]) => `${kodieren(s)}=${kodieren(w)}`),
    ...(ort.stelle !== null ? [`${STELLE}=${kodieren(ort.stelle)}`] : []),
  ];
  return `${b}dokument/${pfad}${paare.length ? `?${paare.join("&")}` : ""}`;
}

/** Wechselt der Ort so, dass Zurück dorthin führen soll (anderes Dokument, andere Ansicht, andere Seite)? */
export function ortsWechsel(a: Ort, b: Ort): boolean {
  if (a.seite !== b.seite) return true;
  if (a.seite !== "dokument" || b.seite !== "dokument") return false;
  return a.kennung !== b.kennung || a.platz !== b.platz;
}
