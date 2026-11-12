// Miniprojekt Python: Paket klassen/ mit den erzeugten Modulen, die Daten unter daten/ und lesen.py. dataclasses
// brauchen nichts weiter; Pydantic steht in requirements.txt und prüft die Grenzen beim Einlesen.

import { klassenIn, type Klassenmodell } from "./modell";
import { pyDateien, pyModul, pyTyp, pyVoraussetzung, pyWurzelDataclass } from "./python";
import type { Codedatei, Codeoptionen, Miniprojektdaten } from "./ziele";

export function pythonMiniprojekt(m: Klassenmodell, o: Codeoptionen, daten: Miniprojektdaten, pydantic: boolean): Codedatei[] {
  const dateien = pyDateien(m, o, pydantic);
  const w = m.wurzel;
  const modulVon = (k: string) => (o.jeKlasse ? pyModul(k) : pyModul(o.dateistamm));
  const importe = [...klassenIn(w)].sort().map((k) => `from klassen.${modulVon(k)} import ${k}`);
  const pfad = `Path(__file__).parent / "daten" / ${JSON.stringify(daten.name)}`;
  const einlesen = pydantic
    ? [
        "from pydantic import TypeAdapter, ValidationError",
        "",
        ...importe,
        "",
        `text = (${pfad}).read_text(encoding="utf-8")`,
        "try:",
        `    wurzel = TypeAdapter(${pyTyp(w)}).validate_json(text)`,
        "except ValidationError as fehler:",
        '    print(f"Prüfung: {fehler.error_count()} Verstöße")',
        "    for f in fehler.errors()[:20]:",
        '        print("  " + ".".join(str(t) for t in f["loc"]) + ": " + f["msg"])',
        "    raise SystemExit(1)",
        'print("Prüfung: alles passt")',
      ]
    : ["import json", "", ...importe, "", `wurzel = ${pyWurzelDataclass(m, `json.loads((${pfad}).read_text(encoding="utf-8"))`)}`];
  const lesen = [
    `"""Liest daten/${daten.name} in die Klassen unter klassen/ und zeigt eine Übersicht."""`,
    "",
    "from pathlib import Path",
    ...einlesen,
    "",
    'print(f"Gelesen: {type(wurzel).__name__}")',
    'teile = vars(wurzel) if hasattr(wurzel, "__dict__") else dict(enumerate(wurzel))',
    "for name, wert in list(teile.items())[:20]:",
    '    zeile = f"{len(wert)} Einträge" if isinstance(wert, list) else repr(wert)',
    '    print(f"  {name}: {zeile[:100]}")',
    "",
  ].join("\n");
  const readme = [
    `# ${o.wurzelname}: Klassen zu ${daten.name}`,
    "",
    `${o.kopf}. Braucht ${pyVoraussetzung(m, pydantic)}.`,
    "",
    "## Ausprobieren",
    "",
    ...(pydantic
      ? ["    python3 -m venv .venv", "    . .venv/bin/activate", "    pip install -r requirements.txt", "    python lesen.py", "", `Liest daten/${daten.name} in die Klassen unter klassen/, prüft die Grenzen und zeigt eine Übersicht.`]
      : ["    python3 lesen.py", "", `Liest daten/${daten.name} in die Klassen unter klassen/ und zeigt eine Übersicht. Ohne weitere Installation.`]),
    "",
  ].join("\n");
  return [
    { name: "klassen/__init__.py", text: "" },
    ...dateien.map((d) => ({ name: `klassen/${d.name}`, text: d.text })),
    { name: "lesen.py", text: lesen },
    ...(pydantic ? [{ name: "requirements.txt", text: "pydantic>=2\n" }] : []),
    { name: `daten/${daten.name}`, text: daten.text },
    { name: "README.md", text: readme },
  ];
}
