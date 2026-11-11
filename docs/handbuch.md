---
zweck: "Zeigt, prüft und baut Strukturdaten um (JSON, NDJSON, CSV, YAML): Baum, Editor, Tabelle und Inspektor auf einem Text mit gemeinsamem Verlauf; mit Server auf pi5b, ohne Server auf GitHub Pages."
geraet: [pi5b]
abhaengigkeiten: [kellerwolke, appkern, vorbau]
daten:
  - "pi5b: `{{wurzel}}/daten/strukturblick.sqlite` (Dokumente samt Verlauf und Arbeitsstand je Konto, Einstellungen, Protokoll)"
  - "Bauart ohne Server (GitHub Pages): nur im Browser des Geräts (IndexedDB `strukturblick-2`), sichern per Herunterladen"
sicherung:
  - "nach der Regel des Appkerns eine Kopie von `strukturblick.sqlite` nach `{{wurzel}}/sicherungen`, wöchentlich und vor dem Ausrollen (nur, wenn die jüngste älter als 24 Stunden ist), höchstens drei Stände"
schluessel_orte:
  - "pi5b: `{{wurzel}}/.env`: Adresse und App-Schlüssel der Kellerwolke als feste Einstellung, vom Ausrollen gesetzt"
  - "pi5b: `{{wurzel}}/zertifikate/`: Blattzertifikat mit Schlüssel aus der Hausstelle (vom Ausrollen)"
einrichten: einrichten.sh
stand: 36092f8
---

# Strukturblick

## Zweck

Strukturblick öffnet Strukturdaten (JSON, NDJSON, CSV, YAML) und zeigt sie als Baum, im Editor und als Tabelle;
der Inspektor zeigt das Gewählte, kopiert seinen Pfad (jq, JSONPath, Zeiger, PHP, Python, TypeScript) und zählt
alle Werte desselben Pfads. Alle Ansichten arbeiten auf demselben Text: eine Änderung in der Tabelle ist eine
Textänderung an genau dieser Stelle, CSV-Dialekt, Kommentare und Formatierung bleiben. Rückgängig gilt für alle
Ansichten gemeinsam, der Verlauf bleibt beim Neuladen erhalten.

Zwei Bauarten aus demselben Code:

- Mit Server auf pi5b: Anmeldung mit dem Kellerwolke-Konto, Dokumente liegen in der Datenbank der App und sind auf
  allen Geräten gleich. Adresse: {{adresse}}, im Heimnetz `https://strukturblick.pi5b.lan`. Fassung {{fassung}}.
- Ohne Server auf GitHub Pages (`https://hallowelt42.github.io/Strukturblick/`): rechnet und speichert alles im
  Browser, ohne Anmeldung; gesichert wird per Herunterladen.

Aufbau und Regeln: `docs/ARCHITEKTUR.md` und `architektur/regeln.toml` im Repo.

## Was sie braucht

- pi5b mit Docker und der Vorbau von pi5b, der `strukturblick.pi5b.lan` an den Vorschaltdienst der App reicht.
- [[Kellerwolke]]: Konto zum Anmelden, den App-Schlüssel besorgt das Ausrollen.
- Mac nach [[Grundlage Mac]] für Entwicklung und Ausrollen; Node 22 für die Oberfläche.
- Für GitHub Pages: das öffentliche Repo HalloWelt42/Strukturblick mit eingeschaltetem Pages (Quelle GitHub Actions).

## Neu einrichten

Zwei Wege. Aus der Sicherung: `strukturblick.sqlite` zurückspielen, dann sind Dokumente, Verlauf und Arbeitsstand
aller Konten wie vorher. Frisch: leere Datenbank; jedes Konto beginnt ohne Dokumente.

### 1. Klon und Entwicklungsumgebung am Mac

```
git clone {{repo}} {{ordner}}
cd {{ordner}} && ./einrichten.sh
```

Probe: `backend/.venv/bin/python -m pytest -q` und `cd frontend && npx vitest run` sind grün.

### 2. Ausrollen auf pi5b

```
tools/ausrollen.sh
```

Baut auf pi5b unter {{wurzel}}, besorgt den App-Schlüssel der Kellerwolke und startet die App hinter ihrem
Vorschaltdienst. Danach den Vorbau von pi5b ausrollen (`~/Entwicklung/Werkzeuge/Vorbau/tools/ausrollen-pi.sh
vorbau-pi5b`), damit der Name `strukturblick.pi5b.lan` gilt.

Probe: {{adresse}}/api/v1/app antwortet mit der Fassung; `https://strukturblick.pi5b.lan` zeigt die Anmeldung, nach
dem Anmelden den Arbeitsplatz.

### 3. Bauart ohne Server auf GitHub Pages

Der Ablauf `.github/workflows/pages.yml` baut bei jedem Push auf `main` die Bauart ohne Server
(`npm run build:eigenstaendig`) und veröffentlicht sie. Einmalig: im Repo Settings, Pages, Source "GitHub Actions".

Probe: `https://hallowelt42.github.io/Strukturblick/` zeigt den Arbeitsplatz ohne Anmeldung; eine hineingezogene
Datei erscheint im Baum, nach dem Neuladen ist sie noch da.

## Sicherung und Rückspielen

Die Datenbank sichert der Appkern nach seiner Regel nach {{wurzel}}/sicherungen. Zurückspielen: App anhalten
(`docker compose -f compose.pi.yml stop strukturblick` in {{wurzel}}), Kopie als `daten/strukturblick.sqlite`
ablegen, starten. Prüfen: nach dem Anmelden sind die Dokumente in der Leiste wie vorher. Die Bauart ohne Server hat
keine Sicherung auf dem Server; dort hilft nur das Herunterladen der Dokumente.

## Wenn etwas klemmt

- Die Anmeldung meldet "Code gilt nicht": der Code stammt aus einer anderen Kellerwolke. Die Anmeldeseite nennt die
  Adresse der Kellerwolke, an der die App hängt.
- Ein großes Dokument wird nicht abgelegt (Fuß zeigt dauerhaft "Wird abgelegt"): Grenze der Ablage 100 MB je
  Dokument, darüber antwortet sie mit 413; der Vorbau reicht ohne `koerper_max` höchstens 200 MB weiter.
- Ein offener Tab zeigt nach dem Ausrollen noch die alte Fassung: er lädt von selbst neu, sobald alles abgelegt ist;
  solange ein Dokument noch "Wird abgelegt" zeigt, wartet er.
- YAML-Dateien über einigen MB brauchen Sekunden zum Lesen (Bibliothek `yaml`); die Oberfläche bleibt dabei
  bedienbar, der Fuß zeigt "liest".
