// Zielsprache PHP 8.4: je Klasse eine final (readonly) class mit Konstruktor-Eigenschaften und fromArray() zum Einlesen
// aus json_decode(..., true). Datum und Zeitpunkt werden DateTimeImmutable, Klassen und Listen von Klassen über ihr
// fromArray(). Listen- und Grenzangaben stehen als PHPDoc am Konstruktor.

import { feldKommentar, type Feld, type Feldtyp, type Klasse, type Klassenmodell } from "./modell";
import { abbildungen, bezeichner, feldnamen, type Codeausgabe, type Codeoptionen, type Codeziel } from "./ziele";

const EIN = "    ";
const schluesselText = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const variable = (name: string): string => bezeichner(name, new Set(["this"]));  // für Namen außerhalb von Klassen

function grundtyp(t: Feldtyp): string {
  switch (t.art) {
    case "text": return "string";
    case "ganz": return "int";
    case "zahl": return "float";
    case "wahrheit": return "bool";
    case "datum":
    case "zeitpunkt": return "DateTimeImmutable";
    case "klasse": return t.name;
    case "liste": return "array";
    case "aufzaehlung": {
      const arten = new Set(t.werte.map((w) => (typeof w === "string" ? "string" : typeof w === "boolean" ? "bool" : Number.isInteger(w) ? "int" : "float")));
      return arten.size === 1 ? [...arten][0] : "mixed";
    }
    case "vereinigung": {
      const teile = [...new Set(t.teile.map(grundtyp))];
      return teile.includes("mixed") || teile.includes("array") && teile.length > 1 ? "mixed" : teile.join("|");
    }
    default: return "mixed";
  }
}

/** Typ der Eigenschaft samt null; fehlende Felder werden null */
function eigenschaftstyp(f: Feld): string {
  const t = grundtyp(f.typ);
  if (t === "mixed" || !(f.nullbar || !f.pflicht)) return t;
  return t.includes("|") ? `${t}|null` : `?${t}`;
}

/** Typ für PHPDoc (Listen mit Eintragstyp) */
function doktyp(t: Feldtyp): string {
  if (t.art === "liste") return `list<${doktyp(t.von)}>`;
  if (t.art === "vereinigung") return t.teile.map(doktyp).join("|");
  return grundtyp(t);
}

/** Ausdruck, der einen Rohwert in den Typ bringt; null, wenn er so bleibt */
function umwandeln(t: Feldtyp, wert: string): string | null {
  if (t.art === "datum" || t.art === "zeitpunkt") return `new DateTimeImmutable(${wert})`;
  if (t.art === "klasse") return `${t.name}::fromArray(${wert})`;
  if (t.art === "liste") {
    if (t.von.art === "klasse") return `array_map(${t.von.name}::fromArray(...), ${wert})`;
    const innen = umwandeln(t.von, "$w");
    return innen ? `array_map(static fn ($w) => ${innen}, ${wert})` : null;
  }
  return null;
}

function feldWert(f: Feld): string {
  const roh = `$daten[${schluesselText(f.name)}]`;
  const w = umwandeln(f.typ, roh);
  if (f.pflicht && !f.nullbar) return w ?? roh;
  return w ? `isset(${roh}) ? ${w} : null` : `${roh} ?? null`;
}

function klasseSchreiben(k: Klasse, o: Codeoptionen): string[] {
  const namen = feldnamen(k.felder.map((f) => f.name), new Set(["this"]));
  const variable = (n: string): string => namen.get(n)!;
  // Pflichtfelder zuerst: optionale bekommen "= null" und dürfen nicht vor Pflichtfeldern stehen
  const felder = [...k.felder].sort((a, b) => Number(!a.pflicht) - Number(!b.pflicht));
  const doku = felder.flatMap((f) => {
    const g = feldKommentar(f);
    return f.typ.art === "liste" || g ? [` * @param ${doktyp(f.typ)}${f.nullbar || !f.pflicht ? "|null" : ""} $${variable(f.name)}${g ? ` ${g}` : ""}`] : [];
  });
  const z: string[] = [];
  if (k.beschreibung) z.push(`/** ${k.beschreibung} */`);
  z.push(`final ${o.unveraenderlich ? "readonly " : ""}class ${k.name}`, "{");
  if (doku.length) z.push(`${EIN}/**`, ...doku.map((d) => `${EIN}${d}`), `${EIN} */`);
  z.push(`${EIN}public function __construct(`);
  for (const f of felder) z.push(`${EIN}${EIN}public ${eigenschaftstyp(f)} $${variable(f.name)}${f.pflicht ? "" : " = null"},`);
  z.push(`${EIN}) {}`, "", `${EIN}/**`, `${EIN} * @param array<string, mixed> $daten`, `${EIN} */`, `${EIN}public static function fromArray(array $daten): self`, `${EIN}{`, `${EIN}${EIN}return new self(`);
  for (const f of felder) z.push(`${EIN}${EIN}${EIN}${variable(f.name)}: ${feldWert(f)},`);
  z.push(`${EIN}${EIN});`, `${EIN}}`, "}");
  return z;
}

function kopf(o: Codeoptionen, mitDatum: boolean): string[] {
  return ["<?php", "", "declare(strict_types=1);", "", ...(o.namensraum ? [`namespace ${o.namensraum};`, ""] : []), ...(mitDatum ? ["use DateTimeImmutable;", ""] : []), `// ${o.kopf}`, ""];
}

const brauchtDatum = (ks: readonly Klasse[]): boolean => ks.some((k) => k.felder.some((f) => JSON.stringify(f.typ).includes('"datum"') || JSON.stringify(f.typ).includes('"zeitpunkt"')));

export const PHP: Codeziel = {
  kennung: "php",
  name: "PHP 8.4",
  sprache: "php",
  namensraum: true,
  schreiben(m: Klassenmodell, o: Codeoptionen): Codeausgabe {
    const klassen = m.klassen;
    const dateien = o.jeKlasse
      ? klassen.map((k) => ({ name: `${k.name}.php`, text: [...kopf(o, brauchtDatum([k])), ...klasseSchreiben(k, o), ""].join("\n") }))
      : [{ name: `${klassen[0]?.name ?? o.wurzelname}.php`, text: [...kopf(o, brauchtDatum(klassen)), ...klassen.flatMap((k, i) => [...(i ? [""] : []), ...klasseSchreiben(k, o)]), ""].join("\n") }];
    const w = m.wurzel;
    const einlesen = w.art === "klasse"
      ? `$daten = json_decode($json, true, flags: JSON_THROW_ON_ERROR);\n$${variable(o.dateistamm) || "wurzel"} = ${w.name}::fromArray($daten);`
      : `$daten = json_decode($json, true, flags: JSON_THROW_ON_ERROR);\n$liste = ${umwandeln(w, "$daten") ?? "$daten"};`;
    return { dateien, abbildung: abbildungen(m, (f) => (f.typ.art === "liste" ? `${eigenschaftstyp(f)}, im PHPDoc ${doktyp(f.typ)}` : eigenschaftstyp(f))), einlesen, hinweis: "Listentypen und Grenzen aus dem Schema stehen als PHPDoc am Konstruktor." };
  },
};
