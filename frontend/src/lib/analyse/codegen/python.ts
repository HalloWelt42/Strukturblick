// Zielsprachen Python: Pydantic (BaseModel, Grenzen als Field(...), Prüfung beim Einlesen) und dataclasses (ohne
// Abhängigkeit, from_dict() wandelt Datum und Klassen um, Grenzen als Kommentar). Schlüssel, die kein Bezeichner sind,
// ein Schlüsselwort, ein Import oder ein Klassenname, bekommen einen gültigen Namen; Pydantic liest sie über alias,
// from_dict über den Schlüssel. Bei "je Klasse" stehen die Importe am Ende der Datei, so gehen auch gegenseitige Bezüge.

import { enthaelt, feldKommentar, klassenIn, type Feld, type Feldtyp, type Klasse, type Klassenmodell } from "./modell";
import { pythonMiniprojekt } from "./pythonProjekt";
import { abbildungen, feldnamen, umbenannt, type Codeausgabe, type Codeoptionen, type Codeziel } from "./ziele";

const EIN = "    ";
const SCHLUESSELWOERTER = ["False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield"];
/** Namen aus den Importen der erzeugten Dateien und von lesen.py */
const IMPORTE = ["date", "datetime", "Any", "Literal", "BaseModel", "ConfigDict", "Field", "TypeAdapter", "ValidationError", "dataclass", "json", "Path"];
/** Was BaseModel selbst mitbringt (ein Feld gleichen Namens überdeckt es) und die Lesemethode der dataclasses */
const GEERBT = ["model_config", "dict", "json", "copy", "schema", "schema_json", "construct", "validate", "parse_obj", "parse_raw", "parse_file", "from_orm", "update_forward_refs", "from_dict"];

/** Klassennamen, die in Python nicht gehen oder einen Import verdecken würden */
export const pyModell = (m: Klassenmodell): Klassenmodell => umbenannt(m, (n) => SCHLUESSELWOERTER.includes(n) || IMPORTE.includes(n));

/** Bezeichner der Felder einer Klasse, eindeutig; nie gleich einem Schlüsselwort, Import, Erbstück oder Klassennamen */
const namenVon = (k: Klasse, klassen: readonly string[]): Map<string, string> =>
  feldnamen(k.felder.map((x) => x.name), new Set([...SCHLUESSELWOERTER, ...IMPORTE, ...GEERBT, ...klassen]));
const py = (w: string | number | boolean | null): string => (w === null ? "None" : typeof w === "boolean" ? (w ? "True" : "False") : JSON.stringify(w));

function typ(t: Feldtyp): string {
  switch (t.art) {
    case "text": return "str";
    case "ganz": return "int";
    case "zahl": return "float";
    case "wahrheit": return "bool";
    case "datum": return "date";
    case "zeitpunkt": return "datetime";
    case "null": return "None";
    case "klasse": return t.name;
    case "liste": return `list[${typ(t.von)}${t.eintragNull ? " | None" : ""}]`;
    case "zuordnung": return `dict[str, ${typ(t.von)}]`;
    case "aufzaehlung": return t.werte.length ? `Literal[${t.werte.map(py).join(", ")}]` : "Any";
    case "vereinigung": return t.teile.map(typ).join(" | ");
    default: return "Any";
  }
}

const feldtyp = (f: Feld): string => {
  const t = typ(f.typ);
  return (f.nullbar || !f.pflicht) && t !== "None" && !t.endsWith(" | None") ? `${t} | None` : t;
};

/** Welche Importe der Text braucht */
function importe(text: string, pydantic: boolean): string[] {
  const z = ["from __future__ import annotations", ""];
  if (!pydantic) z.push("from dataclasses import dataclass");
  const zeit = ["date", "datetime"].filter((n) => new RegExp(`\\b${n}\\b`).test(text));
  if (zeit.length) z.push(`from datetime import ${zeit.join(", ")}`);
  const typing = ["Any", "Literal"].filter((n) => new RegExp(`\\b${n}\\b`).test(text));
  if (typing.length) z.push(`from typing import ${typing.join(", ")}`);
  if (pydantic) {
    const teile = ["BaseModel", ...["ConfigDict", "Field"].filter((n) => text.includes(`${n}(`))];
    z.push(`from pydantic import ${teile.join(", ")}`);
  }
  return z;
}

// ----- Pydantic ------------------------------------------------------------------------------------------------------

