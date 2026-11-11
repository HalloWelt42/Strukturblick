<script lang="ts">
  // Fuß: Zustand des aktiven Dokuments (Format, Größe, Stand, Befunde, abgelegt) und Fassung.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { FASSUNG, URHEBER } from "../../zustand/app";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const a = $derived(blatt?.analyse ?? null);
  const fehler = $derived(a?.diagnosen.filter((d) => d.schwere === "fehler").length ?? 0);
  const warnungen = $derived(a?.diagnosen.filter((d) => d.schwere === "warnung").length ?? 0);

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
        <i class="fa-solid fa-circle-xmark" style="color: var(--fehler)"></i> {fehler} {fehler === 1 ? "Fehler" : "Fehler"}{#if warnungen}, {warnungen} {warnungen === 1 ? "Warnung" : "Warnungen"}{/if}
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
    <a class="teil profil" href={URHEBER.profil} target="_blank" rel="noopener" title="Profil von {URHEBER.name} mit dem Quelltext (neuer Tab)"><i class="fa-brands fa-github"></i> {URHEBER.name}</a>
    <span class="teil mono">{FASSUNG}</span>
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
</style>
