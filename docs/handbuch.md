---
zweck: "Zeigt, prüft und baut Strukturdaten um (JSON, NDJSON, CSV, YAML, TOML, XML, Markdown-Tabellen): Baum, Editor, Tabelle und Inspektor auf einem Text mit gemeinsamem Verlauf; mit Server auf pi5b, ohne Server auf GitHub Pages."
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
stand: f4da234
---

# Strukturblick

## Zweck

Strukturblick öffnet Strukturdaten (JSON, NDJSON, CSV, YAML, TOML, XML, Markdown-Tabellen) und zeigt sie als Baum, im Editor und als Tabelle;
der Inspektor zeigt das Gewählte, kopiert seinen Pfad (jq, JSONPath, Zeiger, PHP, Python, TypeScript) und zählt
alle Werte desselben Pfads. Alle Ansichten arbeiten auf demselben Text: eine Änderung in der Tabelle ist eine
Textänderung an genau dieser Stelle, CSV-Dialekt, Kommentare und Formatierung bleiben. Rückgängig gilt für alle
Ansichten gemeinsam, der Verlauf bleibt beim Neuladen erhalten. Die Werkzeugzeile des Editors bietet bei JSON und
JSON Lines Formatieren, Kompakt und Schlüssel sortieren (je ein Vorgang, rückgängig möglich); bei den übrigen Formaten
bleibt der Text, wie er geschrieben ist.

Das Lexikon ist die Hilfe: ein schwebendes Fenster über dem Arbeitsplatz ("Hilfe" im Fuß, F1, Leiste "Nachschlagen",
Befehlsfeld "Lexikon" oder die kleinen i-Knöpfe an Ansichten, Werkzeugen, Abfrage und Pfaden, die gleich zum passenden
Abschnitt springen). Es lässt sich am Kopf verschieben, an der Ecke in der Größe ziehen, minimieren und maximieren und
merkt Lage, Größe und Thema. Links stehen die Themen nach Bereichen (Anfang, Arbeitsplatz, Pfade und Abfragen, Formate,
Prüfen, Ansichten, Werkzeuge, Begriffe), rechts das Thema mit Inhaltsverzeichnis. Die Volltextsuche markiert Treffer;
"Alle Themen" blättert mit Enter von Thema zu Thema. In den Themen läuft vieles am offenen Dokument: "Dein gewählter Wert"
zeigt die Stelle in allen Pfadschreibweisen, "Ausprobieren" führt Beispiele in jq, JSONPath, XPath, SQL und Suche gleich im
Abfragefeld aus, Verweise springen in andere Themen, Ansichten und Werkzeuge.

Verschachteltes in der Tabelle: Zellen mit Objekten oder Listen zeigen einen Auszug ihres Inhalts
(`{Marta Demir, 06108, Halle (Saale)}`, `[2] Kartoffeln 2,5 kg, Apfelsaft ...`, bei Listen von Objekten je Eintrag
sein erster Wert). Der Knopf in einer Objektzelle oder im Spaltenkopf klappt die Felder als eigene Spalten auf
(`kunde.name`, `kunde.plz`, auch tiefer), der Knopf daneben im Kopf klappt wieder zu. Der Knopf in einer Listenzelle
(oder ein Doppelklick) zeigt die Einträge als Tabelle; der Pfad oben nennt dann, wessen Liste es ist
(`bestellungen > [1] B-24018 > positionen`), "Zurück" und jeder Pfadteil führen wieder hinaus. Aufgeklappte Spalten
und die gezeigte Liste stehen in der Adresse. Der Zeilenfilter sucht in einfachen Werten; was in einem Objekt steht,
findet er, sobald die Spalte aufgeklappt ist.

Die Seite Ablage (Ordnerknopf oben in der Leiste) verwaltet die Dokumente: Ordner (eine Ebene), Umbenennen,
Verschieben, Herunterladen, mehrere auf einmal wählen. Entfernen legt in den Papierkorb, die Meldung bietet
Rückgängig; nach 30 Tagen löscht die Ablage dort endgültig. "Alles sichern" schreibt alle Dokumente samt Verlauf und
Ordnern in eine Datei, "Einspielen" fügt eine solche Datei hinzu, ohne Vorhandenes zu überschreiben. Eingespielte
Dokumente bekommen neue Kennungen; Adressen (Lesezeichen) auf die alten führen deshalb nicht zu den Kopien.

Die Adresszeile zeigt immer, wo man ist (Deeplinks): `/dokument/<Kennung>/<Name>/<Ansicht oder Werkzeug>`, dahinter
die Einstellungen, die von der Vorgabe abweichen, und die gewählte Stelle, etwa
`/dokument/3f9c2a71/bestellungen-json/code?ziel=pydantic&grenzen=attribute&stelle=/bestellungen/0`. Neuladen,
Zurück und Vor und ein Lesezeichen führen genau dorthin; `/ablage` öffnet die Ablage, `/` das zuletzt offene Dokument.
Maßgeblich ist der Anfang der Kennung (8 Zeichen, länger, falls zwei Dokumente gleich beginnen); der Name steht nur
zum Lesen dabei, Umbenennen bricht keinen Link. In die Adresse gehen: Code erzeugen (Ziel, Quelle, Wurzel,
Namensraum, Schalter), Validieren (Schema), Konvertieren (Ziel), Bereinigen und Schema (Reiter), Graph (Fokus,
Tiefe), Struktur (Typ), Statistik und Tabelle (Liste), Vergleich (Gegenseite aus der Ablage). Ein Dokument, das es in
der Ablage nicht gibt (etwa ein Link aus einem anderen Browser in der Bauart ohne Server), wird gemeldet; es bleibt
beim zuletzt offenen.

