<script lang="ts">
  // Ansichtsfläche. In dieser Ausbaustufe zeigt sie den Willkommen-Zustand
  // aus mockups/willkommen.html: Leerzustand mit Aktionen und den
  // Format-Abzeichen aus den Backend-Capabilities.
  import type { FormatFaehigkeiten } from '../api/typen'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  // Breiten der Skelett-Platzhalter, angelehnt an die Abzeichen im Mockup.
  const SKELETT_BREITEN = [44, 40, 38, 44, 44, 56, 42, 118, 96]

  /** Großbuchstaben-Kürzel wie im Mockup; Tabellen-Formate mit Klartext-Zusatz. */
  function kuerzelFuer(format: FormatFaehigkeiten): string {
    if (format.format_id === 'md_tabelle') return 'Markdown-Tabelle'
    if (format.format_id === 'html_tabelle') return 'HTML-Tabelle'
    return format.format_id.toUpperCase()
  }

  function oeffnenFolgt(): void {
    zeige('Das Öffnen von Dokumenten folgt in der nächsten Ausbaustufe.', 'info')
  }
</script>

<div class="ansicht-flaeche">
  <LeererZustand
    icon="fa-sitemap"
    titel="Noch kein Dokument geöffnet"
    text="Öffne eine Datei, füge Inhalt aus der Zwischenablage ein oder ziehe eine Datei hierher."
  >
    {#snippet aktionen()}
      <div class="willk-aktionen">
        <button class="knopf primaer" onclick={oeffnenFolgt}>
          <i class="fa-solid fa-folder-open"></i> Datei öffnen
        </button>
        <button class="knopf" onclick={oeffnenFolgt}>
          <i class="fa-solid fa-clipboard"></i> Aus Zwischenablage einfügen
        </button>
      </div>
      <span class="beschriftung">Unterstützte Formate</span>
      <div class="willk-formate">
        {#if capabilities.daten}
          {#each capabilities.daten.formate as format (format.format_id)}
            <span class="abzeichen">{kuerzelFuer(format)}</span>
          {/each}
        {:else if capabilities.fehler}
          <span class="hinweis-text">Die Formatliste konnte nicht geladen werden.</span>
        {:else}
          {#each SKELETT_BREITEN as breite, index (index)}
            <span class="skelett" style="width: {breite}px"></span>
          {/each}
        {/if}
      </div>
    {/snippet}
  </LeererZustand>
</div>

<style>
  /* Seiten-spezifische Anordnung wie im Mockup (dort im <style> der Seite). */
  .willk-aktionen {
    display: flex;
    gap: var(--a2);
  }

  .willk-formate {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--a2);
    max-width: 520px;
    margin-top: var(--a2);
  }
</style>
