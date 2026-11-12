// Einträge (Objekte einer Liste) als Tabelle für CSV: verschachtelte Objekte als Spalten mit Punkt (kunde.name) oder
// als JSON-Text; eine Liste in den Einträgen als eine Zeile je Element, als Spalten je Element (positionen.0.artikel)
// oder als JSON-Text. Jede Spalte weiß, woher sie kommt, damit Inspektor und Verlustkarte es sagen können.

export type Objektweise = "spalten" | "json";
export type Listenweise = "zeilen" | "spalten" | "json";

export interface Spalte {
  readonly name: string;
  /** eintrag: Wert des Eintrags; objekt: aus einem verschachtelten Objekt; liste: aus der Liste; json: als JSON-Text */
  readonly herkunft: "eintrag" | "objekt" | "liste" | "json";
}

export interface Tabellierung {
  readonly spalten: readonly Spalte[];
  readonly zeilen: readonly (readonly unknown[])[];
  /** Die Liste in den Einträgen, nach der sich die Listenweise richtet (das häufigste Listenfeld), sonst null */
  readonly listenfeld: string | null;
  /** Weitere Listenfelder; sie stehen immer als JSON-Text in einer Zelle */
  readonly weitereListen: readonly string[];
}

export const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

/** Das Listenfeld, das in den meisten Einträgen eine Liste ist, und die übrigen Listenfelder */
export function listenfelder(eintraege: readonly unknown[]): { haupt: string | null; weitere: string[] } {
  const zaehler = new Map<string, number>();
  for (const e of eintraege) {
    if (!istObjekt(e)) continue;
    for (const [k, v] of Object.entries(e)) if (Array.isArray(v)) zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
  }
  const sortiert = [...zaehler].sort((a, b) => b[1] - a[1]);
  return { haupt: sortiert[0]?.[0] ?? null, weitere: sortiert.slice(1).map(([k]) => k) };
}

export function tabellieren(eintraege: readonly unknown[], objekte: Objektweise, listen: Listenweise): Tabellierung {
  const { haupt, weitere } = listenfelder(eintraege);
  const spalten: Spalte[] = [];
  const bekannt = new Set<string>();
  const zeilen: Map<string, unknown>[] = [];

  /** Neue Spalten kommen hinter die letzte mit demselben obersten Namen (positionen.2.* hinter positionen.1.*) */
  const anmelden = (name: string, herkunft: Spalte["herkunft"]) => {
    bekannt.add(name);
    const oben = name.split(".")[0];
    let i = spalten.length;
    while (i > 0 && spalten[i - 1].name.split(".")[0] !== oben) i--;
    spalten.splice(i > 0 ? i : spalten.length, 0, { name, herkunft });
  };
  const setzen = (aus: Map<string, unknown>, name: string, wert: unknown, herkunft: Spalte["herkunft"]) => {
    if (!bekannt.has(name)) anmelden(name, herkunft);
    aus.set(name, wert);
  };

  /** Ein Wert unter `pfad`; `element` ist bei Listenweise "zeilen" das Element der Hauptliste für diese Zeile */
  const flach = (aus: Map<string, unknown>, pfad: string, wert: unknown, herkunft: Spalte["herkunft"], oben: boolean, element: { wert: unknown } | null): void => {
    if (Array.isArray(wert)) {
      if (oben && pfad === haupt && listen === "zeilen") {
        if (element) flach(aus, pfad, element.wert, "liste", false, null);
        return;
      }
      if (oben && pfad === haupt && listen === "spalten") {
        wert.forEach((w, i) => flach(aus, `${pfad}.${i}`, w, "liste", false, null));
        return;
      }
      return setzen(aus, pfad, JSON.stringify(wert), "json");
    }
    if (istObjekt(wert)) {
      if (objekte === "json" && herkunft !== "liste") return setzen(aus, pfad, JSON.stringify(wert), "json");
      for (const [k, v] of Object.entries(wert)) flach(aus, pfad ? `${pfad}.${k}` : k, v, herkunft === "liste" ? "liste" : pfad ? "objekt" : "eintrag", false, null);
      return;
    }
    setzen(aus, pfad || "wert", wert, herkunft);
  };

  for (const e of eintraege) {
    if (!istObjekt(e)) {
      const aus = new Map<string, unknown>();
      flach(aus, "", e, "eintrag", false, null);
      zeilen.push(aus);
      continue;
    }
    const elemente = listen === "zeilen" && haupt && Array.isArray(e[haupt]) && (e[haupt] as unknown[]).length ? (e[haupt] as unknown[]) : [undefined];
    for (const el of elemente) {
      const aus = new Map<string, unknown>();
      for (const [k, v] of Object.entries(e)) flach(aus, k, v, "eintrag", true, el === undefined ? null : { wert: el });
      zeilen.push(aus);
    }
  }
  return { spalten, zeilen: zeilen.map((z) => spalten.map((s) => z.get(s.name))), listenfeld: haupt, weitereListen: weitere };
}

export type Trennzeichen = ";" | "," | "\t";

function zelle(w: unknown, trenner: Trennzeichen): string {
  if (w === null || w === undefined) return "";
  const s = typeof w === "object" ? JSON.stringify(w) : String(w);
  return s.includes(trenner) || /["\r\n]/.test(s) || s !== s.trim() ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvSchreiben(t: Tabellierung, trenner: Trennzeichen, kopfzeile: boolean): string {
  const zeilen = kopfzeile ? [t.spalten.map((s) => s.name), ...t.zeilen] : t.zeilen;
  return zeilen.map((z) => z.map((w) => zelle(w, trenner)).join(trenner)).join("\r\n") + (zeilen.length ? "\r\n" : "");
}