Bei jedem Start und Neuladen erscheint ein Hinweis: Nutzung nur privat und kostenfrei (Copyright HalloWelt42),
was mit den Daten geschieht (ohne Server: nichts verlässt den Browser; mit Server: Ablage auf pi5b, gerechnet im
Browser), Betaphase und dass die Beispiele erfunden sind. Von dort führt ein Link zu `lizenzen.txt` mit der eigenen
Lizenz und den Lizenzen aller Bausteine; der Bau sammelt sie selbst (frontend/lizenzen/sammeln.ts). Später jederzeit
über die Palette: "Über Strukturblick".

Zum Üben gibt es erfundene Beispieldaten: "Beispiele zum Üben" auf der Startseite, in der Ablage oder über die
Befehlspalette ("Beispiele öffnen"). Sie landen im Ordner Beispiele der eigenen Ablage: bestellungen.json (128
Bestellungen eines Hofladens), kunden.csv (1.214 Kunden mit absichtlichen Unsauberkeiten), dienste.yaml,
bestellung.schema.json (Schema eines Lieferdienstes zum Validieren), kundenimport.ndjson (Kundenimport mit vier
kaputten Zeilen zum Reparieren), webshop.toml (Einstellungen des Webshops in TOML), lieferungen.xml (Lieferscheine in XML) mit lieferungen.xsd und
hofladen-position.xsd (XML Schema dazu, das zweite vom ersten importiert). Ein
zweites Öffnen zeigt die vorhandenen samt Änderungen; frisch anfangen: die Beispiele in den Papierkorb legen.
Quelle ist frontend/pruefdaten; Adressen unter example.org, Telefonnummern aus dem für Film und Fernsehen
freigehaltenen Bereich 030 23125.

Ein Rechtsklick (oder die Kontextmenü-Taste, Umschalt+F10) auf ein Dokument in Leiste oder Ablage öffnet das
eigene Menü: Öffnen, Umbenennen (in der Leiste an Ort und Stelle, auch mit F2), Duplizieren, Verschieben nach (alle
Ordner), Herunterladen, In den Papierkorb. Ordner bieten Neues Dokument darin, Umbenennen und Entfernen (nur leer),
Reiter Schließen, Andere schließen und Im Ordner zeigen. Im Editor und in Eingabefeldern bleibt das Menü des
Browsers mit Kopieren und Einfügen. Löschen geht außerdem über den Papierkorb neben jedem Dokument der Leiste und
über die Befehlspalette ("Dokument in den Papierkorb").

Die Abfrage am Fuß des Hauptbereichs (⌥ ⌘ E oder "Öffnen" in der Leiste) rechnet beim Tippen, ganz im Browser:

- jq (echtes jq 1.8 als WebAssembly) und JSONPath auf dem offenen Dokument; die Treffer erscheinen im Baum
  (F3 und ⇧ F3 springen), jeder Wert mit bekanntem Ort springt per Klick dorthin.
- SQL (SQLite im Browser) über alle offenen Dokumente: jedes Dokument ist eine Tabelle, Listen von Objekten
  werden eigene Tabellen mit Verweis auf die Elternzeile (etwa positionen.nr auf bestellungen); lower und upper
  kennen Umlaute, REGEXP geht. Das Ergebnis belegt die Ansicht mit Balken zum Vergleich.
- XPath bei XML-Dokumenten (nur dann steht es zur Wahl), gerechnet mit libxml2 wie die Prüfung gegen XML Schema:
  Elemente, Attribute (`//lieferung/@nr`), Bedingungen, Präfixe aus dem Dokument (`hl:position`) und Funktionen wie
  `count()`. Getroffene Knoten werden Stellen in der Lesart von Strukturblick und springen wie jq-Treffer; Zahlen,
  Text und Wahrheitswerte stehen als ein Wert da. Wechselt das Dokument auf eines ohne XML, gilt wieder jq.
- Suche über Schlüssel und Werte, wahlweise als regulärer Ausdruck und mit Groß und Klein.

Bei YAML steht an einem Alias (`*name`) für Abfragen, SQL, Validieren, Vergleich und Konvertieren der ganze Inhalt seines
Ankers (`&name`); der Baum zeigt den Alias als Verweis auf die Zeile des Ankers. `<<` ist ein gewöhnlicher Schlüssel.
Ganzzahlen über 2^53 (etwa 64-Bit-Kennungen) bleiben Ziffer für Ziffer genau: in jq, JSONPath, Vergleich, beim
Konvertieren und Herunterladen als Zahl ohne Anführungszeichen, in SQL als ganze Zahl bis 2^63 (darüber genau als
Text); nur Validieren vergleicht Grenzen wie maximum mit dem gerundeten Wert.

