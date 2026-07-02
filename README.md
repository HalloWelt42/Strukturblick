# Strukturblick

Lokaler, webbasierter Assistent für Strukturdokumente: JSON, XML, CSV, YAML, TOML, NDJSON, XLSX sowie Markdown- und HTML-Tabellen bildhaft darstellen, durchsuchen, filtern, vergleichen, analysieren, transformieren und exportieren. Mit Schema-Werkzeugen (JSON Schema, XSD), Code-Generierung und optionalen KI-Funktionen über ein lokales Sprachmodell.

## Aktueller Stand

Die Anwendung ist weitgehend fertig. Verfügbar sind:

- Format-Engines: JSON (inklusive JSON5/JSONC-Toleranz), NDJSON, YAML, TOML, XML, CSV (mit Trennzeichen- und Encoding-Erkennung), XLSX-Import sowie Markdown- und HTML-Tabellen. Jedes Dokument wird auf einen einheitlichen Wertebaum mit Positionskarte abgebildet.
- Ansichten: Baum, Roh-Editor (Syntax, Diagnosen als Sprungziele, Format manuell wählbar), Tabelle (sortieren, filtern, Spalten verwalten, Werte übersetzen), Statistik mit Feld-Profil, Schema-Diagramm, Vergleich, Graph und ein schwebendes Lexikon.
- Werkzeuge: Abfrage (JSONPath, XPath, Volltext, regulärer Ausdruck), Schema ableiten und validieren (JSON Schema, XSD), Konvertieren mit Verlustbericht, Reparatur als Vorschau, Code erzeugen (TypeScript, Pydantic, Dataclasses, PHP 8.4+) und Testdaten.
- KI-Funktionen über ein lokales, OpenAI-kompatibles Sprachmodell (optional, Basis-URL in der App wählbar): Daten erklären, Frage in eine Abfrage übersetzen, Schema aus einer Beschreibung, Beschreibung aus einem Schema und Testdaten vorschlagen. Jedes Ergebnis erscheint als Vorschau und wird erst nach Bestätigung übernommen; ist kein Modell erreichbar, ist der Bereich ausgegraut, der Rest der App bleibt voll nutzbar.
- Dokumentverwaltung: gespeicherte Dokumente in einer Tabelle durchsuchen, nach Name sortieren, öffnen, herunterladen und löschen; Dateien per Auswahl, Zwischenablage oder Ablegen laden.
- Einstellungen in der App: Adresse und Modell des Sprachmodells, KI-Funktionen an- und abschalten, Größengrenzen fürs Öffnen, Theme-Wahl (Mittelton, Dunkel) sowie den gesamten Arbeitsstand als Datei exportieren und wieder einspielen (Ersetzen oder Zusammenführen).

Leitprinzip bleibt die Kopplung: jeder Fehler, Suchtreffer und Vergleichseintrag ist ein klickbares Sprungziel im Editor. Die Oberfläche folgt exakt den Mockups (Kopfleiste, Seitenleisten, Ansichtswahl, Statusleiste, Themes Mittelton und Dunkel); die Mockups bleiben der verbindliche Design-Leitfaden.

## Starten

```bash
./start.sh              # Backend (6000) + Frontend (6001), richtet beim ersten Mal alles ein
./start.sh status
./start.sh stop
```

- App: http://localhost:6001
- API-Doku (über den Proxy): http://localhost:6001/docs

Tests: `cd backend && .venv/bin/python -m pytest`

## Mockups ansehen

```bash
./start-mockups.sh           # startet auf Port 6009
./start-mockups.sh status
./start-mockups.sh stop
```

- Galerie aller Seiten: http://localhost:6009/mockups/index.html
- Viewer mit benannten UI-Elementen: http://localhost:6009/mockups/viewer.html

Voraussetzung: einmalig `npm install` im Ordner `frontend/` (liefert Schrift und Icons für die Mockups).

Jede Seite hat unten rechts einen Umschalter zwischen den Themes "Mittelton" (Standard) und "Dunkel". Die zentrale Datei `mockups/stil.css` enthält das komplette Token-System und wird bei der Umsetzung unverändert zur Token-Grundlage des Frontends.

## Geplanter Stack

| Baustein | Technik | Port |
|---|---|---|
| Backend | Python 3.12, FastAPI | 6000 |
| Frontend | Svelte 5, TypeScript, Vite | 6001 |
| Mockups | statisches HTML/CSS | 6009 |

Hinweis zu Port 6000: Browser blockieren diesen Port für direkte Aufrufe ("unsafe port"). Das ist hier unkritisch, weil der Browser nur mit dem Frontend (6001) spricht; der Entwicklungs-Server leitet `/api`, `/docs` und `/openapi.json` serverseitig an das Backend weiter. Die API-Doku ist damit unter http://localhost:6001/docs erreichbar.

## Projektstruktur

```
Strukturblick/
├── start-mockups.sh   # Mockup-Server (Port 6009)
├── version.json       # einzige Versionsquelle
├── mockups/           # klickbare HTML-Mockups, verbindlicher Design-Leitfaden
│   ├── index.html     # Galerie aller Seiten
│   ├── viewer.html    # Viewer mit nummerierten, benannten UI-Elementen
│   ├── stil.css       # zentrales Token-System (mittelton/dunkel) + alle Komponenten-Stile
│   └── *.html         # eine Seite je Ansicht/Zustand
├── frontend/          # Svelte-5-Frontend (Aufbau folgt; aktuell Schrift-/Icon-Pakete)
└── backend/           # FastAPI-Backend (Aufbau folgt)
```

## Unterstützen

Strukturblick ist ein privates Open-Source-Projekt. Kein Tracking, keine Werbung, keine Kompromisse.

Wenn dir das Projekt gefällt, kannst du hier "Danke sagen":

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/HalloWelt42)

**Crypto:**

| Coin | Adresse |
|------|---------|
| BTC | `bc1qnd599khdkv3v3npmj9ufxzf6h4fzanny2acwqr` |
| DOGE | `DL7tuiYCqm3xQjMDXChdxeQxqUGMACn1ZV` |
| ETH | `0x8A28fc47bFFFA03C8f685fa0836E2dBe1CA14F27` |

## Lizenz

Nicht-kommerzielle Lizenz v1.0 - siehe [LICENSE](LICENSE).

Copyright (c) 2026 HalloWelt42
