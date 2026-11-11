<script lang="ts">
  // Thema und Schriftstufe je Gerät, als kleine Tafel am Zahnrad (die Seite Einstellungen folgt in Stufe 7).
  import { einstellungen, SCHRIFTSTUFEN, THEMEN } from "../../zustand/einstellungen.svelte";
  import { zugang } from "../../zustand/zugang.svelte";

  let offen = $state(false);
  let wurzel: HTMLDivElement | undefined = $state();

  function draussen(e: PointerEvent): void {
    if (offen && wurzel && !e.composedPath().includes(wurzel)) offen = false;
  }
</script>

<svelte:window onpointerdown={draussen} onkeydown={(e) => e.key === "Escape" && (offen = false)} />

<div class="anzeigewahl" bind:this={wurzel}>
  <button class="knopf nur-symbol" title="Anzeige" aria-expanded={offen} onclick={() => (offen = !offen)}><i class="fa-solid fa-gear"></i></button>
  {#if offen}
    <div class="tafel karte" role="dialog" aria-label="Anzeige">
      <div class="karte-titel">Thema</div>
      <div class="segment">
        {#each THEMEN as t (t.kennung)}
          <button class:aktiv={einstellungen.thema === t.kennung} onclick={() => einstellungen.setzen({ thema: t.kennung })}>{t.name}</button>
        {/each}
      </div>
      <div class="karte-titel abstand">Schrift</div>
      <div class="segment">
        {#each SCHRIFTSTUFEN as s (s.kennung)}
          <button class:aktiv={einstellungen.schrift === s.kennung} onclick={() => einstellungen.setzen({ schrift: s.kennung })}>{s.name} <span class="text-3">{s.px}</span></button>
        {/each}
      </div>
      <p class="klein text-3">Gilt für dieses Gerät.</p>
      {#if zugang.konto}
        <div class="karte-titel abstand">Konto</div>
        <div class="konto"><span><i class="fa-solid fa-user"></i> {zugang.konto}</span><button class="knopf" onclick={() => void zugang.abmelden()}><i class="fa-solid fa-right-from-bracket"></i> Abmelden</button></div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .anzeigewahl {
    position: relative;
  }
  .tafel {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    z-index: 10;
    width: max-content;
    margin: 0;
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .abstand {
    margin-top: var(--a3);
  }
  p {
    margin: var(--a3) 0 0;
  }
  .konto {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--a3);
  }
</style>
