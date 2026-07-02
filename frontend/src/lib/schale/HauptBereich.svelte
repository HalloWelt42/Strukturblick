<script lang="ts">
  // Ansichtsfläche. Ohne Tab erscheint der Willkommen-Zustand aus
  // mockups/willkommen.html mit funktionierenden Aktionen (Datei öffnen,
  // Zwischenablage, Drag-und-Drop). Mit aktivem Tab rendert sie die
  // Komponente der aktiven Ansicht aus der Registry.
  import { komponenteFuer } from '../ansichten/registry'
  import type { FormatFaehigkeiten } from '../api/typen'
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import {
    groessenUrteil,
    liesDatei,
    oeffneDateien,
    type GeleseneDatei,
  } from '../dienste/dateiEinAusgabe'
  import { formatAusDateiname } from '../dienste/formatErkennung'
  import { alsMbText, menschenlesbareGroesse } from '../dienste/groessenFormat'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import { ablehnungAbBytes } from '../speicher/einstellungenSpeicher'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { aktiverTab, oeffneTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  // Breiten der Skelett-Platzhalter, angelehnt an die Abzeichen im Mockup.
  const SKELETT_BREITEN = [44, 40, 38, 44, 44, 56, 42, 118, 96]

  const tab = $derived(aktiverTab())

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

  /** Prüft die Größe je Datei, öffnet Tabs und stößt die Analyse an. */
  async function verarbeiteDateien(dateien: GeleseneDatei[]): Promise<void> {
    for (const datei of dateien) {
      const urteil = await groessenUrteil(datei.groesse)
      if (urteil === 'ablehnen') {
        const grenze = await ablehnungAbBytes()
        zeige(
          `"${datei.name}" ist zu groß - die Grenze liegt bei ${menschenlesbareGroesse(grenze)}.`,
          'fehler',
        )
        continue
      }
      if (urteil === 'warnen') {
        const laden = await frageNach(
          `Die Datei ist ${alsMbText(datei.groesse)} MB groß. Trotzdem laden?`,
        )
        if (!laden) continue
      }
      const tabId = oeffneTab({
        titel: datei.name,
        inhalt: datei.text,
        format: formatAusDateiname(datei.name),
      })
      void sofortAnalysieren(tabId)
    }
  }

  async function oeffneDateiDialog(): Promise<void> {
    const dateien = await oeffneDateien()
    await verarbeiteDateien(dateien)
  }

  async function ausZwischenablage(): Promise<void> {
    let inhalt = ''
    try {
      inhalt = await navigator.clipboard.readText()
    } catch {
      zeige('Die Zwischenablage konnte nicht gelesen werden.', 'fehler')
      return
    }
    if (inhalt === '') {
      zeige('Die Zwischenablage ist leer.', 'info')
      return
    }
    const tabId = oeffneTab({ titel: 'zwischenablage', inhalt })
    void sofortAnalysieren(tabId)
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
    const dateien = Array.from(ereignis.dataTransfer?.files ?? [])
    if (dateien.length === 0) return
    const gelesen = await Promise.all(dateien.map(liesDatei))
    await verarbeiteDateien(gelesen)
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
  {#if tab === null}
    <LeererZustand
      icon="fa-sitemap"
      titel="Noch kein Dokument geöffnet"
      text="Öffne eine Datei, füge Inhalt aus der Zwischenablage ein oder ziehe eine Datei hierher."
    >
      {#snippet aktionen()}
        <div class="willk-aktionen">
          <button class="knopf primaer" onclick={() => void oeffneDateiDialog()}>
            <i class="fa-solid fa-folder-open"></i> Datei öffnen
          </button>
          <button class="knopf" onclick={() => void ausZwischenablage()}>
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
