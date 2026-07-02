<script lang="ts">
  // Statusleiste: links die Brotkrumen (bei Selektion der Pfad als klickbare
  // Segmente, sonst der Titel des aktiven Tabs), rechts Format, Größe,
  // Cursorposition, Diagnose-Anzeige sowie die Backend-Erreichbarkeit und
  // die Frontend-Version.
  import { menschenlesbareGroesse } from '../dienste/groessenFormat'
  import { kindPointer, segmenteAusPointer } from '../dienste/pfade'
  import { backendStatus } from '../zustand/backendStatus.svelte'
  import { selektion, setzeSelektion } from '../zustand/selektion.svelte'
  import { statusInfo } from '../zustand/statusInfo.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'

  interface Krume {
    text: string
    pfad: string
  }

  const tab = $derived(aktiverTab())
  const groesseBytes = $derived(
    tab === null ? 0 : new TextEncoder().encode(tab.inhalt).length,
  )
  const warnungsAnzahl = $derived(tab?.analyse?.warnungen.length ?? 0)

  /** Brotkrumen zur Selektion: $ plus je Segment der kumulierte Teilpfad. */
  const krumen = $derived.by((): Krume[] | null => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null) return null
    if (tab === null || auswahl.tabId !== tab.id) return null
    const liste: Krume[] = [{ text: '$', pfad: '' }]
    let zeiger = ''
    for (const segment of segmenteAusPointer(auswahl.pfad)) {
      zeiger = kindPointer(zeiger, segment)
      const istIndex = /^(0|[1-9][0-9]*)$/.test(segment)
      liste.push({ text: istIndex ? `[${segment}]` : segment, pfad: zeiger })
    }
    return liste
  })

  function springeZu(tabId: string, pfad: string): void {
    setzeSelektion({ tabId, pfad, quelle: 'brotkrumen' })
  }
</script>

<footer class="status">
  <nav class="brotkrumen">
    {#if krumen !== null && tab !== null}
      {@const tabId = tab.id}
      {#each krumen as krume, index (krume.pfad)}
        {#if index > 0}
          <i class="fa-solid fa-chevron-right"></i>
        {/if}
        {#if index === krumen.length - 1}
          <span class="aktuell">{krume.text}</span>
        {:else}
          <button onclick={() => springeZu(tabId, krume.pfad)}>{krume.text}</button>
        {/if}
      {/each}
    {:else}
      <span class="aktuell">{tab?.titel ?? 'Bereit'}</span>
    {/if}
  </nav>
  <div class="status-rechts">
    {#if tab !== null}
      {#if (tab.formatGewaehlt ?? tab.format) !== null}
        <span
          class="abzeichen info"
          title={tab.formatGewaehlt !== null ? 'Format manuell festgelegt' : 'Format automatisch erkannt'}
        >
          {(tab.formatGewaehlt ?? tab.format)?.toUpperCase()}{tab.formatGewaehlt !== null ? ' *' : ''}
        </span>
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

  /* Button-Reset: die Mockups nutzen <a>-Elemente, in der App sind die
     Krumen echte Knöpfe. Optik wie .brotkrumen a in app.css. */
  .brotkrumen button {
    border: none;
    background: none;
    font-family: var(--schrift-mono);
    font-size: 0.76rem;
    color: var(--text-2);
    padding: 1px 3px;
    cursor: pointer;
  }

  .brotkrumen button:hover {
    background: var(--akzent-weich);
    color: var(--text-1);
  }
</style>