function feldPydantic(f: Feld, name: string): string {
  const r = f.regeln;
  const liste = f.typ.art === "liste";
  const args: string[] = [];
  if (!f.pflicht) args.push("default=None");
  if (name !== f.name) args.push(`alias=${JSON.stringify(f.name)}`);
  const laenge = (min?: number, max?: number) => { if (min !== undefined) args.push(`min_length=${min}`); if (max !== undefined) args.push(`max_length=${max}`); };
  if (liste) laenge(r.minAnzahl, r.maxAnzahl);
  else laenge(r.minLaenge, r.maxLaenge);
  if (r.muster !== undefined && !liste) args.push(`pattern=${JSON.stringify(r.muster)}`);
  if (r.min !== undefined) args.push(`ge=${r.min}`);
  if (r.minExklusiv !== undefined) args.push(`gt=${r.minExklusiv}`);
  if (r.max !== undefined) args.push(`le=${r.max}`);
  if (r.maxExklusiv !== undefined) args.push(`lt=${r.maxExklusiv}`);
  if (r.vielfaches !== undefined) args.push(`multiple_of=${r.vielfaches}`);
  if (f.beschreibung) args.push(`description=${JSON.stringify(f.beschreibung)}`);
  const wert = args.length ? ` = Field(${args.join(", ")})` : f.pflicht ? "" : " = None";
  return `${EIN}${name}: ${feldtyp(f)}${wert}`;
}

function klassePydantic(k: Klasse, o: Codeoptionen, klassen: readonly string[]): string[] {
  const namen = namenVon(k, klassen);
  const z = [`class ${k.name}(BaseModel):`];
  if (k.beschreibung) z.push(`${EIN}"""${k.beschreibung.replace(/"""/g, "'''")}"""`, "");
  const config = [o.unveraenderlich ? "frozen=True" : "", k.felder.some((f) => namen.get(f.name) !== f.name) ? "populate_by_name=True" : ""].filter(Boolean);
  if (config.length) z.push(`${EIN}model_config = ConfigDict(${config.join(", ")})`, "");
  z.push(...k.felder.map((f) => feldPydantic(f, namen.get(f.name)!)));
  if (!k.felder.length) z.push(`${EIN}pass`);
  return z;
}

// ----- dataclasses ---------------------------------------------------------------------------------------------------

/** Ausdruck, der einen Rohwert in den Typ bringt; null, wenn er so bleibt */
function umwandeln(t: Feldtyp, wert: string): string | null {
  if (t.art === "datum") return `date.fromisoformat(${wert})`;
  if (t.art === "zeitpunkt") return `datetime.fromisoformat(${wert})`;
  if (t.art === "klasse") return `${t.name}.from_dict(${wert})`;
  if (t.art === "zuordnung") {
    const innen = umwandeln(t.von, "v");
    return innen ? `{k: ${innen} for k, v in ${wert}.items()}` : null;
  }
  if (t.art === "liste") {
    const innen = umwandeln(t.von, "x");
    if (!innen) return null;
    return `[${t.eintragNull ? `${innen} if x is not None else None` : innen} for x in ${wert}]`;
  }
  return null;
}

