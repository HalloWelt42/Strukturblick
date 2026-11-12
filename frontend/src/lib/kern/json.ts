// JSON mit genauen großen Ganzzahlen (STB-53): Ganzzahlen über 2^53 kann eine JavaScript-Zahl nicht genau halten. In
// Werten stehen sie deshalb als bigint; jsonText schreibt sie als Ziffern ohne Anführungszeichen, jsonLesen liest sie aus
// JSON-Text wieder genau. Alles andere verhält sich wie JSON.stringify und JSON.parse. Rein, ohne Browser.

/** Kennzeichen eines bigint auf dem Weg durch JSON.stringify und JSON.parse (kommt in echten Daten nicht vor) */
const MARKE = "\u0001strukturblick-ganzzahl:";
const MARKE_IM_TEXT = /"\\u0001strukturblick-ganzzahl:(-?\d+)"/g;

/** Wie JSON.stringify, bigint als Ziffern ohne Anführungszeichen */
export function jsonText(wert: unknown, einrueckung?: number): string {
  const text = JSON.stringify(wert, (_s, w: unknown) => (typeof w === "bigint" ? `${MARKE}${w}` : w), einrueckung);
  return text === undefined ? text : text.replace(MARKE_IM_TEXT, "$1");
}

/** Zahl aus JSON-Rohtext: Ganzzahl über 2^53 als bigint, sonst eine gewöhnliche Zahl */
export function ganzOderZahl(roh: string): number | bigint {
  const z = Number(roh);
  return /^-?\d+$/.test(roh) && !Number.isSafeInteger(z) ? BigInt(roh) : z;
}

/** Ganzzahlen außerhalb von Texten, die eine JavaScript-Zahl nicht genau hält, in Kennzeichen-Texte fassen */
function grosseFassen(text: string): string {
  let aus = "";
  let von = 0;
  let imText = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (imText) {
      if (c === "\\") i++;
      else if (c === '"') imText = false;
      continue;
    }
    if (c === '"') {
      imText = true;
      continue;
    }
    if (c !== "-" && (c < "0" || c > "9")) continue;
    let j = i + (c === "-" ? 1 : 0);
    while (j < text.length && text[j] >= "0" && text[j] <= "9") j++;
    const ganz = j < text.length && (text[j] === "." || text[j] === "e" || text[j] === "E") ? null : text.slice(i, j);
    if (ganz && typeof ganzOderZahl(ganz) === "bigint") {
      aus += `${text.slice(von, i)}"${MARKE.replace("\u0001", "\\u0001")}${ganz}"`;
      von = j;
    }
    i = j - 1;
  }
  return von === 0 ? text : aus + text.slice(von);
}

/** Wie JSON.parse, Ganzzahlen über 2^53 genau als bigint */
export function jsonLesen(text: string): unknown {
  if (!/\d{16}/.test(text)) return JSON.parse(text);
  return JSON.parse(grosseFassen(text), (_s, w: unknown) => (typeof w === "string" && w.startsWith(MARKE) ? BigInt(w.slice(MARKE.length)) : w));
}
