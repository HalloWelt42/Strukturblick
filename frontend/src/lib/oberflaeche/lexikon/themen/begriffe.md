---
titel: Begriffe
unterzeile: Fachwörter von Strukturblick, kurz erklärt
bereich: Begriffe
symbol: fa-book
stichworte: glossar, fachwörter, fachwort, begriff, wörterbuch, erklärung, bedeutung, was heißt, was ist, definition, glossary
reihenfolge: 10
quellen:
---

Hier steht jedes Fachwort, das dir in Strukturblick begegnet, in zwei bis vier Sätzen erklärt, mit einem Beispiel und dem Weg zum ausführlichen Thema. Die Begriffe sind nach dem Alphabet geordnet. Die Suche oben im Lexikon findet sie auch, wenn du nur einen Teil des Worts tippst.

## A

### Ablage

Die Ablage ist der Ort, an dem Strukturblick deine Dokumente samt Verlauf aufhebt: ohne Server im Browser, mit Server auf pi5b. Abgelegt wird von selbst kurz nach jeder Änderung, ⌘ S legt sofort ab. Die Seite Ablage verwaltet Ordner, Papierkorb und Sicherungen. Mehr bei [Ablage](#ablage).

### Abfrage

Die Abfrage ist das Feld unten im Hauptbereich, in dem du mit jq, SQL, JSONPath, XPath oder der Suche nach Werten fragst. Das Ergebnis erscheint beim Tippen. `.bestellungen | length` liefert etwa `128`. Mehr bei [Erste Schritte](#erste-schritte/erste-schritte-in-der-abfrage).

### Ableitung

In einem XML Schema entsteht ein Typ oft aus einem anderen, indem er ihn einschränkt oder erweitert; das heißt Ableitung. Aus `xs:string` wird so etwa ein Typ für Postleitzahlen mit genau fünf Ziffern. Die Ansicht Schema zeigt die Ableitungskette bis zum eingebauten Typ. Mehr bei [Schema](#schema-ansicht).

### Anker

In YAML gibt ein Anker (`&standard`) einem Wert einen Namen, ein Alias (`*standard`) wiederholt ihn an anderer Stelle. In dienste.yaml teilen sich so mehrere Dienste dieselben Grundeinstellungen. Ein Alias auf ein Objekt oder eine Liste erscheint im Baum als Verweis auf die Zeile des Ankers. Mehr bei [YAML](#yaml).

### Ansicht

Eine Ansicht ist eine Art, dasselbe Dokument zu zeigen: Baum, Editor, Tabelle, Statistik, Struktur, Graph, Vergleich und bei XML Schema die Ansicht Schema. Alle lesen denselben Text, eine Änderung in einer ist sofort in allen. Gewählt wird oben im Hauptbereich oder mit ⌥ ⌘ 1 bis 8. Mehr bei [Erste Schritte](#erste-schritte).

### Attribut

In XML stehen Attribute im öffnenden Tag, etwa `nr="L-2401"` in `<lieferung nr="L-2401">`. Strukturblick zeigt sie als Schlüssel mit `@` davor (`@nr`), damit sie sich von Kind-Elementen unterscheiden. In PHP heißen außerdem Anmerkungen wie `#[Assert\Count]` Attribute; die nutzt [Code erzeugen](#code-erzeugen) für Grenzen. Mehr bei [XML](#xml).

## B

### Bauart

Strukturblick gibt es in zwei Bauarten: mit Server (Ablage auf pi5b, mit Anmeldung) und ohne Server (alles im Browser). Beide sehen gleich aus und rechnen im Browser; verschieden ist nur, wo deine Dokumente liegen. Mehr bei [Mit und ohne Server](#bauarten).

### Befehlsfeld

Das Befehlsfeld ist das Suchfeld oben rechts im Kopf. Du tippst ein paar Buchstaben, etwa `dh` für "Dokument herunterladen", und Enter führt den Treffer aus. ⌘ K springt hinein. Mehr bei [Befehlsfeld](#befehlsfeld).

### Befund

Ein Befund ist eine Stelle, an der ein Dokument nicht zum Schema passt. Er nennt die Stelle, was erwartet war, was dasteht, und die Regel im Schema, die verletzt ist. Befunde sind Fehler oder Warnungen. Mehr bei [Validieren](#validieren).

### Buchstabenpaare

Buchstabenpaare sind eines der drei Verfahren, mit denen Bereinigen ähnliche Werte findet. Es vergleicht, wie viele benachbarte Buchstabenpaare zwei Werte teilen, und findet so auch fehlende oder vertauschte Buchstaben, etwa `Düsseldorf` und `Düseldorf`. Großzügiger als der [Kern](#begriffe/kern), strenger als der [Tippfehler-Abstand](#begriffe/tippfehler-abstand). Mehr bei [Bereinigen](#bereinigen).

## C

### CDATA

Ein CDATA-Abschnitt in XML (`<![CDATA[ ... ]]>`) enthält Text, in dem Zeichen wie `<` und `&` nicht als Markup gelten. Strukturblick liest ihn als gewöhnlichen Text. lieferungen.xml hat einen zum Ausprobieren. Mehr bei [XML](#xml).

### CSV

CSV ist eine Tabelle als Text: eine Zeile je Datensatz, die Felder durch ein [Trennzeichen](#begriffe/trennzeichen) getrennt. kunden.csv nutzt das Semikolon. Strukturblick erkennt den [Dialekt](#begriffe/dialekt) selbst und behält ihn beim Ändern bei. Mehr bei [CSV](#csv).

## D

### Datensatz

Ein Datensatz ist ein Eintrag mit allen seinen Feldern, etwa eine Zeile einer CSV oder ein Objekt einer Liste. In kunden.csv ist jeder Kunde ein Datensatz, in bestellungen.json jede Bestellung. Tabelle, Statistik und Bereinigen arbeiten Datensatz für Datensatz. Mehr bei [Tabelle](#tabelle).

### Diagnose

Eine Diagnose ist ein Fehler oder eine Warnung, die beim Lesen des Textes auffällt, etwa ein fehlendes Komma in JSON. Der Fuß zählt sie, der Editor unterstreicht die Stelle und listet die Diagnosen unter dem Text. Bei Fehlern in JSON und JSON Lines bietet der Fuß gleich "Reparieren" an. Mehr bei [Editor](#editor).

### Dialekt

Der Dialekt einer CSV sind ihre Schreibregeln: welches [Trennzeichen](#begriffe/trennzeichen), ob die erste Zeile eine [Kopfzeile](#begriffe/kopfzeile) ist und wie Anführungszeichen stehen. Strukturblick erkennt ihn selbst; in der Tabelle zeigt ein Abzeichen ihn an, und du kannst ihn dort ändern. Mehr bei [CSV](#csv).

### Draft

Draft heißt Entwurf, so nennt JSON Schema seine Fassungen, etwa Draft-04, Draft-07, 2019-09 und 2020-12. Welche ein Schema nutzt, steht in seinem Feld `$schema`. Validieren versteht 2020-12 und ältere, abgeleitete Schemas schreibt Strukturblick in 2020-12. Mehr bei [JSON Schema](#json-schema).

### Duplikat

Ein Duplikat ist eine Zeile, die es schon einmal gibt, ganz oder im Schlüssel. "Duplikate prüfen" in der Tabelle zählt sie und lässt dich wählen, welche Zeile je Gruppe bleibt. Das Entfernen ist ein Vorgang im Verlauf. Mehr bei [Tabelle](#tabelle).

## E

### Eingebauter Typ

Eingebaute Typen bringt XML Schema selbst mit, etwa `xs:string`, `xs:integer`, `xs:date` oder `xs:boolean`. Alle eigenen Typen gehen am Ende auf einen davon zurück. Die Ansicht Schema zählt sie im Reiter Statistik. Mehr bei [XML Schema](#xsd).

### Einlesen

Einlesen verwandelt eine Datei, die Strukturblick nicht als Text bearbeitet, in ein JSON-Dokument; das betrifft Tabellendateien (.xlsx) und HTML-Seiten. Aus jedem Blatt oder jeder Tabelle wird eine Liste von Objekten. Die Originaldatei bleibt unberührt. Mehr bei [Ablage](#ablage/einlesen-von-tabellendateien-und-html-seiten).

### Einspielen

Einspielen holt eine Sicherung aus "Alles sichern" zurück in die Ablage. Es fügt hinzu und überschreibt nichts; jedes Dokument bekommt eine neue Kennung. Mehr bei [Ablage](#ablage/alles-sichern-und-einspielen).

### Ersetzungsgruppe

In XML Schema darf ein Element an der Stelle eines anderen stehen, wenn es zu dessen Ersetzungsgruppe gehört (`substitutionGroup`). Oft ist das Kopfelement abstrakt und steht nie selbst im Dokument. Die Ansicht Schema zeigt an seiner Stelle die Elemente der Gruppe. Mehr bei [Schema](#schema-ansicht).

### Erzeuger

Ein Erzeuger liefert im Werkzeug Testdaten die Werte für ein Feld: laufende Nummer, Name, Postleitzahl, E-Mail, Datum, Betrag, Auswahl aus festen Werten und weitere. Strukturblick schlägt je Feld einen vor, passend zu den Werten der [Vorlage](#begriffe/vorlage). Du kannst ihn im Inspektor ändern. Mehr bei [Testdaten](#testdaten).

## F

### Facette

Eine Facette zählt, welche Werte in einer Spalte stehen und wie oft. Ein Klick auf einen Wert zeigt nur noch die Zeilen mit diesem Wert; mehrere Facetten filtern zusammen. In kunden.csv zeigt die Facette ort etwa, wie oft Leipzig vorkommt, in jeder Schreibweise. Mehr bei [Bereinigen](#bereinigen).

### Fassung

Die Fassung ist die Versionsnummer von Strukturblick; sie steht rechts im Fuß und im Hinweis beim Start. Gibt es eine neue, lädt die App von selbst neu, sobald alles abgelegt ist. Mehr bei [Mit und ohne Server](#bauarten/neue-fassung-laedt-von-selbst).

### Fokus

Der Fokus ist im Graph die Stelle, von der aus der Ausschnitt gezeigt wird. Ein Klick auf ein Objekt oder eine Liste setzt den Fokus dorthin, die Karte links führt eine Ebene höher. Der Fokus steht in der Adresse, etwa `fokus=/bestellungen/0`. Mehr bei [Graph](#graph).

### Format

Das Format sagt, nach welchen Regeln ein Text gelesen wird: JSON, JSON Lines, CSV, YAML, TOML, XML oder Markdown. Strukturblick erkennt es am Inhalt und an der Endung; im Editor kannst du es von Hand wählen. Der Fuß zeigt das Format des offenen Dokuments. Mehr bei [Editor](#editor).

### Führende Null

Eine führende Null steht vor der ersten anderen Ziffer, etwa in der Postleitzahl `04109`. Als Zahl gelesen ginge sie verloren, darum lässt Strukturblick solche Werte Text und weist darauf hin. Mehr bei [Zahlen als Text](#zahlen-als-text).

## G

### Gegenseite

Die Gegenseite ist im Vergleich das, womit du dein Dokument vergleichst: ein anderes offenes Dokument, eines aus der Ablage, ein früherer [Stand](#begriffe/stand) aus dem Verlauf oder eine Datei vom Gerät. "Seiten tauschen" dreht die Richtung um. Mehr bei [Vergleich](#vergleich).

## H

### Hauptliste

Die Hauptliste ist die Liste, die die Tabelle zeigt: die Wurzel, wenn sie eine Liste ist, sonst die erste Liste gleich gebauter Objekte darunter. In bestellungen.json ist das `bestellungen`. Statistik, Bereinigen, Konvertieren und Testdaten arbeiten auf ihr. Mehr bei [Tabelle](#tabelle).

### Histogramm

Ein Histogramm zeigt als Balken, wie sich Zahlen oder Datumsangaben verteilen, etwa wie viele Preise zwischen 2 und 3 Euro liegen. Die Statistik zeigt es für das gewählte Feld; Bereinigen zeigt Zahlen in den Facetten ähnlich als Verteilung. Mehr bei [Statistik](#statistik).

## I

### i-Knopf

Das kleine i neben einer Ansicht, einer Abfragesprache oder einer Karte öffnet das Lexikon genau beim passenden Thema. So steht die Erklärung da, wo du gerade entscheidest. Mehr bei [Erste Schritte](#erste-schritte/wo-es-hilfe-gibt).

### Import

Ein XML Schema kann ein anderes einbinden: `xs:import` holt eins aus einem anderen [Namensraum](#begriffe/namensraum), `xs:include` eins aus demselben. lieferungen.xsd importiert so hofladen-position.xsd. Strukturblick sucht solche Dateien im selben Ordner der Ablage. Mehr bei [XML Schema](#xsd).

### Inspektor

Der Inspektor ist die Spalte rechts. Er zeigt, was du gewählt hast, seinen Pfad in sechs Schreibweisen, alle Werte desselben Pfads und den Verlauf. Werkzeuge und einige Ansichten zeigen dort ihre eigenen Karten. Mehr bei [Erste Schritte](#erste-schritte).

## J

### jq

jq ist eine Abfragesprache für JSON: Ausdrücke wie `.bestellungen[].nr` wandern durch die Daten, filtern und rechnen. Strukturblick rechnet mit echtem jq im Browser, auch auf YAML, TOML und den anderen Formaten. Mehr bei [jq](#jq).

### JSON

JSON ist das verbreitetste Format für Strukturdaten, gebaut aus [Objekten](#begriffe/objekt), [Listen](#begriffe/liste), Texten, Zahlen, Wahrheitswerten und `null`. bestellungen.json ist ein Beispiel. Mehr bei [JSON](#json).

### JSON Lines

Siehe [NDJSON](#begriffe/ndjson).

### JSON Patch

Ein JSON Patch ist eine Liste von Änderungen (hinzufügen, entfernen, ersetzen, jeweils mit einem Zeiger), die ein JSON-Dokument in ein anderes verwandelt. Der Vergleich lädt die Unterschiede mit "Als JSON Patch" so herunter. Mehr bei [Vergleich](#vergleich).

### JSON Pointer

Ein JSON Pointer (kurz Zeiger) ist der Weg zu genau einer Stelle, mit Schrägstrichen geschrieben: `/bestellungen/1/kunde/name` ist der Name in der zweiten Bestellung. Listen zählen ab 0. Strukturblick nutzt Zeiger in der Adresse, im Verlauf und in Befunden. Mehr bei [JSON Pointer und jq-Pfade](#json-pointer).

### JSON Schema

Ein JSON Schema beschreibt, wie ein JSON-Dokument aussehen soll: welche Felder Pflicht sind, welche Typen und Grenzen gelten. bestellung.schema.json erlaubt etwa höchstens drei Positionen je Bestellung. Damit prüft das Werkzeug Validieren. Mehr bei [JSON Schema](#json-schema).

### JSONPath

JSONPath ist eine zweite Schreibweise für Wege durch JSON, beginnend mit `$`: `$.bestellungen[0].nr` ist die erste Bestellnummer. Strukturblick kann ihn abfragen und jeden Pfad als JSONPath kopieren. Mehr bei [JSONPath](#jsonpath).

## K

### Kennung

Jedes Dokument hat eine feste Kennung (eine UUID), die sich beim Umbenennen nicht ändert. Die Adresse nutzt ihren Anfang, mindestens 8 Zeichen, etwa `3f9c2a71`. Mehr bei [Adressen](#adressen/kennung-und-name).

### Kern

Der Kern eines Werts ist, was übrig bleibt, wenn Groß und klein, Leerzeichen und Satzzeichen nicht zählen. `Leipzig`, `leipzig` und `Leipzig ` mit Leerzeichen haben denselben Kern und landen in Bereinigen in einer Gruppe. Abkürzungen wie `Lpz.` haben einen anderen Kern. Mehr bei [Bereinigen](#bereinigen).

### Knoten

Ein Knoten ist eine einzelne Stelle in den Daten: ein Objekt, eine Liste oder ein einfacher Wert. Im Baum ist jede Zeile ein Knoten; Objekte und Listen lassen sich aufklappen. Die Statistik zählt die Knoten eines Dokuments. Mehr bei [Baum](#baum).

### Kopfzeile

Die Kopfzeile ist die erste Zeile einer CSV, wenn sie die Namen der Spalten enthält. In kunden.csv beginnt sie mit `kundennr;name;plz`. Ob die erste Zeile Kopf oder Daten ist, erkennt Strukturblick selbst; in der Tabelle kannst du es umstellen. Mehr bei [CSV](#csv).

## L

### Leer-Anteil

Der Leer-Anteil sagt, wie oft ein Feld nichts enthält: weil es fehlt, `null` ist oder ein leerer Text. Die Statistik zeigt ihn je Feld, im Werkzeug Testdaten stellst du ihn je Feld für die erfundenen Daten ein. Mehr bei [Statistik](#statistik).

### Leseweise

Die Leseweise sagt, wie Strukturblick einen Text liest: in welchem [Format](#begriffe/format) und bei CSV mit welchem [Dialekt](#begriffe/dialekt). Du änderst sie im Editor (Formatwahl), in der Tabelle (Trennzeichen, Kopfzeile) oder beim Reparieren ("Lesen als"). Sie wird mit dem Dokument abgelegt; der Text selbst bleibt dabei unverändert. Mehr bei [Editor](#editor).

### Liste

Eine Liste (in JSON ein Array, in eckigen Klammern) ist eine geordnete Folge von Werten. `positionen` in einer Bestellung ist eine Liste von Objekten. Gezählt wird ab 0, `[0]` ist der erste Eintrag. Mehr bei [JSON](#json).

## M

### Miniprojekt

"Projekt als ZIP" im Werkzeug Code erzeugen liefert ein kleines, lauffähiges Projekt: die Klassen, die Daten des Dokuments, ein Leseprogramm, die übliche Abhängigkeitsdatei und eine README. Entpacken, den Befehl aus der README ausführen, und die Daten werden eingelesen. Mehr bei [Code erzeugen](#code-erzeugen).

### Musterpfad

Ein Musterpfad steht für alle gleichartigen Stellen auf einmal; Listenstellen werden darin zu "alle". `.bestellungen[].kunde.stadt` meint die Stadt in jeder Bestellung. Die Karte "Alle Werte dieses Pfads" im Inspektor und die Statistik arbeiten mit Musterpfaden. Mehr bei [Statistik](#statistik).

## N

### Namensraum

Ein Namensraum in XML trennt Namen verschiedener Herkunft, damit gleiche Namen sich nicht stören. In lieferungen.xml steht das Präfix `hl` für den Namensraum `urn:example:hofladen`, darum heißt dort ein Element `hl:position`. In PHP ordnet ein Namensraum (`namespace`) Klassen; [Code erzeugen](#code-erzeugen) lässt ihn einstellen. Mehr bei [XML](#xml).

### NDJSON

NDJSON, auch JSON Lines genannt, hat einen vollständigen JSON-Wert je Zeile, meist ein Objekt. So lassen sich große Datenmengen Zeile für Zeile schreiben und lesen. kundenimport.ndjson ist so gebaut, mit vier kaputten Zeilen zum Reparieren. Mehr bei [NDJSON](#ndjson).

### nillable

In XML Schema erlaubt `nillable="true"`, dass ein Element mit `xsi:nil="true"` ausdrücklich leer bleibt. Das ist etwas anderes als ein fehlendes Element. Mehr bei [XML Schema](#xsd).

## O

### Objekt

Ein Objekt (in JSON in geschweiften Klammern) ist eine Sammlung von [Schlüsseln](#begriffe/schluessel) mit ihren Werten. `kunde` in einer Bestellung ist ein Objekt mit `name`, `plz` und `stadt`. Die Reihenfolge der Schlüssel spielt für die Bedeutung keine Rolle. Mehr bei [JSON](#json).

### Ordner

Ordner gliedern deine Ablage, eine Ebene tief. Die Beispiele zum Üben liegen etwa im Ordner Beispiele. Nur leere Ordner lassen sich entfernen. Mehr bei [Ablage](#ablage/ordner).

## P

### Papierkorb

Im Papierkorb landet, was du aus der Ablage entfernst. Dort lässt es sich wiederherstellen; nach 30 Tagen löscht die Ablage es endgültig. Mehr bei [Ablage](#ablage/papierkorb).

### Pfad

Ein Pfad beschreibt den Weg von der [Wurzel](#begriffe/wurzel) zu einer Stelle. Strukturblick schreibt ihn auf sechs Arten: jq (`.bestellungen[1].kunde.name`), JSONPath, Zeiger, PHP, Python und TypeScript. Der Inspektor kopiert jede davon. Mehr bei [JSON Pointer und jq-Pfade](#json-pointer).

### PHPDoc

PHPDoc sind Kommentare in PHP, die mit `/**` beginnen und Typen oder Grenzen beschreiben, etwa `@var list<Position>`. Sie ändern nichts am Ablauf des Programms, helfen aber Editoren und Prüfprogrammen. Code erzeugen schreibt Grenzen wahlweise als PHPDoc oder als [Attribute](#begriffe/attribut). Mehr bei [Code erzeugen](#code-erzeugen).

### Pflicht

Ein Feld ist Pflicht, wenn es in jedem Eintrag vorkommen muss. Die Struktur markiert Felder, die in jedem Eintrag stehen, mit einem Stern; in der Ansicht Schema steht der Stern für Pflichtteile. Mehr bei [Struktur](#struktur).

## R

### readonly

readonly heißt: Nach dem Anlegen lässt sich ein Wert nicht mehr ändern. Code erzeugen schreibt Klassen so vorgegeben (in PHP `readonly`, in Python mit `frozen`), auf Wunsch auch veränderbar. Das schützt vor versehentlichem Überschreiben eingelesener Daten. Mehr bei [Code erzeugen](#code-erzeugen).

### Regulärer Ausdruck

Ein regulärer Ausdruck ist ein Suchmuster, etwa `^K-100` für alle Werte, die mit K-100 beginnen. Die Suche in der Abfrage versteht ihn, wenn der Schalter `.*` an ist; SQL kennt dafür REGEXP. Mehr bei [Suche](#suche).

### Rekursiv

Rekursiv heißt ein Aufbau, der sich selbst enthält, etwa ein Ordner-Typ, der wieder Ordner enthält. Die Ansicht Schema beendet einen solchen Zweig mit der Marke rekursiv, statt endlos aufzuklappen. Mehr bei [Schema](#schema-ansicht).

### Revision

Eine Revision ist ein bestimmter Stand des Textes; jede Änderung ergibt eine neue. Strukturblick liest jede Revision neu und zeigt solange "liest". Ergebnisse gehören immer zu genau einer Revision, darum zeigen die Ansichten nie Altes und Neues gemischt. Mehr bei [Erste Schritte](#erste-schritte/ein-text-ein-verlauf).

### Rezept

Ein Rezept merkt sich Aufräumschritte aus Bereinigen, etwa "ort zusammenführen", und wendet sie auf die nächste Datei gleicher Bauart an. Es merkt sich, was getan wurde (Spalte und Regel), nicht wo im Text. Vor dem Anwenden gibt es eine Prüfung und eine Vorschau. Mehr bei [Rezepte](#rezepte).

## S

### Schema

Ein Schema beschreibt den Aufbau von Daten: welche Felder es gibt, welchen Typ sie haben und was Pflicht ist. Für JSON gibt es [JSON Schema](#json-schema), für XML [XML Schema](#xsd). Strukturblick leitet in der Ansicht Struktur auch selbst eins aus den Daten ab. Mehr bei [Struktur](#struktur).

### Schlüssel

Ein Schlüssel ist der Name eines Werts in einem Objekt, etwa `nr` oder `kunde`. In der Tabelle werden Schlüssel zu Spalten. Mehr bei [JSON](#json).

### Schlüsselfeld

Ein Schlüsselfeld ist ein Feld, das jeden Eintrag einer Liste eindeutig kennzeichnet, etwa `nr` bei den Bestellungen. Der Vergleich nutzt es, um Einträge beider Seiten einander zuzuordnen, "Duplikate prüfen" schlägt es als Schlüssel vor. Mehr bei [Vergleich](#vergleich).

### Spezifikation

Die Spezifikation ist im Werkzeug Testdaten der Bauplan der erfundenen Daten: je Feld ein [Erzeuger](#begriffe/erzeuger) mit Einstellungen und dem Leer-Anteil. "Spezifikation speichern" legt sie als Dokument ab, damit du dieselben Daten später wieder erzeugen kannst. Mehr bei [Testdaten](#testdaten).

### SQL

SQL ist die Abfragesprache für Tabellen. In Strukturblick ist jedes geöffnete Dokument eine Tabelle, Listen von Objekten werden eigene Tabellen; gerechnet wird mit SQLite im Browser. `SELECT COUNT(*) FROM bestellungen` zählt die Bestellungen. Mehr bei [SQL](#sql).

### Stand

Ein Stand ist ein Punkt im Verlauf eines Dokuments; Stand 0 ist der Text beim Öffnen, jeder Vorgang zählt eins weiter. Der Fuß zeigt den aktuellen Stand, die Karte Verlauf springt per Klick zu einem früheren. Der Vergleich kann gegen einen früheren Stand vergleichen. Mehr bei [Erste Schritte](#erste-schritte/ein-text-ein-verlauf).

### Startwert

Der Startwert ist die Zahl, aus der das Werkzeug Testdaten seinen Zufall ableitet. Gleicher Startwert, gleiche Daten: So kannst du einen Testlauf genau wiederholen. Der Würfelknopf zieht einen neuen. Mehr bei [Testdaten](#testdaten).

### Stelle

Eine Stelle ist ein einzelner Ort im Dokument, beschrieben durch einen [JSON Pointer](#begriffe/json-pointer). Gewählte Stellen stehen in der Adresse, Befunde nennen ihre Stelle. Mehr bei [JSON Pointer und jq-Pfade](#json-pointer).

## T

### Tabellendatei

Eine Tabellendatei (.xlsx) speichert Tabellen mit Blättern, Formeln und Formaten. Strukturblick liest sie beim Öffnen ein und legt sie als JSON-Dokument ab, eine Liste je Blatt; Konvertieren schreibt auch wieder eine. Mehr bei [XLSX](#xlsx).

### Tiefe

Die Tiefe sagt im Graph, wie viele Ebenen unter dem [Fokus](#begriffe/fokus) gezeigt werden, eine bis drei. Ein Plus an einer Karte heißt, darunter liegt mehr, als die Tiefe zeigt. Die Statistik nennt außerdem die größte Tiefe des Dokuments. Mehr bei [Graph](#graph).

### Tippfehler-Abstand

Der Tippfehler-Abstand zählt, wie viele Zeichen man ändern, einfügen oder löschen muss, um von einem Wert zum anderen zu kommen. Bereinigen hält Werte mit höchstens zwei solchen Änderungen für ähnlich. Das findet am meisten, aber auch Falsches. Mehr bei [Bereinigen](#bereinigen).

### Trennzeichen

Das Trennzeichen trennt in einer CSV die Felder einer Zeile: Komma, Semikolon, Tab oder senkrechter Strich. kunden.csv nutzt das Semikolon, wie es im deutschen Raum üblich ist. Strukturblick erkennt es selbst, in der Tabelle lässt es sich umstellen. Mehr bei [CSV](#csv).

### Treffer

Ein Treffer ist eine Stelle, die zu einer Suche oder Abfrage passt. Der Baum markiert Treffer, F3 springt zum nächsten, und "Treffer" nimmt sie als Datei oder neues Dokument mit. Mehr bei [Exportieren](#exportieren/treffer-im-baum).

### Typ

Der Typ eines Werts sagt, was er ist: Objekt, Liste, Text, Zahl, Wahrheitswert oder Nichts (`null`). Die Struktur fasst gleich gebaute Objekte außerdem zu benannten Typen zusammen, etwa Bestellung und Kunde. Mehr bei [Struktur](#struktur).

### Typvorschlag

Ein Typvorschlag sagt, wie ein Wert aussieht, wenn er als Text dasteht: "Text, sieht aus wie Betrag" bei `3.309,23` oder wie ein Datum bei `01.01.2024`. Umgewandelt wird nur, wenn du es willst, im Werkzeug Bereinigen unter Typen. Mehr bei [Tabelle](#tabelle).

## U

### UTF-8

UTF-8 ist die übliche Art, Zeichen als Bytes zu speichern, Umlaute eingeschlossen. Strukturblick liest Dateien als UTF-8, sofern sie nichts anderes sagen, und schreibt beim Herunterladen immer UTF-8. Mehr bei [Ablage](#ablage/dateien-oeffnen-und-hineinziehen).

### UUID

Eine UUID ist eine lange, zufällige Kennung wie `3f9c2a71-5b8e-4c1d-9a2f-0e6b7d8c9a10`, die es so kein zweites Mal gibt. Jedes Dokument hat eine; Testdaten kann auch welche erzeugen. Mehr bei [Adressen](#adressen/kennung-und-name).

## V

### Verlauf

Der Verlauf hält jede Änderung eines Dokuments als Vorgang fest, gleich aus welcher Ansicht sie kam. Rückgängig und Wiederholen wandern darin, die Karte Verlauf im Inspektor springt per Klick zu einem Stand. Er bleibt beim Neuladen erhalten und steckt in jeder Sicherung. Mehr bei [Erste Schritte](#erste-schritte/ein-text-ein-verlauf).

### Verlustkarte

Die Verlustkarte steht im Werkzeug Konvertieren über dem Ergebnis und sagt, was das Zielformat nicht kann, bevor du umwandelst. CSV kennt etwa keine Typen und keine verschachtelten Listen, TOML kein `null`. Mehr bei [Konvertieren](#konvertieren).

### Verweis

In JSON Schema verweist `$ref` auf eine Beschreibung an anderer Stelle, etwa `"$ref": "#/$defs/position"`, damit sie nur einmal dasteht. In SQL verweist eine Spalte einer entfalteten Tabelle auf ihre Elternzeile, etwa `positionen.nr` auf die Bestellung. Mehr bei [Verweise mit $ref](#ref).

### Vielfalt

Die Vielfalt sagt, wie oft etwas vorkommen darf: `1` genau einmal, `0..1` keinmal oder einmal, `0..n` beliebig oft. Struktur und Schema schreiben sie an ihre Kanten und Felder. Mehr bei [Struktur](#struktur).

### Vorgang

Ein Vorgang ist eine Änderung im Verlauf, etwa "ort geändert" oder "Schlüssel sortiert". Auch große Umbauten wie ein Bereinigen-Schritt sind genau ein Vorgang und lassen sich mit einem Rückgängig zurücknehmen. Mehr bei [Erste Schritte](#erste-schritte/ein-text-ein-verlauf).

### Vorlage

Die Vorlage ist im Werkzeug Testdaten das offene Dokument, nach dessen Vorbild die erfundenen Daten entstehen. Aus ihren Werten leitet Strukturblick je Feld den Erzeuger ab. Mehr bei [Testdaten](#testdaten).

## W

### Wahrheitswert

Ein Wahrheitswert ist entweder `true` oder `false`, wie `bezahlt` in den Bestellungen. In SQL steht er als 1 oder 0. Mehr bei [JSON](#json).

### Werkzeug

Ein Werkzeug belegt den Platz der Ansicht, bis du es schließt: Validieren, Bereinigen, Reparieren, Konvertieren, Rezepte, Code erzeugen und Testdaten. Du findest sie in der Leiste und im Befehlsfeld. Mehr bei [Erste Schritte](#erste-schritte).

### Wurzel

Die Wurzel ist der oberste Wert eines Dokuments, in dem alles andere steckt; ihr Zeiger ist leer, ihr jq-Pfad ist `.`. In XML heißt das oberste Element Wurzelelement, in lieferungen.xml ist das `lieferungen`. In Code erzeugen ist der Wurzelname der Name der obersten Klasse. Mehr bei [JSON Pointer und jq-Pfade](#json-pointer).

## X

### XML

XML ist ein Format aus verschachtelten Elementen mit Tags, Attributen und Text, wie in lieferungen.xml. Strukturblick liest es als Baum von Objekten: [Attribute](#begriffe/attribut) mit `@`, Text daneben als `#text`. Mehr bei [XML](#xml).

### XML Schema

Ein XML Schema (Dateiendung .xsd) beschreibt, welche Elemente und Attribute ein XML-Dokument haben darf und welche Typen gelten. lieferungen.xsd verlangt etwa `bezahlt` als Wahrheitswert. Die Ansicht Schema zeigt es, Validieren prüft dagegen. Mehr bei [XML Schema](#xsd).

### XPath

XPath ist die Abfragesprache für XML: `//lieferung/@nr` trifft die Nummern aller Lieferungen. Strukturblick bietet XPath in der Abfrage an, sobald ein XML-Dokument offen ist. Mehr bei [XPath](#xpath).

## Z

### Zeiger

Siehe [JSON Pointer](#begriffe/json-pointer).

### Zielformat

Das Zielformat ist das Format, in das Konvertieren umschreibt oder in dem Testdaten erzeugt werden, etwa CSV, YAML oder XLSX. Das eigene Format steht beim Konvertieren nicht zur Wahl. Mehr bei [Konvertieren](#konvertieren).

### Zielwert

Der Zielwert ist in Bereinigen die Schreibweise, auf die eine Gruppe ähnlicher Werte vereinheitlicht wird. Vorgeschlagen wird der häufigste Wert der Gruppe, du kannst einen anderen wählen oder eintippen. Mehr bei [Bereinigen](#bereinigen).

### Zuordnung

Eine Zuordnung ist ein Objekt mit freien Schlüsseln und gleich gebauten Werten, etwa Preise je Artikelname. Code erzeugen schreibt dafür `array<string, X>` in PHP, `Record` in TypeScript und `dict` in Python. In JSON Schema steht so etwas als `additionalProperties`. Mehr bei [Code erzeugen](#code-erzeugen).
