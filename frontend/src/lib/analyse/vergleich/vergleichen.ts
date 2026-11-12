// Strukturvergleich zweier Werte (Vorher und Jetzt): ein Baum aus Vergleichsknoten und die Liste der Unterschiede.
// Objekte werden nach Schlüsseln verglichen (die Reihenfolge der Schlüssel zählt nicht). Listen werden gepaart: über ein
// Schlüsselfeld (selbst erkannt oder gewählt, etwa nr), sonst nach Stelle mit Ausrichtung gleicher Einträge, damit ein
// eingefügter Eintrag nicht alle folgenden als geändert erscheinen lässt. Rein, ohne Browser.

export type Art = "gleich" | "geaendert" | "hinzu" | "weg" | "innen";

export interface Vergleichsknoten {
  readonly art: Art;
  /** Schlüssel im Objekt; null für Listeneinträge und die Wurzel */
  readonly schluessel: string | null;
  /** Stelle in der Liste auf jeder Seite (null, wenn es dort keinen Eintrag gibt oder kein Listeneintrag) */
  readonly vorherStelle: number | null;
  readonly jetztStelle: number | null;
  readonly vorher: unknown;
  readonly jetzt: unknown;
  /** Bei "innen": die Kinder (beide Seiten sind Objekte oder beide Listen) */
  readonly kinder: readonly Vergleichsknoten[] | null;
  readonly liste: boolean;
  /** Anzeigepfad wie bestellungen[nr="B-1"].positionen[0].preis */
  readonly pfad: string;
  readonly zeigerVorher: string | null;
  readonly zeigerJetzt: string | null;
  /** Bei Listen: Die gepaarten Einträge stehen in anderer Reihenfolge (zählt nur, wenn die Reihenfolge nicht egal ist) */
  readonly reihenfolge?: boolean;
}

export interface Paarung {
  /** Musterpfad der Liste ohne Stellen, etwa bestellungen[].positionen */
  readonly muster: string;
  /** Schlüsselfeld oder null für "nach Stelle" */
  readonly feld: string | null;
  readonly paare: number;
  readonly nurVorher: number;
  readonly nurJetzt: number;
  /** Felder, die als Schlüssel taugen (bestes zuerst) */
  readonly kandidaten: readonly string[];
}

export interface Vergleichsoptionen {
  /** Listen über ein Schlüsselfeld paaren, wo eins taugt */
  readonly schluessel: boolean;
  /** Ohne Schlüssel: gleiche Einträge auch an anderer Stelle finden */
  readonly reihenfolgeEgal: boolean;
  /** Gewähltes Feld je Musterpfad; "" heißt nach Stelle */
  readonly felder: Readonly<Record<string, string>>;
}

export interface Vergleich {
  readonly wurzel: Vergleichsknoten;
  /** Geänderte, hinzugekommene und weggefallene Knoten in Lesereihenfolge */
  readonly unterschiede: readonly Vergleichsknoten[];
  readonly paarungen: readonly Paarung[];
}

export const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

/** Gleichheit ohne Rücksicht auf die Reihenfolge der Schlüssel */
export function gleich(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => gleich(x, b[i]));
  if (istObjekt(a) && istObjekt(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => k in b && gleich(a[k], b[k]));
  }
  return false;
}

/** Text, der für gleiche Werte gleich ist (Schlüssel sortiert) */
function abdruck(w: unknown): string {
  if (Array.isArray(w)) return `[${w.map(abdruck).join(",")}]`;
  if (istObjekt(w)) return `{${Object.keys(w).sort().map((k) => `${JSON.stringify(k)}:${abdruck(w[k])}`).join(",")}}`;
  return JSON.stringify(w) ?? "undefined";
}

