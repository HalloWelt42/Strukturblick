// Einen Text erzeugen, der zu einem Muster von XML Schema passt (xs:pattern, eigene Regex-Sprache ohne Anker). Gewählt
// wird der kürzeste Weg: erste Alternative, Mindestzahl der Wiederholung, erstes passendes Zeichen einer Klasse. Reicht
// für die Muster, die in Schemas üblich sind (Kennungen, Nummern, Codes); kann ein Muster nicht gelesen werden, null.

type Klasse = { readonly negiert: boolean; readonly teile: readonly ((c: string) => boolean)[]; readonly beispiele: readonly string[]; readonly ohne: Klasse | null };
type Knoten =
  | { readonly art: "zeichen"; readonly klasse: Klasse }
  | { readonly art: "gruppe"; readonly zweige: readonly (readonly Teil[])[] };
type Teil = { readonly knoten: Knoten; readonly min: number };

const PROBE = ["a", "A", "1", "x", "_", "-", ".", " ", "0", "Z"];

/** Kurzklassen \d \w \s \i \c und ihre Gegenstücke, \p{..} grob nach Kategorie */
function kurzklasse(z: string, kategorie?: string): { test: (c: string) => boolean; beispiel: string } {
  switch (z) {
    case "d": return { test: (c) => /\p{Nd}/u.test(c), beispiel: "1" };
    case "D": return { test: (c) => !/\p{Nd}/u.test(c), beispiel: "a" };
    case "s": return { test: (c) => /[ \t\n\r]/.test(c), beispiel: " " };
    case "S": return { test: (c) => !/[ \t\n\r]/.test(c), beispiel: "a" };
    case "w": return { test: (c) => /[\p{L}\p{N}]/u.test(c), beispiel: "a" };
    case "W": return { test: (c) => !/[\p{L}\p{N}]/u.test(c), beispiel: "-" };
    case "i": return { test: (c) => /[\p{L}_:]/u.test(c), beispiel: "a" };
    case "I": return { test: (c) => !/[\p{L}_:]/u.test(c), beispiel: "1" };
    case "c": return { test: (c) => /[\p{L}\p{N}._:-]/u.test(c), beispiel: "a" };
    case "C": return { test: (c) => !/[\p{L}\p{N}._:-]/u.test(c), beispiel: " " };
    case "p":
    case "P": {
      let re: RegExp;
      try { re = new RegExp(`\\p{${kategorie}}`, "u"); } catch { re = /\p{L}/u; }
      const beispiel = PROBE.find((c) => re.test(c)) ?? "a";
      return z === "p" ? { test: (c) => re.test(c), beispiel } : { test: (c) => !re.test(c), beispiel: PROBE.find((c) => !re.test(c)) ?? "1" };
    }
    default: return { test: (c) => c === z, beispiel: z };
  }
}

const ESCAPE: Readonly<Record<string, string>> = { n: "\n", r: "\r", t: "\t" };

class Leser {
  i = 0;
  constructor(readonly m: string) {}
  ende(): boolean { return this.i >= this.m.length; }
  sieh(): string { return this.m[this.i]; }
  nimm(): string { return this.m[this.i++]; }

  /** Escape nach dem Backslash: liefert Prüfung und Beispielzeichen */
  escape(): { test: (c: string) => boolean; beispiel: string } {
    const z = this.nimm();
    if (z === "p" || z === "P") {
      const e = this.m.indexOf("}", this.i);
      const kat = this.m.slice(this.i + 1, e);
      this.i = e + 1;
      return kurzklasse(z, kat.replace(/^Is/, "Script="));
    }
    if (ESCAPE[z]) return { test: (c) => c === ESCAPE[z], beispiel: ESCAPE[z] };
    return kurzklasse(z);
  }

