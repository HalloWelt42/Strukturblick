# Strukturblick 2.0: Plan

Stufen als Tickets im Board "Strukturblick" (STB) der Pinnwand. Architektur: `docs/ARCHITEKTUR.md`.

| Stufe | Ticket | Inhalt |
|---|---|---|
| 1 | STB-2 | Entwürfe (abgenommen 11.11.2026), Ordner `entwuerfe/` |
| 2 | STB-3 | Neuer Kern: Sitzung, Verlauf, Strukturindex, Worker; Formate JSON, NDJSON, CSV, YAML; Schale, Editor, Baum, Tabelle, Inspektor; Ablage im Browser |
| 3 | STB-4 | Betrieb: Bauart mit Server auf pi5b (Docker arm64, Ablage, Anmeldung, Leitstelle), Bauart ohne Server auf GitHub Pages, Fassung lädt von selbst, Handbuch |
| 4 | STB-5 | Abfrage: jq, SQL (DuckDB-WASM), JSONPath, XPath, Suche |
| 5 | STB-6 | Bereinigen: Facetten, ähnliche Werte, Typen |
| 6 | STB-7 | Rezepte aus dem Verlauf |
| 7 | STB-8 | Übrige Ansichten und Werkzeuge, weitere Formate (TOML, XML, XLSX, Markdown- und HTML-Tabellen) |

## Stufe 2 im Einzelnen

1. Gerüst `app/`: Svelte 5, TypeScript streng, Vite, Vitest; Schriften und Symbole über npm; Marken aus den Entwürfen.
2. Kern: Pfade nach RFC 6901, Strukturindex (typisierte Felder), Sitzung mit Befehlen (Werte geprüft mit zod), Verlauf aus Änderungsmengen mit Umkehrung.
3. Formate hinter dem Vertrag: JSON (eigener Leser mit Spannen), NDJSON, CSV (Dialekt erkennen, Spannen je Zelle, Quoting beim Schreiben), YAML (Bibliothek `yaml` mit Bereichen).
4. Worker: liest im Hintergrund, Antwort mit Revision, Felder ohne Kopie übertragen, veraltete Aufträge abbrechen.
5. Zustand: Arbeitsblätter, Einstellungen (Thema, Schriftstufe je Gerät).
6. Oberfläche nach den Entwürfen: Schale, Editor (CodeMirror 6), Baum (virtualisiert), Tabelle (virtualisiert, Zellen bearbeiten), Inspektor (Pfad kopieren, alle Werte dieses Pfads), Meldung mit Rückgängig, Verlauf im Kopf.
7. Ablage im Browser (IndexedDB): Text je Revision verzögert sichern, Datei öffnen, Herunterladen.
8. Prüfung im Browser in allen Breiten neben den Entwürfen, Rauchtest von Konsole und Netz.

Die alte Fassung (`frontend/`, `backend/`) bleibt bis zur Ablösung in Stufe 3 liegen und wird dann entfernt.
