<script lang="ts">
  // Rendert die Kurzmeldungen des Toasters als kantige Karten unten rechts
  // (oberhalb der Statusleiste). Farben je Meldungsart über die Zustands-Token.
  import { entferne, toaster, type MeldungsArt } from '../zustand/toaster.svelte'

  const ICONS: Record<MeldungsArt, string> = {
    info: 'fa-circle-info',
    erfolg: 'fa-circle-check',
    fehler: 'fa-circle-exclamation',
  }
</script>

{#if toaster.meldungen.length > 0}
  <div class="toast-stapel" role="status" aria-live="polite">
    {#each toaster.meldungen as meldung (meldung.id)}
      <div class="toast-karte {meldung.art}">
        <i class="fa-solid {ICONS[meldung.art]}"></i>
        <div class="toast-inhalt">
          <span class="toast-text">{meldung.text}</span>
          {#if meldung.detail}
            <code class="toast-detail">{meldung.detail}</code>
          {/if}
        </div>
        <button class="icon-knopf" aria-label="Meldung schließen" onclick={() => entferne(meldung.id)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-stapel {
    position: fixed;
    right: var(--a4);
    bottom: var(--a6);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--a2);
    z-index: 60;
  }

  .toast-karte {
    display: flex;
    align-items: flex-start;
    gap: var(--a2);
    max-width: 380px;
    padding: var(--a2) var(--a2) var(--a2) var(--a3);
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-2);
    border-radius: var(--radius-panel);
    box-shadow: var(--schatten-2);
    color: var(--text-1);
    font-size: 0.86rem;
  }

  .toast-karte > i {
    margin-top: 2px;
  }

  .toast-inhalt {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .toast-detail {
    font-family: var(--schrift-mono);
    font-size: 0.76rem;
    color: var(--text-2);
    background: var(--flaeche-eingabe);
    border: 1px solid var(--rand-1);
    padding: 2px 6px;
    max-height: 3.4em;
    overflow: hidden;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .toast-karte.info {
    border-color: var(--zustand-info);
  }

  .toast-karte.info > i {
    color: var(--zustand-info);
  }

  .toast-karte.erfolg {
    border-color: var(--zustand-erfolg);
  }

  .toast-karte.erfolg > i {
    color: var(--zustand-erfolg);
  }

  .toast-karte.fehler {
    border-color: var(--zustand-fehler);
  }

  .toast-karte.fehler > i {
    color: var(--zustand-fehler);
  }
</style>
