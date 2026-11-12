"""Anweisungen an das Sprachmodell je Aufgabe (STB-60). Die Antwortform ist für alle gleich: `ergebnis` (Text, Ausdruck
oder JSON-Text) und `erklaerung` (kurze Sätze). Was das Modell über das Dokument weiß, steht allein im Auszug, den die
Oberfläche baut; Tabellen für SQL und die Erzeuger der Testdaten bringt sie dort mit, damit es eine Wahrheit gibt."""

from typing import Any

from .modelle import Aufgabe, Auftrag, Zielsprache

TITEL: dict[Aufgabe, str] = {
    "erklaeren": "Daten erklären",
    "abfrage": "Frage in Abfrage übersetzen",
    "schema": "Schema aus Beschreibung",
    "beschreibung": "Beschreibung aus Schema",
    "testdaten": "Testdaten vorschlagen",
}

GRUNDLAGE = """Du hilfst in Strukturblick, einem Werkzeug für Strukturdaten wie JSON, CSV, YAML, XML und TOML.
Du bekommst einen Auszug aus einem Dokument: Name, Format, Felder mit Typen und bis zu 20 Beispieleinträge, nie das
ganze Dokument. Rechne damit, dass die übrigen Einträge ähnlich aussehen, aber anders geschrieben sein können.
Schreibe Deutsch, nur gerade Anführungszeichen und den einfachen Bindestrich, keine Gedankenstriche.
Antworte nur mit einem JSON-Objekt {"ergebnis": "...", "erklaerung": ["...", "..."]}.
"erklaerung" sind zwei bis fünf kurze Sätze, je einer pro Punkt, ohne Aufzählungszeichen."""

SPRACHEN: dict[Zielsprache, str] = {
    "sql": """Schreibe eine einzige SELECT-Abfrage für SQLite. Die Tabellen und Spalten stehen im Auszug unter
"SQL-Tabellen"; nimm genau diese Namen. Nur lesen: kein INSERT, UPDATE, DELETE, CREATE, DROP oder PRAGMA.
Achte auf Schreibweisen aus den Beispielen: Groß und klein, Leerzeichen am Rand, Abkürzungen, deutsche Beträge wie
1.234,50 als Text (dann Punkt entfernen, Komma zu Punkt und mit CAST(... AS REAL) vergleichen).""",
    "jq": """Schreibe einen jq-Ausdruck (jq 1.7), der auf dem ganzen Dokument läuft. Der Auszug zeigt die Pfade in
jq-Schreibweise. Nimm keine Funktionen, die jq 1.7 nicht kennt.""",
    "jsonpath": """Schreibe einen JSONPath-Ausdruck nach RFC 9535, beginnend mit $. Filter mit ?(...) und @ sind
erlaubt, Funktionen nur length, count, match, search und value.""",
    "xpath": """Schreibe einen XPath-1.0-Ausdruck auf dem XML-Dokument. Namensräume stehen im Auszug, wenn es welche
gibt; nutze dann ihre Vorsilben.""",
}

AUFGABEN: dict[Aufgabe, str] = {
    "erklaeren": """Erkläre, was in den Daten steht: wofür das Dokument da ist und was die wichtigen Felder bedeuten.
"ergebnis" ist Markdown: ein bis zwei Sätze Einleitung, dann eine Liste "- `feld`: Bedeutung" für die wichtigen Felder.
Ist eine Frage gestellt, beantworte zuerst sie. In "erklaerung" stehen Auffälligkeiten (gemischte Schreibweisen,
leere Werte, Zahlen als Text) und was unsicher bleibt.""",
    "abfrage": """Übersetze die Frage in eine Abfrage. "ergebnis" ist nur der Ausdruck, ohne Codezaun und ohne
Kommentar. In "erklaerung" steht, wie der Ausdruck die Frage liest und welche Annahmen er trifft, etwa ob "mehr als"
die Grenze einschließt.""",
    "schema": """Schreibe ein JSON Schema (Entwurf 2020-12) nach der Beschreibung in der Frage. Gibt es einen Auszug,
nimm seine Feldnamen, wo sie passen, und beschreibe das ganze Dokument so, wie der Auszug es liest: Ist die Wurzel eine
Liste, ist das Schema "type": "array" und der beschriebene Eintrag steht unter "items"; liegt die Liste in einem Feld,
steht sie dort. "ergebnis" ist das Schema als JSON-Text mit zwei Leerzeichen eingerückt, mit "$schema", "title" und
"type". In "erklaerung" stehen die Entscheidungen: Pflichtfelder, Formate, Grenzen.""",
    "beschreibung": """Im Auszug steht ein JSON Schema. Ergänze zu jeder Eigenschaft und zu jedem Typ ein deutsches
"description" mit einem kurzen Satz. Ändere sonst nichts: keine Felder, Typen oder Grenzen dazu oder weg. Ist eine
Frage gestellt, beachte sie. "ergebnis" ist das ganze Schema als JSON-Text mit zwei Leerzeichen eingerückt.""",
    "testdaten": """Im Auszug stehen die Felder einer Liste mit dem bisherigen Vorschlag (ein Erzeuger je Feld) und
die verfügbaren Erzeuger mit ihren Einstellungen. Wähle je Feld den passendsten Erzeuger nach Feldname, Beispielen
und Frage. Erfinde keine Erzeuger und keine Einstellungen. Nie echte Personen, Firmen oder Domains; E-Mail-Adressen
nur mit Domains auf .example. "ergebnis" ist JSON-Text der Form
{"felder": [{"pfad": "...", "erzeuger": "...", "einstellungen": {}, "leer": {"anteil": 0, "als": "fehlt"}}]}
mit genau den Pfaden aus dem Auszug in ihrer Reihenfolge. In "erklaerung" steht, wo du vom Vorschlag abweichst.""",
}

#: Feste Antwortform (JSON Schema) für response_format
ANTWORT: dict[str, Any] = {
    "type": "object",
    "properties": {"ergebnis": {"type": "string"}, "erklaerung": {"type": "array", "items": {"type": "string"}}},
    "required": ["ergebnis", "erklaerung"],
    "additionalProperties": False,
}


def system(a: Auftrag) -> str:
    teile = [GRUNDLAGE, AUFGABEN[a.aufgabe]]
    if a.aufgabe == "abfrage" and a.sprache:
        teile.append(SPRACHEN[a.sprache])
    return "\n\n".join(teile)


def nutzer(a: Auftrag) -> str:
    teile = [f"Aufgabe: {TITEL[a.aufgabe]}"]
    if a.frage.strip():
        teile.append(f"Frage: {a.frage.strip()}")
    if a.auszug.strip():
        teile.append(f"Auszug:\n{a.auszug.strip()}")
    if a.vorher:
        teile.append(f"Der vorige Vorschlag war:\n{a.vorher}\nSchlage etwas anderes vor, mit einem anderen Ansatz.")
    return "\n\n".join(teile)
