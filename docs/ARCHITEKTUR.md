# Strukturblick 2.0: Architektur

Stand: 11.11.2026, Ticket STB-3. Die Fassung 0.x ist an ihrem Zustand gescheitert: Es gab 23 globale Speicher, die Tabelle führte einen eigenen Entwurf neben dem Text, Analysen kamen ohne Bezug auf eine Revision zurück, und ein Dokument mit 6,9 MB belegte 1,4 GB Speicher. Fassung 2.0 baut den Kern neu nach den Leitgedanken unten. Die harten Regeln dazu stehen in `architektur/regeln.toml`; der Commit-Haken prüft sie.

## Leitgedanken

1. **Der Text ist die eine Wahrheit.** Baum, Tabelle, Statistik und Inspektor sind Lesarten einer bestimmten Revision des Textes. Jede Änderung wird zu einer Textänderung an bekannter Stelle, auch eine aus Baum oder Tabelle. Deshalb bleiben Formatierung, Kommentare, Anführungszeichen und der CSV-Dialekt erhalten. Ein Dokument wird nie neu serialisiert, nur weil eine Zelle geändert wurde.
2. **Ein Weg für jede Änderung.** Jede Änderung läuft über `sitzung.ausfuehren(befehl, werte)`. Ein Befehl berechnet aus Text und Analyse eine Änderungsmenge (`ChangeSet` aus `@codemirror/state`, rein und ohne DOM). Der Verlauf speichert dazu den Aufruf, also Befehl und Werte, die zugleich ein Rezeptschritt sind, außerdem die Änderung und ihre Umkehrung. Damit folgen Rückgängig, Verlauf und Rezepte aus einer Quelle. Getipptes im Editor ist der Befehl `text.aendern`.
3. **Analysen tragen ihre Revision.** Geparst wird im Worker. Jede Antwort nennt die Revision, aus der sie stammt. Antworten zu einer älteren Revision werden verworfen, ein laufender Auftrag wird abgebrochen. Ein Befehl, der Positionen braucht (Zelle setzen), nutzt nur die Analyse der aktuellen Revision. Fehlt sie, wartet er auf sie.
4. **Alles zu einem Dokument an einem Ort.** Ein `Arbeitsblatt` je offenem Dokument hält:
   - die Sitzung (Text, Revision, Verlauf);
   - die Analyse zur Revision;
   - das Gewählte (Pfad);
   - die offene Ansicht oder das offene Werkzeug, immer genau eins;
   - die Zustände der Ansichten (Filter, Sortierung, aufgeklappte Knoten).

   Die Oberfläche bekommt das Blatt als Eigenschaft. Nur die Schale kennt die Liste der Blätter. Schließen räumt alles auf einmal ab.
5. **Kompakter Strukturindex statt Objektbaum.** Eine Analyse beschreibt die Knoten in typisierten Feldern (`Int32Array`, `Uint8Array`): Art, Eltern, erstes Kind, nächstes Geschwister, Anfang und Ende des Werts und des Schlüssels im Text, in UTF-16-Einheiten wie im Editor. Werte und Schlüssel werden bei Bedarf aus dem Text gelesen. Die Felder wandern ohne Kopie vom Worker zur Oberfläche. Pfade folgen RFC 6901 (`~0`, `~1`).
6. **Typen sind Vorschläge.** Der Rohtext eines Werts bleibt immer erhalten (Postleitzahl "04109", große Ganzzahlen, "1.234,50"). Erkannte Typen erscheinen als Hinweis. Umgewandelt wird nur ausdrücklich, als Befehl mit Vorschau.
7. **Formate hinter einem Vertrag.** Jedes Format meldet sich an einer Registrierung an und erfüllt den Vertrag `Format`:
   - erkennen;
   - lesen, das ergibt den Strukturindex mit Diagnosen;
   - `wertSchreiben`, das liefert den Text für einen neuen Wert an einer Stelle, mit Quoting nach Dialekt;
   - Fähigkeiten, etwa ob das Format Kommentare und Tabellen kann.

   Oberfläche und Befehle haben keine Sonderfälle für einzelne Formate.
8. **Zwei Bauarten, eine Codebasis.** Ablage und KI stehen hinter Schnittstellen:
   - `Ablage`: im Browser über IndexedDB, mit Server über die Ablage auf pi5b.
   - `Ki`: ohne Server keine, mit Server über die Leitstelle.

   Die Bauart steht beim Bau fest (`VITE_BAUART=eigenstaendig|server`). Ohne Server fehlen die Funktionen ganz, statt ausgegraut dazustehen. Jede Fachfunktion rechnet im Browser.
9. **Kern ohne Browser.** `kern/`, `formate/` und `analyse/` kennen weder `window` noch `document`. Sie laufen im Worker, in Tests und auf dem Server.

## Schichten (`frontend/src/lib`)