function klasseDataclass(k: Klasse, o: Codeoptionen, klassen: readonly string[]): string[] {
  const namen = namenVon(k, klassen);
  // Felder ohne Vorgabe zuerst: dataclasses verlangen das
  const felder = [...k.felder].sort((a, b) => Number(!a.pflicht) - Number(!b.pflicht));
  const z = [`@dataclass${o.unveraenderlich ? "(frozen=True)" : ""}`, `class ${k.name}:`];
  if (k.beschreibung) z.push(`${EIN}"""${k.beschreibung.replace(/"""/g, "'''")}"""`, "");
  for (const f of felder) {
    const c = feldKommentar(f);
    z.push(`${EIN}${namen.get(f.name)}: ${feldtyp(f)}${f.pflicht ? "" : " = None"}${c ? `  # ${c}` : ""}`);
  }
  if (!felder.length) z.push(`${EIN}pass`);
  z.push("", `${EIN}@classmethod`, `${EIN}def from_dict(cls, d: dict[str, Any]) -> ${k.name}:`, `${EIN}${EIN}return cls(`);
  for (const f of felder) {
    const roh = f.pflicht ? `d[${JSON.stringify(f.name)}]` : `d.get(${JSON.stringify(f.name)})`;
    const w = umwandeln(f.typ, roh);
    const ausdruck = !w ? roh : f.pflicht && !f.nullbar ? w : `${umwandeln(f.typ, `d[${JSON.stringify(f.name)}]`)} if d.get(${JSON.stringify(f.name)}) is not None else None`;
    z.push(`${EIN}${EIN}${EIN}${namen.get(f.name)}=${ausdruck},`);
  }
  z.push(`${EIN}${EIN})`);
  return z;
}

// ----- Gemeinsam ---------------------------------------------------------------------------------------------------

/** Pydantic wertet "str | None" zur Laufzeit aus (ab 3.10); datetime.fromisoformat liest "Z" erst ab 3.11 */
export const pyVoraussetzung = (m: Klassenmodell, pydantic: boolean): string => (pydantic ? "Python ab 3.10 und Pydantic 2" : `Python ab ${enthaelt(m, "zeitpunkt") ? "3.11" : "3.7"}`);

/** Modulname zu einem Klassen- oder Dateinamen ("KundeAdresse" wird kunde_adresse) */
export const pyModul = (n: string): string => {
  const m = n.replace(/(\p{Ll})(\p{Lu})/gu, "$1_$2").toLowerCase().replace(/[^\p{L}\p{N}_]/gu, "_");
  // Ein Modul "import" oder "class" ließe sich nicht importieren
  return SCHLUESSELWOERTER.includes(m) || /^\p{N}/u.test(m) ? `${m}_` : m;
};

/** Typ der Wurzel (für TypeAdapter) */
export const pyTyp = typ;

/** Klassendateien; das Modell ist schon für Python umbenannt */
export function pyDateien(m: Klassenmodell, o: Codeoptionen, pydantic: boolean): { name: string; text: string }[] {
  const voraussetzung = pyVoraussetzung(m, pydantic);
  const namen = m.klassen.map((k) => k.name);
  const klasse = (k: Klasse) => (pydantic ? klassePydantic(k, o, namen) : klasseDataclass(k, o, namen));
  const datei = (ks: readonly Klasse[], spaeter: string[] = []): string => {
    const rumpf = ks.flatMap((k, i) => [...(i ? ["", ""] : []), ...klasse(k)]).join("\n");
    // Bezüge auf andere Dateien zuletzt: die Klasse steht dann schon, gegenseitige Importe gehen
    const ende = spaeter.length ? ["", "", "# Bezüge auf andere Dateien zuletzt (so gehen auch gegenseitige)", ...spaeter] : [];
    return [`# ${o.kopf}`, `# Braucht ${voraussetzung}`, ...importe(rumpf, pydantic), "", "", rumpf, ...ende, ""].join("\n");
  };
  return o.jeKlasse
    ? m.klassen.map((k) => {
        const braucht = [...new Set(k.felder.flatMap((f) => [...klassenIn(f.typ)]))].filter((n) => n !== k.name).sort();
        return { name: `${pyModul(k.name)}.py`, text: datei([k], braucht.map((n) => `from .${pyModul(n)} import ${n}  # noqa: E402`)) };
      })
    : [{ name: `${pyModul(o.dateistamm)}.py`, text: datei(m.klassen) }];
}

function schreiben(roh: Klassenmodell, o: Codeoptionen, pydantic: boolean): Codeausgabe {
  const m = pyModell(roh);
  const w = m.wurzel;
  const einlesen = pydantic
    ? w.art === "klasse" ? `daten = ${w.name}.model_validate_json(text)` : `from pydantic import TypeAdapter\n\ndaten = TypeAdapter(${typ(w)}).validate_json(text)`
    : w.art === "klasse" ? `import json\n\ndaten = ${w.name}.from_dict(json.loads(text))` : `import json\n\ndaten = ${umwandeln(w, "json.loads(text)") ?? "json.loads(text)"}`;
  return {
    dateien: pyDateien(m, o, pydantic),
    abbildung: abbildungen(m, feldtyp),
    einlesen,
    hinweis: pydantic ? "Grenzen aus dem Schema stehen als Field(...) und werden beim Einlesen geprüft." : "Grenzen aus dem Schema stehen als Kommentar am Feld; dataclasses prüfen sie nicht.",
    voraussetzung: pyVoraussetzung(m, pydantic),
  };
}

/** Ausdruck für die Wurzel aus json.loads (dataclasses) */
export const pyWurzelDataclass = (m: Klassenmodell, roh: string): string => (m.wurzel.art === "klasse" ? `${m.wurzel.name}.from_dict(${roh})` : (umwandeln(m.wurzel, roh) ?? roh));

export const PYDANTIC: Codeziel = {
  kennung: "pydantic", name: "Python (Pydantic)", sprache: "python", namensraum: false, attribute: false,
  schreiben: (m, o) => schreiben(m, o, true),
  miniprojekt: (m, o, daten) => pythonMiniprojekt(pyModell(m), o, daten, true),
};
export const DATACLASSES: Codeziel = {
  kennung: "dataclasses", name: "Python (dataclasses)", sprache: "python", namensraum: false, attribute: false,
  schreiben: (m, o) => schreiben(m, o, false),
  miniprojekt: (m, o, daten) => pythonMiniprojekt(pyModell(m), o, daten, false),
};
