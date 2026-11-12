<script lang="ts">
  // Ansicht Tabelle (Vorbild entwuerfe/tabelle.html): eine Liste des Dokuments als Tabelle. Es gibt keinen eigenen
  // Entwurf: jede Änderung geht als wert.setzen über das Blatt in den Text, die Tabelle zeigt danach die neue Analyse.
  // Filter und Sortierung sind nur Sicht. Rechnen in analyse/tabelle.ts und analyse/spaltenprofil.ts.
  import "./tabelle.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { Analyse } from "../../../kern/befehl";
  import { inhalt, istBehaelter, KEIN, type Strukturindex } from "../../../kern/strukturindex";
  import { knotenZu, zeigerAus } from "../../../kern/pfade";
  import { listeFinden, ortVon, sichtBerechnen, tabelleBauen, zelle, zellZeiger, type Ort } from "../../../analyse/tabelle";
  import { eingabeAnfang, neuerWertAus } from "../../../analyse/werteingabe";
  import { spaltenprofil } from "../../../analyse/spaltenprofil";
  import { tabellenZustand } from "./tabellenZustand.svelte";
  import TabellenWerkzeugzeile from "./TabellenWerkzeugzeile.svelte";
  import TabellenRaster from "./TabellenRaster.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const zustand = $derived(tabellenZustand(blatt));

  // Analyse zusammen mit dem Text genau ihrer Revision; solange neu gelesen wird, gilt das letzte stimmige Paar.
  interface Lesestand { readonly analyse: Analyse; readonly text: string }
  let letzterStand: Lesestand | null = null;
  const stand = $derived.by((): Lesestand | null => {
    const a = blatt.analyse;
    if (a && blatt.aktuell) letzterStand = { analyse: a, text: blatt.text };
    return letzterStand;
  });

  const index = $derived(stand?.analyse.index ?? null);
  const text = $derived(stand?.text ?? "");

  const knotenOderKein = (ix: Strukturindex, zeiger: string | null): number => (zeiger === null || (zeiger !== "" && !zeiger.startsWith("/")) ? KEIN : knotenZu(ix, text, zeiger));

  const listeKnoten = $derived(index ? listeFinden(index, knotenOderKein(index, blatt.gewaehlt), knotenOderKein(index, zustand.liste)) : KEIN);
  const tabelle = $derived(index && listeKnoten !== KEIN ? tabelleBauen(index, text, listeKnoten) : null);
  const listeZeiger = $derived(tabelle ? zeigerAus(tabelle.listeTeile) : "");
  const sicht = $derived(tabelle && index ? sichtBerechnen(tabelle, index, text, { filter: zustand.filter, sortierung: zustand.sortierung }) : new Int32Array(0));
  const profile = $derived(tabelle && index ? tabelle.spalten.map((_, j) => spaltenprofil(tabelle, index, text, j)) : []);
  const ort = $derived(tabelle ? ortVon(tabelle, blatt.gewaehlt) : null);
  const spalteGewaehlt = $derived(ort && zustand.spaltenwahl !== null && zustand.spaltenwahl === blatt.gewaehlt ? ort.spalte : -1);
  const typen = $derived(stand?.analyse.format.faehigkeiten.typen ?? false);

  // ----- Wählen -----

  function waehlen(o: Ort): void {
    if (!tabelle) return;
    zustand.liste = listeZeiger;
    zustand.spaltenwahl = null;
    blatt.waehlen(o.spalte < 0 ? zeigerAus([...tabelle.listeTeile, o.zeile]) : zellZeiger(tabelle, o.zeile, o.spalte));
  }

  /** Spalte wählen: der Zeiger der ersten Zelle dieser Spalte; der Inspektor zeigt dann alle Werte dieses Pfads. */
  function spalteWaehlen(spalte: number): void {
    if (!tabelle || !index) return;
    let z = 0;
    while (z < tabelle.zeilen.length && zelle(tabelle, index, z, spalte) === KEIN) z++;
    if (z === tabelle.zeilen.length) return;
    const zeiger = zellZeiger(tabelle, z, spalte);
    zustand.liste = listeZeiger;
    blatt.waehlen(zeiger);
    zustand.spaltenwahl = zeiger;
  }

  // ----- Bearbeiten -----

  /** Bearbeitung beginnen; nur mit der Analyse der aktuellen Revision und nur bei einfachen, vorhandenen Werten. */
  function bearbeiten(o: Ort): boolean {
    if (!blatt.aktuell || !tabelle || !index || o.spalte < 0) return false;
    const k = zelle(tabelle, index, o.zeile, o.spalte);
    if (k === KEIN || istBehaelter(index.art[k])) return false;
    zustand.bearbeitung = { zeiger: zellZeiger(tabelle, o.zeile, o.spalte), anfang: eingabeAnfang(index.art[k], inhalt(index, text, k)), art: index.art[k] };
    return true;
  }

  /** Nachbarzelle in Anzeigereihenfolge (Tab vorwärts, Umschalt+Tab rückwärts), über Zeilenenden hinweg. */
  function nachbar(o: Ort, schritt: 1 | -1): Ort | null {
    if (!tabelle) return null;
    const breite = tabelle.spalten.length;
    let i = sicht.indexOf(o.zeile);
    let j = o.spalte + schritt;
    if (j >= breite) { i++; j = 0; }
    if (j < 0) { i--; j = breite - 1; }
    return i >= 0 && i < sicht.length ? { zeile: sicht[i], spalte: j } : null;
  }

  async function uebernehmen(wert: string, schritt: 0 | 1 | -1): Promise<void> {
    const b = zustand.bearbeitung;
    if (!b || !tabelle) return;
    zustand.bearbeitung = null;
    const von = ortVon(tabelle, b.zeiger);
    const ziel = von && schritt !== 0 ? nachbar(von, schritt) : null;
    if (wert !== b.anfang) {
      const neu = neuerWertAus(b.art, wert, typen);
      const e = await blatt.ausfuehrenMitMeldung("wert.setzen", { zeiger: b.zeiger, neu }, { ort: "Tabelle" });
      if (e.ok && e.geaendert) {
        await blatt.analyseAbwarten();
        zustand.markieren({ zeiger: b.zeiger, vorher: b.anfang });
      }
    }
    if (ziel) {
      waehlen(ziel);
      bearbeiten(ziel);
    }
  }

  function abbrechen(): void {
    zustand.bearbeitung = null;
  }
