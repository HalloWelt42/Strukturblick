// Code erzeugen: JSON Schema zu Klassenmodell (Verweise, eingebettete Objekte, null, enum, Grenzen) und die vier
// Zielsprachen an bestellung.schema.json und an Sonderfällen (Schlüssel, die kein Bezeichner sind, optionale Klassen,
// Listen von Datumswerten, Wurzel als Liste).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { alsJsonSchema, schemaAbleiten } from "../schema";
import { ausJsonSchema } from "./ausJsonSchema";
import { codeziel } from "./codeziele";
import type { Codeoptionen } from "./ziele";

const lies = (name: string) => readFileSync(new URL(`../../../../pruefdaten/${name}`, import.meta.url), "utf8");
const OPTIONEN: Codeoptionen = { wurzelname: "Bestellungen", namensraum: "Lindenhof\\Bestellungen", unveraenderlich: true, jeKlasse: false, kopf: "Erzeugt von Strukturblick aus bestellung.schema.json", dateistamm: "bestellungen", attribute: false };
const BESTELLUNG = ausJsonSchema(JSON.parse(lies("bestellung.schema.json")), "Bestellungen");
const code = (ziel: string, o: Partial<Codeoptionen> = {}) => codeziel(ziel).schreiben(BESTELLUNG, { ...OPTIONEN, ...o });

const SONDERFAELLE = {
  type: "array",
  items: {
    type: "object",
    required: ["@nr", "class", "termine"],
    properties: {
      "@nr": { type: "string" },
      class: { enum: ["a", "b", null] },
      termine: { type: "array", items: { type: "string", format: "date" } },
      ort: { anyOf: [{ $ref: "#/$defs/Ort" }, { type: "null" }] },
      wert: { type: ["integer", "string"] },
    },
  },
  $defs: { Ort: { type: "object", required: ["plz"], properties: { plz: { type: "string", pattern: "^[0-9]{5}$" } } } },
};

describe("Klassenmodell aus JSON Schema", () => {
  it("liest Klassen, Typen, Pflicht, null und Grenzen", () => {
    expect(BESTELLUNG.klassen.map((k) => k.name)).toEqual(["Bestellungen", "Bestellung", "Kunde", "Position"]);
    const b = BESTELLUNG.klassen[1];
    expect(b.felder.map((f) => [f.name, f.typ.art, f.pflicht, f.nullbar])).toEqual([
      ["nr", "text", true, false], ["datum", "datum", true, false], ["kunde", "klasse", true, false],
      ["positionen", "liste", true, false], ["bezahlt", "wahrheit", true, false], ["notiz", "text", false, true],
    ]);
    expect(b.felder[3].regeln).toEqual({ minAnzahl: 1, maxAnzahl: 3 });
    expect(BESTELLUNG.klassen[3].felder.find((f) => f.name === "preis")!.regeln).toEqual({ minExklusiv: 0 });
  });

  it("nimmt eingebettete Objekte, enum mit null, anyOf mit null und eine Liste als Wurzel", () => {
    const m = ausJsonSchema(SONDERFAELLE, "Termine");
    expect(m.wurzel).toEqual({ art: "liste", von: { art: "klasse", name: "TermineEintrag" } });
    const f = m.klassen[0].felder;
    expect(f.find((x) => x.name === "class")).toMatchObject({ typ: { art: "aufzaehlung", werte: ["a", "b"] }, nullbar: true });
    expect(f.find((x) => x.name === "ort")).toMatchObject({ typ: { art: "klasse", name: "Ort" }, nullbar: true, pflicht: false });
    expect(f.find((x) => x.name === "wert")!.typ.art).toBe("vereinigung");
  });

  it("geht auch aus den Daten (abgeleitetes Schema)", () => {
    const text = lies("bestellungen.json");
    const index = format("json").lesen(text).index!;
    const m = ausJsonSchema(alsJsonSchema(schemaAbleiten(index, text), "bestellungen.json"), "Bestellungen");
    expect(m.klassen[0].name).toBe("Bestellungen");
    expect(m.klassen.length).toBeGreaterThan(2);
  });
});

