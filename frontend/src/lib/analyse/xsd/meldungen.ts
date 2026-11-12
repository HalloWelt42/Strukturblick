// Meldungen von libxml2 zur Prüfung gegen XML Schema auf Deutsch: Meldung, Soll, Ist, Regel und, wo eindeutig, ein
// Vorschlag. Erkannt werden die häufigen Fälle; alles andere bleibt im Wortlaut von libxml2 stehen (gekennzeichnet).

export interface Beschreibung {
  readonly meldung: string;
  readonly erwartet: string;
  readonly gefunden: string;
  readonly regel: string;
  readonly vorschlag: string | null;
}

/** Element 'x' oder Element '{urn:ns}x': Name ohne Namensraum in geschweiften Klammern */
const name = (roh: string): string => roh.replace(/^\{[^}]*\}/, "");
const namen = (liste: string): string =>
  liste
    .split(",")
    .map((n) => name(n.trim()))
    .filter(Boolean)
    .join(", ");

type Regel = { muster: RegExp; deuten: (m: RegExpExecArray, element: string) => Beschreibung };

const REGELN: readonly Regel[] = [
  {
    muster: /\[facet 'pattern'\] The value '(.*)' is not accepted by the pattern '(.*)'/,
    deuten: (m) => {
      const ziffern = /^\[0-9\]\{(\d+)\}$|^\\d\{(\d+)\}$/.exec(m[2]);
      const n = ziffern ? Number(ziffern[1] ?? ziffern[2]) : 0;
      const kurz = n > 0 && /^\d+$/.test(m[1]) && m[1].length < n;
      return { meldung: kurz ? `Hat ${m[1].length} statt ${n} Ziffern` : `${m[1]} passt nicht zum Muster`, erwartet: `Muster ${m[2]}`, gefunden: `'${m[1]}'`, regel: `pattern ${m[2]}`, vorschlag: kurz ? m[1].padStart(n, "0") : null };
    },
  },
  {
    muster: /\[facet 'enumeration'\] The value '(.*)' is not an element of the set \{(.*)\}/,
    deuten: (m) => ({ meldung: `${m[1]} ist keiner der erlaubten Werte`, erwartet: m[2].replace(/'/g, ""), gefunden: `'${m[1]}'`, regel: "enumeration", vorschlag: null }),
  },
  {
    muster: /\[facet '(maxLength|minLength|length)'\] The value '(.*)' has a length of '(\d+)'; this (?:exceeds|underruns|differs from) the allowed (?:maximum |minimum )?length of '(\d+)'/,
    deuten: (m) => ({ meldung: `Hat ${m[3]} Zeichen, ${m[1] === "maxLength" ? "höchstens" : m[1] === "minLength" ? "mindestens" : "genau"} ${m[4]} sind erlaubt`, erwartet: `${m[1] === "maxLength" ? "höchstens" : m[1] === "minLength" ? "mindestens" : "genau"} ${m[4]} Zeichen`, gefunden: `'${m[2]}'`, regel: `${m[1]} ${m[4]}`, vorschlag: null }),
  },
  {
    muster: /\[facet '(maxInclusive|minInclusive|maxExclusive|minExclusive)'\] The value '(.*)' is (?:greater|less) than (?:or equal to )?the (?:maximum|minimum) value allowed \('(.*)'\)/,
    deuten: (m) => {
      const art = { maxInclusive: "höchstens", minInclusive: "mindestens", maxExclusive: "kleiner als", minExclusive: "größer als" }[m[1]] ?? m[1];
      return { meldung: `${m[2]} liegt außerhalb des erlaubten Bereichs`, erwartet: `${art} ${m[3]}`, gefunden: m[2], regel: `${m[1]} ${m[3]}`, vorschlag: null };
    },
  },
  {
    muster: /\[facet '(totalDigits|fractionDigits)'\] The value '(.*)' has more digits than are allowed \('(\d+)'\)|\[facet '(totalDigits|fractionDigits)'\] The value '(.*)' has more fractional digits than are allowed \('(\d+)'\)/,
    deuten: (m) => {
      const facette = m[1] ?? m[4];
      const wert = m[2] ?? m[5];
      const n = m[3] ?? m[6];
      return { meldung: facette === "fractionDigits" ? `${wert} hat zu viele Nachkommastellen` : `${wert} hat zu viele Stellen`, erwartet: facette === "fractionDigits" ? `höchstens ${n} Nachkommastellen` : `höchstens ${n} Stellen`, gefunden: wert, regel: `${facette} ${n}`, vorschlag: null };
    },
  },
  {
    muster: /(?:^|: )'(.*)' is not a valid value of the (?:atomic|list|union) type '(.*)'/,
    deuten: (m) => ({ meldung: `'${m[1]}' passt nicht zum Typ ${name(m[2])}`, erwartet: `Typ ${name(m[2])}`, gefunden: `'${m[1]}'`, regel: `type ${name(m[2])}`, vorschlag: null }),
  },
  {
    muster: /This element is not expected\. Expected is(?: one of)? \( (.*) \)/,
    deuten: (m, el) => ({ meldung: `${el} steht hier nicht an der richtigen Stelle`, erwartet: namen(m[1]), gefunden: el, regel: "Reihenfolge und Inhalt", vorschlag: null }),
  },
  {
    muster: /This element is not expected/,
    deuten: (_m, el) => ({ meldung: `${el} ist hier nicht erlaubt`, erwartet: "kein weiteres Element", gefunden: el, regel: "Inhalt", vorschlag: null }),
  },
  {
    muster: /Missing child element\(s\)\. Expected is(?: one of)? \( (.*) \)/,
    deuten: (m, el) => ({ meldung: `In ${el} fehlt ${namen(m[1])}`, erwartet: namen(m[1]), gefunden: "fehlt", regel: "Pflichtelement", vorschlag: null }),
  },
  {
    muster: /The attribute '(.*)' is required but missing/,
    deuten: (m) => ({ meldung: `Pflichtattribut ${name(m[1])} fehlt`, erwartet: `Attribut ${name(m[1])}`, gefunden: "fehlt", regel: "use required", vorschlag: null }),
  },
  {
    muster: /The attribute '(.*)' is not allowed/,
    deuten: (m) => ({ meldung: `Attribut ${name(m[1])} ist hier nicht erlaubt`, erwartet: "kein solches Attribut", gefunden: `Attribut ${name(m[1])}`, regel: "Attribute", vorschlag: null }),
  },
  {
    muster: /Character content other than whitespace is not allowed/,
    deuten: (_m, el) => ({ meldung: `In ${el} ist nur Struktur erlaubt, kein Text`, erwartet: "nur Elemente", gefunden: "Text", regel: "element-only", vorschlag: null }),
  },
  {
    muster: /Element content is not allowed, because the content type is a simple type definition/,
    deuten: (_m, el) => ({ meldung: `${el} darf nur einen Wert enthalten, keine Elemente`, erwartet: "einfacher Wert", gefunden: "Elemente", regel: "simple type", vorschlag: null }),
  },
  {
    muster: /Character content is not allowed, because the content type is empty/,
    deuten: (_m, el) => ({ meldung: `${el} muss leer sein, enthält aber Text`, erwartet: "leeres Element", gefunden: "Text", regel: "empty", vorschlag: null }),
  },
  {
    muster: /No matching global declaration available for the validation root/,
    deuten: (_m, el) => ({ meldung: `Das Schema kennt das Wurzelelement ${el} nicht`, erwartet: "ein Wurzelelement aus dem Schema", gefunden: el, regel: "globale Deklaration", vorschlag: null }),
  },
];

/** Meldung von libxml2 deuten; unbekannte bleiben im Wortlaut (mit Kennzeichen) */
export function deuten(roh: string): Beschreibung & { element: string } {
  const text = roh.trim();
  const el = /^Element '([^']*)'/.exec(text)?.[1];
  const element = el ? name(el) : "";
  for (const r of REGELN) {
    const m = r.muster.exec(text);
    if (m) return { ...r.deuten(m, element || "das Element"), element };
  }
  return { meldung: `libxml2: ${text}`, erwartet: "", gefunden: "", regel: "", vorschlag: null, element };
}

/** Gründe, aus denen sich ein Schema nicht laden lässt, auf Deutsch; sonst der Wortlaut von libxml2 */
export function schemaGrund(roh: string): string {
  const t = roh.trim();
  const ns = /References from this schema to components in (?:the )?(?:no namespace|namespace '([^']*)') are not allowed, since not indicated by an import statement/.exec(t);
  if (ns) return `Das Schema verweist auf Bausteine ${ns[1] ? `aus dem Namensraum ${ns[1]}` : "ohne Namensraum"}, ohne ihn zu importieren (ein Fehler im Schema selbst)`;
  const ort = /Failed to locate a schema at location '([^']*)'/.exec(t);
  if (ort) return `Das Schema ${ort[1]} wurde nicht gefunden`;
  const typ = /The QName value '([^']*)' does not resolve to a\(n\) (type|element|attribute|group) definition/.exec(t);
  if (typ) return `${typ[1]} ist im Schema nicht definiert`;
  return `libxml2: ${t}`;
}
