---
zweck: "Zeigt, prüft und baut Strukturdaten um (JSON, NDJSON, CSV, YAML): Baum, Editor, Tabelle und Inspektor auf einem Text mit gemeinsamem Verlauf; mit Server auf pi5b, ohne Server auf GitHub Pages."
geraet: [pi5b]
abhaengigkeiten: [kellerwolke, appkern, vorbau]
daten:
  - "pi5b: `{{wurzel}}/daten/strukturblick.sqlite` (Dokumente samt Verlauf, Ordner, Papierkorb und Arbeitsstand je Konto, Einstellungen, Protokoll)"
  - "Bauart ohne Server (GitHub Pages): nur im Browser des Geräts (IndexedDB `strukturblick-2`), sichern über Ablage, Alles sichern"
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

Die Seite Ablage (Ordnerknopf oben in der Leiste) verwaltet die Dokumente: Ordner (eine Ebene), Umbenennen,
Verschieben, Herunterladen, mehrere auf einmal wählen. Entfernen legt in den Papierkorb, die Meldung bietet
Rückgängig; nach 30 Tagen löscht die Ablage dort endgültig. "Alles sichern" schreibt alle Dokumente samt Verlauf und
Ordnern in eine Datei, "Einspielen" fügt eine solche Datei hinzu, ohne Vorhandenes zu überschreiben.

Zum Üben gibt es erfundene Beispieldaten: "Beispiele zum Üben" auf der Startseite, in der Ablage oder über die
Befehlspalette ("Beispiele öffnen"). Sie landen im Ordner Beispiele der eigenen Ablage: bestellungen.json (128
Bestellungen eines Hofladens), kunden.csv (1.214 Kunden mit absichtlichen Unsauberkeiten) und dienste.yaml. Ein
zweites Öffnen zeigt die vorhandenen samt Änderungen; frisch anfangen: die Beispiele in den Papierkorb legen.
Quelle ist frontend/pruefdaten; Adressen unter example.org, Telefonnummern aus dem für Film und Fernsehen
freigehaltenen Bereich 030 23125.

Die Abfrage am Fuß des Hauptbereichs (⌥ ⌘ E oder "Öffnen" in der Leiste) rechnet beim Tippen, ganz im Browser:

- jq (echtes jq 1.8 als WebAssembly) und JSONPath auf dem offenen Dokument; die Treffer erscheinen im Baum
  (F3 und ⇧ F3 springen), jeder Wert mit bekanntem Ort springt per Klick dorthin.
- SQL (SQLite im Browser) über alle offenen Dokumente: jedes Dokument ist eine Tabelle, Listen von Objekten
  werden eigene Tabellen mit Verweis auf die Elternzeile (etwa positionen.nr auf bestellungen); lower und upper
  kennen Umlaute, REGEXP geht. Das Ergebnis belegt die Ansicht mit Balken zum Vergleich.
- Suche über Schlüssel und Werte, wahlweise als regulärer Ausdruck und mit Groß und Klein.

Ein Fehler im Ausdruck steht an der Stelle im Feld; das letzte gültige Ergebnis bleibt gedimmt stehen. Jedes
Ergebnis lässt sich ganz als neues Dokument anlegen (⌘ Enter), herunterladen (JSON, NDJSON, CSV mit Semikolon)
oder in den Abfragen-Verlauf legen. Eine Abfrage, die länger als 10 s rechnet, wird abgebrochen.

Gefilterte Tabellen und Treffer im Baum lassen sich ebenso mitnehmen: "Exportieren" in der Werkzeugzeile der
Tabelle nimmt genau die sichtbaren Zeilen (Filter und Sortierung wie angezeigt), "Treffer" neben der
Treffernavigation des Baums die Treffer der Suche oder Abfrage (einzelne Werte mit ihrem Pfad). Beides geht als
Datei (JSON, NDJSON, CSV) oder als neues Dokument in der Ablage, im selben Ordner wie die Quelle.

Die Befehlspalette (⌘ K, unter Windows und Linux Strg K, oder das Suchfeld oben rechts) findet Befehle, Dokumente,
Ordner und Ansichten mit unscharfer Suche; zuletzt Benutztes steht oben, jeder Befehl zeigt sein Tastenkürzel. Die
Kürzel (am Mac ⌘ und ⌥, sonst Strg und Alt):