</script>

<div class="tb-ansicht">
  {#if !stand}
    <div class="tb-hinweis"><i class="fa-solid fa-spinner fa-spin"></i><span>Das Dokument wird gelesen ...</span></div>
  {:else if !index}
    <div class="tb-hinweis">
      <i class="fa-solid fa-triangle-exclamation tb-hinweis-warn"></i>
      <span><span class="abzeichen fehler">nicht lesbar</span> Das Dokument lässt sich so nicht als Tabelle zeigen.</span>
      <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "editor" })}><i class="fa-solid fa-code"></i> Zum Editor</button>
    </div>
  {:else if !tabelle}
    <div class="tb-hinweis">
      <i class="fa-solid fa-table"></i>
      <span>In diesem Dokument gibt es keine Liste, die sich als Tabelle zeigen lässt.</span>
      <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "baum" })}><i class="fa-solid fa-folder-tree"></i> Im Baum ansehen</button>
    </div>
  {:else}
    <TabellenWerkzeugzeile {blatt} {zustand} analyse={stand.analyse} {tabelle} {sicht} text={stand.text} liest={!blatt.aktuell} {spalteGewaehlt} />
    <TabellenRaster
      {blatt}
      {zustand}
      {index}
      {text}
      {tabelle}
      {listeZeiger}
      {sicht}
      {profile}
      {ort}
      {spalteGewaehlt}
      onwaehlen={waehlen}
      onspalte={spalteWaehlen}
      onbearbeiten={bearbeiten}
      onuebernehmen={uebernehmen}
      onabbrechen={abbrechen}
    />
  {/if}
</div>