  klasse(): Klasse {
    // nach "["
    const negiert = this.sieh() === "^";
    if (negiert) this.i++;
    const teile: ((c: string) => boolean)[] = [];
    const beispiele: string[] = [];
    let ohne: Klasse | null = null;
    let erstes = true;
    while (!this.ende() && (this.sieh() !== "]" || erstes)) {
      erstes = false;
      if (this.sieh() === "-" && this.m[this.i + 1] === "[") {
        this.i += 2;
        ohne = this.klasse();
        continue;
      }
      let von: string;
      if (this.sieh() === "\\") {
        this.i++;
        const klassenEscape = "dDsSwWiIcCpP".includes(this.sieh());
        const e = this.escape();
        if (klassenEscape) { teile.push(e.test); beispiele.push(e.beispiel); continue; }
        von = e.beispiel;
      } else von = this.nimm();
      if (this.sieh() === "-" && this.m[this.i + 1] !== "]" && this.m[this.i + 1] !== "[") {
        this.i++;
        let bis = this.nimm();
        if (bis === "\\") bis = this.escape().beispiel;
        const [a, b] = [von.codePointAt(0)!, bis.codePointAt(0)!];
        teile.push((c) => c.codePointAt(0)! >= a && c.codePointAt(0)! <= b);
        beispiele.push(von);
      } else {
        teile.push((c) => c === von);
        beispiele.push(von);
      }
    }
    this.i++; // "]"
    return { negiert, teile, beispiele, ohne };
  }

  zweige(): Teil[][] {
    const zweige: Teil[][] = [[]];
    while (!this.ende() && this.sieh() !== ")") {
      const z = this.nimm();
      if (z === "|") { zweige.push([]); continue; }
      let knoten: Knoten;
      if (z === "(") {
        if (this.sieh() === "?") throw new Error("keine XSD-Syntax");
        knoten = { art: "gruppe", zweige: this.zweige() };
        this.i++; // ")"
      } else if (z === "[") knoten = { art: "zeichen", klasse: this.klasse() };
      else if (z === "\\") { const e = this.escape(); knoten = { art: "zeichen", klasse: { negiert: false, teile: [e.test], beispiele: [e.beispiel], ohne: null } }; }
      else if (z === ".") knoten = { art: "zeichen", klasse: { negiert: true, teile: [(c) => c === "\n" || c === "\r"], beispiele: [], ohne: null } };
      else knoten = { art: "zeichen", klasse: { negiert: false, teile: [(c) => c === z], beispiele: [z], ohne: null } };
      zweige[zweige.length - 1].push({ knoten, min: this.wiederholung() });
    }
    return zweige;
  }

  /** Mindestzahl aus ?, *, +, {n}, {n,}, {n,m} */
  wiederholung(): number {
    const z = this.sieh();
    if (z === "?" || z === "*") { this.i++; return 0; }
    if (z === "+") { this.i++; return 1; }
    if (z === "{") {
      const e = this.m.indexOf("}", this.i);
      const n = Number(this.m.slice(this.i + 1, e).split(",")[0]);
      this.i = e + 1;
      return Number.isFinite(n) ? n : 1;
    }
    return 1;
  }
}

function passt(k: Klasse, c: string): boolean {
  const drin = k.teile.some((t) => t(c));
  return (k.negiert ? !drin : drin) && !(k.ohne && passt(k.ohne, c));
}

function zeichen(k: Klasse): string | null {
  for (const c of [...k.beispiele, ...PROBE]) if (passt(k, c)) return c;
  return null;
}

function erzeugen(zweig: readonly Teil[]): string | null {
  let aus = "";
  for (const t of zweig) {
    const s = t.knoten.art === "zeichen" ? zeichen(t.knoten.klasse) : t.knoten.zweige.map(erzeugen).find((x) => x !== null) ?? null;
    if (s === null) { if (t.min) return null; continue; }
    aus += s.repeat(t.min);
  }
  return aus;
}

/** Kürzester Text zum Muster, oder null, wenn das Muster hier nicht lesbar ist */
export function textZumMuster(muster: string): string | null {
  try {
    const l = new Leser(muster);
    const zweige = l.zweige();
    if (!l.ende()) return null;
    for (const z of zweige) {
      const s = erzeugen(z);
      if (s !== null) return s;
    }
    return null;
  } catch {
    return null;
  }
}
