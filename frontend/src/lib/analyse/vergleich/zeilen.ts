// Zeilen für die Ansicht Vergleich: beide Seiten nebeneinander, Zeile für Zeile auf gleicher Höhe. Gleiche Behälter
// und Läufe gleicher Listeneinträge werden zu einer Falte ("[2] bis [126]: 125 Einträge, gleich"), die sich aufklappen
// lässt. Geänderte Werte stehen links alt, rechts neu; Hinzugekommenes steht nur rechts, Weggefallenes nur links.

import { istObjekt, type Vergleichsknoten } from "./vergleichen";

export type Ton = "gleich" | "geaendert" | "hinzu" | "weg";

export interface Teil {
  readonly text: string;
  /** k Schlüssel, idx Stelle, text/zahl/bool/null Wert, alt/neu geänderter Wert, leer ohne Auszeichnung */
  readonly art: "k" | "idx" | "text" | "zahl" | "bool" | "null" | "alt" | "neu" | "leer";
}

export type Vergleichszeile =
  | { readonly art: "zeile"; readonly ebene: number; readonly ton: Ton; readonly links: readonly Teil[] | null; readonly rechts: readonly Teil[] | null; readonly knoten: Vergleichsknoten | null }
  | { readonly art: "falte"; readonly ebene: number; readonly id: string; readonly text: string; readonly kennung: string };

/** So viele Zeilen baut die Ansicht höchstens; der Rest steht als Hinweis da */
export const ZEILEN_HOECHSTENS = 3000;
/** Hinzugekommenes und Weggefallenes wird bis zu dieser Tiefe ausgeschrieben */
const AUSSCHREIBEN = 2;

const anzahl = (n: number): string => n.toLocaleString("de-DE");

function wertTeil(w: unknown, art?: "alt" | "neu"): Teil {
  const text = typeof w === "string" ? JSON.stringify(w) : w === null ? "null" : Array.isArray(w) ? `[ ${anzahl(w.length)} ${w.length === 1 ? "Eintrag" : "Einträge"} ]` : istObjekt(w) ? `{ ${anzahl(Object.keys(w).length)} Schlüssel }` : String(w);
  if (art) return { text, art };
  return { text, art: typeof w === "string" ? "text" : typeof w === "number" ? "zahl" : typeof w === "boolean" ? "bool" : w === null ? "null" : "leer" };
}

/** Kopf einer Zeile: "schluessel": oder Stelle */
function kopf(k: { schluessel: string | null }, stelle: number | null): Teil[] {
  if (k.schluessel !== null) return [{ text: JSON.stringify(k.schluessel), art: "k" }, { text: ": ", art: "leer" }];
  return stelle !== null ? [{ text: `[${stelle}] `, art: "idx" }] : [];
}

/** Kurzbeschreibung eines Eintrags für Falten: die ersten zwei Texte */
export function kennung(w: unknown): string {
  if (!istObjekt(w)) return typeof w === "string" ? w : JSON.stringify(w) ?? "";
  return Object.values(w).filter((v): v is string => typeof v === "string" && v.trim() !== "").slice(0, 2).join(", ");
}

