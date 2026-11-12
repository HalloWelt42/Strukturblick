// Zielsprachen Python: Pydantic (BaseModel, Grenzen als Field(...), Prüfung beim Einlesen) und dataclasses (ohne
// Abhängigkeit, from_dict() wandelt Datum und Klassen um, Grenzen als Kommentar). Schlüssel, die kein Bezeichner
// sind oder ein Schlüsselwort, bekommen einen gültigen Namen; Pydantic liest sie über alias, from_dict über den Schlüssel.

import { enthaelt, feldKommentar, klassenIn, type Feld, type Feldtyp, type Klasse, type Klassenmodell } from "./modell";
import { abbildungen, feldnamen, type Codeausgabe, type Codeoptionen, type Codeziel } from "./ziele";

const EIN = "    ";
const SCHLUESSELWOERTER = new Set(["False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "model_config"]);
/** Bezeichner der Felder einer Klasse, eindeutig */
const namenVon = (k: Klasse): Map<string, string> => feldnamen(k.felder.map((x) => x.name), SCHLUESSELWOERTER);
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
    case "liste": return `list[${typ(t.von)}]`;
    case "aufzaehlung": return t.werte.length ? `Literal[${t.werte.map(py).join(", ")}]` : "Any";
    case "vereinigung": return t.teile.map(typ).join(" | ");
    default: return "Any";
  }
}

const feldtyp = (f: Feld): string => `${typ(f.typ)}${f.nullbar || !f.pflicht ? " | None" : ""}`;

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

function klassePydantic(k: Klasse, o: Codeoptionen): string[] {
  const namen = namenVon(k);
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
  if (t.art === "liste") {
    const innen = umwandeln(t.von, "x");
    return innen ? `[${innen} for x in ${wert}]` : null;
  }
  return null;
}

function klasseDataclass(k: Klasse, o: Codeoptionen): string[] {
  const namen = namenVon(k);
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

function schreiben(m: Klassenmodell, o: Codeoptionen, pydantic: boolean): Codeausgabe {
  // Pydantic wertet "str | None" zur Laufzeit aus (ab 3.10); datetime.fromisoformat liest "Z" erst ab 3.11
  const voraussetzung = pydantic ? "Python ab 3.10 und Pydantic 2" : `Python ab ${enthaelt(m, "zeitpunkt") ? "3.11" : "3.7"}`;
  const klasse = (k: Klasse) => (pydantic ? klassePydantic(k, o) : klasseDataclass(k, o));
  const datei = (ks: readonly Klasse[], extra: string[] = []): string => {
    const rumpf = ks.flatMap((k, i) => [...(i ? ["", ""] : []), ...klasse(k)]).join("\n");
    return [`# ${o.kopf}`, `# Braucht ${voraussetzung}`, ...importe(rumpf, pydantic), ...extra, "", "", rumpf, ""].join("\n");
  };
  const modul = (n: string) => n.replace(/(\p{Ll})(\p{Lu})/gu, "$1_$2").toLowerCase();
  const dateien = o.jeKlasse
    ? m.klassen.map((k) => {
        const braucht = [...new Set(k.felder.flatMap((f) => [...klassenIn(f.typ)]))].filter((n) => n !== k.name).sort();
        return { name: `${modul(k.name)}.py`, text: datei([k], braucht.map((n) => `from .${modul(n)} import ${n}`)) };
      })
    : [{ name: `${modul(o.dateistamm)}.py`, text: datei(m.klassen) }];
  const w = m.wurzel;
  const einlesen = pydantic
    ? w.art === "klasse" ? `daten = ${w.name}.model_validate_json(text)` : `from pydantic import TypeAdapter\n\ndaten = TypeAdapter(${typ(w)}).validate_json(text)`
    : w.art === "klasse" ? `import json\n\ndaten = ${w.name}.from_dict(json.loads(text))` : `import json\n\ndaten = ${umwandeln(w, "json.loads(text)") ?? "json.loads(text)"}`;
  return {
    dateien,
    abbildung: abbildungen(m, feldtyp),
    einlesen,
    hinweis: pydantic ? "Grenzen aus dem Schema stehen als Field(...) und werden beim Einlesen geprüft." : "Grenzen aus dem Schema stehen als Kommentar am Feld; dataclasses prüfen sie nicht.",
    voraussetzung,
  };
}

export const PYDANTIC: Codeziel = { kennung: "pydantic", name: "Python (Pydantic)", sprache: "python", namensraum: false, schreiben: (m, o) => schreiben(m, o, true) };
export const DATACLASSES: Codeziel = { kennung: "dataclasses", name: "Python (dataclasses)", sprache: "python", namensraum: false, schreiben: (m, o) => schreiben(m, o, false) };
