# Strukturblick

Lokaler, webbasierter Assistent für Strukturdokumente: JSON, XML, CSV, YAML, TOML, NDJSON, XLSX sowie Markdown- und HTML-Tabellen bildhaft darstellen, durchsuchen, filtern, vergleichen, analysieren, transformieren und exportieren. Mit Schema-Werkzeugen (JSON Schema, XSD), Code-Generierung und optionalen KI-Funktionen über ein lokales Sprachmodell.

## Aktueller Stand

Das Projekt befindet sich in der Mockup-Phase: Alle Ansichten liegen als klickbare HTML-Seiten mit dem echten Design-Token-System vor. Die Umsetzung (Python/FastAPI-Backend + Svelte-5-Frontend) folgt auf Basis dieser Mockups.

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
