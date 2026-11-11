// wertSchreiben für YAML: ersetzt genau die Spanne eines einfachen Werts. Der Stil des alten Werts bleibt erhalten
// (einfache oder doppelte Anführungszeichen); ein neuer Text ohne Anführungszeichen bekommt doppelte, wenn er sonst
// etwas anderes bedeuten würde. Block-Texte und Aliase lassen sich so nicht ersetzen.

import { isScalar, isSeq, parseDocument } from "yaml";
import { istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { Formatfehler, type Merkmale, type NeuerWert, type TextAenderung } from "../vertrag";
import { brauchtAnfuehrung, doppeltZitiert, einfachZitiert, istYamlZahl } from "./skalare";

const NULL_SCHREIBWEISEN = new Set(["~", "null", "Null", "NULL", ""]);
const ART_DES_NEUEN: Record<NeuerWert["art"], KnotenArt> = { text: KnotenArt.text, zahl: KnotenArt.zahl, wahrheitswert: KnotenArt.wahrheitswert, nichts: KnotenArt.nichts };

/** Typangabe (etwa !!str) direkt vor dem Wert, auch mit Anker dazwischen; null, wenn keine da ist. */
function typangabeVor(text: string, von: number): string | null {
  const zeile = text.slice(text.lastIndexOf("\n", von - 1) + 1, von);
  const treffer = /(?:^|\s)(!(?:[^\s]*[^\s:])?)(?:\s+&[^\s]+)?\s+$/.exec(zeile);
  return treffer ? treffer[1] : null;
}

/** Steht der Knoten in einer Klammerschreibweise ([ ] oder { })? Die Wurzel aus mehreren Dokumenten zählt nicht. */
function imFluss(text: string, index: Strukturindex, k: number, merkmale: Merkmale): boolean {
  const e = index.eltern[k];
  if (e === KEIN) return false;
  if (index.eltern[e] === KEIN && typeof merkmale.dokumente === "number" && merkmale.dokumente > 1) return false;
  const z = text[index.von[e]];
  return z === "[" || z === "{";
}

/** Bleibt der Text ohne Anführungszeichen derselbe Text? Prüft die Regeln und liest zur Sicherheit nach. */
function schlichtMoeglich(s: string, fluss: boolean): boolean {
  if (brauchtAnfuehrung(s, fluss)) return false;
  const probe = parseDocument(fluss ? `[${s}]` : s, { schema: "core" });
  if (probe.errors.length > 0) return false;
  const inhalt = probe.contents;
  const wert = fluss && isSeq(inhalt) && inhalt.items.length === 1 ? inhalt.items[0] : inhalt;
  return isScalar(wert) && wert.value === s;
}

function textSchreiben(s: string, alt: string, fluss: boolean): string {
  if (alt === "'") return einfachZitiert(s) ?? doppeltZitiert(s);
  if (alt === '"') return doppeltZitiert(s);
  return schlichtMoeglich(s, fluss) ? s : doppeltZitiert(s);
}

function neuerRohtext(neu: NeuerWert, alt: string, altRoh: string, fluss: boolean): string {
  switch (neu.art) {
    case "text":
      return textSchreiben(neu.wert, alt, fluss);
    case "zahl":
      if (!istYamlZahl(neu.roh)) throw new Formatfehler(`"${neu.roh}" ist keine Zahl in YAML (erlaubt etwa 42, -1.5, 1e6, 0x1F)`);
      return neu.roh;
    case "wahrheitswert":
      return neu.wert ? "true" : "false";
    case "nichts":
      return NULL_SCHREIBWEISEN.has(altRoh) ? altRoh : "null";
  }
}

export function wertSchreibenYaml(text: string, index: Strukturindex, k: number, neu: NeuerWert, merkmale: Merkmale): TextAenderung {
  if (k < 0 || k >= index.anzahl) throw new Formatfehler("Diesen Wert gibt es nicht (mehr)");
  const von = index.von[k];
  const bis = index.bis[k];
  const alt = von === bis ? "" : text[von];
  if (alt === "*") {
    throw new Formatfehler("Der Wert ist ein Alias (*name) auf einen Anker. Bitte den Wert am Anker (&name) ändern oder den Alias im Text ersetzen.");
  }
  if (istBehaelter(index.art[k])) throw new Formatfehler("Hier lassen sich nur einfache Werte ersetzen, keine Objekte oder Listen.");
  if (alt === "|" || alt === ">") {
    throw new Formatfehler("Der Wert ist ein Block-Text (| oder >). Er hängt an Einrückung und Zeilen; bitte direkt im Text bearbeiten.");
  }
  const typ = typangabeVor(text, von);
  if (typ !== null && ART_DES_NEUEN[neu.art] !== index.art[k]) {
    throw new Formatfehler(`Der Wert trägt die Typangabe ${typ}; eine andere Art passt nicht dazu. Bitte die Typangabe im Text anpassen.`);
  }
  let einfuegen = neuerRohtext(neu, alt, text.slice(von, bis), imFluss(text, index, k, merkmale));
  if (von === bis && einfuegen !== "") {
    // Ein leerer Wert sitzt direkt hinter "schluessel:" oder vor einem Kommentar; ohne Abstand verschmölze beides.
    if (von > 0 && !/\s/.test(text[von - 1])) einfuegen = " " + einfuegen;
    if (text[bis] === "#") einfuegen += " ";
  }
  return { von, bis, einfuegen };
}
