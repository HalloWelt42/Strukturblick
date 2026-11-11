<script lang="ts">
  // Kopf einer Spalte in zwei Teilen: oben nur der Name (er hat Vorrang und wird nie verdrängt), darunter
  // Typvorschlag mit Sortierknopf, Profil und Anteilsbalken der häufigsten Werte. Am rechten Rand der Griff für die
  // Breite. Ein Klick auf den Kopf wählt die Spalte (das erledigt das Raster über data-kopf).
  import type { Spalte } from "../../../analyse/tabelle";
  import type { Spaltenprofil } from "../../../analyse/spaltenprofil";
  import { anzahl, prozent } from "./zahlen";

  let {
    spalte,
    nummer,
    profil,
    fix,
    gewaehlt,
    sortierung,
    onsortieren,
    onbreite,
  }: {
    spalte: Spalte;
    nummer: number;
    profil: Spaltenprofil;
    fix: boolean;
    gewaehlt: boolean;
    sortierung: "auf" | "ab" | null;
    onsortieren: () => void;
    /** Neue Breite in px; das Raster sorgt dafür, dass der Name immer Platz behält */
    onbreite: (px: number) => void;
  } = $props();

  /** Schritt für die Breite mit den Pfeiltasten am Griff */
  const BREITE_SCHRITT = 16;

  let kopf = $state<HTMLElement | null>(null);
  const name = $derived(spalte.selbst ? spalte.name : spalte.name === "" ? '""' : spalte.name);
  const gefuellt = $derived(profil.zeilen - profil.leer);
  const haeufung = $derived(profil.haeufigste.filter((h) => h.anzahl > 1));
  const symbol = $derived(sortierung === "auf" ? "fa-arrow-up-short-wide" : sortierung === "ab" ? "fa-arrow-down-wide-short" : "fa-sort");
  const sortTitel = $derived(
    sortierung === "auf" ? "Absteigend sortieren" : sortierung === "ab" ? "Sortierung aufheben" : `Nach ${name} aufsteigend sortieren`,
  );

  function ziehen(e: PointerEvent): void {
    if (!kopf) return;
    e.preventDefault();
    e.stopPropagation();
    const griff = e.currentTarget as HTMLElement;
    const start = e.clientX;
    const breite = kopf.getBoundingClientRect().width;
    griff.setPointerCapture(e.pointerId);
    const bewegen = (m: PointerEvent) => onbreite(Math.round(breite + m.clientX - start));
    const loslassen = () => {
      griff.removeEventListener("pointermove", bewegen);
      griff.removeEventListener("pointerup", loslassen);
      griff.removeEventListener("pointercancel", loslassen);
    };
    griff.addEventListener("pointermove", bewegen);
    griff.addEventListener("pointerup", loslassen);
    griff.addEventListener("pointercancel", loslassen);
  }

  function taste(e: KeyboardEvent): void {
    if (!kopf || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    e.stopPropagation();
    onbreite(Math.round(kopf.getBoundingClientRect().width + (e.key === "ArrowRight" ? BREITE_SCHRITT : -BREITE_SCHRITT)));
  }
</script>

<div class="tb-kopfzelle" class:tb-fix={fix} class:tb-gewaehlt={gewaehlt} role="columnheader" aria-sort={sortierung === "auf" ? "ascending" : sortierung === "ab" ? "descending" : undefined} data-kopf={nummer} bind:this={kopf}>
  <div class="tb-kopf">
    <span class="tb-name" title={spalte.selbst ? "Einträge, die keine Objekte sind" : `Spalte ${name}: Klick zeigt alle Werte im Inspektor`}>{name}</span>
    <span class="tb-typzeile">
      <span class="abzeichen" class:zweit={profil.typ.siehtAusWie === null} title={profil.typ.erklaerung}>{profil.typ.titel}</span>
      <button class="tb-kopf-knopf" class:aktiv={sortierung !== null} title={sortTitel} aria-label={sortTitel} onclick={(e) => { e.stopPropagation(); onsortieren(); }}><i class="fa-solid {symbol}"></i></button>
    </span>
    <span class="tb-profil">
      <span>leer {prozent(profil.leer, profil.zeilen)}</span>
      {#if profil.verschieden > 0 || gefuellt === 0}
        <span>{anzahl(profil.verschieden)} verschiedene</span>
      {:else}
        <span>verschachtelt</span>
      {/if}
    </span>
    <div class="tb-anteil" title={haeufung.length === 0 ? "Keine Häufung: fast alle Werte kommen einmal vor" : `Häufigste Werte von ${anzahl(gefuellt)} gefüllten`}>
      {#each haeufung as h, i (i)}
        <span class="tb-f{i + 1}" style="width: {(h.anzahl / profil.zeilen) * 100}%" title="{h.wert}: {anzahl(h.anzahl)}"></span>
      {/each}
      {#if profil.leer > 0}
        <span class="tb-fleer" style="width: {(profil.leer / profil.zeilen) * 100}%" title="leer: {anzahl(profil.leer)}"></span>
      {/if}
    </div>
  </div>
  <button class="tb-greifer" title="Spaltenbreite: ziehen oder Pfeiltasten" aria-label="Breite der Spalte {name}" onpointerdown={ziehen} onkeydown={taste} onclick={(e) => e.stopPropagation()}></button>
</div>