Ein Fehler im Ausdruck steht an der Stelle im Feld; das letzte gültige Ergebnis bleibt gedimmt stehen. Jedes
Ergebnis lässt sich ganz als neues Dokument anlegen (⌘ Enter), herunterladen (JSON, NDJSON, CSV mit Semikolon)
oder in den Abfragen-Verlauf legen. Eine Abfrage, die länger als 10 s rechnet, wird abgebrochen.

Gefilterte Tabellen und Treffer im Baum lassen sich ebenso mitnehmen: "Exportieren" in der Werkzeugzeile der
Tabelle nimmt genau die sichtbaren Zeilen (Filter und Sortierung wie angezeigt), "Treffer" neben der
Treffernavigation des Baums die Treffer der Suche oder Abfrage (einzelne Werte mit ihrem Pfad). Beides geht als
Datei (JSON, NDJSON, CSV) oder als neues Dokument in der Ablage, im selben Ordner wie die Quelle.

In der Tabelle zählt "Duplikate prüfen" doppelte Zeilen nach der Spalte, die als Schlüssel taugt (immer gefüllt,
fast überall verschieden, Namen wie nr oder id zuerst). Das Blatt zeigt je Gruppe die Zeilen mit markierten
Unterschieden; gleich sein müssen der Schlüssel, die ganze Zeile oder gewählte Spalten, und es bleibt die erste, die
letzte oder die Zeile mit den meisten Angaben, oder eine von Hand gewählte. Ist eine Spalte gewählt (Klick auf den
Kopf), entfernt der Knopf mit dem Papierkorb sie aus allen Einträgen, bei CSV samt Kopfzelle. Beides ist ein
Vorgang im Verlauf und landet als Schritt in Rezepten (eigene Wahl bei Duplikaten nicht, sie gilt nur für diese
Datei).

Die Ansicht Statistik (⌥ ⌘ 4) zeigt Kennzahlen des Dokuments (Knoten, Tiefe, Größe, Arten) und je Feld der Liste,
die auch die Tabelle zeigt, Typ, Vorkommen, verschiedene Werte, Textlänge, Spanne (bei Beträgen nach Zahl, bei
Datum nach Datum) und den Leer-Anteil (fehlt, null oder leer). Verschachtelte Felder stehen als Musterpfad da
(positionen[].preis). Ein Klick auf ein Feld zeigt sein Histogramm und im Inspektor alle Werte dieses Pfads; Muster
nennen Schlüssel, Datumsangaben und Nummern mit führender Null.

Die Ansicht Struktur (⌥ ⌘ 5) leitet aus allen Werten das Schema ab: je Objekttyp eine Karte mit Feldern, Typ
(Datum in ISO-Form, andere Datumsformen, nur Ziffern, ganze Zahl), Stern für "in jedem Eintrag" und Schlüssel;
Kanten nennen 1, 0..1 oder 0..n. Namen kommen aus den Schlüsseln, Listeneinträge aus dem Listennamen in der
Einzahl. "Als JSON Schema" lädt das Schema (Entwurf 2020-12) herunter; der Inspektor zeigt den gewählten Typ und
seinen Ausschnitt zum Kopieren.

Bei XML-Dokumenten leitet "XML Schema ableiten" (auch in der Befehlspalette) ein XSD aus den Daten ab und legt es
neben das Dokument: name.abgeleitet.xsd, dazu je weiterem Namensraum eine Datei (name.abgeleitet.präfix.xsd), die
die erste importiert; das Ergebnis öffnet in der Ansicht Schema. Abgeleitet wird so streng, wie die Daten es zeigen:
Reihenfolge der Kinder aus dem Dokument (wechselt sie, eine Auswahl in beliebiger Reihenfolge), Pflicht ist, was in
jedem Vorkommen da ist, was mehrfach vorkommt, darf beliebig oft. Werttypen: Wahrheitswert nur mit true oder false,
ganze Zahl, Dezimalzahl, Datum, Zeitpunkt, Uhrzeit, sonst Text; Ziffern mit führender Null bleiben Text. Typen aus
xsi:type im Dokument werden benannt erklärt, xsi:nil macht ein Element nillable. Das Ausgangsdokument ist gegen das
Ergebnis gültig; vor dem Einsatz für andere Daten prüfen und wo nötig lockern.

Die Ansicht Graph (⌥ ⌘ 6) zeigt einen Ausschnitt der Daten als Wertkarten: ab einem Fokus eine bis drei Ebenen tief
(Tiefe oben rechts), links die Karte eine Ebene höher als Rückweg. Jede Karte nennt Schlüssel oder Stelle, Art, den Wert
oder bei Objekten den ersten Text darin, und den Umfang; ein Plus heißt, darunter liegt mehr, als die Tiefe zeigt. Klick
auf ein Objekt oder eine Liste setzt den Fokus dorthin und richtet den Graph neu aus, Klick auf einen Wert wählt ihn
(Inspektor und die anderen Ansichten folgen); der Pfad oben springt zu einem Vorfahren. Der Inspektor blättert zum vorigen oder nächsten Nachbarn des Fokus. Sehr lange Listen
zeigt der Fokus mit 50, tiefere Ebenen mit 12 Einträgen, den Rest als Zahl.

