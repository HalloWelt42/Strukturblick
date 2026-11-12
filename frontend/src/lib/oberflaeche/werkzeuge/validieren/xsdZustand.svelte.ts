// Prüfen gegen XML Schema im Werkzeug Validieren: welches Schema (aus der Ablage oder aus einem Schema-Paket), das
// geladene Paket (ZIP, bleibt nur im Browser) und das Ergebnis. Importe kommen aus dem Ordner des Schemas in der Ablage
// und aus dem Paket. Die Prüfung läuft asynchron (libxml2 lädt beim ersten Mal) und wird je Stand des Dokuments gemerkt.

import { unzipSync } from "fflate";
import type { Analyse } from "../../../kern";
import { textAusBytes } from "../../../formate/kodierung";
import { verwiesenesSchema, xsdPruefen, type Schemadatei, type XsdPruefung } from "../../../analyse/xsd/pruefen";
import { ablageverwaltung } from "../../../zustand/ablageverwaltung.svelte";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";

export type XsdWahl = { readonly art: "ablage"; readonly kennung: string; readonly name: string; readonly ordner: string } | { readonly art: "paket"; readonly pfad: string; readonly name: string };

const istXsd = (name: string): boolean => /\.xsd$/i.test(name);
const dateiname = (p: string): string => p.split("/").pop() ?? p;

export class XsdZustand {
  wahl = $state<XsdWahl | null>(null);
  paket = $state.raw<{ readonly name: string; readonly dateien: readonly Schemadatei[] } | null>(null);
  ergebnis = $state.raw<{ readonly analyse: Analyse; readonly schluessel: string; readonly pruefung: XsdPruefung; readonly importe: number } | null>(null);
  laeuft = $state(false);
  paketfehler = $state<string | null>(null);

  /** XSD-Dokumente der Ablage, die zum gewählten Wurzelordner passen zuerst */
  schemasDerAblage(): { kennung: string; name: string; ordner: string }[] {
    return arbeitsplatz.dokumente.filter((d) => istXsd(d.name)).map((d) => ({ kennung: d.kennung, name: d.name, ordner: d.ordner })).sort((a, b) => a.name.localeCompare(b.name, "de"));
  }

  /** Schema-Paket laden: alle XSD aus dem ZIP, nur im Speicher dieses Browsers */
  async paketLaden(datei: File, blatt: Arbeitsblatt): Promise<void> {
    try {
      const teile = unzipSync(new Uint8Array(await datei.arrayBuffer()));
      const dateien = Object.entries(teile)
        .filter(([p, b]) => istXsd(p) && b.length > 0 && !p.split("/").some((t) => t.startsWith("__MACOSX") || t.startsWith("._")))
        .map(([pfad, b]) => ({ pfad, text: textAusBytes(b).text }));
      if (!dateien.length) throw new Error("Im Paket ist kein XML Schema (.xsd)");
      this.paket = { name: datei.name, dateien };
      this.paketfehler = null;
      if (!this.wahl || this.wahl.art === "paket") this.vorschlagWaehlen(blatt);
    } catch (e) {
      this.paketfehler = `${datei.name}: ${e instanceof Error && e.message.startsWith("Im Paket") ? e.message : "kein gültiges ZIP mit Schemas"}`;
    }
  }

  /** Das Schema, auf das das Dokument verweist, aus Paket oder Ablage wählen; liefert, ob eins gefunden wurde */
  vorschlagWaehlen(blatt: Arbeitsblatt): boolean {
    const name = verwiesenesSchema(blatt.text);
    if (!name) return false;
    const imPaket = this.paket?.dateien.filter((d) => dateiname(d.pfad) === name).sort((a, b) => a.pfad.length - b.pfad.length)[0];
    if (imPaket) { this.wahl = { art: "paket", pfad: imPaket.pfad, name }; return true; }
    const inAblage = this.schemasDerAblage().find((d) => d.name === name);
    if (inAblage) { this.wahl = { art: "ablage", ...inAblage }; return true; }
    return false;
  }

  private schluessel(): string {
    const w = this.wahl;
    return w ? `${w.art}:${w.art === "paket" ? w.pfad : w.kennung}|${this.paket?.name ?? ""}` : "";
  }

  /** Ergebnis zum aktuellen Stand, wenn es eins gibt */
  aktuell(blatt: Arbeitsblatt): XsdPruefung | null {
    const e = this.ergebnis;
    return e && e.analyse === blatt.analyse && e.schluessel === this.schluessel() ? e.pruefung : null;
  }

  /** Prüfen, wenn sich Dokument oder Schema geändert haben */
  async pruefen(blatt: Arbeitsblatt): Promise<void> {
    const a = blatt.analyse;
    const w = this.wahl;
    if (!a || !w || this.aktuell(blatt) || this.laeuft) return;
    const schluessel = this.schluessel();
    this.laeuft = true;
    try {
      const paket = this.paket?.dateien ?? [];
      let haupt: Schemadatei | null = null;
      const weitere: Schemadatei[] = [...paket];
      if (w.art === "paket") haupt = paket.find((d) => d.pfad === w.pfad) ?? null;
      else {
        const t = await ablageverwaltung.textVon(w.kennung);
        haupt = t ? { pfad: w.name, text: t.text } : null;
      }
      // Ein Schema aus der Ablage findet seine Importe im selben Ordner (und im Paket, falls geladen)
      if (w.art === "ablage") {
        for (const d of this.schemasDerAblage().filter((x) => x.ordner === w.ordner && x.kennung !== w.kennung)) {
          const t = await ablageverwaltung.textVon(d.kennung);
          if (t) weitere.push({ pfad: d.name, text: t.text });
        }
      }
      const pruefung: XsdPruefung = haupt ? await xsdPruefen(a.index, blatt.analyseText, haupt, weitere) : { ok: false, fehler: `${w.name} gibt es nicht mehr` };
      this.ergebnis = { analyse: a, schluessel, pruefung, importe: weitere.length };
    } finally {
      this.laeuft = false;
    }
    // Hat sich während der Prüfung etwas geändert, gleich noch einmal
    if (blatt.analyse !== a || this.schluessel() !== schluessel) void this.pruefen(blatt);
  }
}
