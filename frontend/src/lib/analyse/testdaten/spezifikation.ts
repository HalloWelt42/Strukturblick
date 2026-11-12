// Spezifikation für Testdaten: je Feld (Musterpfad wie in der Statistik: "kunde.plz", "positionen[].preis", "" für den
// Datensatz selbst) ein Erzeuger mit Einstellungen und ein Anteil, mit dem das Feld leer bleibt. Die Erzeugung baut
// daraus Datensatz für Datensatz; gleicher Startwert, gleiche Daten. Sie läuft in Blöcken weiter (naechste), damit die
// Oberfläche zwischendurch zeichnen und anhalten kann.

import { Zufall } from "./zufall";
import { NACHNAMEN, ORTE, VORNAMEN, type Ortangabe } from "./daten";
import { erzeuger, mitVorgaben, plzGebiet, type Einstellungen, type Json, type Kontext, type Person, type Wohnort } from "./erzeuger";

export type Leerart = "fehlt" | "null" | "leertext";

export interface Feldspec {
  readonly pfad: string;
  readonly erzeuger: string;
  readonly einstellungen: Einstellungen;
  /** Anteil in Prozent, mit dem das Feld leer bleibt, und wie */
  readonly leer: { readonly anteil: number; readonly als: Leerart };
}

export interface Spezifikation {
  readonly felder: readonly Feldspec[];
}

export const LEERARTEN: readonly { readonly wert: Leerart; readonly titel: string }[] = [
  { wert: "fehlt", titel: "Schlüssel fehlt" },
  { wert: "null", titel: "null" },
  { wert: "leertext", titel: "leerer Text" },
];

// ----- Pfade --------------------------------------------------------------------------------------------------------

/** Pfad des umgebenden Felds: "kunde.plz" in "kunde", "positionen[]" in "positionen", "nr" im Datensatz "" */
export function elternVon(pfad: string): string | null {
  if (pfad === "") return null;
  if (pfad.endsWith("[]")) return pfad.slice(0, -2);
  const i = pfad.lastIndexOf(".");
  return i < 0 ? "" : pfad.slice(0, i);
}

/** Schlüssel im umgebenden Objekt ("plz" aus "kunde.plz") */
export const schluesselVon = (pfad: string): string => pfad.slice(pfad.lastIndexOf(".") + 1);

/** Tiefe für die Einrückung in der Tafel */
export const tiefeVon = (pfad: string): number => (pfad === "" ? 0 : (pfad.match(/\.|\[\]/g)?.length ?? 0));

/**
 * Felder mit allen umgebenden Feldern: fehlt zu "kunde.plz" das Feld "kunde" oder zu "positionen[].preis" der Eintrag
 * "positionen[]", kommt es als Objekt vor seinem ersten Feld dazu (die Statistik führt Objekte nicht eigens).
 */
export function vervollstaendigen(felder: readonly Feldspec[]): Feldspec[] {
  const da = new Set(felder.map((f) => f.pfad));
  const aus: Feldspec[] = [];
  const dazu = (pfad: string): void => {
    if (da.has(pfad)) return;
    const e = elternVon(pfad);
    if (e !== null && e !== "") dazu(e);
    da.add(pfad);
    aus.push({ pfad, erzeuger: "objekt", einstellungen: {}, leer: { anteil: 0, als: "fehlt" } });
  };
  for (const f of felder) {
    const e = elternVon(f.pfad);
    if (e !== null && e !== "") dazu(e);
    aus.push(f);
  }
  return aus;
}

// ----- Erzeugung ----------------------------------------------------------------------------------------------------

const PLZ_STELLEN = 5;

export class Erzeugung {
  private readonly zufall: Zufall;
  private readonly kinder = new Map<string, Feldspec[]>();
  private readonly nachPfad = new Map<string, Feldspec>();
  private readonly folgen = new Map<string, number>();
  private readonly orte: readonly Ortangabe[];
  private erzeugtBisher = 0;