Die Ansicht Vergleich (⌥ ⌘ 7) vergleicht das Dokument mit einer Gegenseite: einem anderen offenen Dokument, einem aus
der Ablage, einem früheren Stand aus dem Verlauf (vorgewählt ist der Anfang, sobald es Änderungen gibt) oder einer
Datei, die dafür nicht abgelegt wird. Verglichen wird der Aufbau, nicht der Text: Objekte nach Schlüsseln (ihre
Reihenfolge zählt nicht), Listen über ein Schlüsselfeld, das Strukturblick selbst erkennt, wenn es nach Kennung aussieht
(nr, id ...) und in beiden Listen eindeutig ist; ein anderes Feld oder "nach Stelle" lässt sich wählen. Nach Stelle
werden gleiche Einträge ausgerichtet, ein eingefügter Eintrag macht die folgenden also nicht zu Änderungen. Eine andere
Reihenfolge ist ein eigener Unterschied, außer "Reihenfolge ignorieren" ist an.

Die Ansicht Schema (⌥ ⌘ 8) gibt es nur bei XML-Schema-Dokumenten (Wurzel xs:schema). Sie liest das Schema samt allem,
was es importiert oder einbindet; die Dateien dafür sucht Strukturblick im selben Ordner der Ablage, was fehlt, nennt das
Hinweisband. Drei Reiter: Elementbaum zeigt, was in einem gültigen Dokument wo stehen darf, Ebene für Ebene beim
Aufklappen, mit Vielfalt (1, 0..1, 0..n, 1..n oder Grenzen wie 2..5) und * für Pflicht. Erweiterte Typen bringen Inhalt und Attribute ihrer Basis
mit, eine Auswahl steht als eigener Knoten "eins von", ein abstraktes Element zeigt die Elemente seiner Ersetzungsgruppe,
und wo sich ein Typ wiederholt, endet der Zweig mit der Marke rekursiv. Typen listet alle benannten Typen mit Art,
Ableitung, Zahl der erlaubten Werte und Verwendungen, mit Suche und Filtern (Komplex, Einfach, Mit Werten, Ungenutzt).
Statistik zählt Dateien, Namensräume, Elemente, Typen und Tiefe, zeigt Ableitungen und eingebaute Typen als Balken, die
meistgenutzten Basistypen, die gelesenen Dateien und ungenutzte Typen. Der Inspektor zeigt zur gewählten Stelle oder zum
Typ die Ableitungskette bis zum eingebauten Typ, Einschränkungen (Muster, Längen, Grenzen), erlaubte Werte mit Erklärung,
Attribute und wo der Typ verwendet wird; "Im Editor" springt zur Erklärung, "Öffnen" holt eine importierte Datei aus der
Ablage. Zum Üben: lieferungen.xsd aus den Beispielen.

"Beispieldokument" in der Ansicht Schema erzeugt ein gültiges XML-Dokument zur Wurzel, die im Elementbaum gewählt ist
(sonst zur ersten): "Nur Pflichtteile" oder "Jedes Teil einmal". Es landet als name.beispiel.xml neben dem Schema,
verweist darauf (xsi:schemaLocation) und öffnet gleich in Validieren. Die Werte sind Platzhalter, halten aber erlaubte
Werte, Muster, Längen, Grenzen und Stellen ein; bei einer Auswahl steht die erste Möglichkeit, für ein abstraktes
Element eins aus seiner Ersetzungsgruppe, für einen abstrakten Typ ein abgeleiteter (mit xsi:type). Optionale Teile,
die sich endlos wiederholen würden, bleiben weg; über 5.000 Elemente kommen nur noch Pflichtteile dazu. Was sich nicht
gültig erzeugen lässt (etwa ein abstrakter Typ ohne Ableitung im gelesenen Schema), nennt die Meldung.

Beide Seiten stehen nebeneinander, Zeile für Zeile; Gleiches ist eingeklappt ("[2] bis [126]: 125 Einträge, gleich")
und klappt per Klick auf. Rechts (bei wenig Breite darunter) stehen die Unterschiede mit Pfad wie
bestellungen[nr="B-2"].bezahlt; ein Klick rollt die Seiten dorthin. Der Inspektor zeigt den gewählten Unterschied mit
Zeiger und Werten, übernimmt den Wert der Gegenseite ins Dokument (ein Vorgang im Verlauf) und zeigt die Stelle im
Baum. "Als JSON Patch" (RFC 6902) lädt die Vorgänge herunter, die Vorher in Jetzt verwandeln; "Seiten tauschen" dreht
die Richtung um.

Das Werkzeug Validieren (Leiste, "Prüfen und umbauen") prüft die Daten gegen ein JSON Schema (Entwurf 2020-12 und
älter): "Aus der Ablage" nimmt ein .json-Dokument der Ablage als Schema, "Aus den Daten" das Schema, das auch die
Struktur zeigt. Jeder Befund nennt Stelle (Pfad, Zeile, Eintrag), was erwartet war, was da steht, und die Regel im
Schema; Fehler und Warnungen lassen sich getrennt filtern, ein Format wie date gilt als Warnung. Die Fundstelle
zeigt die Zeilen rundherum mit der falschen Stelle unterstrichen und springt in Editor oder Baum. Gibt es einen
eindeutigen Vorschlag (etwa eine fehlende führende Null bei einer Postleitzahl), setzt "Beheben" im Inspektor den
Wert als ein Vorgang im Verlauf. "Bericht herunterladen" schreibt alle Befunde als Text. Zum Üben: die Beispiele
öffnen und bestellung.schema.json wählen; es erlaubt höchstens drei Positionen je Bestellung.

