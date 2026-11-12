// Miniprojekt TypeScript: die Typen unter src/, die Daten unter daten/ und src/lesen.ts. Läuft mit Node ab 22.18 direkt
// (node src/lesen.ts, Typen werden nur entfernt) oder nach npm install über tsc, das die Typen auch prüft.

import type { Klassenmodell } from "./modell";
import { TYPESCRIPT } from "./typescript";
import type { Codedatei, Codeoptionen, Miniprojektdaten } from "./ziele";

const paket = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "daten";

export function typescriptMiniprojekt(m: Klassenmodell, o: Codeoptionen, daten: Miniprojektdaten): Codedatei[] {
  const a = TYPESCRIPT.schreiben(m, o);
  const w = m.wurzel;
  const typname = w.art === "klasse" ? w.name : o.wurzelname;
  const modul = o.jeKlasse ? typname : o.dateistamm;
  const lesen = [
    `// Liest daten/${daten.name} und zeigt eine Übersicht. Die Typen prüft tsc beim Übersetzen, nicht zur Laufzeit.`,
    'import { readFileSync } from "node:fs";',
    `import type { ${typname} } from "./${modul}";`,
    "",
    `const wurzel = JSON.parse(readFileSync(new URL("../daten/${daten.name}", import.meta.url), "utf8")) as ${typname};`,
    "",
    `console.log(${JSON.stringify(`Gelesen: ${typname}`)});`,
    "for (const [name, wert] of Object.entries(Object(wurzel) as Record<string, unknown>).slice(0, 20)) {",
    '  const zeile = Array.isArray(wert) ? `${wert.length} Einträge` : JSON.stringify(wert) ?? String(wert);',
    "  console.log(`  ${name}: ${zeile.slice(0, 100)}`);",
    "}",
    "",
  ].join("\n");
  const paketjson = {
    name: paket(o.dateistamm),
    private: true,
    type: "module",
    scripts: { start: "tsc && node dist/lesen.js" },
    devDependencies: { typescript: "^5.6.0", "@types/node": "^22.0.0" },
  };
  const tsconfig = {
    compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, outDir: "dist", rootDir: "src", types: ["node"], skipLibCheck: true },
    include: ["src"],
  };
  const readme = [
    `# ${o.wurzelname}: Typen zu ${daten.name}`,
    "",
    `${o.kopf}. Braucht ${a.voraussetzung}, zum Ausführen Node.`,
    "",
    "## Ausprobieren",
    "",
    "    npm install",
    "    npm start",
    "",
    `Übersetzt mit tsc (prüft die Typen) und liest daten/${daten.name}.`,
    "",
    "Ab Node 22.18 geht es auch ohne Installation:",
    "",
    "    node src/lesen.ts",
    "",
  ].join("\n");
  return [
    ...a.dateien.map((d) => ({ name: `src/${d.name}`, text: d.text })),
    { name: "src/lesen.ts", text: lesen },
    { name: "package.json", text: `${JSON.stringify(paketjson, null, 2)}\n` },
    { name: "tsconfig.json", text: `${JSON.stringify(tsconfig, null, 2)}\n` },
    { name: `daten/${daten.name}`, text: daten.text },
    { name: "README.md", text: readme },
  ];
}