export function vergleichszeilen(wurzel: Vergleichsknoten, offen: ReadonlySet<string>): { zeilen: Vergleichszeile[]; gekuerzt: boolean } {
  const zeilen: Vergleichszeile[] = [];
  let gekuerzt = false;
  const dazu = (z: Vergleichszeile) => {
    if (zeilen.length >= ZEILEN_HOECHSTENS) { gekuerzt = true; return; }
    zeilen.push(z);
  };

  /** Ein Wert nur auf einer Seite (hinzu oder weg), ausgeschrieben bis zur Tiefe AUSSCHREIBEN */
  const einseitig = (w: unknown, kopfteile: Teil[], ebene: number, ton: "hinzu" | "weg", tiefe: number, knoten: Vergleichsknoten | null, komma: boolean) => {
    const seite = (t: Teil[]) => (ton === "hinzu" ? { links: null, rechts: t } : { links: t, rechts: null });
    const ende = komma ? "," : "";
    if ((Array.isArray(w) || istObjekt(w)) && tiefe < AUSSCHREIBEN) {
      const liste = Array.isArray(w);
      dazu({ art: "zeile", ebene, ton, knoten, ...seite([...kopfteile, { text: liste ? "[" : "{", art: "leer" }]) });
      const eintraege = liste ? w.map((x, i) => [null, x, i] as const) : Object.entries(w).map(([k, x]) => [k, x, null] as const);
      eintraege.forEach(([k, x, i], n) => einseitig(x, kopf({ schluessel: k }, i), ebene + 1, ton, tiefe + 1, null, n < eintraege.length - 1));
      dazu({ art: "zeile", ebene, ton, knoten: null, ...seite([{ text: (liste ? "]" : "}") + ende, art: "leer" }]) });
      return;
    }
    dazu({ art: "zeile", ebene, ton, knoten, ...seite([...kopfteile, wertTeil(w), { text: ende, art: "leer" }]) });
  };

  const besuchen = (k: Vergleichsknoten, ebene: number, komma: boolean) => {
    const ende = komma ? "," : "";
    const kl = kopf(k, k.vorherStelle);
    const kr = kopf(k, k.jetztStelle);
    if (k.art === "hinzu") return einseitig(k.jetzt, kr, ebene, "hinzu", 0, k, komma);
    if (k.art === "weg") return einseitig(k.vorher, kl, ebene, "weg", 0, k, komma);
    if (k.art === "geaendert") {
      dazu({ art: "zeile", ebene, ton: "geaendert", knoten: k, links: [...kl, wertTeil(k.vorher, "alt"), { text: ende, art: "leer" }], rechts: [...kr, wertTeil(k.jetzt, "neu"), { text: ende, art: "leer" }] });
      return;
    }
    if (!k.kinder) {
      const t = [wertTeil(k.jetzt), { text: ende, art: "leer" } as Teil];
      dazu({ art: "zeile", ebene, ton: "gleich", knoten: k, links: [...kl, ...t], rechts: [...kr, ...t] });
      return;
    }
    // Behälter: gleich und zu, oder offen mit Kindern
    if (k.art === "gleich" && !offen.has(k.pfad) && ebene > 0) {
      const n = k.kinder.length;
      const name = k.schluessel ?? `[${k.jetztStelle}]`;
      const umfang = k.liste ? `${anzahl(n)} ${n === 1 ? "Eintrag" : "Einträge"}` : `${anzahl(n)} Schlüssel`;
      // Listeneinträge heißen nach ihrem Inhalt ("[0] B-24017, gleich"), Felder nach Name und Umfang
      const inhalt = k.schluessel === null ? kennung(k.jetzt) : "";
      dazu({ art: "falte", ebene, id: k.pfad, text: `${name} ${inhalt || umfang}, gleich`, kennung: "" });
      return;
    }
    const auf = k.liste ? "[" : "{";
    const zu = k.liste ? "]" : "}";
    const rf: Teil[] = k.reihenfolge ? [{ text: "  Reihenfolge geändert", art: "alt" }] : [];
    dazu({ art: "zeile", ebene, ton: k.reihenfolge ? "geaendert" : "gleich", knoten: k.reihenfolge ? k : null, links: [...kl, { text: auf, art: "leer" }], rechts: [...kr, { text: auf, art: "leer" }, ...rf] });
    const kinder = k.kinder;
    for (let i = 0; i < kinder.length; i++) {
      const c = kinder[i];
      // Läufe gleicher Listeneinträge zu einer Falte
      if (k.liste && c.art === "gleich" && !offen.has(c.pfad)) {
        let j = i;
        while (j + 1 < kinder.length && kinder[j + 1].art === "gleich" && !offen.has(kinder[j + 1].pfad)) j++;
        if (j > i) {
          const lauf = `${k.pfad}#${i}-${j}`;
          if (!offen.has(lauf)) {
            dazu({ art: "falte", ebene: ebene + 1, id: lauf, text: `[${c.jetztStelle}] bis [${kinder[j].jetztStelle}]: ${anzahl(j - i + 1)} Einträge, gleich`, kennung: "" });
            i = j;
            continue;
          }
          for (let n = i; n <= j; n++) besuchen(kinder[n], ebene + 1, n < kinder.length - 1);
          i = j;
          continue;
        }
      }
      besuchen(c, ebene + 1, i < kinder.length - 1);
    }
    dazu({ art: "zeile", ebene, ton: "gleich", knoten: null, links: [{ text: zu + ende, art: "leer" }], rechts: [{ text: zu + ende, art: "leer" }] });
  };

  besuchen(wurzel, 0, false);
  return { zeilen, gekuerzt };
}

