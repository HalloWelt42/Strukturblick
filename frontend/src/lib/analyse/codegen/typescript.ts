// Zielsprache TypeScript: je Klasse ein exportiertes Interface für die Daten aus JSON.parse. Datum und Zeitpunkt bleiben
// Text (JSON kennt kein Datum), der Kommentar nennt das Format; optionale Felder bekommen ?, null-fähige "| null".
// Unveränderlich heißt readonly an Feldern und Listen. Schlüssel, die kein Bezeichner sind, stehen in Anführungszeichen.

import { feldKommentar, klassenIn, type Feld, type Feldtyp, type Klasse, type Klassenmodell } from "./modell";
import { abbildungen, type Codeausgabe, type Codeoptionen, type Codeziel } from "./ziele";

const EIN = "  ";
const istBezeichner = (s: string): boolean => /^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(s);

function typ(t: Feldtyp, o: Codeoptionen): string {
  switch (t.art) {
    case "text":
    case "datum":
    case "zeitpunkt": return "string";
    case "ganz":
    case "zahl": return "number";
    case "wahrheit": return "boolean";
    case "null": return "null";
    case "klasse": return t.name;
    case "liste": {
      const innen = typ(t.von, o);
      const klammern = /[|&]/.test(innen) ? `(${innen})` : innen;
      return `${o.unveraenderlich ? "readonly " : ""}${klammern}[]`;
    }
    case "aufzaehlung": return t.werte.map((w) => JSON.stringify(w)).join(" | ") || "never";
    case "vereinigung": return t.teile.map((x) => typ(x, o)).join(" | ");
    default: return "unknown";
  }
}

const feldtyp = (f: Feld, o: Codeoptionen): string => `${typ(f.typ, o)}${f.nullbar ? " | null" : ""}`;

function kommentar(f: Feld): string | null {
  const c = feldKommentar(f, f.typ.art === "datum" ? "Datum JJJJ-MM-TT" : f.typ.art === "zeitpunkt" ? "Zeitpunkt nach ISO 8601" : null);
  return c ? `/** ${c.replace(/\*\//g, "* /")} */` : null;
}

function klasseSchreiben(k: Klasse, o: Codeoptionen): string[] {
  const z: string[] = [];
  if (k.beschreibung) z.push(`/** ${k.beschreibung} */`);
  z.push(`export interface ${k.name} {`);
  for (const f of k.felder) {
    const c = kommentar(f);
    if (c) z.push(`${EIN}${c}`);
    z.push(`${EIN}${o.unveraenderlich ? "readonly " : ""}${istBezeichner(f.name) ? f.name : JSON.stringify(f.name)}${f.pflicht ? "" : "?"}: ${feldtyp(f, o)};`);
  }
  z.push("}");
  return z;
}

export const TYPESCRIPT: Codeziel = {
  kennung: "typescript",
  name: "TypeScript",
  sprache: "typescript",
  namensraum: false,
  schreiben(m: Klassenmodell, o: Codeoptionen): Codeausgabe {
    const w = m.wurzel;
    const wurzelAlias = w.art === "klasse" ? null : [`export type ${o.wurzelname} = ${typ(w, o)};`];
    const kopf = [`// ${o.kopf}`, ""];
    let dateien;
    if (o.jeKlasse) {
      dateien = m.klassen.map((k) => {
        const braucht = [...new Set(k.felder.flatMap((f) => [...klassenIn(f.typ)]))].filter((n) => n !== k.name).sort();
        const importe = braucht.map((n) => `import type { ${n} } from "./${n}";`);
        return { name: `${k.name}.ts`, text: [...kopf, ...importe, ...(importe.length ? [""] : []), ...klasseSchreiben(k, o), ""].join("\n") };
      });
      if (wurzelAlias) {
        const braucht = [...klassenIn(w)].sort();
        dateien.push({ name: `${o.wurzelname}.ts`, text: [...kopf, ...braucht.map((n) => `import type { ${n} } from "./${n}";`), "", ...wurzelAlias, ""].join("\n") });
      }
    } else {
      const teile = m.klassen.flatMap((k, i) => [...(i ? [""] : []), ...klasseSchreiben(k, o)]);
      dateien = [{ name: `${o.dateistamm}.ts`, text: [...kopf, ...(wurzelAlias ? [...wurzelAlias, ""] : []), ...teile, ""].join("\n") }];
    }
    const name = w.art === "klasse" ? w.name : o.wurzelname;
    return {
      dateien,
      abbildung: abbildungen(m, (f) => feldtyp(f, o)),
      einlesen: `const daten = JSON.parse(text) as ${name};`,
      hinweis: "Typen für JSON.parse; Formate und Grenzen stehen als Kommentar am Feld, zur Laufzeit prüft TypeScript sie nicht.",
    };
  },
};