describe("Zielsprachen", () => {
  it("PHP: readonly-Klassen mit fromArray, Datum, Listen und PHPDoc", () => {
    const [d] = code("php").dateien;
    expect(d.name).toBe("Bestellungen.php");
    expect(d.text).toContain("namespace Lindenhof\\Bestellungen;");
    expect(d.text).toContain("// Braucht PHP ab 8.2");
    expect(code("php").voraussetzung).toBe("PHP ab 8.2");
    expect(code("php", { unveraenderlich: false }).voraussetzung).toBe("PHP ab 8.1");
    expect(code("typescript").voraussetzung).toBe("TypeScript ab 3.4");
    expect(code("pydantic").voraussetzung).toBe("Python ab 3.10 und Pydantic 2");
    expect(code("dataclasses").voraussetzung).toBe("Python ab 3.11");
    expect(d.text).toContain("use DateTimeImmutable;");
    expect(d.text).toContain("final readonly class Bestellung\n");
    expect(d.text).toContain("public ?string $notiz = null,");
    expect(d.text).toContain("* @param list<Position> $positionen Der Lieferdienst nimmt höchstens drei Positionen je Bestellung an; 1 bis 3 Einträge");
    expect(d.text).toContain("datum: new DateTimeImmutable($daten['datum']),");
    expect(d.text).toContain("positionen: array_map(Position::fromArray(...), $daten['positionen']),");
    expect(d.text).toContain("notiz: $daten['notiz'] ?? null,");
    expect(code("php", { unveraenderlich: false }).dateien[0].text).toContain("final class Bestellung\n");
    expect(code("php", { jeKlasse: true }).dateien.map((x) => x.name)).toEqual(["Bestellungen.php", "Bestellung.php", "Kunde.php", "Position.php"]);
  });

  it("TypeScript: Interfaces mit readonly, optional und null", () => {
    const [d] = code("typescript").dateien;
    expect(d.name).toBe("bestellungen.ts");
    expect(d.text).toContain("export interface Bestellung {");
    expect(d.text).toContain("  readonly notiz?: string | null;");
    expect(d.text).toContain("  readonly positionen: readonly Position[];");
    expect(d.text).toContain("/** Datum JJJJ-MM-TT */");
    const listen = ausJsonSchema({ type: "object", properties: { matrix: { type: "array", items: { type: "array", items: { type: "integer" } } } } }, "Raster");
    expect(codeziel("typescript").schreiben(listen, OPTIONEN).dateien[0].text).toContain("readonly matrix?: readonly (readonly number[])[];");
    const je = code("typescript", { jeKlasse: true }).dateien;
    expect(je.find((x) => x.name === "Bestellung.ts")!.text).toContain('import type { Kunde } from "./Kunde";');
  });

  it("Python: Pydantic mit Field-Grenzen, dataclasses mit from_dict", () => {
    const p = code("pydantic").dateien[0].text;
    expect(p).toContain("class Bestellung(BaseModel):");
    expect(p).toContain("model_config = ConfigDict(frozen=True)");
    expect(p).toContain("positionen: list[Position] = Field(min_length=1, max_length=3, description=");
    expect(p).toContain("preis: float = Field(gt=0)");
    expect(p).toContain("notiz: str | None = Field(default=None)");
    expect(p).toContain("from datetime import date, datetime");
    const d = code("dataclasses").dateien[0].text;
    expect(d).toContain("@dataclass(frozen=True)\nclass Bestellung:");
    expect(d).toContain('datum=date.fromisoformat(d["datum"]),');
    expect(d).toContain('positionen=[Position.from_dict(x) for x in d["positionen"]],');
    expect(d).toContain('notiz=d.get("notiz"),');
  });

  it("macht aus Schlüsseln, die kein Bezeichner sind, gültige Namen", () => {
    const m = ausJsonSchema(SONDERFAELLE, "Termine");
    const o = { ...OPTIONEN, wurzelname: "Termine", dateistamm: "termine" };
    expect(codeziel("pydantic").schreiben(m, o).dateien[0].text).toContain('    nr: str = Field(alias="@nr")');
    expect(codeziel("pydantic").schreiben(m, o).dateien[0].text).toContain('class_: Literal["a", "b"] | None = Field(alias="class")');
    expect(codeziel("typescript").schreiben(m, o).dateien[0].text).toContain('readonly "@nr": string;');
    expect(codeziel("php").schreiben(m, o).dateien[0].text).toContain("            nr: $daten['@nr'],");
    expect(codeziel("dataclasses").schreiben(m, o).dateien[0].text).toContain('termine=[date.fromisoformat(x) for x in d["termine"]],');
  });
});

