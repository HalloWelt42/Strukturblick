// Tabellen aus HTML lesen. HTML ist kein XML (offene Tags, fehlende Enden), deshalb ein nachsichtiger Leser nur für
// Tabellen: <table> bis </table>, Zeilen <tr>, Zellen <td> und <th>, auch ohne schließende Tags. Name aus <caption>,
// sonst aus der Überschrift davor, sonst "Tabelle n". Text der Zellen ohne Tags, Entities aufgelöst, Leerraum
// zusammengefasst; <br> wird ein Zeilenumbruch. colspan füllt leere Zellen auf; was nicht mitkommt, sagen die Hinweise.

import { textAusBytes } from "../kodierung";
import { EinlesenFehler, tabellenAlsDokument, type Einleser, type Tabelle } from "../einlesen/tabellen";

// Die Zeichen stehen als \u-Schreibweise, damit der Quelltext nur gerade Zeichen enthält; in den Daten bleiben sie, wie sie sind
const BENANNT: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0", auml: "\u00e4", ouml: "\u00f6", uuml: "\u00fc", Auml: "\u00c4", Ouml: "\u00d6",
  Uuml: "\u00dc", szlig: "\u00df", euro: "\u20ac", copy: "\u00a9", reg: "\u00ae", deg: "\u00b0", sect: "\u00a7", shy: "\u00ad",
  hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", laquo: "\u00ab", raquo: "\u00bb", bdquo: "\u201e", ldquo: "\u201c",
  rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019", sbquo: "\u201a", times: "\u00d7", middot: "\u00b7",
};

function entities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|[A-Za-z]+);/g, (ganz, n: string) => {
    if (n[0] === "#") {
      const cp = n[1] === "x" || n[1] === "X" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ganz;
    }
    return BENANNT[n] ?? ganz;
  });
}

/** Text einer Zelle: Tags weg, <br> als Umbruch, Leerraum zusammengefasst */
function zellText(roh: string): string {
  const ohne = roh.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "");
  return entities(ohne).split("\n").map((z) => z.replace(/[ \t\r\f ]+/g, " ").trim()).join("\n").trim();
}

export interface HtmlTabellen {
  readonly tabellen: Tabelle[];
  readonly hinweise: string[];
}

export function htmlTabellenLesen(html: string): HtmlTabellen {
  // Kommentare, Skripte und Stile zählen nicht; ersetzt durch Leerraum, damit Positionen bleiben
  const t = html.replace(/<!--[\s\S]*?-->|<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, (m) => " ".repeat(m.length));
  const tabellen: Tabelle[] = [];
  let colspans = 0;
  let rowspans = 0;
  let verschachtelt = 0;
  let vorher = 0;
  for (const m of t.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi)) {
    const inhalt = m[1];
    if (/<table\b/i.test(inhalt)) verschachtelt++;
    const caption = /<caption\b[^>]*>([\s\S]*?)<\/caption\s*>/i.exec(inhalt);
    const ueberschriften = [...t.slice(vorher, m.index).matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/gi)];
    const name = (caption && zellText(caption[1])) || (ueberschriften.length && zellText(ueberschriften[ueberschriften.length - 1][1])) || `Tabelle ${tabellen.length + 1}`;
    vorher = m.index + m[0].length;
    const zeilen: string[][] = [];
    let kopf: boolean | undefined;
    for (const r of inhalt.matchAll(/<tr\b[^>]*>([\s\S]*?)(?=<tr\b|<\/tbody|<\/thead|<\/tfoot|$)/gi)) {
      const zeile: string[] = [];
      let nurTh = true;
      for (const c of r[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)(?=<td\b|<th\b|<\/tr|$)/gi)) {
        if (c[1].toLowerCase() !== "th") nurTh = false;
        zeile.push(zellText(c[3].replace(/<\/t[dh]\s*>[\s\S]*$/i, "")));
        const span = Number(/colspan\s*=\s*["']?(\d+)/i.exec(c[2])?.[1] ?? 1);
        if (span > 1) { colspans++; for (let i = 1; i < span; i++) zeile.push(""); }
        if (/rowspan\s*=\s*["']?([2-9]|\d{2,})/i.test(c[2])) rowspans++;
      }
      if (!zeile.length) continue;
      if (zeilen.length === 0) kopf = nurTh || /<thead\b/i.test(inhalt.slice(0, r.index ?? 0)) ? true : undefined;
      zeilen.push(zeile);
    }
    tabellen.push({ name, zeilen, kopf: kopf ?? false });
  }
  const hinweise = ["Werte sind Text (HTML kennt keine Typen)"];
  const zahl = (n: number, eins: string, viele: string): string => `${n.toLocaleString("de-DE")} ${n === 1 ? eins : viele}`;
  if (colspans) hinweise.push(`${zahl(colspans, "Zelle reicht", "Zellen reichen")} über mehrere Spalten: der Wert steht in der ersten, die übrigen sind leer`);
  if (rowspans) hinweise.push(`${zahl(rowspans, "Zelle reicht", "Zellen reichen")} über mehrere Zeilen: der Wert steht nur in der ersten Zeile`);
  if (verschachtelt) hinweise.push(`${zahl(verschachtelt, "Tabelle steht", "Tabellen stehen")} in einer anderen: gelesen wird nur die innere`);
  return { tabellen, hinweise };
}

export const HTML_EINLESER: Einleser = {
  name: "HTML-Seite",
  endungen: ["html", "htm"],
  einlesen: (bytes, dateiname) => {
    const { tabellen, hinweise } = htmlTabellenLesen(textAusBytes(bytes).text);
    if (!tabellen.length) throw new EinlesenFehler("Die Seite enthält keine Tabelle; Strukturblick liest aus HTML nur Tabellen");
    return tabellenAlsDokument(tabellen, dateiname, { eins: "Tabelle", viele: "Tabellen" }, hinweise);
  },
};
