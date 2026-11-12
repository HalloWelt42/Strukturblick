// Zielsprache PHP: je Klasse eine final (readonly) class mit Konstruktor-Eigenschaften und fromArray() zum Einlesen aus
// json_decode(..., true). Datum und Zeitpunkt werden DateTimeImmutable, Klassen und Listen von Klassen über ihr
// fromArray(). Grenzen stehen als PHPDoc oder als Attribute des Symfony Validators (wählbar); list<T> bleibt PHPDoc,
// denn Generics kennen PHPStan, Psalm und die IDE nur von dort.

import { feldKommentar, type Feld, type Feldtyp, type Klasse, type Klassenmodell } from "./modell";
import { phpMiniprojekt } from "./phpProjekt";
import { abbildungen, feldnamen, umbenannt, type Codeausgabe, type Codeoptionen, type Codeziel } from "./ziele";

const EIN = "    ";
const schluesselText = (s: string): string => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/** Als Klassenname verboten (ohne Rücksicht auf Groß- und Kleinschreibung) */
const VERBOTEN = new Set(("abstract and array as bool break callable case catch class clone const continue datetimeimmutable declare default do echo else " +
  "elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends false final finally float fn for foreach function " +
  "global goto if implements include instanceof insteadof int interface isset iterable list match mixed namespace never new null numeric object " +
  "or parent print private protected public readonly require resource return self static string switch throw trait true try unset use var void " +
  "while xor yield " +
  // eingebaute Klassen (stören ohne Namensraum)
  "arrayiterator arrayobject attribute closure countable dateinterval dateperiod datetime datetimezone directory error exception fiber generator " +
  "iterator iteratoraggregate jsonexception serializable splobjectstorage stdclass stringable throwable traversable typeerror valueerror weakmap " +
  "weakreference").split(" "));