describe("Allgemein: Zuordnungen, allOf, nur Definitionen, reservierte Namen", () => {
  const SCHEMA = {
    definitions: {
      Basis: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      Error: { allOf: [{ $ref: "#/definitions/Basis" }, { type: "object", properties: { code: { type: "integer" } } }] },
      Import: { type: "object", properties: { werte: { type: "object", additionalProperties: { $ref: "#/definitions/Basis" } }, None: { type: "string" } } },
    },
  };
  const m = ausJsonSchema(SCHEMA, "Wurzel");

  it("liest Definitionen ohne Bezug, führt allOf zusammen und erkennt Zuordnungen", () => {
    expect(m.klassen.map((k) => k.name)).toEqual(["Basis", "Error", "Import"]);
    expect(m.klassen[1].felder.map((f) => [f.name, f.pflicht])).toEqual([["id", true], ["code", false]]);
    expect(m.klassen[2].felder[0].typ).toEqual({ art: "zuordnung", von: { art: "klasse", name: "Basis" } });
  });

  it("schreibt Zuordnungen je Sprache und benennt reservierte Klassen um", () => {
    const php = codeziel("php").schreiben(m, OPTIONEN).dateien[0].text;
    expect(php).toContain("final readonly class ErrorTyp");
    expect(php).toContain("* @param array<string, Basis>|null $werte");
    expect(php).toContain("werte: isset($daten['werte']) ? array_map(Basis::fromArray(...), $daten['werte']) : null,");
    expect(codeziel("typescript").schreiben(m, OPTIONEN).dateien[0].text).toContain("readonly werte?: Readonly<Record<string, Basis>>;");
    const py = codeziel("pydantic").schreiben(m, OPTIONEN).dateien[0].text;
    expect(py).toContain("class ImportTyp(BaseModel):".replace("ImportTyp", "Import"));
    expect(py).toContain("werte: dict[str, Basis] | None = Field(default=None)");
    expect(py).toContain('None_: str | None = Field(default=None, alias="None")');
    const dc = codeziel("dataclasses").schreiben(m, { ...OPTIONEN, jeKlasse: true }).dateien;
    expect(dc.map((d) => d.name)).toEqual(["basis.py", "error.py", "import_.py"]);
    expect(dc[2].text).toContain('werte={k: Basis.from_dict(v) for k, v in d["werte"].items()} if d.get("werte") is not None else None,');
  });
});

describe("Miniprojekt", () => {
  const daten = { name: "bestellungen.json", text: "{}" };
  it("bringt je Sprache Klassen, Daten, Leseprogramm, Abhängigkeiten und README mit", () => {
    const namen = (ziel: string, o: Partial<Codeoptionen> = {}) => codeziel(ziel).miniprojekt(BESTELLUNG, { ...OPTIONEN, ...o }, daten).map((d) => d.name);
    expect(namen("php", { attribute: true })).toEqual(["src/Bestellungen.php", "src/Bestellung.php", "src/Kunde.php", "src/Position.php", "composer.json", "lesen.php", "daten/bestellungen.json", "README.md"]);
    expect(namen("typescript")).toEqual(["src/bestellungen.ts", "src/lesen.ts", "package.json", "tsconfig.json", "daten/bestellungen.json", "README.md"]);
    expect(namen("pydantic")).toEqual(["klassen/__init__.py", "klassen/bestellungen.py", "lesen.py", "requirements.txt", "daten/bestellungen.json", "README.md"]);
    expect(namen("dataclasses")).toEqual(["klassen/__init__.py", "klassen/bestellungen.py", "lesen.py", "daten/bestellungen.json", "README.md"]);
    const php = codeziel("php").miniprojekt(BESTELLUNG, { ...OPTIONEN, attribute: true }, daten);
    expect(JSON.parse(php.find((d) => d.name === "composer.json")!.text)).toMatchObject({ require: { php: ">=8.2", "symfony/validator": "^7.0" }, autoload: { "psr-4": { "Lindenhof\\Bestellungen\\": "src/" } } });
    expect(php.find((d) => d.name === "lesen.php")!.text).toContain("$praefix = 'Lindenhof\\\\Bestellungen\\\\';");
    expect(php.find((d) => d.name === "src/Bestellung.php")!.text).toContain("#[Assert\\Count(min: 1, max: 3)]");
  });
});
