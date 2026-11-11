// Schreibweisen einfacher YAML-Werte: welche Rohtexte eine Zahl sind und wie ein Text in Anführungszeichen steht.
// Grundlage ist das Core-Schema von YAML 1.2; Wörter, die ältere Leser (YAML 1.1) als Wahrheitswert, Zahl oder Datum
// verstehen, gelten beim Schreiben ebenfalls als mehrdeutig, damit ein neuer Text überall Text bleibt.

const ZAHL_CORE = /^(?:[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?|0o[0-7]+|0x[0-9a-fA-F]+|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

/** Ist der Rohtext eine Zahl nach dem Core-Schema von YAML 1.2? */
export const istYamlZahl = (roh: string): boolean => ZAHL_CORE.test(roh);

const WORT_CORE = /^(?:true|True|TRUE|false|False|FALSE|null|Null|NULL|~)$/;
const WORT_YAML11 = /^(?:y|Y|yes|Yes|YES|n|N|no|No|NO|on|On|ON|off|Off|OFF)$/;
const ZAHL_YAML11 = /^(?:[-+]?[0-9][0-9_]*(?:\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|[-+]?0b[01_]+|[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+(?:\.[0-9_]*)?)$/;
const DATUM = /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}/;
const SONDERZEICHEN_AM_ANFANG = /^[-?:,[\]{}#&*!|>'"%@`]/;
const KLAMMERZEICHEN = /[,[\]{}]/;
// Steuerzeichen, C1-Bereich, Zeilentrenner und BOM brauchen Escapes in doppelten Anführungszeichen.
const NICHT_DRUCKBAR = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\ufeff]/;

/** Würde der Text ohne Anführungszeichen etwas anderes bedeuten? `imFluss`: Wert steht in [ ] oder { }. */
export function brauchtAnfuehrung(s: string, imFluss: boolean): boolean {
  if (s === "") return true;
  if (WORT_CORE.test(s) || WORT_YAML11.test(s)) return true;
  if (istYamlZahl(s) || ZAHL_YAML11.test(s) || DATUM.test(s)) return true;
  if (SONDERZEICHEN_AM_ANFANG.test(s) || s.startsWith("...")) return true;
  if (s.includes(": ") || s.includes(" #") || s.endsWith(":")) return true;
  if (s.trim() !== s || NICHT_DRUCKBAR.test(s)) return true;
  if (s.includes("\t")) return true;
  return imFluss && KLAMMERZEICHEN.test(s);
}

const ESCAPES: Readonly<Record<string, string>> = {
  "\\": "\\\\",
  '"': '\\"',
  "\n": "\\n",
  "\t": "\\t",
  "\r": "\\r",
  "\0": "\\0",
  "\u0007": "\\a",
  "\b": "\\b",
  "\u000b": "\\v",
  "\f": "\\f",
  "\u001b": "\\e",
  "\u0085": "\\N",
  "\u2028": "\\L",
  "\u2029": "\\P",
};

/** Text in doppelten Anführungszeichen; Unicode bleibt lesbar, nur Steuerzeichen werden maskiert. */
export function doppeltZitiert(s: string): string {
  let aus = '"';
  for (const z of s) {
    const e = ESCAPES[z];
    if (e !== undefined && z !== " ") aus += e;
    else if (NICHT_DRUCKBAR.test(z)) aus += "\\u" + z.charCodeAt(0).toString(16).padStart(4, "0");
    else aus += z;
  }
  return aus + '"';
}

/** Text in einfachen Anführungszeichen, oder null, wenn er dort nicht darstellbar ist (Zeilenumbrüche, Steuerzeichen). */
export function einfachZitiert(s: string): string | null {
  if (NICHT_DRUCKBAR.test(s.replaceAll("\t", " "))) return null;
  return "'" + s.replaceAll("'", "''") + "'";
}
