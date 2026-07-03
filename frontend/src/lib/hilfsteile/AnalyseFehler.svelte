<script lang="ts">
  // Gemeinsamer Fehlerzustand der Struktur-Ansichten. Unterscheidet einen nicht
  // erreichbaren Analysedienst (Backend) von einem echten Fehler im Dokument und
  // bietet je nach Fall "Erneut versuchen" oder "Zum Editor".
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import { backendStatus, pruefeBackend } from '../zustand/backendStatus.svelte'
  import { setzeAnsicht, type DokumentTab } from '../zustand/tabs.svelte'
  import LeererZustand from './LeererZustand.svelte'

  interface Props {
    tab: DokumentTab
    /** Titel im Fall eines echten Fehlers im Dokument (ansichtsspezifisch). */
    titel?: string
  }

  let { tab, titel = 'Keine Struktur verfügbar' }: Props = $props()

  // Netzwerk-/Erreichbarkeitsfehler: der Analysedienst hat nicht geantwortet.
  const istNetzwerk = $derived(
    tab.analyseFehler?.code === 'netzwerk' || backendStatus.erreichbar === false,
  )

  const meldung = $derived(tab.analyseFehler?.meldung ?? 'Unbekannter Fehler.')

  function erneutVersuchen(): void {
    void pruefeBackend()
    void sofortAnalysieren(tab.id)
  }

  function zumEditor(): void {
    setzeAnsicht(tab.id, 'editor')
  }
</script>

{#if istNetzwerk}
  <LeererZustand
    icon="fa-plug-circle-xmark"
    titel="Backend nicht erreichbar"
    text="Der Analysedienst antwortet nicht. Läuft das Backend? Prüfe die Verbindung und versuche es erneut."
  >
    {#snippet aktionen()}
      <button class="knopf primaer" onclick={erneutVersuchen}>
        <i class="fa-solid fa-rotate"></i> Erneut versuchen
      </button>
    {/snippet}
  </LeererZustand>
{:else}
  <LeererZustand
    icon="fa-triangle-exclamation"
    {titel}
    text={`${meldung} - wechsle in den Editor, um den Fehler zu beheben.`}
  >
    {#snippet aktionen()}
      <button class="knopf primaer" onclick={zumEditor}>
        <i class="fa-solid fa-code"></i> Zum Editor
      </button>
    {/snippet}
  </LeererZustand>
{/if}