Bei XML-Dokumenten prüft Validieren gegen XML Schema (XSD), mit libxml2 im Browser (lädt beim ersten Prüfen). Das
Schema kommt aus der Ablage (seine Importe sucht Strukturblick im selben Ordner nach Dateinamen) oder aus einem
Schema-Paket als ZIP, das nur im Browser bleibt und nicht abgelegt wird (Importe nach Pfad im Paket). Verweist das
Dokument selbst auf ein Schema (xsi:schemaLocation oder xsi:noNamespaceSchemaLocation), wird es vorgewählt. Befunde
stehen wie bei JSON Schema mit Stelle, Meldung, Soll und Ist da; die häufigen Meldungen von libxml2 sind übersetzt,
seltene stehen im Wortlaut mit "libxml2:" davor. Fehlt ein importiertes Schema oder hat das Schema selbst einen Fehler,
sagt das der Hinweis. Zum Üben: lieferungen.xml mit lieferungen.xsd; das Schema verlangt bezahlt als Wahrheitswert,
die Daten sagen ja und nein.

Das Werkzeug Reparieren (Leiste, "Prüfen und umbauen"; bei Fehlern auch "Reparieren" im Fuß und im Baum) macht
kaputtes JSON und JSON Lines lesbar. "Lesen als" wählt JSON Lines (ein Datensatz je Zeile) oder JSON (die ganze
Datei); vorgewählt ist das Format des Dokuments. Die Reparatur folgt festen Regeln, gleiche Datei ergibt gleichen
Vorschlag: fehlende Kommas, Doppelpunkte und Klammern ergänzen, abgeschnittene Texte und Objekte schließen, einfache
Anführungszeichen in doppelte setzen, Schlüssel und Texte ohne Anführungszeichen einfassen, True, None und NaN in
JSON-Wörter umschreiben, Zahlen wie +1, .5 oder 007 (als Text) richten, Kommentare und überzählige Kommas in JSON
Lines entfernen, zwei Datensätze einer Zeile auf zwei Zeilen verteilen. Werte werden nicht geraten: Fehlt einer,
steht null und ein Hinweis; fehlen einem Datensatz Felder, die die übrigen haben, sagt ein Hinweis welche. Wo keine
Regel greift, steht "bitte von Hand" mit Spalte.

Je Zeile stehen Spalte, Meldung und Vorschlag; rechts die Vorschau als Unterschied (alte Zeile mit der Stelle, neue
mit dem Ergänzten). Jede Zeile lässt sich mit "Zeile so lassen" ausnehmen; das Band oben zählt, wie viele Zeichen
ergänzt und gelöscht werden, die Zeile unten, wie viele Datensätze danach lesbar sind. "Übernehmen" ist ein Vorgang
im Verlauf, "Verwerfen" schließt das Werkzeug ohne Änderung.

Das Werkzeug Konvertieren (Leiste, "Prüfen und umbauen") schreibt das Dokument in ein anderes Format um: CSV, JSON
Lines, JSON, YAML, TOML, XML, Markdown, HTML oder XLSX (das eigene Format steht nicht zur Wahl). Das Dokument bleibt unverändert; das Ergebnis wird
mit "Als neues Dokument" ein eigener Reiter im selben Ordner oder mit "Herunterladen" eine Datei. Über Quelle und
Ergebnis steht die Verlustkarte "Was ... nicht kann", ehrlich vor dem Umwandeln:

- CSV hat eine Zeile je Eintrag der Hauptliste (der Liste, die auch die Tabelle zeigt). Steckt in den Einträgen eine
  Liste (etwa positionen), gibt es drei Wege: eine Zeile je Element (die übrigen Werte wiederholen sich), Spalten je
  Element (positionen.0.artikel ...) oder die Liste als JSON-Text in einer Zelle; jeder Weg nennt Zeilen und Spalten.
  Objekte werden Spalten mit Punkt (kunde.name) oder JSON-Text. Trennzeichen Semikolon, Komma oder Tab, mit oder
  ohne Kopfzeile.
- Weitere Punkte, wo sie zutreffen: Typen werden in CSV Text (mit Beispielen und Nummern mit führender Null), null
  und leer sehen gleich aus, Felder außerhalb der Hauptliste fehlen in CSV und JSON Lines, Kommentare gehen
  verloren, aus CSV bleiben Werte Text, nicht lesbare Stellen kommen nur als Text mit (vorher Reparieren).
- YAML wird nach den Regeln von 1.1 geschrieben: Texte wie yes, on oder 2026-11-01 stehen in Anführungszeichen und
  bleiben in jedem Leser Text.
- TOML braucht oben ein Objekt (eine Liste kommt unter eintraege, jeder Eintrag als eigener Abschnitt in doppelten eckigen Klammern) und kennt
  kein null: solche Felder fallen weg, die Karte nennt sie. Aus TOML werden Datum und Zeit in den übrigen Zielen Text.
- XML braucht ein Wurzelelement (sonst steht alles unter daten), Felder mit @ werden Attribute, #text wird Text, Listen
  werden wiederholte Elemente, null ein leeres Element; Namen, die XML nicht erlaubt, werden angepasst und genannt.
  Aus XML sagt die Karte, welche Elemente mal einzeln, mal als Liste vorkommen (ein einzelnes wird keine Liste).
