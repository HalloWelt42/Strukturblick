---
title: CSV
subtitle: Tabellendaten als Text
category: Formate
icon: fa-table
---

CSV speichert eine Tabelle als Textdatei: eine Zeile pro Datensatz, die Felder
durch ein Trennzeichen getrennt. Enthält ein Feld das Trennzeichen, einen
Zeilenumbruch oder Anführungszeichen, wird es in doppelte Anführungszeichen
gesetzt; ein Anführungszeichen im Feld wird verdoppelt. Als gemeinsame
Referenz für diese Regeln gilt RFC 4180.

```
kunde,ort,umsatz
"Musterfrau, Erika",Hamburg,68.30
Beispielmann,Lübeck,12.90
```

CSV kennt keine Typen: Jedes Feld ist zunächst nur Text. Ob `12.90` eine Zahl,
`2019-03-14` ein Datum oder `true` ein Wahrheitswert sein soll, entscheidet
erst der Leser. Strukturblick nutzt dafür die Mustererkennung: Sie schlägt je
Spalte einen Typ vor und zeigt ihn in der Tabellen-Ansicht an, geändert wird
aber nichts ohne Bestätigung.

Da CSV nur flache Zeilen abbildet, gehen bei der Konvertierung aus JSON, YAML
oder XML alle Verschachtelungen verloren oder müssen in Spaltennamen kodiert
werden. Die Verlustwarnung macht das vorab sichtbar. Verwandte Themen:
CSV-Dialekt, Kopfzeile, Zeichenkodierung.
