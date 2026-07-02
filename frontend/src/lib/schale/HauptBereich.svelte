<script lang="ts">
  // Ansichtsfläche. Ohne Tab erscheint der Willkommen-Zustand aus
  // mockups/willkommen.html mit funktionierenden Aktionen (Datei öffnen,
  // Zwischenablage, Drag-und-Drop). Mit aktivem Tab rendert sie die
  // Komponente der aktiven Ansicht aus der Registry.
  import { komponenteFuer } from '../ansichten/registry'
  import type { FormatFaehigkeiten } from '../api/typen'
  import {
    ausZwischenablageOeffnen,
    oeffneUeberDialog,
    verarbeiteAbgelegte,
  } from '../dienste/dokumenteLaden'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import { werkzeugKomponente } from '../werkzeuge/registry'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'
  import { werkzeug } from '../zustand/werkzeug.svelte'

  // Breiten der Skelett-Platzhalter, angelehnt an die Abzeichen im Mockup.
  const SKELETT_BREITEN = [44, 40, 38, 44, 44, 56, 42, 118, 96]

  const tab = $derived(aktiverTab())

  // Ein aktives Werkzeug hat Vorrang vor der Ansicht des Tabs; die
  // Ansichtswahl darüber bleibt sichtbar und schließt es beim Reiter-Klick.
  const aktivesWerkzeug = $derived(
    werkzeug.aktiv !== null ? werkzeugKomponente(werkzeug.aktiv) : undefined,
  )

  let ziehAktiv = $state(false)
  let ladeDialogOffen = $state(false)
  let ladeDialogFrage = $state('')
  let ladeDialogAufloeser: ((bestaetigt: boolean) => void) | null = null

  /** Großbuchstaben-Kürzel wie im Mockup; Tabellen-Formate mit Klartext-Zusatz. */
  function kuerzelFuer(format: FormatFaehigkeiten): string {
    if (format.format_id === 'md_tabelle') return 'Markdown-Tabelle'
    if (format.format_id === 'html_tabelle') return 'HTML-Tabelle'
    return format.format_id.toUpperCase()
  }

  /** Eigene Nachfrage (kein Browser-Dialog) als Promise. */
  function frageNach(frage: string): Promise<boolean> {
    ladeDialogFrage = frage
    ladeDialogOffen = true
    return new Promise((resolve) => {
      ladeDialogAufloeser = resolve
    })
  }

  function beiLadeErgebnis(bestaetigt: boolean): void {
    ladeDialogAufloeser?.(bestaetigt)
    ladeDialogAufloeser = null
  }

  function beiDragOver(ereignis: DragEvent): void {
    ereignis.preventDefault()
    ziehAktiv = true
  }

  function beiDragLeave(ereignis: DragEvent): void {
    const ziel = ereignis.relatedTarget
    if (
      ziel instanceof Node &&
      ereignis.currentTarget instanceof Node &&
      ereignis.currentTarget.contains(ziel)
    ) {
      return
    }
    ziehAktiv = false
  }

  async function beiDrop(ereignis: DragEvent): Promise<void> {
    ereignis.preventDefault()
    ziehAktiv = false
    await verarbeiteAbgelegte(ereignis.dataTransfer?.files ?? [], frageNach)
  }
</script>

<div
  class="ansicht-flaeche"
  class:zieh-ziel={ziehAktiv}
  role="region"
  aria-label="Ansichtsfläche"
  ondragover={beiDragOver}
  ondragleave={beiDragLeave}
  ondrop={beiDrop}
>
  {#if aktivesWerkzeug !== undefined}
    {@const Werkzeug = aktivesWerkzeug}
    <Werkzeug />
  {:else if tab === null}
    <LeererZustand
      icon="fa-sitemap"
      titel="Noch kein Dokument geöffnet"
      text="Öffne eine Datei, füge Inhalt aus der Zwischenablage ein oder ziehe eine Datei hierher."
    >
      {#snippet aktionen()}
        <div class="willk-aktionen">
          <button class="knopf primaer" onclick={() => void oeffneUeberDialog(frageNach)}>
            <i class="fa-solid fa-folder-open"></i> Datei öffnen
          </button>
          <button class="knopf" onclick={() => void ausZwischenablageOeffnen()}>
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
  {:else}
    {@const Ansicht = komponenteFuer(tab.aktiveAnsicht) ?? komponenteFuer('editor')}
    {#if Ansicht !== undefined}
      <Ansicht />
    {/if}
  {/if}
</div>

<Bestaetigung
  bind:offen={ladeDialogOffen}
  titel="Große Datei"
  frage={ladeDialogFrage}
  bestaetigenText="Laden"
  onErgebnis={beiLadeErgebnis}
/>

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

  /* Marker für Drag-und-Drop über der gesamten Ansichtsfläche. */
  .ansicht-flaeche.zieh-ziel::after {
    content: "";
    position: absolute;
    inset: 0;
    border: 2px dashed var(--akzent);
    background: var(--akzent-weich);
    pointer-events: none;
    z-index: 10;
  }
</style>