- XLSX ist eine Tabellendatei: die Hauptliste wird ein Blatt (Listen in den Einträgen wie bei CSV), Felder außerhalb
  der Liste kommen auf das Blatt Angaben. Zahlen, Wahrheitswerte und Datum behalten ihren Typ, Nummern mit führender
  Null bleiben Text, die Kopfzeile ist fett und bleibt beim Rollen stehen. Das Ergebnis wird heruntergeladen; ein
  neues Dokument entsteht daraus nicht, weil es kein Text ist.
- Markdown und HTML zeigen die Hauptliste als Tabelle zum Lesen, Felder außerhalb der Liste als zweite Tabelle
  Angaben, Zahlen rechtsbündig. Typen werden Text, null eine leere Zelle. Markdown wird ein neues Dokument, HTML eine
  Seite zum Herunterladen.

Im Werkzeug zeigt der Inspektor Zeilen, Spalten, Größe und bei CSV, woher jede Spalte kommt (aus dem Eintrag,
aufgeklappt, je Element der Liste).

Das Werkzeug Code erzeugen (Leiste, "Erzeugen") schreibt Klassen zu den Daten: PHP (final readonly class mit
fromArray), TypeScript (Interfaces für JSON.parse), Python mit Pydantic (BaseModel, Grenzen als Field) oder mit
dataclasses (from_dict). Quelle ist das Schema der Daten (wie in der Ansicht Struktur abgeleitet) oder ein JSON Schema
aus der Ablage. Einstellbar sind Wurzelname, Namensraum (PHP), readonly oder veränderbar und eine Datei oder je Klasse
eine. Objekte werden Klassen ($defs mit ihrem Namen, eingebettete nach dem Feld), Datum und Zeitpunkt werden
DateTimeImmutable, date und datetime (in TypeScript bleiben sie Text), null-fähige und fehlende Felder optional, feste
Werte Aufzählungen; Grenzen aus dem Schema stehen am Feld (PHPDoc, Kommentar, Pydantic prüft sie). Schlüssel, die kein
Bezeichner sind ("@nr", "class"), bekommen einen gültigen Namen und werden über den Schlüssel gelesen. Der Inspektor
zeigt, wie Schema-Typen im Code ankommen und wie man die Daten einliest; mehrere Dateien lädt "Herunterladen" als ZIP.
Objekte mit freien Schlüsseln und gleich gebauten Werten (additionalProperties) werden Zuordnungen (array<string, X>,
Record, dict), allOf wird zu einer Klasse zusammengeführt, Schemas nur mit Definitionen bekommen eine Klasse je
Definition. Bei PHP stehen die Grenzen wahlweise als PHPDoc oder als Attribute des Symfony Validators (#[Assert\Count]
...), den Eintragstyp von Listen prüft #[Assert\All([new Assert\Type(...)])], list<T> steht zusätzlich im PHPDoc für
Editor und statische Analyse. Der Inspektor nennt die Attribute je Feld, der Hinweis unter der Tafel zählt sie; aus
Daten abgeleitet gibt es kaum Grenzen (etwa Muster), mehr liefert ein JSON Schema aus der Ablage. Der Kopf der Tafel
und jeder Datei nennt, was der Code braucht (etwa "PHP ab 8.2 und symfony/validator 7"), die Fassung des Schemas und
von Strukturblick samt HalloWelt42 und Webadresse.

"Projekt als ZIP" liefert ein lauffähiges Miniprojekt: die Klassen, die Daten des Dokuments als JSON, ein
Leseprogramm, das einliest und eine Übersicht zeigt, die übliche Abhängigkeitsdatei und eine README. PHP (Composer mit
PSR-4, lesen.php mit eigenem Autoloader), TypeScript (ab Node 22.18 direkt mit node src/lesen.ts, sonst npm start) und
dataclasses laufen ohne Installation; die Prüfung mit Symfony holt composer install, Pydantic pip install. Geprüft an
247 echten JSON-Dateien und 91 JSON Schemas in Docker (PHP 8.1, 8.2, 8.5, Python 3.10 und 3.11, Node 22, tsc --strict).