  constructor(private readonly spez: Spezifikation, startwert: number) {
    this.zufall = new Zufall(startwert);
    for (const f of vervollstaendigen(spez.felder)) {
      this.nachPfad.set(f.pfad, f);
      const e = elternVon(f.pfad);
      if (e === null) continue;
      if (!this.kinder.has(e)) this.kinder.set(e, []);
      this.kinder.get(e)!.push(f);
    }
    // Orte nur aus dem Gebiet der (ersten) Postleitzahl, damit Ort und Postleitzahl zusammenpassen
    const plz = spez.felder.find((f) => f.erzeuger === "plz");
    const g = plz ? plzGebiet(mitVorgaben(erzeuger("plz"), plz.einstellungen)) : null;
    const imGebiet = g ? ORTE.filter((o) => Math.floor(o.plzBis / 1000) >= g.von && Math.floor(o.plzVon / 1000) <= g.bis) : ORTE;
    this.orte = imGebiet.length ? imGebiet : ORTE;
  }

  get erzeugt(): number {
    return this.erzeugtBisher;
  }

  /** Die nächsten `n` Datensätze */
  naechste(n: number): Json[] {
    const aus: Json[] = [];
    for (let i = 0; i < n; i++) aus.push(this.datensatz());
    this.erzeugtBisher += n;
    return aus;
  }

  private datensatz(): Json {
    let person: Person | null = null;
    let wohnort: Wohnort | null = null;
    const z = this.zufall;
    const k = {
      person: (): Person => (person ??= { vorname: z.wahl(VORNAMEN), nachname: z.wahl(NACHNAMEN) }),
      wohnort: (): Wohnort => {
        if (wohnort) return wohnort;
        const o = z.wahl(this.orte);
        return (wohnort = { ort: o.ort, plz: String(z.ganz(o.plzVon, o.plzBis)).padStart(PLZ_STELLEN, "0"), vorwahl: o.vorwahl });
      },
    };
    const selbst = this.nachPfad.get("");
    return selbst && erzeuger(selbst.erzeuger).art === "wert" ? this.wert(selbst, k) : this.objekt("", k);
  }

  private objekt(pfad: string, k: Pick<Kontext, "person" | "wohnort">): Json {
    const o: Record<string, Json> = {};
    for (const f of this.kinder.get(pfad) ?? []) {
      if (f.pfad.endsWith("[]")) continue;
      if (f.leer.anteil > 0 && this.zufall.ja(f.leer.anteil / 100)) {
        if (f.leer.als === "null") o[schluesselVon(f.pfad)] = null;
        else if (f.leer.als === "leertext") o[schluesselVon(f.pfad)] = "";
        continue;
      }
      o[schluesselVon(f.pfad)] = this.wert(f, k);
    }
    return o;
  }

  private wert(f: Feldspec, k: Pick<Kontext, "person" | "wohnort">): Json {
    const erz = erzeuger(f.erzeuger);
    const e = mitVorgaben(erz, f.einstellungen);
    if (erz.art === "objekt") return this.objekt(f.pfad, k);
    if (erz.art === "liste") {
      const eintrag = this.nachPfad.get(`${f.pfad}[]`);
      const n = this.zufall.ganz(Number(e.von) || 0, Number(e.bis) || 0);
      return eintrag ? Array.from({ length: n }, () => this.wert(eintrag, k)) : [];
    }
    const folge = this.folgen.get(f.pfad) ?? 0;
    this.folgen.set(f.pfad, folge + 1);
    return erz.erzeugen(e, { zufall: this.zufall, folge, person: k.person, wohnort: k.wohnort });
  }
}

/** Wert eines Felds in einem Datensatz (bei Listen im ersten Eintrag); undefined, wenn er dort fehlt */
export function wertAn(datensatz: Json, pfad: string): Json | undefined {
  if (pfad === "") return datensatz;
  let w: Json | undefined = datensatz;
  for (const teil of pfad.match(/\[\]|[^.[\]]+/g) ?? []) {
    if (w === null || typeof w !== "object") return undefined;
    w = teil === "[]" ? (Array.isArray(w) ? w[0] : undefined) : Array.isArray(w) ? undefined : w[teil];
  }
  return w;
}

/** Beispielwerte eines Felds aus den ersten Datensätzen (für Tafel und Inspektor) */
export function beispiele(spez: Spezifikation, startwert: number, pfad: string, anzahl = 5): Json[] {
  return new Erzeugung(spez, startwert)
    .naechste(anzahl * 3)
    .map((d) => wertAn(d, pfad))
    .filter((w): w is Json => w !== undefined)
    .slice(0, anzahl);
}
