---
titel: XML Schema
unterzeile: XML gegen ein XSD prüfen, Schemas ableiten und Beispiele erzeugen
bereich: Prüfen
symbol: fa-sitemap
stichworte: xml schema, xsd, schema, validieren, prüfen, libxml2, import, include, chameleon, chamäleon, namensraum, targetnamespace, schemalocation, nonamespaceschemalocation, schema-paket, zip, ableiten, beispieldokument, simpletype, complextype, element, attribut
reihenfolge: 30
quellen: [W3C XML Schema 1.0 Teil 1: Strukturen](https://www.w3.org/TR/xmlschema-1/), [W3C XML Schema 1.0 Teil 2: Datentypen](https://www.w3.org/TR/xmlschema-2/), [W3C XML Schema Teil 0: Einführung](https://www.w3.org/TR/xmlschema-0/), [libxml2](https://gitlab.gnome.org/GNOME/libxml2)
---

Ein **XML Schema**, kurz **XSD** (nach der Dateiendung .xsd), ist der Bauplan für XML-Dokumente. Es legt fest, welche Elemente in welcher Reihenfolge vorkommen, welche Attribute sie tragen und welche Werte erlaubt sind: "Ein Lieferschein hat eine Nummer nach dem Muster L-0000", "bezahlt ist ein Wahrheitswert". Ein XSD ist selbst ein XML-Dokument. Für JSON und die übrigen Formate übernimmt diese Rolle [JSON Schema](#json-schema).

Strukturblick kann mit XML Schema drei Dinge: XML-Dokumente dagegen **prüfen** (Werkzeug [Validieren](#validieren)), ein Schema **lesen und zeigen** (Ansicht [Schema](#schema-ansicht)) und ein Schema aus Daten **ableiten** oder umgekehrt aus einem Schema ein **Beispieldokument** erzeugen.

## Wie ein XSD gebaut ist

Ein Auszug aus lieferungen.xsd aus den Beispieldaten (Leiste, "Beispiele zum Üben"):

```xml
<xs:complexType name="Lieferung">
  <xs:sequence>
    <xs:element name="kunde" type="Kunde"/>
    <xs:element ref="hl:position" maxOccurs="unbounded"/>
    <xs:element name="hinweis" type="xs:string" minOccurs="0"/>
    <xs:element name="bezahlt" type="xs:boolean"/>
  </xs:sequence>
  <xs:attribute name="nr" type="Lieferscheinnummer" use="required"/>
  <xs:attribute name="datum" type="xs:date" use="required"/>
</xs:complexType>

<xs:simpleType name="Lieferscheinnummer">
  <xs:restriction base="xs:string">
    <xs:pattern value="L-[0-9]{4}"/>
  </xs:restriction>
</xs:simpleType>
```

Die wichtigsten Bausteine:

| Baustein | Bedeutung |
|---|---|
| `xs:element` | Ein Element, mit Namen und Typ |
| `xs:attribute` | Ein Attribut; `use="required"` macht es zur Pflicht |
| `xs:complexType` | Typ mit Kindelementen oder Attributen |
| `xs:simpleType` | Typ für einen einfachen Wert, meist ein eingeschränkter eingebauter Typ |
| `xs:sequence` | Kinder in genau dieser Reihenfolge; `xs:choice` heißt "eins davon", `xs:all` "alle, Reihenfolge egal" |
| `minOccurs`, `maxOccurs` | Wie oft ein Element vorkommen darf; Vorgabe ist genau einmal, `unbounded` heißt beliebig oft |
| `xs:restriction` | Schränkt einen Typ ein, etwa mit `xs:pattern`, `xs:enumeration`, `xs:minInclusive`, `xs:maxLength` oder `xs:fractionDigits` |
| `xs:extension` | Erweitert einen Typ um weitere Kinder oder Attribute |

Eingebaute Typen beginnen mit `xs:`: `xs:string`, `xs:integer`, `xs:decimal`, `xs:boolean`, `xs:date` und viele mehr. Ein `xs:boolean` kennt nur `true`, `false`, `1` und `0`.

### Namensräume

Ein **Namensraum** (englisch namespace) ist eine Kennung, die Elemente verschiedener Herkunft auseinanderhält, etwa `urn:example:hofladen`. Im Dokument steht er hinter einem kurzen Präfix: `hl:position` ist das Element `position` aus dem Namensraum, für den `hl` steht. Ein Schema beschreibt mit `targetNamespace` genau einen Namensraum. Elemente aus einem anderen Namensraum kommen deshalb aus einer eigenen Schemadatei.

## Mehrere Dateien: import und include

Größere Schemas verteilen sich auf mehrere Dateien:

- **`xs:import`** holt ein Schema für einen **anderen** Namensraum. lieferungen.xsd hat keinen eigenen Namensraum und importiert hofladen-position.xsd für `urn:example:hofladen`, aus dem das Element `hl:position` stammt:

```xml
<xs:import namespace="urn:example:hofladen" schemaLocation="hofladen-position.xsd"/>
```

- **`xs:include`** bindet ein Schema für **denselben** Namensraum ein, als stünde sein Inhalt in der eigenen Datei.
- **Chamäleon-Include** (englisch chameleon): Hat die eingebundene Datei gar keinen `targetNamespace`, nimmt sie den Namensraum der einbindenden an, wie ein Chamäleon die Farbe seiner Umgebung. So lassen sich allgemeine Bausteine in verschiedenen Namensräumen wiederverwenden. Die Ansicht Schema ordnet solche Erklärungen dem einbindenden Namensraum zu.
- **`xs:redefine`** bindet ein und definiert dabei einzelne Typen neu; die Ansicht Schema zeigt dann die neue Fassung.

`schemaLocation` nennt, wo die Datei liegt. Strukturblick lädt dafür **nichts aus dem Netz**. Es sucht die Datei so:

1. **Aus der Ablage**: im selben Ordner wie das gewählte Schema, nach dem Dateinamen. Steht in `schemaLocation` eine Adresse wie `https://example.org/xsd/basis.xsd`, genügt eine Datei basis.xsd im Ordner. Leg deshalb alle Teile eines Schemas in einen gemeinsamen Ordner.
2. **Aus einem Schema-Paket**: ein ZIP mit allen .xsd-Dateien. Dort sucht Strukturblick erst nach dem vollen Pfad relativ zur einbindenden Datei (auch mit `../`), dann nach dem Ende des Pfads, zuletzt nach dem Dateinamen.

Fehlt eine Datei, nennt sie die Meldung beim Prüfen, etwa "Das Schema lässt sich nicht laden: Ein importiertes Schema fehlt (hofladen-position.xsd). Ablegen im selben Ordner oder als Schema-Paket laden." In der Ansicht Schema nennt das Hinweisband, was fehlt.

## XML gegen ein XSD prüfen

Öffne ein XML-Dokument und wähle in der Leiste unter "Prüfen und umbauen" das Werkzeug [Validieren](#werkzeug:validieren). Bei XML prüft es gegen XML Schema:

- **"Aus der Ablage"** listet alle .xsd-Dokumente der Ablage. Importe und Includes kommen aus demselben Ordner.
- **"Schema-Paket (ZIP)"** lädt ein ZIP mit Schemadateien. Das Paket bleibt nur in diesem Browser und wird nicht abgelegt; praktisch für umfangreiche Schemas von Behörden oder Verbänden. Im Paket wählst du das Hauptschema aus der Liste.
- **Verweist das Dokument selbst** auf ein Schema, über `xsi:noNamespaceSchemaLocation` oder `xsi:schemaLocation`, wählt Strukturblick es vor und markiert es in der Liste mit "laut Dokument".

Geprüft wird mit **libxml2**, einer bewährten XML-Bibliothek, als WebAssembly im Browser. Sie lädt beim ersten Prüfen und prüft nach XML Schema 1.0. Externe Entities aus einer DTD lädt sie absichtlich nicht; ein Dokument, das welche braucht, lässt sich hier nicht prüfen.

Die Befunde sehen aus wie bei JSON Schema: Stelle mit Pfad, Zeile und Spalte, Meldung, Erwartet und Gefunden, dazu das Element, an dem die Regel hängt. Die häufigen Meldungen von libxml2 stehen auf Deutsch da ("passt nicht zum Typ", "Pflichtattribut fehlt", "steht hier nicht an der richtigen Stelle"); seltene im Wortlaut mit "libxml2:" davor. Fehlt einer Ziffernfolge nur die führende Null (Muster `[0-9]{5}`, Wert `6108`), bietet der Inspektor unter "Beheben" den Knopf "Auf "06108" setzen" an.

### Übung mit lieferungen.xml

1. Öffne die Beispiele und darin lieferungen.xml.
2. Wähle Validieren. lieferungen.xsd ist schon vorgewählt, denn das Dokument nennt es in `xsi:noNamespaceSchemaLocation`. hofladen-position.xsd liegt im selben Ordner Beispiele und wird für den Import gefunden.

Ergebnis: 12 Fehler, je Lieferschein einer, etwa "'nein' passt nicht zum Typ xs:boolean". Das Schema verlangt einen Wahrheitswert, die Daten sagen ja und nein. Welche Werte dort stehen, zeigt eine Abfrage mit [XPath](#xpath):

```xpath
//lieferung[bezahlt = 'nein']/@nr
```

Ergebnis: 4 Nummern, `L-2401`, `L-2404`, `L-2407` und `L-2410`; die übrigen 8 Lieferscheine sagen ja. Dasselbe in [jq](#jq):

```jq
.lieferungen.lieferung | map(.bezahlt) | group_by(.) | map({wert: .[0], anzahl: length})
```

Ergebnis: `ja` 8 Mal, `nein` 4 Mal. Ersetzt du im Editor ja durch true und nein durch false, ist das Dokument gültig.

## Ein XSD aus Daten ableiten

"XML Schema ableiten" in der Ansicht [Struktur](#ansicht:struktur) oder in der Befehlspalette (⌘ K) baut aus einem XML-Dokument ein passendes Schema und legt es neben das Dokument: name.abgeleitet.xsd und für jeden weiteren Namensraum eine eigene Datei name.abgeleitet.präfix.xsd, die die erste importiert. Das Ergebnis öffnet in der Ansicht Schema.

Abgeleitet wird so streng, wie die Daten es zeigen:

- Die Reihenfolge der Kinder kommt aus dem Dokument. Wechselt sie, entsteht eine Auswahl in beliebiger Reihenfolge.
- Pflicht ist, was in jedem Vorkommen da ist; was mehrfach vorkommt, darf beliebig oft.
- Werttypen: Wahrheitswert nur bei true oder false, ganze Zahl, Dezimalzahl, Datum, Zeitpunkt, Uhrzeit, sonst Text. Ziffern mit führender Null bleiben Text.
- Typen aus `xsi:type` im Dokument werden benannt erklärt, `xsi:nil` macht ein Element nillable (darf leer bleiben).

Aus lieferungen.xml entstehen so lieferungen.abgeleitet.xsd und lieferungen.abgeleitet.hl.xsd für die Positionen. Darin ist `datum` ein `xs:date`, `preis` ein `xs:decimal`, aber `plz` ein `xs:string` (wegen 06108) und `bezahlt` ebenfalls `xs:string`, denn ja und nein sind kein Wahrheitswert. Das Ausgangsdokument ist gegen das Ergebnis gültig. Bevor du das Schema für andere Daten nimmst: prüfen und wo nötig lockern oder verschärfen.

## Ein Beispieldokument erzeugen

Umgekehrt geht es auch. Öffne ein XSD, etwa lieferungen.xsd, in der Ansicht [Schema](#schema-ansicht) (⌥ ⌘ 8, unter Windows und Linux Strg Alt 8) und wähle "Beispieldokument":

- **Nur Pflichtteile**: alles, was sein muss, und nichts darüber hinaus.
- **Jedes Teil einmal**: auch alle optionalen Elemente und Attribute, je einmal.

Das Dokument landet als name.beispiel.xml neben dem Schema, verweist per `xsi:schemaLocation` oder `xsi:noNamespaceSchemaLocation` darauf und öffnet gleich in Validieren. Die Werte sind Platzhalter, halten aber erlaubte Werte, Muster, Längen und Grenzen ein. Für lieferungen.xsd ergibt "Nur Pflichtteile" einen Lieferschein mit `nr="L-0000"`, einem Kunden, einer Position und `<bezahlt>true</bezahlt>`, 8 Elemente insgesamt; "Jedes Teil einmal" bringt dazu `zahlweise="bar"`, die Einheit und einen Hinweis.

Bei einer Auswahl steht die erste Möglichkeit, für ein abstraktes Element eines aus seiner Ersetzungsgruppe. Optionale Teile, die sich endlos wiederholen würden, bleiben weg; ab 5.000 Elementen kommen nur noch Pflichtteile dazu. Was sich nicht gültig erzeugen lässt, nennt die Meldung.

## Die Ansicht Schema

Ein XSD selbst liest du am besten in der Ansicht [Schema](#schema-ansicht): Elementbaum, Liste aller Typen, Statistik und im Inspektor die Ableitungskette jedes Typs mit seinen Einschränkungen. Sie liest das Schema samt allem, was es importiert oder einbindet, aus demselben Ordner der Ablage.

## Grenzen

- libxml2 prüft nach **XML Schema 1.0**. Bausteine aus Fassung 1.1 wie `xs:assert` oder `xs:override` kennt es nicht.
- Schemadateien kommen nur aus der Ablage (gleicher Ordner) oder aus einem Schema-Paket, nie aus dem Netz.
- Das Dokument muss wohlgeformt sein, sonst meldet Validieren "Das Dokument ist kein wohlgeformtes XML". Die Fehler zeigt der [Editor](#editor).
- Ein abgeleitetes Schema beschreibt deine Beispieldaten, nicht alle denkbaren Daten.

## Weiter

- [XML](#xml) zur Lesart von XML in Strukturblick (Attribute als `@name`, Text als `#text`)
- [XPath](#xpath), um XML-Dokumente gezielt abzufragen
- [Validieren](#validieren) zu Befunden, Filtern und Bericht