| Schicht | Inhalt | darf nutzen |
|---|---|---|
| `kern` | Typen, Pfade (RFC 6901), Strukturindex, Sitzung, Verlauf, Befehle | nichts außer sich |
| `formate` | Vertrag, Registrierung, JSON, NDJSON, CSV, YAML (später TOML, XML, XLSX, Markdown- und HTML-Tabellen) | `kern` |
| `analyse` | Auswertungen über dem Strukturindex (Profil, Werte eines Pfads, später Statistik, Facetten) | `kern`, `formate` |
| `dienste` | Worker-Anbindung, Ablage (Browser/Server), Fassung, KI (nur Server) | `kern`, `formate`, `analyse` |
| `zustand` | Arbeitsblätter, Einstellungen (Svelte-Runen) | `kern`, `formate`, `analyse`, `dienste` |
| `oberflaeche` | Schale, Ansichten, Inspektor, Bausteine (Svelte) | `zustand`, `kern`, `formate`, `analyse` |

Ansichten und Werkzeuge melden sich an einer Registrierung an. Die Schale baut Ansichtswahl und Leiste nur aus ihr auf, ohne hart geschriebene Reiter.

Lexikon (Hilfe, STB-50): Themen als Markdown mit Kopf unter `oberflaeche/lexikon/themen/`, beim Bauen eingelesen,
mit marked zu HTML und durch DOMPurify geführt (`themen.ts`); ein Zustand für das schwebende Fenster
(`lexikonZustand.svelte.ts`), das Fenster (`LexikonFenster.svelte`) und der i-Knopf (`LexikonKnopf.svelte`) als einziger
Weg zum Öffnen an einem Thema und Abschnitt. Lebendige Teile im Text: `data-live="gewaehlt"`, Beispielblöcke mit
Ausprobieren, Verweise `#thema/abschnitt`, `#ansicht:x`, `#werkzeug:x`. `themen.test.ts` prüft alle Themen (Kopf,
Verweise, Hausregeln). Ansichten und Werkzeuge nennen ihr Thema in der Registrierung (`lexikon`), wenn es anders heißt.

KI (STB-60): nur in der Bauart mit Server und nur über die Leitstelle. Der Server reicht weiter
(`backend/app/ki/`: Einstellungen `ki_an` und `ki_modell`, Anweisungen je Aufgabe, feste Antwortform, Fehler der
Leitstelle als Satz) und liest selbst kein Dokument. Was hinausgeht, baut die Oberfläche: `analyse/ki/auszug.ts`
(Felder, Typen, höchstens 20 Beispiele, Grenze 40.000 Zeichen), ebenso das Prüfen der Antwort gegen das, was
Strukturblick kennt (`analyse/ki/vorschlag.ts`). `zustand/ki.svelte.ts` hält Stand und Wahl, das Werkzeug
(`oberflaeche/werkzeuge/ki/`) zeigt Vorschlag und Probelauf; die Probe einer Abfrage rechnet in einem eigenen
Abfragedienst, damit die Konsole bleibt. Übernommen wird nur auf Klick. Werkzeuge, die nicht immer gehen, nennen in
der Registrierung `sichtbar`; ohne Server oder ausgeschaltet fehlt Mit KI ganz.

Adressen (Deeplinks, STB-48): `zustand/adresse.ts` übersetzt zwischen Pfad und Ort (Seite, Dokument, Ansicht oder
Werkzeug, Stelle, Einstellungen), ohne Browser und testbar. Was eine Ansicht oder ein Werkzeug in die Adresse gibt,
sagt sie selbst: ihr Zustand erfüllt `Adressierbar` (Werte abweichend von der Vorgabe, Übernehmen mit Vorgabe für
Fehlendes), die Registrierung nennt ihn (`adresse`). `oberflaeche/schale/adressleitung.svelte.ts` hält Adresszeile
und Arbeitsplatz gleich: beim Start und bei Zurück/Vor führt die Adresse, sonst folgt sie; Ortswechsel legen einen
Verlaufseintrag an, Feinheiten ersetzen ihn. Die Basis kommt aus `import.meta.env.BASE_URL` (Bau: `STRUKTURBLICK_BASIS`).

## Ablauf einer Änderung

```
Zelle bearbeiten (Tabelle)
  -> sitzung.ausfuehren("wert.setzen", { zeiger: "/1/ort", rohtext: "Leipzig" })
     Befehl: Analyse der aktuellen Revision -> Spanne des Werts -> format.wertSchreiben(...) -> ChangeSet
  -> Verlauf: Aufruf + ChangeSet + Umkehrung, Revision + 1
  -> Arbeitsblatt: Analyseauftrag für die neue Revision (Worker), alte verworfen
  -> Ablage: Text speichern (verzögert, je Revision höchstens einmal)
  -> Meldung "ort geändert" mit Rückgängig
```

## Gestaltung

Die Marken stehen in `entwuerfe/stil.css` (Abschnitt 1) und wandern unverändert nach `frontend/src/stil/marken.css`. Bausteine sind Svelte-Komponenten nach den abgenommenen Entwürfen (`entwuerfe/`). Die Dauerkarten STB-10 bis STB-14 im Board halten die Regeln zum Nachschlagen. Schriften und Symbole kommen über npm, ohne CDN.
