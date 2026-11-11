<script lang="ts">
  // Facette für Zahlen und Beträge: Verteilung in runden Schritten. Ein Klick auf einen Balken wählt ihn (weitere
  // Klicks erweitern den Bereich, ein Klick auf den einzigen gewählten hebt auf); die Griffe lassen sich ziehen, die
  // Felder nehmen genaue Grenzen. Nicht lesbare Werte fehlen in der Verteilung, ein Hinweis führt zu den Typen.
  import { zahlenVerteilung, type Klasse } from "../../../analyse/bereinigen/facetten";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { z, s, name, spalte }: { z: BereinigenZustand; s: Tabellenstand; name: string; spalte: number } = $props();

  const ZAHL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
  const v = $derived(zahlenVerteilung(s.tabelle, s.index, s.text, spalte, 12));
  const anfang = $derived(v.klassen[0]?.von ?? 0);
  const ende = $derived(v.klassen.at(-1)?.bis ?? 1);
  const hoechste = $derived(Math.max(1, ...v.klassen.map((k) => k.anzahl)));
  const auswahl = $derived.by(() => {
    const a = z.auswahl(name);
    return a?.art === "bereich" ? a : null;
  });

  /** Während des Ziehens: Grenzen nur hier, gefiltert wird beim Loslassen */
  let zug = $state<{ griff: "von" | "bis"; von: number | null; bis: number | null } | null>(null);
  const von = $derived(zug ? zug.von : (auswahl?.von ?? null));
  const bis = $derived(zug ? zug.bis : (auswahl?.bis ?? null));
  const gewaehlt = $derived(zug !== null || auswahl !== null);
  const imBereich = (k: Klasse): boolean => gewaehlt && (von === null || k.bis > von) && (bis === null || k.von < bis);
  const lage = (x: number): number => ((x - anfang) / (ende - anfang || 1)) * 100;

  function setzen(neuVon: number | null, neuBis: number | null): void {
    z.auswahlSetzen(name, neuVon === null && neuBis === null ? null : { art: "bereich", von: neuVon, bis: neuBis });
  }

  function klicken(k: Klasse): void {
    if (!auswahl) setzen(k.von, k.bis);
    else if (auswahl.von === k.von && auswahl.bis === k.bis) setzen(null, null);
    else setzen(Math.min(auswahl.von ?? k.von, k.von), Math.max(auswahl.bis ?? k.bis, k.bis));
  }

  // ----- Griffe ziehen: rastet an den Grenzen der Klassen ein -----
  let flaeche: HTMLElement | undefined = $state();

  function grenzeBei(e: PointerEvent): number {
    const r = flaeche!.getBoundingClientRect();
    const anteil = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const schritt = (ende - anfang) / v.klassen.length;
    return anfang + Math.round((anteil * (ende - anfang)) / schritt) * schritt;
  }

  function greifen(e: PointerEvent, griff: "von" | "bis"): void {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    zug = { griff, von: von ?? anfang, bis: bis ?? ende };
  }

  function ziehen(e: PointerEvent): void {
    if (!zug || !flaeche) return;
    const g = grenzeBei(e);
    if (zug.griff === "von") zug.von = Math.min(g, (zug.bis ?? ende) - (ende - anfang) / v.klassen.length);
    else zug.bis = Math.max(g, (zug.von ?? anfang) + (ende - anfang) / v.klassen.length);
  }

  function loslassen(): void {
    if (!zug) return;
    const z2 = zug;
    zug = null;
    setzen(z2.von !== null && z2.von <= anfang ? null : z2.von, z2.bis !== null && z2.bis >= ende ? null : z2.bis);
  }

  function feld(e: Event, welche: "von" | "bis"): void {
    const roh = (e.currentTarget as HTMLInputElement).value.trim();
    // Felder sind deutsch geschrieben: Punkt trennt Tausender, Komma die Nachkommastellen
    const n = roh === "" ? null : Number(roh.replaceAll(".", "").replace(",", ".").replace(/\s/g, ""));
    if (n !== null && Number.isNaN(n)) return;
    setzen(welche === "von" ? n : (auswahl?.von ?? null), welche === "bis" ? n : (auswahl?.bis ?? null));
  }
</script>

{#if v.klassen.length}
  <div class="br-histo" bind:this={flaeche} role="group" aria-label="{name} in Schritten von {ZAHL.format((ende - anfang) / v.klassen.length)}">
    {#each v.klassen as k, i (i)}
      <button class:br-in={imBereich(k)} style="height: {Math.max(4, (k.anzahl / hoechste) * 100)}%" title="{ZAHL.format(k.von)} bis {ZAHL.format(k.bis)}: {anzahl(k.anzahl)} Werte" aria-label="{ZAHL.format(k.von)} bis {ZAHL.format(k.bis)}" onclick={() => klicken(k)}></button>
    {/each}
    {#if gewaehlt}
      <span class="br-griff" style="left: {lage(von ?? anfang)}%" title="Untere Grenze ziehen" role="slider" aria-valuenow={von ?? anfang} tabindex="-1" onpointerdown={(e) => greifen(e, "von")} onpointermove={ziehen} onpointerup={loslassen} onpointercancel={loslassen}></span>
      <span class="br-griff" style="left: {lage(bis ?? ende)}%" title="Obere Grenze ziehen" role="slider" aria-valuenow={bis ?? ende} tabindex="-1" onpointerdown={(e) => greifen(e, "bis")} onpointermove={ziehen} onpointerup={loslassen} onpointercancel={loslassen}></span>
    {/if}
  </div>
  <div class="br-histo-achse"><span style="left: 0">{ZAHL.format(anfang)}</span><span style="right: 0">{ZAHL.format(ende)}</span></div>
  <div class="br-spanne-felder">
    <label class="feld"><input value={von === null ? "" : ZAHL.format(von)} placeholder="ab" aria-label="{name} von" onchange={(e) => feld(e, "von")} /></label>
    <span>bis</span>
    <label class="feld"><input value={bis === null ? "" : ZAHL.format(bis)} placeholder="bis" aria-label="{name} bis" onchange={(e) => feld(e, "bis")} /></label>
  </div>
{:else}
  <p class="br-facette-unter">Keine lesbaren Zahlen.</p>
{/if}
{#if v.unlesbar}
  <button class="br-hinweis" onclick={() => z.typenZeigen(name)}><i class="fa-solid fa-triangle-exclamation"></i><span>{v.unlesbar === 1 ? "1 Wert nicht lesbar, er fehlt" : `${anzahl(v.unlesbar)} Werte nicht lesbar, sie fehlen`} hier. Ansehen</span></button>
{/if}
