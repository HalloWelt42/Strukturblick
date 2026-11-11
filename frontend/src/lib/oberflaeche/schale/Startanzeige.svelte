<script lang="ts">
  // Startanzeige, solange der Arbeitsplatz öffnet: Schritt, Ladebalken (bestimmt beim Laden der offenen Dokumente,
  // sonst laufend), und wenn der Start wartet oder scheitert, der Grund mit dem, was man tun kann.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { zugang } from "../../zustand/zugang.svelte";

  const s = $derived(arbeitsplatz.start);
</script>

<div class="startfeld">
  <div class="karte start" role="status" aria-live="polite">
    <div class="titel"><i class="fa-solid fa-sitemap"></i> Strukturblick</div>
    <p class="schritt">{s.schritt} ...</p>
    <div class="balken" class:laufend={s.anteil === null} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={s.anteil === null ? undefined : Math.round(s.anteil * 100)} aria-label="Fortschritt des Starts">
      <span style:width={s.anteil === null ? null : `${Math.max(4, Math.round(s.anteil * 100))}%`}></span>
    </div>
    {#if s.hinweis}
      <p class="hinweis" class:fehler={s.fehler}><i class="fa-solid {s.fehler ? 'fa-circle-exclamation' : 'fa-hourglass-half'}"></i> {s.hinweis}</p>
    {/if}
    {#if s.fehler}
      <button class="knopf primaer" onclick={() => void zugang.arbeitsplatzStarten()}><i class="fa-solid fa-rotate-right"></i> Neu versuchen</button>
    {/if}
  </div>
</div>

<style>
  .startfeld {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--a4);
    background: var(--flaeche-seite);
  }
  .start {
    width: min(480px, 100%);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }
  .titel {
    font-size: var(--titel);
    font-weight: 600;
    color: var(--text-1);
  }
  .titel i {
    color: var(--akzent);
  }
  .schritt,
  .hinweis {
    margin: 0;
  }
  .schritt {
    color: var(--text-2);
  }
  .balken {
    height: 8px;
    overflow: hidden;
    background: var(--mulde);
    box-shadow: var(--vertieft);
  }
  .balken span {
    display: block;
    height: 100%;
    background: var(--akzent-flaeche);
    transition: width 0.3s ease;
  }
  .balken.laufend span {
    width: 30%;
    animation: laufen 1.4s ease-in-out infinite;
  }
  @keyframes laufen {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(340%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .balken.laufend span {
      animation: none;
      width: 100%;
      opacity: 0.4;
    }
  }
  .hinweis {
    padding: var(--a2) var(--a3);
    background: var(--warn-weich);
    color: var(--text-1);
  }
  .hinweis.fehler {
    background: var(--fehler-weich);
  }
</style>