"Testdaten" (Leiste, Erzeugen) macht erfundene Daten nach dem Vorbild des Dokuments. Die Spezifikation leitet je Feld
der Liste (wie in Statistik und Tabelle) einen Erzeuger aus den Werten ab: laufende Nummer mit Muster (K-#####), Name,
Postleitzahl, Ort, Straße, E-Mail, Telefon, Datum, Zeitpunkt, Zahl oder Betrag (auch deutsch mit Tausenderpunkt), ja
oder nein, Auswahl aus festen Werten mit Gewicht, Text, fester Wert, UUID; Objekte und Listen (mit Länge von bis)
bleiben verschachtelt. Je Datensatz passen Name und E-Mail sowie Postleitzahl, Ort und Vorwahl zusammen; E-Mail-Adressen
enden auf .example und erreichen niemanden. Je Feld lässt sich ein Anteil leerer Werte einstellen (Schlüssel fehlt,
null, leerer Text). Ein Klick auf eine Zeile wählt das Feld, der Inspektor ändert Name, Erzeuger und Einstellungen und
zeigt das Feld in der Vorlage und Beispiele. Anzahl (bis 1 Million), Startwert (gleicher Startwert, gleiche Daten) und
Zielformat (CSV mit Trennzeichen, JSON, NDJSON, YAML; vorgewählt wie die Vorlage) stehen unter "Erzeugen"; es läuft in
Blöcken mit Anhalten und Fortsetzen, das Ergebnis geht als neues Dokument oder als Datei. "Spezifikation speichern" legt
alles als Dokument `<name>.testdaten.json` ab; geöffnet dient es dem Werkzeug als Vorlage und erzeugt dieselben Daten.
Geänderte Einstellungen halten, solange das Dokument offen ist; dauerhaft über Speichern.

TOML liest Strukturblick selbst, mit allen Stellen im Text: Tabellen ([kontakt]), Tabellenlisten (versand in doppelten eckigen Klammern)
als Liste, Punktschlüssel (offen.tage), eingebettete Tabellen ({ prozent = 2 }), alle Textformen, Zahlen auch zur Basis 16,
8 und 2, Datum und Zeit. Ein Fehler betrifft nur seine Zeile; der Rest bleibt lesbar. Ändern, Einträge entfernen und
Spalten entfernen wirken nur an ihren Stellen, Kommentare und Anordnung bleiben; null lässt TOML nicht zu.

XML liest Strukturblick ebenfalls selbst, nach festen Regeln: Ein Element mit Attributen oder Kind-Elementen wird ein
Objekt, Attribute heißen @name, Text daneben #text, ein Element nur mit Text wird Text, gleichnamige Geschwister werden
eine Liste. XML kennt keine Typen; alle Werte sind Text (umwandeln mit Bereinigen, Typen). Geprüft wird streng wie
von einem XML-Parser: Entities, & und < an falscher Stelle, die Lage der XML-Deklaration, Namensräume, -- in
Kommentaren und verbotene Steuerzeichen. Entities aus einer DTD werden aus Sicherheitsgründen nicht aufgelöst, nur
gemeldet. Ändern und Entfernen wirken nur an ihren Stellen; Kommentare, Einrückung und Namensräume bleiben.

Beim Öffnen einer Datei erkennt Strukturblick die Kodierung: Bytereihenfolge-Marke, die Angabe encoding in der
XML-Deklaration (etwa ISO-8859-1), sonst UTF-8; ist eine Datei kein gültiges UTF-8, wird sie als Windows-1252 gelesen.
Eine Meldung sagt, wenn nicht UTF-8 gelesen wurde; Herunterladen schreibt immer UTF-8.

Markdown-Tabellen liest Strukturblick wie CSV: Kopfzeile, darunter die Trennzeile (|---|---|), darunter die
Datenzeilen; äußere Striche sind freiwillig, \| steht für einen Strich im Inhalt, <br> für einen Zeilenumbruch. Steht
mehr als eine Tabelle im Text, heißen sie nach ihrer Überschrift; Text um die Tabellen bleibt unberührt. Ändern,
Zeilen und Spalten entfernen wirken nur an ihren Stellen.

HTML-Seiten (.html) werden wie Tabellendateien eingelesen: Strukturblick nimmt nur die Tabellen heraus (Name aus der
Beschriftung oder der Überschrift davor) und macht daraus ein JSON-Dokument; Zellen über mehrere Spalten oder Zeilen
nennt die Meldung. Alle Werte sind dann Text.

Tabellendateien (.xlsx) lassen sich öffnen wie andere Dateien (Datei öffnen oder hineinziehen). Strukturblick arbeitet
auf Text, deshalb wird daraus ein JSON-Dokument mit einer Liste je Blatt: Die erste Zeile gibt die Feldnamen, wenn sie
nur Texte enthält (sonst heißen die Felder A, B ...), leere Zellen werden null, ganz leere Zeilen fallen weg. Zahlen,
Wahrheitswerte und Datum (am Zahlenformat erkannt, als 2026-11-03) behalten ihren Typ. Formeln liefern ihr zuletzt
berechnetes Ergebnis; Formeln, Fehlerwerte und verbundene Zellen nennt die Meldung beim Öffnen. Die Datei selbst
bleibt unverändert.

Das Werkzeug Bereinigen (Leiste, "Prüfen und umbauen", oder die Befehlspalette) arbeitet auf der Liste, die
auch die Tabelle zeigt, und belegt den Platz der Ansicht, bis es über das Kreuz im Segment geschlossen wird:

- Facetten: Eine Facette zählt, welche Werte in einer Spalte stehen und wie oft (bei Listen in der Zelle jeden
  Eintrag). Text zum Ankreuzen, Zahlen und Beträge als Verteilung mit Bereich, Datumsangaben je Monat. Mehrere
  Facetten filtern zusammen; der Inspektor zählt die Zeilen nach jedem Filter. "Als neues Dokument" legt eine Kopie
  mit den Treffern an, "Nur diese Zeilen behalten" entfernt nach einer Vorschau die übrigen Zeilen aus dem Text
  (Kopfzeile, Kommentare und Schreibweise bleiben).
- Ähnliche Werte: Schreibweisen mit gleichem Kern (Groß und klein, Leerzeichen und Satzzeichen zählen nicht),
  ähnlichen Buchstabenpaaren oder höchstens zwei Tippfehlern Abstand. Je Gruppe Zielwert wählen oder eintippen,
  Gruppen mit "Nein" ausnehmen. Die unscharfen Verfahren gehen bis 1.500 verschiedene Werte je Spalte.
- Typen: was je Spalte erkannt wird (Betrag im deutschen Format, Datum, Nummer mit führender Null) und was sich
  einheitlich umschreiben ließe. Umgewandelt wird nur auf Knopfdruck; nicht lesbare Werte bleiben stehen oder
  werden auf Wunsch leer.

Jedes Übernehmen ist genau ein Vorgang im Verlauf und lässt sich rückgängig machen.

Rezepte (Leiste, Abschnitt "Rezepte") wiederholen das Aufräumen an der nächsten Datei gleicher Bauart. Jeder
Vorgang aus Bereinigen merkt sich im Verlauf, was fachlich geschah (Spalte und Regel, nie Stellen im Text);
"Neues Rezept aus dem Verlauf" macht aus den gewählten Vorgängen Schritte. Schritte lassen sich ausschalten,
verschieben und entfernen, bei Betrag und Datum gilt für nicht lesbare Werte "stehen lassen" oder "leer setzen".
"Anwenden" läuft auf dem offenen Dokument: erst die Prüfung der Spalten (fehlt eine, wird nur ihr Schritt
übersprungen, zusätzliche bleiben), dann die Vorschau je Schritt, dann als neues Dokument im selben Ordner oder als
ein Vorgang im Dokument. Rezepte liegen in der Ablage (auf pi5b je Konto, ohne Server im Browser) und lassen sich
einzeln als Datei herunterladen.

Die Befehlspalette ist das Suchfeld oben rechts im Kopf: hineinklicken oder ⌘ K (unter Windows und Linux Strg K) und gleich tippen, die Treffer erscheinen als Liste darunter, ohne Dialog und ohne Abdunkeln. Sie findet Befehle, Dokumente,
Ordner und Ansichten mit unscharfer Suche; zuletzt Benutztes steht oben, jeder Befehl zeigt sein Tastenkürzel. Die
Kürzel (am Mac ⌘ und ⌥, sonst Strg und Alt):

| Kürzel | Befehl |
|---|---|
| ⌘ K | Ins Befehlsfeld oben rechts, auch aus dem Editor |
| F1 | Lexikon (Hilfe) öffnen oder schließen |
| ⌘ Z, ⇧ ⌘ Z oder ⌘ Y | Rückgängig, Wiederholen im gemeinsamen Verlauf des Dokuments, auch im Editor (in Eingabefeldern und im Abfragefeld deren eigenes) |
| ⌘ S | Jetzt ablegen (geschieht sonst von selbst) |
| ⇧ ⌘ S | Dokument herunterladen |
| ⌘ O | Datei öffnen |
| ⌥ ⌘ N | Neues Dokument |
| ⌥ ⌘ W | Dokument schließen |
| ⌥ ⌘ A | Ablage verwalten oder schließen |
| ⌥ ⌘ 1 bis 8 | Ansicht Baum, Editor, Tabelle, Statistik, Struktur, Graph, Vergleich, Schema (nur bei XML Schema) |
| ⌥ ⌘ E | Abfrage öffnen oder einklappen |
| F3, ⇧ F3 | Nächster, voriger Treffer im Baum |
| F2 | Dokument in der Leiste umbenennen |
| ⌘ F, ⌥ ⌘ F | Im Editor suchen, suchen und ersetzen |
| ⌘ Enter | Ergebnis der Abfrage als neues Dokument |
| ⇧ F10 oder Menütaste | Kontextmenü an der gewählten Stelle |

⌘ N, ⌘ W und ⌘ 1 bis 9 belegt der Browser selbst; deshalb tragen diese Befehle ⌥ dazu. Unter Windows und Linux wirken
die Kürzel mit Strg und Alt in Eingabefeldern nicht, weil Strg und Alt dort AltGr bedeuten (etwa für @ und eckige
Klammern).

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

Der Bau nimmt als Basis den Unterpfad des Repos (`STRUKTURBLICK_BASIS=/<Repo>/`, setzt der Ablauf) und legt
`404.html` als Kopie der Startseite dazu: Pages liefert sie für jeden tiefen Pfad, die Seite liest ihren Ort dann
selbst. Ohne die Variable baut Vite mit der Basis `/` (Server auf pi5b, der jeden Weg ohne Dateiendung mit der
Startseite beantwortet).

Probe: `https://hallowelt42.github.io/Strukturblick/` zeigt den Arbeitsplatz ohne Anmeldung; eine hineingezogene
Datei erscheint im Baum, nach dem Neuladen ist sie noch da. In der Ablage einen Ordner anlegen und die Datei dorthin
verschieben; die Leiste zeigt den Ordner.

## Sicherung und Rückspielen

Die Datenbank sichert der Appkern nach seiner Regel nach {{wurzel}}/sicherungen. Zurückspielen: App anhalten
(`docker compose -f compose.pi.yml stop strukturblick` in {{wurzel}}), Kopie als `daten/strukturblick.sqlite`
ablegen, starten. Prüfen: nach dem Anmelden sind die Dokumente in der Leiste wie vorher. Die Bauart ohne Server hat
keine Sicherung auf dem Server: dort in der Ablage "Alles sichern" wählen (Dokumente samt Verlauf und Rezepte) und die
Datei aufheben; auf einem anderen
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
