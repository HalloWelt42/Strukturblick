# Strukturblick

Strukturdaten ansehen, prüfen und umbauen: JSON, NDJSON, CSV und YAML als Baum, im Editor und als Tabelle, mit einem
Inspektor, der den Pfad des Gewählten in jq, JSONPath, JSON Pointer, PHP, Python und TypeScript kopiert und alle Werte
desselben Pfads zählt. Alle Ansichten arbeiten auf demselben Text: eine Änderung in der Tabelle ist eine Änderung an
genau dieser Stelle im Text, CSV-Dialekt, Kommentare und Formatierung bleiben erhalten. Rückgängig gilt für alle
Ansichten gemeinsam, der Verlauf übersteht das Neuladen.

## Ausprobieren

- **Im Browser, ohne Einrichtung: https://hallowelt42.github.io/Strukturblick/** (alles bleibt im Browser)
- Entwürfe aller Ansichten: https://hallowelt42.github.io/Strukturblick/entwuerfe/index.html

## Zwei Bauarten

- **Ohne Server** (GitHub Pages oder jede statische Ablage): Parsen, Abfragen und Prüfen rechnen im Browser, die
  Dokumente liegen im Browser, gesichert wird per Herunterladen.
- **Mit Server** (eigener Rechner, Docker): dazu Anmeldung, Ablage der Dokumente für alle Geräte und neue Fassungen,
  die von selbst laden. Das Backend nutzt das Gerüst [Appkern](https://github.com/HalloWelt42/appkern).

## Entwickeln

```bash
./einrichten.sh                         # Python-Umgebung, Pakete, Bau, Git-Haken
cd frontend && npm run dev:eigenstaendig  # Bauart ohne Server, http://localhost:6011
cd frontend && npx vitest run           # Tests der Oberfläche
cd backend && .venv/bin/python -m pytest -q
```

Aufbau und harte Regeln: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md), [architektur/regeln.toml](architektur/regeln.toml);
Stufen: [docs/PLAN.md](docs/PLAN.md). Die Regeln prüft der Git-Haken bei jedem Commit.

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