function grundtyp(t: Feldtyp): string {
  switch (t.art) {
    case "text": return "string";
    case "ganz": return "int";
    case "zahl": return "float";
    case "wahrheit": return "bool";
    case "datum":
    case "zeitpunkt": return "DateTimeImmutable";
    case "klasse": return t.name;
    case "liste":
    case "zuordnung": return "array";
    case "aufzaehlung": {
      const arten = new Set(t.werte.map((w) => (typeof w === "string" ? "string" : typeof w === "boolean" ? "bool" : Number.isInteger(w) ? "int" : "float")));
      return arten.size === 1 ? [...arten][0] : "mixed";
    }
    case "vereinigung": {
      // Mit Klassen, Listen oder Datum bliebe der Rohwert ein Array oder Text: dann mixed, ohne Umwandlung
      if (t.teile.some((x) => ["klasse", "liste", "zuordnung", "datum", "zeitpunkt", "beliebig", "null"].includes(x.art))) return "mixed";
      const teile = [...new Set(t.teile.map(grundtyp))];
      return teile.includes("mixed") ? "mixed" : teile.join("|");
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
  if (t.art === "liste") return `list<${doktyp(t.von)}${t.eintragNull ? "|null" : ""}>`;
  if (t.art === "zuordnung") return `array<string, ${doktyp(t.von)}>`;
  if (t.art === "vereinigung") return t.teile.map(doktyp).join("|");
  return grundtyp(t);
}

/** Ausdruck, der einen Rohwert in den Typ bringt; null, wenn er so bleibt */
function umwandeln(t: Feldtyp, wert: string): string | null {
  if (t.art === "datum" || t.art === "zeitpunkt") return `new DateTimeImmutable(${wert})`;
  if (t.art === "klasse") return `${t.name}::fromArray(${wert})`;
  // array_map behält die Schlüssel: so passt es für Listen und Zuordnungen
  if (t.art === "zuordnung") {
    if (t.von.art === "klasse") return `array_map(${t.von.name}::fromArray(...), ${wert})`;
    const innen = umwandeln(t.von, "$w");
    return innen ? `array_map(static fn ($w) => ${innen}, ${wert})` : null;
  }
  if (t.art === "liste") {
    if (t.von.art === "klasse" && !t.eintragNull) return `array_map(${t.von.name}::fromArray(...), ${wert})`;
    const innen = umwandeln(t.von, "$w");
    if (!innen) return null;
    return `array_map(static fn ($w) => ${t.eintragNull ? `$w === null ? null : ${innen}` : innen}, ${wert})`;
  }
  return null;
}

function feldWert(f: Feld): string {
  const roh = `$daten[${schluesselText(f.name)}]`;
  const w = umwandeln(f.typ, roh);
  if (f.pflicht && !f.nullbar) return w ?? roh;
  return w ? `isset(${roh}) ? ${w} : null` : `${roh} ?? null`;
}

/** Attribute des Symfony Validators für ein Feld */
function attribute(f: Feld): string[] {
  const r = f.regeln;
  const a: string[] = [];
  const liste = f.typ.art === "liste";
  if (liste && (r.minAnzahl !== undefined || r.maxAnzahl !== undefined)) a.push(`Assert\\Count(${[r.minAnzahl !== undefined ? `min: ${r.minAnzahl}` : "", r.maxAnzahl !== undefined ? `max: ${r.maxAnzahl}` : ""].filter(Boolean).join(", ")})`);
  if (!liste && (r.minLaenge !== undefined || r.maxLaenge !== undefined)) a.push(`Assert\\Length(${[r.minLaenge !== undefined ? `min: ${r.minLaenge}` : "", r.maxLaenge !== undefined ? `max: ${r.maxLaenge}` : ""].filter(Boolean).join(", ")})`);
  if (r.muster !== undefined) a.push(`Assert\\Regex(${schluesselText(`/${r.muster.replace(/\//g, "\\/")}/u`)})`);
  if (r.min !== undefined) a.push(`Assert\\GreaterThanOrEqual(${r.min})`);
  if (r.minExklusiv !== undefined) a.push(`Assert\\GreaterThan(${r.minExklusiv})`);
  if (r.max !== undefined) a.push(`Assert\\LessThanOrEqual(${r.max})`);
  if (r.maxExklusiv !== undefined) a.push(`Assert\\LessThan(${r.maxExklusiv})`);
  if (r.vielfaches !== undefined) a.push(`Assert\\DivisibleBy(${r.vielfaches})`);
  if (r.ohneDoppel) a.push("Assert\\Unique");
  if (f.typ.art === "aufzaehlung" && f.typ.werte.length) a.push(`Assert\\Choice([${f.typ.werte.map((w) => (typeof w === "string" ? schluesselText(w) : String(w))).join(", ")}])`);
  // Verschachtelte Klassen mitprüfen
  if (f.typ.art === "klasse" || ((f.typ.art === "liste" || f.typ.art === "zuordnung") && f.typ.von.art === "klasse")) a.push("Assert\\Valid");
  return a;
}

function klasseSchreiben(k: Klasse, o: Codeoptionen): string[] {
  const namen = feldnamen(k.felder.map((f) => f.name), new Set(["this"]));
  const variable = (n: string): string => namen.get(n)!;
  // Pflichtfelder zuerst: optionale bekommen "= null" und dürfen nicht vor Pflichtfeldern stehen
  const felder = [...k.felder].sort((a, b) => Number(!a.pflicht) - Number(!b.pflicht));
  const doku = felder.flatMap((f) => {
    const g = o.attribute ? (f.beschreibung?.replace(/[.\s]+$/, "") ?? "") : feldKommentar(f);
    return f.typ.art === "liste" || f.typ.art === "zuordnung" || g ? [` * @param ${doktyp(f.typ)}${f.nullbar || !f.pflicht ? "|null" : ""} $${variable(f.name)}${g ? ` ${g.replace(/\*\//g, "* /")}` : ""}`] : [];
  });
  const z: string[] = [];
  if (k.beschreibung) z.push(`/** ${k.beschreibung.replace(/\*\//g, "* /")} */`);
  z.push(`final ${o.unveraenderlich ? "readonly " : ""}class ${k.name}`, "{");
  if (doku.length) z.push(`${EIN}/**`, ...doku.map((d) => `${EIN}${d}`), `${EIN} */`);
  z.push(`${EIN}public function __construct(`);
  for (const f of felder) {
    if (o.attribute) for (const a of attribute(f)) z.push(`${EIN}${EIN}#[${a}]`);
    z.push(`${EIN}${EIN}public ${eigenschaftstyp(f)} $${variable(f.name)}${f.pflicht ? "" : " = null"},`);
  }
  z.push(`${EIN}) {}`, "", `${EIN}/**`, `${EIN} * @param array<string, mixed> $daten`, `${EIN} */`, `${EIN}public static function fromArray(array $daten): self`, `${EIN}{`, `${EIN}${EIN}return new self(`);
  for (const f of felder) z.push(`${EIN}${EIN}${EIN}${variable(f.name)}: ${feldWert(f)},`);
  z.push(`${EIN}${EIN});`, `${EIN}}`, "}");
  return z;
}

/** Was im Modus Attribute am Feld steht; ohne Grenzen im Schema bleibt es bei Valid für verschachtelte Klassen */
function attributHinweis(m: Klassenmodell): string {
  const alle = m.klassen.flatMap((k) => k.felder.flatMap(attribute));
  const grenzen = alle.filter((a) => a !== "Assert\\Valid").length;
  const valid = alle.length - grenzen;
  const zahl = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;
  if (!alle.length) return "Das Schema hat keine Grenzen, daher keine Attribute. Ein JSON Schema mit Grenzen aus der Ablage liefert sie.";
  const teile = [grenzen ? zahl(grenzen, "Grenze", "Grenzen") : "", valid ? `${zahl(valid, "Prüfung", "Prüfungen")} verschachtelter Klassen (Valid)` : ""].filter(Boolean);
  const wenige = grenzen ? "" : " Aus Daten abgeleitet gibt es kaum Grenzen; ein JSON Schema aus der Ablage liefert mehr.";
  return `Attribute des Symfony Validators am Feld: ${teile.join(", ")}. Listentypen bleiben PHPDoc.${wenige}`;
}

/** readonly class gibt es ab 8.2; sonst trägt Klasse::fromArray(...) (first-class callable) ab 8.1 */
export const phpVoraussetzung = (o: Codeoptionen): string => `PHP ab ${o.unveraenderlich ? "8.2" : "8.1"}${o.attribute ? " und symfony/validator 7" : ""}`;

function kopf(o: Codeoptionen, ks: readonly Klasse[]): string[] {
  const datum = ks.some((k) => k.felder.some((f) => JSON.stringify(f.typ).includes('"datum"') || JSON.stringify(f.typ).includes('"zeitpunkt"')));
  const assert = o.attribute && ks.some((k) => k.felder.some((f) => attribute(f).length));
  const use = [...(datum ? ["use DateTimeImmutable;"] : []), ...(assert ? ["use Symfony\\Component\\Validator\\Constraints as Assert;"] : [])];
  return ["<?php", "", "declare(strict_types=1);", "", ...(o.namensraum ? [`namespace ${o.namensraum};`, ""] : []), ...(use.length ? [...use, ""] : []), `// ${o.kopf}`, `// Braucht ${phpVoraussetzung(o)}`, ""];
}

/** Modell mit Klassennamen, die in PHP gehen */
export const phpModell = (m: Klassenmodell): Klassenmodell => umbenannt(m, (n) => VERBOTEN.has(n.toLowerCase()));

/** Klassendateien (je Klasse eine oder alle in einer) */
export function phpDateien(m: Klassenmodell, o: Codeoptionen, jeKlasse: boolean): { name: string; text: string }[] {
  return jeKlasse
    ? m.klassen.map((k) => ({ name: `${k.name}.php`, text: [...kopf(o, [k]), ...klasseSchreiben(k, o), ""].join("\n") }))
    : [{ name: `${m.klassen[0]?.name ?? o.wurzelname}.php`, text: [...kopf(o, m.klassen), ...m.klassen.flatMap((k, i) => [...(i ? [""] : []), ...klasseSchreiben(k, o)]), ""].join("\n") }];
}

/** Ausdruck, der die decodierten Daten in die Wurzel bringt */
export const phpWurzel = (m: Klassenmodell, daten: string): string => (m.wurzel.art === "klasse" ? `${m.wurzel.name}::fromArray(${daten})` : (umwandeln(m.wurzel, daten) ?? daten));

export const PHP: Codeziel = {
  kennung: "php",
  name: "PHP 8.4",
  sprache: "php",
  namensraum: true,
  attribute: true,
  schreiben(roh: Klassenmodell, o: Codeoptionen): Codeausgabe {
    const m = phpModell(roh);
    const einlesen = `$daten = json_decode($json, true, flags: JSON_THROW_ON_ERROR);\n$wurzel = ${phpWurzel(m, "$daten")};${o.attribute ? "\n\n// Prüfen (symfony/validator)\n$fehler = Validation::createValidatorBuilder()->enableAttributeMapping()->getValidator()->validate($wurzel);" : ""}`;
    const typText = (f: Feld) =>
      [
        eigenschaftstyp(f),
        ...(f.typ.art === "liste" || f.typ.art === "zuordnung" ? [`im PHPDoc ${doktyp(f.typ)}`] : []),
        ...(o.attribute ? attribute(f).map((a) => `#[${a}]`) : []),
      ].join(", ");
    return {
      dateien: phpDateien(m, o, o.jeKlasse),
      abbildung: abbildungen(m, typText),
      einlesen,
      hinweis: o.attribute ? attributHinweis(m) : "Listentypen und Grenzen aus dem Schema stehen als PHPDoc am Konstruktor.",
      voraussetzung: phpVoraussetzung(o),
    };
  },
  miniprojekt: (m, o, daten) => phpMiniprojekt(phpModell(m), o, daten),
};
