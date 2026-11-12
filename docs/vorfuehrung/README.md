# Vorführung: Drehbücher aus den Testläufen (STB-22)

Jeder Testlauf im Browser wird hier als Drehbuch festgehalten, in der Reihenfolge, in der ein Mensch die Funktion
kennenlernt (nicht in der Reihenfolge, in der getestet wurde). Daraus entsteht später eine Vorführung, die die App
selbst abspielt: Schritt zeigen, ausführen, Text sprechen. Vorbild ist das Tutorial des Orbit-Spiels (Sprechertexte
als JSON, im Medienpool vertont; Markierung mit Lauflicht am Bedienelement).

Die Drehbücher spielen in der Bauart ohne Server mit dem Demosatz (STB-19): `bestellungen.json`, `kunden.csv`,
`dienste.yaml`. Werte in den Erwartungen stammen aus diesem Satz.

## Aufbau einer Datei

```json
{
  "kapitel": "abfrage",
  "titel": "Fragen an die Daten stellen",
  "ticket": "STB-5",
  "rolle": "erzaehler",
  "voraussetzung": "Demosatz geöffnet, bestellungen.json aktiv, Ansicht Baum",
  "schritte": [
    {
      "nr": 1,
      "sprechtext": "Was gesprochen wird, ganze Sätze, ohne Abkürzungen.",
      "ziel": { "anker": "abfrage-oeffnen", "notbehelf": "button:has-text('Öffnen') in .konsole-leiste" },
      "aktion": { "art": "klicken" },
      "erwartung": "Was danach zu sehen ist (prüfbar).",
      "geprueft": "2026-11-11, Bauart ohne Server, 1440 x 900"
    }
  ]
}
```

- `aktion.art`: `klicken`, `tippen` (mit `text`), `taste` (mit `kuerzel`, etwa `⌥ ⌘ E`), `warten` (mit `ms`), `zeigen`
  (nur markieren und erzählen, nichts ausführen).
- `ziel.anker`: künftiger Anker `data-vorfuehrung="..."` am Bedienelement; `notbehelf` beschreibt, wie es heute zu
  finden ist (Beschriftung oder Klasse), bis die Anker gesetzt sind.
- `sprechtext` wird später je Satz vertont (Klangschlüssel `vorfuehrung_<kapitel>_<nr>`).
- `geprueft`: wann und wie der Schritt wirklich durchgespielt wurde.

## Kapitel

| Datei | Kapitel | Stand |
|---|---|---|
| `start.json` | Der erste Blick (STB-29) | durchgespielt 11.11.2026 |
| `beispiele.json` | Mit Beispielen anfangen (STB-19) | durchgespielt 11.11.2026 |
| `ablage.json` | Dokumente ordnen (STB-18) | durchgespielt 11.11.2026 |
| `palette.json` | Alles über die Tastatur (STB-16) | durchgespielt 11.11.2026 |
| `abfrage.json` | Fragen an die Daten stellen (STB-5) | durchgespielt 11.11.2026 |
| `exportieren.json` | Ergebnisse mitnehmen (STB-21) | durchgespielt 11.11.2026 |
| `bereinigen.json` | Daten aufräumen (STB-6) | durchgespielt 11.11.2026 |
| `rezepte.json` | Aufräumen wiederholen (STB-7) | durchgespielt 11.11.2026 |
| `statistik.json` | Daten auf einen Blick (STB-31) | durchgespielt 11.11.2026 |
| `struktur.json` | Den Aufbau sehen (STB-32) | durchgespielt 12.11.2026 |
| `duplikate.json` | Doppeltes auflösen (STB-33) | durchgespielt 12.11.2026 |
| `kontextmenues.json` | Ordnen mit der rechten Maustaste (STB-36) | durchgespielt 12.11.2026 |
| `validieren.json` | Daten gegen ein Schema prüfen (STB-34) | durchgespielt 12.11.2026 |
| `reparieren.json` | Kaputte Daten lesbar machen (STB-41) | durchgespielt 12.11.2026 |
| `konvertieren.json` | In ein anderes Format umschreiben (STB-42) | durchgespielt 12.11.2026 |
| `toml.json` | Einstellungen in TOML (STB-42) | durchgespielt 12.11.2026 |
| `xml.json` | Lieferscheine in XML (STB-42) | durchgespielt 12.11.2026 |
| `xlsx.json` | Tabellendateien öffnen und schreiben (STB-42) | durchgespielt 12.11.2026 |
