---
titel: Schema
unterzeile: Elementbaum, Typen und Statistik eines XML Schemas auf einen Blick
bereich: Ansichten
symbol: fa-sitemap
stichworte: schema, ansicht schema, xml schema, xsd, xs:schema, elementbaum, element, attribut, typen, complextype, simpletype, komplexer typ, einfacher typ, ableitung, erweiterung, einschränkung, aufzählung, enumeration, import, include, namensraum, namespace, beispieldokument, beispiel xml
reihenfolge: 80
quellen: [W3C XML Schema 1.0, Teil 1: Strukturen](https://www.w3.org/TR/xmlschema-1/), [W3C XML Schema 1.0, Teil 2: Datentypen](https://www.w3.org/TR/xmlschema-2/)
---

Ein **XML Schema** (Dateiendung `.xsd`) beschreibt, wie ein gültiges XML-Dokument aussehen darf: welche Elemente wo stehen, wie oft, mit welchen Attributen und welchen Werten. Als Text ist so ein Schema schwer zu lesen, weil Typen aufeinander aufbauen und über mehrere Dateien verteilt sein können. Die Ansicht Schema rechnet das für dich zusammen und zeigt drei Dinge: den **Elementbaum** (was in einem gültigen Dokument wo stehen darf), die **Typen** und eine **Statistik**. Mehr zur Sprache selbst steht bei [XML Schema](#xsd).

Die Ansicht gibt es nur bei XML-Schema-Dokumenten, also XML mit der Wurzel `xs:schema`. Dann erscheint der Reiter [Schema](#ansicht:schema), und ⌥ ⌘ 8 öffnet ihn (unter Windows und Linux Strg Alt 8). Zum Üben öffnest du die Beispiele und darin lieferungen.xsd.

## Importe und eingebundene Dateien

Ein Schema kann andere Schemas importieren (`xs:import`, für einen anderen Namensraum) oder einbinden (`xs:include`, gleicher Namensraum). Ein **Namensraum** ist ein Name, meist eine Adresse, der Elemente verschiedener Herkunft auseinanderhält. lieferungen.xsd importiert hofladen-position.xsd, das die Positionen im Namensraum `urn:example:hofladen` erklärt.

Strukturblick sucht solche Dateien im selben Ordner der [Ablage](#ablage), nach dem Dateinamen. Die Beispiele liegen zusammen im Ordner Beispiele, deshalb klappt das dort von selbst. Fehlt eine Datei, steht über der Ansicht ein Hinweisband, etwa "Ein eingebundenes Schema fehlt: hofladen-position.xsd. Im selben Ordner ablegen, dann ist der Baum vollständig." Sobald du sie dort ablegst, liest die Ansicht neu.

## Elementbaum

Der erste Reiter zeigt Ebene für Ebene, was ein gültiges Dokument enthalten darf. Jede Zeile hat ein Zeichen für die Art, den Namen, den Typ, rechts die **Vielfalt** und einen Stern für Pflicht.

| Zeichen und Name | Bedeutung |
|---|---|
| Element | Ein Element, etwa `kunde` |
| `@name` | Ein Attribut, etwa `@nr` |
| Auswahl, "eins von 3" | Genau eine der Möglichkeiten darunter |
| Folge | Die Teile darunter in dieser Reihenfolge (nur sichtbar, wenn sie sich wiederholt oder in einer Auswahl steht) |
| Ersetzungsgruppe | An dieser Stelle steht eins der Elemente darunter |
| beliebiges Element | Hier darf ein beliebiges Element stehen |

| Vielfalt | Bedeutung |
|---|---|
| 1 | genau einmal |
| 0..1 | höchstens einmal, kann fehlen |
| 1..n | mindestens einmal, beliebig oft |
| 0..n | beliebig oft, auch gar nicht |

Andere Grenzen stehen genauso da, etwa `2..5`.

Für lieferungen.xsd sieht der Baum aufgeklappt so aus:

| Stelle | Typ | Vielfalt |
|---|---|---|
| `lieferungen` | komplex | 1 * |
| `lieferungen > @stand` | xs:date | 1 * |
| `lieferungen > @anzahl` | xs:positiveInteger | 0..1 |
| `lieferungen > lieferung` | Lieferung | 1..n * |
| `lieferung > @nr` | Lieferscheinnummer | 1 * |
| `lieferung > @datum` | xs:date | 1 * |
| `lieferung > @zahlweise` | Zahlweise | 0..1 |
| `lieferung > kunde` | Kunde | 1 * |
| `kunde > name`, `kunde > plz`, `kunde > ort` | xs:string, PLZ, xs:string | je 1 * |
| `lieferung > hl:position` | hl:Position | 1..n * |
| `hl:position > @menge`, `hl:position > @preis` | xs:positiveInteger, hl:Betrag | je 1 * |
| `hl:position > @einheit` | hl:Einheit | 0..1 |
| `lieferung > hinweis` | xs:string | 0..1 |
| `lieferung > bezahlt` | xs:boolean | 1 * |

Im Baum selbst steht jede Stelle eingerückt unter ihrem Elternteil, mit dem Namen allein.

Ein paar Dinge rechnet der Baum für dich zusammen:

- **Erweiterte Typen** bringen Inhalt und Attribute ihrer Basis mit. `kunde` hat den Typ Kunde, der Person erweitert; deshalb steht `name` aus Person mit `plz` und `ort` darunter.
- **Abstrakte Elemente** zeigen die Elemente ihrer Ersetzungsgruppe; sie tragen die Marke "abstrakt".
- Wiederholt sich ein Typ in sich selbst, endet der Zweig mit der Marke **rekursiv**, damit der Baum nicht unendlich wird.

**Bedienung**: Klick wählt eine Zeile, der Pfeil oder ein Doppelklick klappt sie auf. Mit der Tastatur: ↓ und ↑ wählen, → klappt auf (oder geht zum ersten Kind), ← klappt zu (oder geht zum Elternteil), Pos1 und Ende springen an Anfang und Ende. "Eine Ebene weiter" klappt alle sichtbaren Zeilen eine Ebene weiter auf, "Zuklappen" schließt alles. Der Fuß zählt die sichtbaren Zeilen und die möglichen Wurzeln.

## Typen

Der zweite Reiter listet alle benannten Typen, auch die aus importierten Dateien. Die Zahl am Reiter nennt, wie viele es sind, bei lieferungen.xsd 9.

| Spalte | Bedeutung |
|---|---|
| Typ | Name; ein Würfel für komplexe, ein Buchstabe für einfache Typen |
| Art | komplex (mit Kind-Elementen oder Attributen) oder einfach (für Text und Werte) |
| Ableitung | etwa "erweitert Person", "schränkt xs:string ein" oder "eigener Aufbau" |
| Werte | Zahl der erlaubten Werte bei einer Aufzählung |
| Verwendet | Wie oft das Schema auf den Typ verweist; 0 ist markiert |
| Datei | "dieses Dokument" oder die Datei, aus der der Typ kommt |

Das Feld "Typ suchen" sucht in Namen, Basistyp und Erklärung. Die Filter daneben: **Alle**, **Komplex**, **Einfach**, **Mit Werten** (Typen mit Aufzählung) und **Ungenutzt** (Typen, auf die nichts verweist). "Mit Werten" zeigt bei lieferungen.xsd zwei Typen: Zahlweise mit 3 Werten und hl:Einheit mit 4. Lange Listen laden beim Rollen nach. Ein Klick auf eine Zeile zeigt den Typ im Inspektor.

## Statistik

Der dritte Reiter zählt das gelesene Schema. Für lieferungen.xsd samt Import:

| Kachel | Wert |
|---|---|
| Dateien | 2 |
| Namensräume | 2 |
| Elemente | 2 (globale Elemente: lieferungen und hl:position) |
| Komplexe Typen | 4 |
| Einfache Typen | 5 |
| Tiefe | 4 |

Darunter stehen als Balken die **Ableitungen** (2 Erweiterungen, 5 Einschränkungen), die **eingebauten Typen** nach Nutzung (xs:string 8, xs:date 2, xs:positiveInteger 2, xs:boolean 1, xs:decimal 1) und die **meistgenutzten Basistypen** (hier nur Person). Die Tafel **Bausteine** nennt anonyme Typen, Gruppen, Aufzählungen (2 Typen mit zusammen 7 Werten), abstrakte Teile und Ersetzungsgruppen. Die Tafel **Dateien** zeigt jede gelesene Datei mit Namensraum, Rolle (dieses Dokument, eingebunden, importiert) und was sie einbindet; Fehlendes ist markiert. Zuletzt die **ungenutzten Typen**; bei lieferungen.xsd steht dort "Jeder benannte Typ wird genutzt." In Bibliotheken für andere Schemas sind ungenutzte Typen üblich.

## Der Inspektor rechts

Ohne Wahl nennt der Inspektor Namensraum, Zahl der Wurzeln, Typen und Dateien.

**Gewählte Stelle** (nach einem Klick im Elementbaum) zeigt Art und Name, Vielfalt mit "Pflicht" oder "kann fehlen", den Typ (ein Klick darauf zeigt ihn), einen festen Wert oder eine Vorgabe, ob das Element leer sein darf (`xsi:nil`), die Erklärung aus dem Schema und die **Fundstelle**. Für `plz`: Vielfalt 1, Pflicht, Typ PLZ, Fundstelle Zeile 44. "Im Editor" springt dorthin. Liegt die Fundstelle in einer importierten Datei, holt "Öffnen" diese aus der Ablage.

**Typ der Stelle** oder **Gewählter Typ** zeigt die Karte des Typs:

- **Ableitung** und die **Kette** der Basistypen bis zum eingebauten Typ; Basistypen sind anklickbar.
- **Einschränkungen** wie Muster, Längen und Grenzen. PLZ hat das Muster `[0-9]{5}`, hl:Betrag "Mindestens 0" und "Nachkommastellen 2".
- **Erlaubte Werte** bei Aufzählungen, mit Erklärung beim Darüberfahren. Zahlweise erlaubt `bar` (Bei Übergabe), `Rechnung` (Zahlbar in 14 Tagen) und `Lastschrift`.
- **Attribute** mit Typ, Pflichtstern und Vorgabe. hl:Position hat `@menge *`, `@preis *` und `@einheit` mit der Vorgabe Stück.
- Die **Erklärung** aus dem Schema, bei PLZ "Fünf Ziffern; eine führende Null gehört dazu."

**Verwendet** zählt, wo das Schema auf den Typ verweist (als Typ, als Basis, als Eintragstyp ...), mit der Fundstelle der Erklärung. Person wird einmal verwendet, als Basis von Kunde.

## Beispieldokument

"Beispieldokument" rechts in der Werkzeugzeile erzeugt ein gültiges XML-Dokument zum Schema, für die Wurzel, die im Elementbaum gewählt ist (sonst die erste). Zwei Umfänge:

- **Nur Pflichtteile**: was ein gültiges Dokument mindestens braucht.
- **Jedes Teil einmal**: auch alles Optionale, je einmal; bei einer Auswahl die erste Möglichkeit.

Das Ergebnis landet als `lieferungen.beispiel.xml` neben dem Schema, verweist darauf und öffnet gleich im Werkzeug [Validieren](#validieren), das es dagegen prüft. Für lieferungen.xsd entsteht mit "Nur Pflichtteile" ein Dokument mit 8 Elementen:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Beispiel zu lieferungen.xsd, aus dem Schema erzeugt (nur Pflichtteile). Die Werte sind Platzhalter. -->
<lieferungen xmlns:hl="urn:example:hofladen" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="lieferungen.xsd" stand="2026-01-15">
  <lieferung nr="L-0000" datum="2026-01-15">
    <kunde>
      <name>Beispiel name</name>
      <plz>00000</plz>
      <ort>Beispiel ort</ort>
    </kunde>
    <hl:position menge="1" preis="1.5">Beispiel position</hl:position>
    <bezahlt>true</bezahlt>
  </lieferung>
</lieferungen>
```

"Jedes Teil einmal" fügt `anzahl`, `zahlweise="bar"`, `einheit="Stück"` und das Element `hinweis` hinzu, 9 Elemente. Die Werte sind Platzhalter, halten aber Muster, Längen, Grenzen und erlaubte Werte ein: `L-0000` passt zum Muster `L-[0-9]{4}`, `00000` zu `[0-9]{5}`. Bei einem abstrakten Element steht eins aus seiner Ersetzungsgruppe, bei einem abstrakten Typ ein abgeleiteter. Was sich nicht gültig erzeugen lässt, nennt die Meldung.

## Tastenkürzel

| Kürzel | Wirkung |
|---|---|
| ⌥ ⌘ 8 | Ansicht Schema (nur bei XML Schema) |
| ↓ ↑ Pos1 Ende | Im Elementbaum wählen |
| → ← | Aufklappen, zuklappen |

## Grenzen

- Die Ansicht liest nur. Das Schema selbst änderst du im [Editor](#editor); "Im Editor" in der Fundstelle bringt dich hin.
- Importierte Dateien findet sie nur im selben Ordner der Ablage, nach Dateinamen.
- Optionale Teile, die sich endlos wiederholen würden, lässt das Beispieldokument weg; ab 5.000 Elementen kommen nur noch Pflichtteile dazu.

## Passt dazu

- [XML Schema](#xsd) für die Sprache und das Prüfen mit Validieren
- [XML](#xml) für das Lesen von XML in Strukturblick
- [Struktur](#struktur), wo "XML Schema ableiten" ein Schema aus vorhandenen XML-Daten erzeugt