| Kürzel | Befehl |
|---|---|
| ⌘ K | Befehlspalette, auch im Editor |
| ⌘ Z, ⇧ ⌘ Z oder ⌘ Y | Rückgängig, Wiederholen (im Editor dessen eigene) |
| ⌘ S | Jetzt ablegen (geschieht sonst von selbst) |
| ⇧ ⌘ S | Dokument herunterladen |
| ⌘ O | Datei öffnen |
| ⌥ ⌘ N | Neues Dokument |
| ⌥ ⌘ W | Dokument schließen |
| ⌥ ⌘ A | Ablage verwalten oder schließen |
| ⌥ ⌘ 1, 2, 3 | Ansicht Baum, Editor, Tabelle |
| ⌥ ⌘ E | Abfrage öffnen oder einklappen |
| F3, ⇧ F3 | Nächster, voriger Treffer im Baum |

⌘ N, ⌘ W und ⌘ 1 bis 9 belegt der Browser selbst; deshalb tragen diese Befehle ⌥ dazu.

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
Datei erscheint im Baum, nach dem Neuladen ist sie noch da. In der Ablage einen Ordner anlegen und die Datei dorthin
verschieben; die Leiste zeigt den Ordner.

## Sicherung und Rückspielen

Die Datenbank sichert der Appkern nach seiner Regel nach {{wurzel}}/sicherungen. Zurückspielen: App anhalten
(`docker compose -f compose.pi.yml stop strukturblick` in {{wurzel}}), Kopie als `daten/strukturblick.sqlite`
ablegen, starten. Prüfen: nach dem Anmelden sind die Dokumente in der Leiste wie vorher. Die Bauart ohne Server hat
keine Sicherung auf dem Server: dort in der Ablage "Alles sichern" wählen und die Datei aufheben; auf einem anderen
Gerät oder nach dem Leeren des Browsers holt "Einspielen" alles zurück. Das geht auch zwischen den Bauarten.

## Wenn etwas klemmt

- Die Anmeldung meldet "Code gilt nicht": der Code stammt aus einer anderen Kellerwolke. Die Anmeldeseite nennt die
  Adresse der Kellerwolke, an der die App hängt.
- Ein großes Dokument wird nicht abgelegt (Fuß zeigt dauerhaft "Wird abgelegt"): Grenze der Ablage 100 MB je
  Dokument, darüber antwortet sie mit 413; der Vorbau reicht ohne `koerper_max` höchstens 200 MB weiter.
- Ein offener Tab zeigt nach dem Ausrollen noch die alte Fassung: er lädt von selbst neu, sobald alles abgelegt ist;
  solange ein Dokument noch "Wird abgelegt" zeigt, wartet er.
- Kopieren eines Pfads meldet "Kopieren ging nicht": der Browser gibt die Zwischenablage nur über https oder
  localhost und nach einem Klick oder Tastendruck frei; der Pfad steht dann im Inspektor zum Markieren.
- Die Abfrage meldet "jq brauchte mehr Speicher": jq sammelt zu viele Werte auf einmal, etwa [range(...)] über
  sehr große Folgen; mit limit(1000; ...) oder first(...) begrenzen. jq lädt danach von selbst neu.
- Eine Abfrage bricht nach 10 s ab: meist ein regulärer Ausdruck mit verschachtelten Wiederholungen oder eine
  Schleife in jq; der Abfrage-Worker startet danach neu, die nächste Abfrage läuft normal.
- Die Bauart ohne Server bleibt beim Start stehen und meldet, ein anderer Tab sei mit einer älteren Fassung offen:
  jenen Tab schließen oder neu laden, danach geht es von selbst weiter. Ab Fassung 2.4 machen Tabs einer neueren
  Fassung selbst Platz (sie legen alles ab und laden neu).
- Der Browser erlaubt kein Speichern (privates Fenster): die App startet trotzdem, warnt und hält die Dokumente nur,
  solange das Fenster offen ist; sichern per Herunterladen oder in der Ablage mit Alles sichern.
- Ein Ordner lässt sich nicht entfernen: nur leere Ordner gehen weg; Dokumente vorher verschieben oder in den
  Papierkorb legen.
- YAML-Dateien über einigen MB brauchen Sekunden zum Lesen (Bibliothek `yaml`); die Oberfläche bleibt dabei
  bedienbar, der Fuß zeigt "liest".
