<script lang="ts">
  // Fuß: Zustand des aktiven Dokuments (Format, Größe, Stand, Befunde, abgelegt) und Fassung.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { FASSUNG, URHEBER } from "../../zustand/app";
  import { kannReparieren } from "../../analyse/reparatur/reparatur";
  import { lexikon } from "../lexikon/lexikonZustand.svelte";
  import { ki } from "../../zustand/ki.svelte";
  import { fassungsstand } from "../../zustand/fassung.svelte";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const a = $derived(blatt?.analyse ?? null);
  const fehler = $derived(a?.diagnosen.filter((d) => d.schwere === "fehler").length ?? 0);
  const warnungen = $derived(a?.diagnosen.filter((d) => d.schwere === "warnung").length ?? 0);
  /** Reparieren kennt JSON und JSON Lines */
  const reparierbar = $derived(kannReparieren(a?.format.kennung));

  function groesse(zeichen: number): string {
    if (zeichen < 1024) return `${zeichen} Zeichen`;
    if (zeichen < 1024 * 1024) return `${Math.round(zeichen / 1024)} KB`;
    return `${(zeichen / 1048576).toFixed(1).replace(".", ",")} MB`;
  }
</script>

<footer class="fuss">
  {#if blatt}
    <span class="teil">{#if a}<span class="abzeichen">{a.format.name}</span>{/if} {groesse(blatt.text.length)}</span>
    <span class="teil"><i class="fa-solid fa-code-branch text-3"></i> Stand {blatt.verlauf.zeiger}</span>
    <span class="teil">
      {#if blatt.liest && !blatt.aktuell}
        <i class="fa-solid fa-spinner fa-spin text-3"></i> liest
      {:else if blatt.lesefehler}
        <i class="fa-solid fa-circle-xmark" style="color: var(--fehler)"></i> {blatt.lesefehler}
      {:else if fehler}
        <i class="fa-solid fa-circle-xmark" style="color: var(--fehler)"></i> {fehler} Fehler{#if warnungen}, {warnungen} {warnungen === 1 ? "Warnung" : "Warnungen"}{/if}
        {#if reparierbar}<button class="fuss-reparieren" title="Im Werkzeug Reparieren nach festen Regeln lesbar machen" onclick={() => blatt.zeigen({ art: "werkzeug", kennung: "reparieren" })}><i class="fa-solid fa-screwdriver-wrench"></i> Reparieren</button>{/if}
      {:else if warnungen}
        <i class="fa-solid fa-triangle-exclamation" style="color: var(--warn)"></i> {warnungen} {warnungen === 1 ? "Warnung" : "Warnungen"}
      {:else}
        <i class="fa-solid fa-circle-check" style="color: var(--gut)"></i> Keine Fehler
      {/if}
    </span>
  {/if}
  <span class="rechts">
    {#if blatt}
      <span class="teil"><span class="punkt" class:warn={!blatt.gespeichert}></span> {blatt.gespeichert ? "Abgelegt" : "Wird abgelegt"}</span>
    {/if}
    {#if ki.verfuegbar && ki.stand}<span class="teil" title={ki.stand.bereit ? `KI über die Leitstelle mit ${ki.stand.modellname}` : ki.stand.meldung}><span class="punkt" class:warn={!ki.stand.bereit}></span> Leitstelle</span>{/if}
    <button class="teil fuss-knopf" class:aktiv={lexikon.offen} title="Lexikon: Hilfe zu allem in Strukturblick, durchsuchbar (F1)" onclick={() => lexikon.umschalten()}><i class="fa-solid fa-circle-question"></i> Hilfe</button>
    <a class="teil profil" href={URHEBER.profil} target="_blank" rel="noopener" title="Profil von {URHEBER.name} mit dem Quelltext (neuer Tab)"><i class="fa-brands fa-github"></i> {URHEBER.name}</a>
    {#if fassungsstand.neu && !fassungsstand.fragen}
      <button class="teil fuss-knopf mono" title="Neue Fassung {fassungsstand.neu} ist da; neu laden legt vorher alles ab" onclick={() => void fassungsstand.neuLaden()}>{FASSUNG} <i class="fa-solid fa-arrow-right"></i> {fassungsstand.neu}</button>
    {:else}
      <span class="teil mono">{FASSUNG}</span>
    {/if}
  </span>
</footer>

<style>
  .profil {
    color: inherit;
    text-decoration: none;
  }
  .profil:hover {
    color: var(--akzent);
  }
  .fuss-reparieren {
    margin-left: var(--a2);
    padding: 0;
    border: 0;
    background: transparent;
    font: inherit;
    color: var(--akzent);
    cursor: pointer;
  }
  .fuss-reparieren:hover {
    text-decoration: underline;
  }
  .fuss-knopf {
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .fuss-knopf:hover,
  .fuss-knopf.aktiv {
    color: var(--akzent);
  }
</style>
