// Deutsche Meldungen zu den Fehlerkennungen der YAML-Bibliothek. Die Bibliothek meldet englisch; hier steht je
// Kennung ein kurzer, verständlicher Satz. Unbekannte Kennungen (neuere Fassungen der Bibliothek) fallen auf einen
// allgemeinen Satz zurück.

import type { ErrorCode } from "yaml";

const MELDUNGEN: Partial<Record<ErrorCode, string>> = {
  ALIAS_PROPS: "Ein Alias darf keinen Anker und keine Typangabe tragen",
  BAD_ALIAS: "Ungültiger Alias",
  BAD_DIRECTIVE: "Ungültige Direktive (Zeile mit %)",
  BAD_DQ_ESCAPE: "Ungültige Escape-Folge in doppelten Anführungszeichen",
  BAD_INDENT: "Falsche Einrückung",
  BAD_PROP_ORDER: "Anker und Typangabe stehen an der falschen Stelle",
  BAD_SCALAR_START: "Ein Wert darf nicht mit diesem Zeichen beginnen",
  BLOCK_AS_IMPLICIT_KEY: "Verschachtelte Einträge in einer Zeile sind nicht erlaubt",
  BLOCK_IN_FLOW: "Blockschreibweise innerhalb von Klammern ist nicht erlaubt",
  BAD_COLLECTION_TYPE: "Die Typangabe passt nicht zu dieser Sammlung",
  DUPLICATE_KEY: "Der Schlüssel kommt mehrfach vor",
  IMPOSSIBLE: "Interner Lesefehler",
  KEY_OVER_1024_CHARS: "Ein Schlüssel ohne ? darf höchstens 1024 Zeichen lang sein",
  MISSING_CHAR: "Hier fehlt ein Zeichen, etwa ein schließendes Anführungszeichen oder eine Klammer",
  MULTILINE_IMPLICIT_KEY: "Ein Schlüssel ohne ? muss in einer Zeile stehen",
  MULTIPLE_ANCHORS: "Ein Wert hat mehrere Anker",
  MULTIPLE_DOCS: "Der Text enthält mehrere Dokumente",
  MULTIPLE_TAGS: "Ein Wert hat mehrere Typangaben",
  NON_STRING_KEY: "Der Schlüssel ist kein Text",
  RESOURCE_EXHAUSTION: "Zu viele Alias-Auflösungen",
  TAB_AS_INDENT: "Tabulatoren sind als Einrückung nicht erlaubt",
  TAG_RESOLVE_FAILED: "Unbekannte Typangabe; der Wert wird als Text gelesen",
  UNEXPECTED_TOKEN: "Unerwartetes Zeichen",
};

export const meldungZu = (code: ErrorCode): string => MELDUNGEN[code] ?? "Der Text ist an dieser Stelle kein gültiges YAML";
