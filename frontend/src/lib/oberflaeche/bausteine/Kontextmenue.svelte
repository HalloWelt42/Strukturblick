<script lang="ts">
  // Das offene Kontextmenü: schwebende Karte an der Stelle des Klicks, im Fenster gehalten. Bedienung mit Maus und
  // Tastatur (Pfeile, Eingabe, Escape; Pfeil rechts öffnet ein Untermenü, links schließt es). Ein Klick daneben,
  // Rollen oder ein Fensterwechsel schließt es.
  import { tick } from "svelte";
  import { kontextmenue, type Menueeintrag, type Menuepunkt } from "./kontextstand.svelte";

  const stand = $derived(kontextmenue.stand);
  let karte: HTMLElement | undefined = $state();
  let unterKarte: HTMLElement | undefined = $state();
  let lage = $state({ x: 0, y: 0 });
  let unter = $state<{ punkt: Menuepunkt; y: number; links: boolean } | null>(null);
  const RAND = 8;

  const punkte = (l: readonly Menueeintrag[]): Menuepunkt[] => l.filter((e): e is Menuepunkt => e !== "trenner");

  // Nach dem Öffnen: im Fenster halten und den ersten Eintrag fokussieren
  $effect(() => {
    if (!stand) return;
    unter = null;
    lage = { x: stand.x, y: stand.y };
    void tick().then(() => {
      if (!karte) return;
      const r = karte.getBoundingClientRect();
      lage = {
        x: Math.max(RAND, Math.min(stand.x, innerWidth - r.width - RAND)),
        y: Math.max(RAND, Math.min(stand.y, innerHeight - r.height - RAND)),
      };
      karte.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    });
  });

  function waehlen(p: Menuepunkt, knopf: HTMLElement): void {
    if (p.gesperrt) return;
    if (p.unter) {
      unterOeffnen(p, knopf);
      return;
    }
    kontextmenue.schliessen(false);
    p.ausfuehren?.();
  }

  function unterOeffnen(p: Menuepunkt, knopf: HTMLElement): void {
    const r = knopf.getBoundingClientRect();
    const k = karte!.getBoundingClientRect();
    unter = { punkt: p, y: r.top - k.top, links: k.right + 260 > innerWidth };
    void tick().then(() => unterKarte?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
  }

  function tasten(e: KeyboardEvent, feld: HTMLElement | undefined, istUnter: boolean): void {
    if (!feld) return;
    const knoepfe = [...feld.querySelectorAll<HTMLButtonElement>(":scope > .km-eintraege > button:not(:disabled)")];
    const i = knoepfe.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = knoepfe.length;
      knoepfe[(i + (e.key === "ArrowDown" ? 1 : n - 1)) % n]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      knoepfe[e.key === "Home" ? 0 : knoepfe.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (istUnter) {
        const p = unter?.punkt;
        unter = null;
        void tick().then(() => [...(karte?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((b) => b.dataset.titel === p?.titel)?.focus());
      } else kontextmenue.schliessen();
    } else if (e.key === "ArrowLeft" && istUnter) {
      e.preventDefault();
      const p = unter?.punkt;
      unter = null;
      void tick().then(() => [...(karte?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((b) => b.dataset.titel === p?.titel)?.focus());
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  }

  function daneben(e: PointerEvent): void {
    if (!stand) return;
    const pfad = e.composedPath();
    if ((karte && pfad.includes(karte)) || (unterKarte && pfad.includes(unterKarte))) return;
    kontextmenue.schliessen(false);
  }
</script>

<svelte:window onpointerdown={daneben} onblur={() => stand && kontextmenue.schliessen(false)} onresize={() => stand && kontextmenue.schliessen(false)} onwheel={(e) => stand && karte && !e.composedPath().includes(karte) && !(unterKarte && e.composedPath().includes(unterKarte)) && kontextmenue.schliessen(false)} />

{#snippet liste(eintraege: readonly Menueeintrag[])}
  <div class="km-eintraege">
    {#each eintraege as e, i (i)}
      {#if e === "trenner"}
        <div class="km-trenner" role="separator"></div>
      {:else}
        <button
          class="km-punkt"
          class:km-gefahr={e.gefahr}
          class:km-offen={unter?.punkt === e}
          role="menuitem"
          aria-haspopup={e.unter ? "menu" : undefined}
          aria-disabled={e.gesperrt ? "true" : undefined}
          disabled={!!e.gesperrt && !e.unter}
          title={e.gesperrt}
          data-titel={e.titel}
          onclick={(ev) => waehlen(e, ev.currentTarget)}
          onkeydown={(ev) => ev.key === "ArrowRight" && e.unter && (ev.preventDefault(), unterOeffnen(e, ev.currentTarget))}
          onpointerenter={(ev) => (e.unter ? unterOeffnen(e, ev.currentTarget) : unter && !punkte(unter.punkt.unter ?? []).includes(e) && (unter = null))}
        >
          <i class="fa-solid {e.symbol}"></i><span class="km-name">{e.titel}</span>
          {#if e.kuerzel}<span class="km-kuerzel">{e.kuerzel}</span>{/if}
          {#if e.unter}<i class="fa-solid fa-chevron-right km-pfeil"></i>{/if}
        </button>
      {/if}
    {/each}
  </div>
{/snippet}

{#if stand}
  <div class="km-menue karte" role="menu" aria-label={stand.titel} tabindex="-1" bind:this={karte} style="left: {lage.x}px; top: {lage.y}px" onkeydown={(e) => tasten(e, karte, false)} oncontextmenu={(e) => e.preventDefault()}>
    <div class="km-titel">{stand.titel}</div>
    {@render liste(stand.eintraege)}
    {#if unter}
      <div class="km-menue karte km-unter" class:km-links={unter.links} role="menu" aria-label={unter.punkt.titel} tabindex="-1" bind:this={unterKarte} style="top: {unter.y}px" onkeydown={(e) => tasten(e, unterKarte, true)}>
        {@render liste(unter.punkt.unter ?? [])}
      </div>
    {/if}
  </div>
{/if}

<style>
  .km-menue {
    position: fixed;
    z-index: 60;
    margin: 0;
    min-width: 240px;
    max-width: min(360px, calc(100vw - 16px));
    padding: var(--a1);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .km-menue.km-unter {
    position: absolute;
    left: calc(100% - var(--a1));
  }
  .km-menue.km-unter.km-links {
    left: auto;
    right: calc(100% - var(--a1));
  }
  .km-titel {
    padding: var(--a1) var(--a2) var(--a2);
    font-size: var(--marke);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .km-eintraege {
    display: flex;
    flex-direction: column;
  }
  .km-punkt {
    display: flex;
    align-items: center;
    gap: var(--a2);
    min-height: var(--zeile);
    padding: 0 var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    color: var(--text-1);
    text-align: left;
    cursor: pointer;
  }
  .km-punkt > i:first-child {
    width: 1.6em;
    text-align: center;
    color: var(--akzent);
  }
  .km-punkt .km-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .km-punkt:hover:not(:disabled),
  .km-punkt:focus-visible,
  .km-punkt.km-offen {
    outline: 0;
    background: var(--akzent-weich);
  }
  .km-punkt:disabled,
  .km-punkt[aria-disabled="true"] {
    color: var(--text-3);
    cursor: default;
  }
  .km-punkt:disabled > i:first-child {
    color: var(--text-3);
  }
  .km-punkt.km-gefahr:not(:disabled),
  .km-punkt.km-gefahr:not(:disabled) > i:first-child {
    color: var(--fehler);
  }
  .km-kuerzel {
    font-family: var(--schrift-mono);
    font-size: var(--klein);
    color: var(--text-3);
  }
  .km-pfeil {
    font-size: var(--marke);
    color: var(--text-3);
  }
  .km-trenner {
    height: 1px;
    margin: var(--a1) var(--a2);
    background: var(--rand-1);
  }
</style>