const zeigerTeil = (s: string | number): string => String(s).replaceAll("~", "~0").replaceAll("/", "~1");
const pfadTeil = (k: string): string => (/^[A-Za-z_@#][\w@#:.-]*$/.test(k) ? k : `[${JSON.stringify(k)}]`);
const anhaengen = (pfad: string, k: string): string => (pfad ? (pfadTeil(k).startsWith("[") ? `${pfad}${pfadTeil(k)}` : `${pfad}.${pfadTeil(k)}`) : pfadTeil(k));

const BEVORZUGT = /^(id|nr|nummer|key|schluessel|code|kennung|uuid|sku)$/i;
const ENDET = /(id|nr|nummer|kennung|code)$/i;

/** Felder, die in beiden Listen in jedem Eintrag als einfacher Wert stehen und je Seite eindeutig sind, bestes zuerst */
export function schluesselKandidaten(a: readonly unknown[], b: readonly unknown[]): string[] {
  const alle = [...a, ...b];
  if (alle.length < 2 || !alle.every(istObjekt)) return [];
  const felder = Object.keys(alle[0] as Record<string, unknown>).filter((f) =>
    alle.every((o) => {
      const v = (o as Record<string, unknown>)[f];
      return typeof v === "string" || typeof v === "number";
    }),
  );
  const eindeutig = (liste: readonly unknown[], f: string) => new Set(liste.map((o) => String((o as Record<string, unknown>)[f]))).size === liste.length;
  const rang = (f: string) => (BEVORZUGT.test(f) ? 0 : ENDET.test(f) ? 1 : 2);
  return felder.filter((f) => eindeutig(a, f) && eindeutig(b, f)).sort((x, y) => rang(x) - rang(y));
}

/** Größte Liste, für die nach Stelle mit Ausrichtung (LCS) gerechnet wird; darüber nur Anfang und Ende */
const LCS_GRENZE = 4_000_000;

/** Paare [Stelle vorher, Stelle jetzt] in Anzeigereihenfolge (Jetzt-Reihenfolge, Weggefallenes davor eingereiht) */
function nachStelle(a: readonly unknown[], b: readonly unknown[], egal: boolean): [number | null, number | null][] {
  const fa = a.map(abdruck);
  const fb = b.map(abdruck);
  if (egal) {
    // Gleiche Einträge an beliebiger Stelle paaren, die übrigen der Reihe nach als Änderung, Rest weg oder hinzu
    const frei = new Map<string, number[]>();
    fa.forEach((f, i) => frei.set(f, [...(frei.get(f) ?? []), i]));
    const partner: (number | null)[] = fb.map((f) => frei.get(f)?.shift() ?? null);
    const genutzt = new Set(partner);
    const ungepaartA = a.map((_, i) => i).filter((i) => !genutzt.has(i));
    const aus: [number | null, number | null][] = partner.map((i, j) => [i ?? ungepaartA.shift() ?? null, j]);
    for (const i of ungepaartA) aus.push([i, null]);
    return aus;
  }
  const anker: [number, number][] = [];
  if (a.length * b.length <= LCS_GRENZE) {
    const n = a.length;
    const m = b.length;
    const l = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) l[i][j] = fa[i] === fb[j] ? l[i + 1][j + 1] + 1 : Math.max(l[i + 1][j], l[i][j + 1]);
    for (let i = 0, j = 0; i < n && j < m; ) {
      if (fa[i] === fb[j]) { anker.push([i, j]); i++; j++; }
      else if (l[i + 1][j] >= l[i][j + 1]) i++;
      else j++;
    }
  } else {
    let s = 0;
    while (s < a.length && s < b.length && fa[s] === fb[s]) { anker.push([s, s]); s++; }
    let e = 0;
    const ende: [number, number][] = [];
    while (e < a.length - s && e < b.length - s && fa[a.length - 1 - e] === fb[b.length - 1 - e]) { ende.unshift([a.length - 1 - e, b.length - 1 - e]); e++; }
    anker.push(...ende);
  }
  // Lücken zwischen den Ankern: nach Stelle paaren, Überzähliges ist weg oder hinzu
  const steigend: [number, number][] = [];
  for (const [i, j] of anker) if (!steigend.length || (i > steigend[steigend.length - 1][0] && j > steigend[steigend.length - 1][1])) steigend.push([i, j]);
  const aus: [number | null, number | null][] = [];
  let ia = 0;
  let jb = 0;
  for (const [i, j] of [...steigend, [a.length, b.length] as [number, number]]) {
    const la = i - ia;
    const lb = j - jb;
    for (let k = 0; k < Math.max(la, lb); k++) aus.push([k < la ? ia + k : null, k < lb ? jb + k : null]);
    if (i < a.length) aus.push([i, j]);
    ia = i + 1;
    jb = j + 1;
  }
  return aus;
}

/** Paare über ein Schlüsselfeld in Jetzt-Reihenfolge; Weggefallenes steht vor seinem nächsten gepaarten Nachfolger */
function ueberSchluessel(a: readonly unknown[], b: readonly unknown[], feld: string): [number | null, number | null][] {
  const wert = (o: unknown) => String((o as Record<string, unknown>)[feld]);
  const inA = new Map(a.map((o, i) => [wert(o), i]));
  const inB = new Set(b.map(wert));
  const aus: [number | null, number | null][] = [];
  let naechstesA = 0;
  const wegBis = (grenze: number) => {
    for (; naechstesA < grenze; naechstesA++) if (!inB.has(wert(a[naechstesA]))) aus.push([naechstesA, null]);
  };
  b.forEach((o, j) => {
    const i = inA.get(wert(o));
    if (i === undefined) { aus.push([null, j]); return; }
    wegBis(i);
    aus.push([i, j]);
  });
  wegBis(a.length);
  // Zwischen zwei gepaarten Einträgen steht Weggefallenes vor Hinzugekommenem, wie bei einer Ersetzung
  const geordnet: [number | null, number | null][] = [];
  let lauf: [number | null, number | null][] = [];
  const fertig = () => { geordnet.push(...lauf.filter((p) => p[1] === null), ...lauf.filter((p) => p[1] !== null)); lauf = []; };
  for (const p of aus) {
    if (p[0] !== null && p[1] !== null) { fertig(); geordnet.push(p); }
    else lauf.push(p);
  }
  fertig();
  return geordnet;
}

export function vergleichen(vorher: unknown, jetzt: unknown, o: Vergleichsoptionen): Vergleich {
  const unterschiede: Vergleichsknoten[] = [];
  const paarungen = new Map<string, { feld: string | null; paare: number; nurVorher: number; nurJetzt: number; kandidaten: string[] }>();

  const knoten = (a: unknown, b: unknown, schluessel: string | null, va: number | null, vb: number | null, pfad: string, za: string | null, zb: string | null, muster: string): Vergleichsknoten => {
    const blatt = (art: Art): Vergleichsknoten => {
      const k = { art, schluessel, vorherStelle: va, jetztStelle: vb, vorher: a, jetzt: b, kinder: null, liste: Array.isArray(b ?? a), pfad, zeigerVorher: za, zeigerJetzt: zb };
      if (art !== "gleich") unterschiede.push(k);
      return k;
    };
    if (a === undefined) return blatt("hinzu");
    if (b === undefined) return blatt("weg");
    if (istObjekt(a) && istObjekt(b)) {
      const namen = [...Object.keys(b), ...Object.keys(a).filter((k) => !(k in b))];
      const kinder = namen.map((n) => knoten(a[n], b[n], n, null, null, anhaengen(pfad, n), n in a ? `${za}/${zeigerTeil(n)}` : null, n in b ? `${zb}/${zeigerTeil(n)}` : null, anhaengen(muster, n)));
      const art: Art = kinder.every((k) => k.art === "gleich") ? "gleich" : "innen";
      return { art, schluessel, vorherStelle: va, jetztStelle: vb, vorher: a, jetzt: b, kinder, liste: false, pfad, zeigerVorher: za, zeigerJetzt: zb };
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      const ersterUnterschied = unterschiede.length;
      const listenMuster = `${muster}[]`;
      const gewaehlt = o.felder[muster];
      const kandidaten = o.schluessel ? schluesselKandidaten(a, b) : [];
      // Selbst gewählt wird nur ein Feld, das nach Kennung aussieht (nr, id ...); andere nur von Hand
      const feld = gewaehlt === "" ? null : gewaehlt && kandidaten.includes(gewaehlt) ? gewaehlt : (kandidaten.find((k) => BEVORZUGT.test(k) || ENDET.test(k)) ?? null);
      const paare = feld ? ueberSchluessel(a, b, feld) : nachStelle(a, b, o.reihenfolgeEgal);
      const kinder = paare.map(([i, j]) => {
        const e = j !== null ? b[j] : a[i!];
        const kennung = feld && istObjekt(e) ? `[${feld}=${JSON.stringify(e[feld])}]` : `[${j ?? i}]`;
        return knoten(i === null ? undefined : a[i], j === null ? undefined : b[j], null, i, j, `${pfad}${kennung}`, i === null ? null : `${za}/${i}`, j === null ? null : `${zb}/${j}`, listenMuster);
      });
      if (a.length || b.length) {
        const p = paarungen.get(muster) ?? { feld, paare: 0, nurVorher: 0, nurJetzt: 0, kandidaten: o.schluessel ? kandidaten : schluesselKandidaten(a, b) };
        for (const [i, j] of paare) {
          if (i !== null && j !== null) p.paare++;
          else if (i !== null) p.nurVorher++;
          else p.nurJetzt++;
        }
        paarungen.set(muster, p);
      }
      const gepaart = paare.filter(([i, j]) => i !== null && j !== null) as [number, number][];
      const reihenfolge = !o.reihenfolgeEgal && gepaart.some(([i], n) => n > 0 && i < gepaart[n - 1][0]);
      const art: Art = !reihenfolge && kinder.every((k) => k.art === "gleich") ? "gleich" : "innen";
      const k: Vergleichsknoten = { art, schluessel, vorherStelle: va, jetztStelle: vb, vorher: a, jetzt: b, kinder, liste: true, pfad, zeigerVorher: za, zeigerJetzt: zb, reihenfolge };
      if (reihenfolge) unterschiede.splice(ersterUnterschied, 0, k);
      return k;
    }
    return blatt(gleich(a, b) ? "gleich" : "geaendert");
  };

  const wurzel = knoten(vorher, jetzt, null, null, null, "", "", "", "");
  return { wurzel, unterschiede, paarungen: [...paarungen].map(([muster, p]) => ({ muster: muster || "(Wurzel)", ...p })) };
}
