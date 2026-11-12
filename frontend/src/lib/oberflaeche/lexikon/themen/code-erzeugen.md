---
titel: Code erzeugen
unterzeile: Klassen in PHP, TypeScript oder Python zu deinen Daten
bereich: Werkzeuge
symbol: fa-file-code
stichworte: code erzeugen, codegenerator, code generation, klassen, dto, datenklasse, model, php, typescript, interface, python, pydantic, dataclasses, basemodel, fromarray, from_dict, readonly, namensraum, namespace, phpdoc, attribute, symfony validator, assert, json schema, miniprojekt, zip, composer, npm, pip
reihenfolge: 60
quellen: [PHP-Handbuch: Klassen und Objekte](https://www.php.net/manual/de/language.oop5.php), [Symfony Validator](https://symfony.com/doc/current/validation.html), [TypeScript: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html), [Pydantic: Models](https://docs.pydantic.dev/latest/concepts/models/), [Python: dataclasses](https://docs.python.org/3/library/dataclasses.html)
---

Wer Daten in einem Programm einliest, braucht passende Typen: eine Klasse `Bestellung` mit den Feldern `nr`, `datum` und `kunde`, eine Klasse `Kunde` und so weiter. Code erzeugen schreibt sie dir. Grundlage ist ein **Schema**, also die Beschreibung, wie die Daten gebaut sind: entweder das, was Strukturblick aus deinen Daten ableitet (wie in der [Ansicht Struktur](#struktur)), oder ein [JSON Schema](#json-schema) aus der Ablage. Heraus kommt Code zum Lesen, Kopieren und Herunterladen, auf Wunsch auch ein kleines lauffähiges Projekt. Alles entsteht in deinem Browser.

## Wo du es findest

Leiste links, Abschnitt "Erzeugen", [Code erzeugen](#werkzeug:code); oder die Befehlspalette (⌘ K, unter Windows und Linux Strg K). Geschlossen wird es über den Knopf mit seinem Namen und dem Kreuz oben im Kopf des Hauptbereichs. Alle Einstellungen, die von der Vorgabe abweichen, stehen in der Adresse, etwa `/code?ziel=pydantic&grenzen=attribute`; ein Lesezeichen bringt dich genau zu diesem Code zurück.

## Die Einstellungen

Alle stehen oben in einer Zeile:

| Einstellung | Werte | Was sie bewirkt |
|---|---|---|
| Ziel | PHP, TypeScript, Python (Pydantic), Python (dataclasses) | die Sprache |
| Aus | **Daten** oder **Schema** (Menü mit den `.json`-Dokumenten der Ablage, solche mit "schema" im Namen zuerst) | woraus die Klassen entstehen |
| Wurzelname | frei, leer heißt aus dem Dokumentnamen (`bestellungen.json` wird `Bestellungen`) | Name der obersten Klasse |
| Namensraum | Vorgabe `App\Daten` | `namespace` der PHP-Dateien; nur bei PHP |
| Klassen | **readonly** oder **veränderbar** | ob Werte nach dem Anlegen fest sind (PHP `readonly`, TypeScript `readonly`, Python `frozen`) |
| Grenzen als | **PHPDoc** oder **Attribute** | wie Grenzen aus dem Schema am Feld stehen; nur bei PHP |
| Dateien | **Eine** oder **Je Klasse** | alles in einer Datei oder je Klasse eine; bei mehreren wählen Reiter über dem Code die Datei |

**Grenzen** sind Regeln wie "mindestens 1 Zeichen", "1 bis 3 Einträge" oder "Muster `^B-[0-9]{5}$`". **PHPDoc** schreibt sie als Kommentar über den Konstruktor, ohne jede Abhängigkeit. **Attribute** schreibt sie als Attribute des Symfony Validators an die Felder (`#[Assert\Count(min: 1, max: 3)]`), die eine Prüfung mit dem Paket symfony/validator auswerten kann. Den **Eintragstyp** einer Liste, also welche Klasse ihre Einträge haben, prüft dann `#[Assert\All([new Assert\Type(Position::class)])]`, verschachtelte Klassen `#[Assert\Valid]`; `list<Position>` steht zusätzlich im PHPDoc für Editor und statische Analyse.

## Wie Schema und Code zusammenhängen

- Jedes Objekt wird eine Klasse: Definitionen aus `$defs` mit ihrem Namen, eingebettete Objekte nach ihrem Feld (`kunde` wird `Kunde`), Listeneinträge nach der Liste in der Einzahl (`positionen` wird `Position`).
- Datum und Zeitpunkt (`format: date`, `date-time`) werden in PHP `DateTimeImmutable`, in Python `date` und `datetime`; in TypeScript bleiben sie Text mit einem Kommentar.
- Felder, die `null` sein dürfen oder fehlen können, werden optional (`?string`, `string | null`, `str | None`).
- Feste Werte (`enum`) werden Aufzählungen.
- Objekte mit freien Schlüsseln und gleich gebauten Werten (`additionalProperties`) werden **Zuordnungen**: `array<string, float>` in PHP, `Record<string, number>` in TypeScript, `dict[str, float]` in Python.
- `allOf` wird zu einer Klasse mit allen Feldern zusammengeführt.
- Ein Schema nur mit Definitionen bekommt eine Klasse je Definition.
- Schlüssel, die kein gültiger Name sind (`@nr`, `class`), bekommen einen gültigen Namen und werden über den Schlüssel gelesen.

## Beispiel: bestellungen.json

Öffne bestellungen.json aus den Beispielen und dann Code erzeugen. Ziel ist PHP, Quelle die Daten. Es entstehen 4 Klassen: `Bestellungen` (`shop`, `stand`, `bestellungen`), `Bestellung` (`nr`, `datum`, `kunde`, `positionen`, `bezahlt`, `notiz`), `Kunde` (`name`, `plz`, `stadt`) und `Position` (`artikel`, `menge`, `preis`). Die Felder einer Bestellung zeigt dir auch jq:

```jq
.bestellungen[0] | keys_unsorted
```

Ergebnis: `["nr", "datum", "kunde", "positionen", "bezahlt", "notiz"]`.

Wählst du TypeScript, sieht der Anfang so aus:

```typescript
// Erzeugt von Strukturblick ... aus bestellungen.json
// Braucht TypeScript ab 3.4

export interface Bestellungen {
  readonly shop: string;
  /** Zeitpunkt nach ISO 8601 */
  readonly stand: string;
  readonly bestellungen: readonly Bestellung[];
}
```

Aus den Daten abgeleitet gibt es kaum Grenzen; bei `plz` steht nur das Muster `^[0-9]+$`, das die Daten zeigen. Mehr liefert ein geschriebenes Schema: Stell **Aus** auf **Schema** und wähle bestellung.schema.json. Mit Ziel Python (Pydantic) steht nun etwa:

```python
class Bestellung(BaseModel):
    model_config = ConfigDict(frozen=True)

    nr: str = Field(pattern="^B-[0-9]{5}$")
    datum: date
    kunde: Kunde
    positionen: list[Position] = Field(min_length=1, max_length=3, description="Der Lieferdienst nimmt höchstens drei Positionen je Bestellung an.")
    bezahlt: bool
    notiz: str | None = Field(default=None)
```

Pydantic prüft diese Grenzen beim Einlesen. Bei PHP mit **Grenzen als: Attribute** nennt der Hinweis unter der Tafel "7 Grenzen, 2 Eintragstypen (All), 3 Prüfungen verschachtelter Klassen (Valid)"; aus den Daten abgeleitet ist es nur 1 Grenze.

## Was über und unter dem Code steht

Über dem Code stehen der Dateiname (oder die Reiter bei "Je Klasse") und Abzeichen: was der Code braucht (etwa "PHP ab 8.2" oder "PHP ab 8.2 und symfony/validator 7"), die Fassung des Schemas (etwa "JSON Schema 2020-12"), die Fassung von Strukturblick und die Zahl der Klassen und Zeilen. Dieselben Angaben stehen im Kopf jeder Datei. Welche PHP-Fassung der Code braucht, nennt das Abzeichen: `readonly class` gibt es ab PHP 8.2, veränderbare Klassen gehen ab 8.1.

Unten stehen ein Satz, wo die Grenzen stehen, und drei Knöpfe:

- **Kopieren**: die gezeigte Datei in die Zwischenablage.
- **Herunterladen**: eine Datei direkt, mehrere als ZIP.
- **Projekt als ZIP**: ein Miniprojekt, siehe unten.

## Projekt als ZIP

Ein **Miniprojekt** ist ein kleines, sofort lauffähiges Projekt: die Klassen, die Daten deines Dokuments als JSON unter `daten/`, ein Leseprogramm, das sie einliest und eine Übersicht zeigt, die übliche Abhängigkeitsdatei und eine README mit den Befehlen. Entpacken und den Befehl aus der README ausführen:

| Ziel | Dateien | Ohne Installation | Mit Installation |
|---|---|---|---|
| PHP | `src/` je Klasse, `composer.json` (PSR-4), `lesen.php` | `php lesen.php`, mit eigenem kleinem Autoloader | `composer install` richtet den Autoloader ein; bei Grenzen als Attribute holt es symfony/validator, und `lesen.php` prüft dann die Grenzen |
| TypeScript | `src/`, `src/lesen.ts`, `package.json`, `tsconfig.json` | ab Node 22.18 `node src/lesen.ts` | `npm install` und `npm start` (übersetzt mit tsc, das die Typen prüft) |
| Python (dataclasses) | `klassen/`, `lesen.py` | `python3 lesen.py` | nicht nötig |
| Python (Pydantic) | `klassen/`, `lesen.py`, `requirements.txt` | | `pip install -r requirements.txt`, dann `python lesen.py` |

Für Pydantic schlägt die README eine eigene Umgebung vor:

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python lesen.py
```

## Was der Inspektor zeigt

- **Erzeugt**: Klassen, Quelle, Fassung des Schemas, was der Code braucht, Dateinamen; darunter Hinweise, etwa auf Verweise, die sich nicht auflösen ließen.
- **Vom Schema zum Typ**: bis zu acht Felder, deren Abbildung erklärenswert ist, mit bestellung.schema.json und PHP etwa `stand` wird `DateTimeImmutable` "aus format date-time", `positionen` wird "array, im PHPDoc list<Position>" mit "1 bis 3 Einträge", `notiz` wird `?string` "darf null sein, kann fehlen".
- **Projekt als ZIP**: kurz, was darin ist.
- **Einlesen**: ein paar Zeilen, die die Daten einlesen, in PHP etwa `Bestellungen::fromArray($daten)`, in TypeScript `JSON.parse(text) as Bestellungen`, mit Pydantic `Bestellungen.model_validate_json(text)`, mit dataclasses `Bestellungen.from_dict(json.loads(text))`.
- **Im Browser**: Nichts geht an einen Server.

## Grenzen

- TypeScript-Typen prüfen zur Laufzeit nichts; Formate und Grenzen stehen dort nur als Kommentar. Dasselbe gilt für dataclasses.
- Aus Daten abgeleitet kennt der Code nur, was die Daten zeigen; ein Feld, das zufällig in jedem Eintrag steht, gilt als Pflicht.
- Code erzeugen braucht mindestens ein Objekt mit Feldern; ein Schema nur aus einfachen Werten ergibt "Keine Objekte im Schema".
- `$ref` folgt das Werkzeug nur innerhalb des Schemas (`#/$defs/...` und `#/definitions/...`). Ein Verweis auf eine andere Datei wird ein Feld ohne feste Form, und die Karte "Erzeugt" im Inspektor nennt ihn: "Verweis ... nicht aufgelöst".
