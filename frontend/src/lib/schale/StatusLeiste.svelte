<script lang="ts">
  // Statusleiste: links die Brotkrumen (vorerst der Titel des aktiven Tabs),
  // rechts Format, Größe, Cursorposition, Diagnose-Anzeige sowie die
  // Backend-Erreichbarkeit und die Frontend-Version.
  import { menschenlesbareGroesse } from '../dienste/groessenFormat'
  import { backendStatus } from '../zustand/backendStatus.svelte'
  import { statusInfo } from '../zustand/statusInfo.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'

  const tab = $derived(aktiverTab())
  const groesseBytes = $derived(
    tab === null ? 0 : new TextEncoder().encode(tab.inhalt).length,
  )
  const warnungsAnzahl = $derived(tab?.analyse?.warnungen.length ?? 0)
</script>

<footer class="status">
  <nav class="brotkrumen">
    <span class="aktuell">{tab?.titel ?? 'Bereit'}</span>
  </nav>
  <div class="status-rechts">
    {#if tab !== null}
      {#if tab.format !== null}
        <span class="abzeichen info">{tab.format.toUpperCase()}</span>
      {/if}
      <span>{menschenlesbareGroesse(groesseBytes)}</span>
      <span>Zeile {statusInfo.zeile}, Spalte {statusInfo.spalte}</span>
      {#if tab.analyseFehler !== null}
        <span class="diag-zaehler fehler">
          <i class="fa-solid fa-circle-xmark"></i> 1 Fehler
        </span>
      {:else if warnungsAnzahl > 0}
        <span class="diag-zaehler warnung">
          <i class="fa-solid fa-triangle-exclamation"></i>
          {warnungsAnzahl === 1 ? '1 Warnung' : `${warnungsAnzahl} Warnungen`}
        </span>
      {:else}
        <span class="diag-zaehler">
          <i class="fa-solid fa-circle-check"></i> Keine Fehler
        </span>
      {/if}
      <span class="trenner-v"></span>
    {/if}
    <span class="backend-anzeige">
      {#if backendStatus.erreichbar === null}
        Prüfe ...
      {:else if backendStatus.erreichbar}
        <span class="status-punkt"></span> Backend erreichbar
      {:else}
        <span class="status-punkt aus"></span> Backend nicht erreichbar
      {/if}
    </span>
    <span class="trenner-v"></span>
    <span>v{__APP_VERSION__}</span>
  </div>
</footer>

<style>
  .backend-anzeige {
    display: inline-flex;
    align-items: center;
    gap: var(--a2);
  }
</style>
