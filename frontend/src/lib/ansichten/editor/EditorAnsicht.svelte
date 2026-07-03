<script lang="ts">
  // Editor-Ansicht: Werkzeugzeile, CodeMirror-Editor und Diagnose-Liste nach
  // mockups/editor.html. Der Editor ist an den aktiven Tab gebunden; beim
  // Tab-Wechsel wird er neu aufgebaut, damit die Undo-Historie nicht in ein
  // fremdes Dokument hinüberreicht.
  import { openSearchPanel } from '@codemirror/search'
  import type { EditorView } from '@codemirror/view'
  import { untrack } from 'svelte'

  import { konvertiere } from '../../api/transform'
  import type { FormatFaehigkeiten, FormatId, QuellSpanne } from '../../api/typen'
  import { analysiere, sofortAnalysieren } from '../../dienste/analyseDienst'
  import {
    baueIndex,
    pfadAnOffset,
    pfadZuSpanne,
    type PfadIndex,
  } from '../../dienste/pfadIndex'
  import { ebenenAnzahl } from '../../dienste/tiefe'
  import { aktualisiereDokument, speichereDokument } from '../../speicher/dokumente'
  import { capabilities } from '../../zustand/capabilities.svelte'
  import { ladeNeu } from '../../zustand/dokumentListe.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { setzeCursor } from '../../zustand/statusInfo.svelte'
  import {
    aktiverTab,
    markiereGespeichert,
    setzeFormat,
    setzeInhalt,
    tabs,
  } from '../../zustand/tabs.svelte'
  import { zeige } from '../../zustand/toaster.svelte'
  import {
    alsOffsetBereich,
    entfalteAlles,
    erzeugeEditor,
    falteAlles,
    falteAufEbene,
    setzeDiagnosen,
    setzeDokument,
    setzeSprache,
    springeZuPosition,
    type DiagnoseEintrag,
  } from './erzeugeEditor'

  interface AnzeigeDiagnose {
    schwere: 'fehler' | 'warnung'
    pfad: string
    meldung: string
    position: QuellSpanne | null
  }

  let wirt = $state<HTMLDivElement>()
  let view: EditorView | null = null
  let angezeigteTabId: string | null = null

  // Binäre Dokumente (XLSX) haben keinen editierbaren Text - statt des Editors
  // erscheint dann ein Hinweis auf die Tabellen- bzw. Baum-Ansicht.
  const istBinaer = $derived(aktiverTab()?.istBinaer ?? false)

  /** Flacher Positions-Index des aktiven Tabs für die Baum-Kopplung. */
  const pfadIndex = $derived.by((): PfadIndex => {
    const tab = aktiverTab()
    if (tab === null || tab.analyse === null) return []
    return baueIndex(tab.analyse.positionen)
  })

  // Anzahl sinnvoller Ebenen-Knöpfe aus der tatsächlichen Verschachtelungs-
  // tiefe des Dokuments - genau wie beim Baum (mind. 1, gedeckelt bei 9).
  const ebenen = $derived.by((): number => {
    const tab = aktiverTab()
    if (tab === null || tab.analyse === null) return 1
    return ebenenAnzahl(tab.analyse.wurzel)
  })

  // Wählbare Formate für die manuelle Festlegung: alle Textformate aus den
  // Capabilities (binäre wie XLSX blieben ohne editierbaren Text und entfallen).
  const waehlbareFormate = $derived.by((): FormatFaehigkeiten[] =>
    (capabilities.daten?.formate ?? []).filter((format) => !format.ist_binaer),
  )

  /** Kurzer Anzeigename fürs Format-Menü. */
  function formatName(format: FormatFaehigkeiten): string {
    if (format.format_id === 'md_tabelle') return 'Markdown-Tabelle'
    if (format.format_id === 'html_tabelle') return 'HTML-Tabelle'
    return format.format_id.toUpperCase()
  }

  /** Manuelle Format-Wahl: festlegen (oder auf automatisch zurücksetzen) und neu prüfen. */
  function waehleFormat(wert: string): void {
    const tab = aktiverTab()
    if (tab === null) return
    setzeFormat(tab.id, wert === '' ? null : (wert as FormatId))
    void sofortAnalysieren(tab.id)
  }

  // Editor-Lebenszyklus: bei Tab-Wechsel neu aufbauen.
  $effect(() => {
    const tabId = tabs.aktiveTabId
    const ziel = wirt
    // Binäre Dokumente bekommen keinen Editor; eine offene Ansicht wird beendet.
    if (istBinaer) {
      view?.destroy()
      view = null
      angezeigteTabId = null
      return
    }
    if (tabId === null || ziel === undefined) return
    if (view !== null && angezeigteTabId === tabId) return
    view?.destroy()
    view = null
    const tab = untrack(() => aktiverTab())
    if (tab === null) return
    angezeigteTabId = tabId
    view = erzeugeEditor(ziel, {
      inhalt: tab.inhalt,
      format: tab.format,
      anInhaltGeaendert: (text) => uebernimmAenderung(tabId, text),
      anCursor: (zeile, spalte, offset) => {
        setzeCursor(zeile, spalte)
        meldeCursorPfad(tabId, offset)
      },
    })
    setzeCursor(1, 1)
  })

  /** Editor -> Baum: Pfad am Cursor als Selektion (Quelle "editor") melden. */
  function meldeCursorPfad(tabId: string, offset: number): void {
    const eintrag = pfadAnOffset(pfadIndex, offset)
    if (eintrag === null) return
    const aktuelle = selektion.aktuell
    if (aktuelle !== null && aktuelle.tabId === tabId && aktuelle.pfad === eintrag.pfad) return
    setzeSelektion({ tabId, pfad: eintrag.pfad, quelle: 'editor' })
  }

  // Aufräumen beim Verlassen der Ansicht.
  $effect(() => () => {
    view?.destroy()
    view = null
    angezeigteTabId = null
  })

  // Inhalt-Sync von außen (zum Beispiel spätere Transformationen) in den Editor.
  $effect(() => {
    const tab = aktiverTab()
    if (tab === null || view === null || tab.id !== angezeigteTabId) return
    if (view.state.doc.toString() !== tab.inhalt) {
      setzeDokument(view, tab.inhalt)
    }
  })

  // Sprache folgt dem gewählten Format (falls festgelegt), sonst dem vom Backend
  // erkannten - so passt die Syntaxfarbe auch, wenn das erzwungene Format (noch)
  // nicht sauber parst.
  $effect(() => {
    const tab = aktiverTab()
    if (tab === null || view === null || tab.id !== angezeigteTabId) return
    setzeSprache(view, tab.formatGewaehlt ?? tab.format)
  })

  // Diagnosen aus Analysefehler und Warnungen in die Lint-Anzeige einspeisen.
  $effect(() => {
    const tab = aktiverTab()
    if (tab === null || view === null || tab.id !== angezeigteTabId) return
    const eintraege: DiagnoseEintrag[] = []
    if (tab.analyseFehler !== null) {
      eintraege.push({
        schwere: 'error',
        meldung: tab.analyseFehler.meldung,
        position: tab.analyseFehler.position,
      })
    }
    for (const warnung of tab.analyse?.warnungen ?? []) {
      eintraege.push({ schwere: 'info', meldung: warnung, position: null })
    }
    setzeDiagnosen(view, eintraege)
  })

  // Baum/Diagnose/Brotkrumen -> Editor: fremde Selektionen anspringen.
  // Getrackt wird nur die Selektion selbst - Analyse-Updates lösen keinen
  // erneuten Sprung aus (deshalb untrack um den Positions-Index).
  $effect(() => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null || auswahl.quelle === 'editor') return
    const pfad = auswahl.pfad
    untrack(() => {
      if (view === null || angezeigteTabId !== auswahl.tabId) return
      const eintrag = pfadZuSpanne(pfadIndex, pfad)
      if (eintrag === null) return
      springeZuPosition(view, eintrag.von, eintrag.bis)
    })
  })

  const anzeigeDiagnosen = $derived.by((): AnzeigeDiagnose[] => {
    const tab = aktiverTab()
    if (tab === null) return []
    const liste: AnzeigeDiagnose[] = []
    if (tab.analyseFehler !== null) {
      liste.push({
        schwere: 'fehler',
        pfad: tab.analyseFehler.pfad ?? '',
        meldung: tab.analyseFehler.meldung,
        position: tab.analyseFehler.position,
      })
    }
    for (const warnung of tab.analyse?.warnungen ?? []) {
      liste.push({ schwere: 'warnung', pfad: '', meldung: warnung, position: null })
    }
    return liste
  })

  const fehlerAnzahl = $derived(
    anzeigeDiagnosen.filter((diagnose) => diagnose.schwere === 'fehler').length,
  )
  const warnungsAnzahl = $derived(
    anzeigeDiagnosen.filter((diagnose) => diagnose.schwere === 'warnung').length,
  )

  /** Übernimmt Editor-Eingaben in den Tab und stößt die Analyse an. */
  function uebernimmAenderung(tabId: string, text: string): void {
    const tab = tabs.liste.find((eintrag) => eintrag.id === tabId)
    if (tab === undefined || tab.inhalt === text) return
    setzeInhalt(tabId, text)
    analysiere(tabId)
  }

  type Transformation = 'formatieren' | 'minify' | 'sortieren'

  const TRANSFORM_NAME: Record<Transformation, string> = {
    formatieren: 'Formatiert',
    minify: 'Minifiziert',
    sortieren: 'Schlüssel sortiert',
  }

  /**
   * Transformiert den Editor-Inhalt, indem er ihn im selben Format neu
   * serialisiert: Formatieren rückt mit zwei Stufen ein, Minify verzichtet auf
   * Einrückung, Schlüssel sortieren ordnet Objektschlüssel alphabetisch. Läuft
   * über den vorhandenen Konvertieren-Endpunkt, damit jede Engine ihr Format
   * korrekt schreibt (inklusive erkanntem CSV-Trennzeichen).
   */
  async function transformiere(art: Transformation): Promise<void> {
    const tab = aktiverTab()
    if (tab === null) return
    const format = tab.formatGewaehlt ?? tab.format
    if (!format) {
      zeige('Zum Transformieren muss ein Format erkannt oder gewählt sein.', 'info')
      return
    }
    try {
      const antwort = await konvertiere({
        dokument: { inhalt_text: tab.inhalt, format_id: format },
        ziel_format: format,
        optionen: {
          einrueckung: art === 'minify' ? 0 : 2,
          sortiere_schluessel: art === 'sortieren',
          csv_trennzeichen: tab.analyse?.dialekt_info?.trennzeichen ?? ';',
        },
      })
      const text = antwort.ergebnis.inhalt_text
      if (text === null) {
        zeige('Dieses Format lässt sich nicht als Text ausgeben.', 'fehler')
        return
      }
      if (text === tab.inhalt) {
        zeige('Der Inhalt liegt bereits in dieser Form vor.', 'info')
        return
      }
      setzeInhalt(tab.id, text)
      analysiere(tab.id)
      zeige(`${TRANSFORM_NAME[art]}.`, 'erfolg')
    } catch (grund: unknown) {
      const meldung = grund instanceof Error ? grund.message : 'unbekannter Fehler'
      zeige(`Transformation fehlgeschlagen: ${meldung}`, 'fehler')
    }
  }

  /** Faltet alle faltbaren Knoten ab Tiefe N (robust auch bei großen Dateien). */
  function zeigeEbene(ebene: number): void {
    if (view === null) return
    falteAufEbene(view, ebene)
  }

  function allesAufklappen(): void {
    if (view === null) return
    entfalteAlles(view)
  }

  function allesZuklappen(): void {
    if (view === null) return
    falteAlles(view)
  }

  function oeffneSuche(): void {
    if (view === null) return
    openSearchPanel(view)
  }

  function bytesVon(text: string): number {
    return new TextEncoder().encode(text).length
  }

  /** Speichert den aktiven Tab in der Dokument-Bibliothek (IndexedDB). */
  async function speichere(): Promise<void> {
    const tab = aktiverTab()
    if (tab === null) return
    try {
      if (tab.dokumentId !== null) {
        const dokument = await aktualisiereDokument(tab.dokumentId, {
          inhalt: tab.inhalt,
          titel: tab.titel,
        })
        if (dokument !== null) {
          markiereGespeichert(tab.id, dokument.id)
          await ladeNeu()
          zeige('Dokument gespeichert.', 'erfolg')
          return
        }
        // Das verknüpfte Dokument existiert nicht mehr - unten neu anlegen.
      }
      const dokument = await speichereDokument({
        titel: tab.titel,
        format: tab.format,
        inhalt: tab.inhalt,
        groesse: bytesVon(tab.inhalt),
      })
      markiereGespeichert(tab.id, dokument.id)
      await ladeNeu()
      zeige('Dokument gespeichert.', 'erfolg')
    } catch (grund: unknown) {
      console.error('Speichern fehlgeschlagen:', grund)
      zeige('Das Dokument konnte nicht gespeichert werden.', 'fehler')
    }
  }

  function springeZuDiagnose(diagnose: AnzeigeDiagnose): void {
    if (view === null) return
    const bereich = alsOffsetBereich(view.state.doc, diagnose.position)
    springeZuPosition(view, bereich.from, bereich.to)
    // Trägt der Fehler einen Pfad, gilt der Klick auch als Selektion.
    if (diagnose.pfad !== '' && angezeigteTabId !== null) {
      setzeSelektion({ tabId: angezeigteTabId, pfad: diagnose.pfad, quelle: 'diagnose' })
    }
  }

  function positionsText(position: QuellSpanne | null): string {
    if (position === null || position.start.zeile < 1) return 'Zeile 1'
    if (position.start.spalte > 0) {
      return `Zeile ${position.start.zeile}, Spalte ${position.start.spalte}`
    }
    return `Zeile ${position.start.zeile}`
  }
</script>

{#if istBinaer}
  <div class="binaer-hinweis">
    <i class="fa-solid fa-file-excel"></i>
    <span>Binäres Dokument (XLSX) - nutze die Tabellen- oder Baum-Ansicht.</span>
  </div>
{:else}
  <div class="werkzeugzeile">
    <span class="beschriftung">Format:</span>
    <select
      class="feld ed-format"
      value={aktiverTab()?.formatGewaehlt ?? ''}
      onchange={(ereignis) => waehleFormat(ereignis.currentTarget.value)}
    >
      <option value="">Automatisch{aktiverTab()?.format ? ` (${aktiverTab()?.format?.toUpperCase()})` : ''}</option>
      {#each waehlbareFormate as format (format.format_id)}
        <option value={format.format_id}>{formatName(format)}</option>
      {/each}
    </select>
    <span class="trenner-v"></span>
    <button class="knopf klein" onclick={() => void transformiere('formatieren')}>
      <i class="fa-solid fa-indent"></i> Formatieren
    </button>
    <button class="knopf klein" onclick={() => void transformiere('minify')}>
      <i class="fa-solid fa-compress"></i> Minify
    </button>
    <button class="knopf klein" onclick={() => void transformiere('sortieren')}>
      <i class="fa-solid fa-arrow-down-a-z"></i> Schlüssel sortieren
    </button>
    <button class="knopf klein" onclick={allesAufklappen}>
      <i class="fa-solid fa-angles-down"></i> Alles aufklappen
    </button>
    <button class="knopf klein" onclick={allesZuklappen}>
      <i class="fa-solid fa-angles-up"></i> Alles zuklappen
    </button>
    <span class="beschriftung">Ebene:</span>
    {#each Array.from({ length: ebenen }, (_, i) => i + 1) as ebene (ebene)}
      <button class="knopf klein" onclick={() => zeigeEbene(ebene)}>{ebene}</button>
    {/each}
    <span class="luecke"></span>
    <button class="knopf klein" onclick={oeffneSuche}>
      <i class="fa-solid fa-magnifying-glass"></i> Suchen
    </button>
    <button class="knopf klein primaer" onclick={() => void speichere()}>
      <i class="fa-solid fa-floppy-disk"></i> Speichern
    </button>
  </div>

  <div class="editor-wirt" bind:this={wirt}></div>
{/if}

{#if !istBinaer && anzeigeDiagnosen.length > 0}
  <div class="karte diagnose-karte">
    <div class="karte-kopf">
      <i class="fa-solid fa-stethoscope"></i> Diagnose
      <span class="luecke"></span>
      {#if fehlerAnzahl > 0}
        <span class="abzeichen fehler">{fehlerAnzahl} Fehler</span>
      {/if}
      {#if warnungsAnzahl > 0}
        <span class="abzeichen warnung">
          {warnungsAnzahl === 1 ? '1 Warnung' : `${warnungsAnzahl} Warnungen`}
        </span>
      {/if}
    </div>
    {#each anzeigeDiagnosen as diagnose, index (index)}
      <div
        class="diagnose-zeile"
        role="button"
        tabindex="0"
        onclick={() => springeZuDiagnose(diagnose)}
        onkeydown={(ereignis) => {
          if (ereignis.key === 'Enter' || ereignis.key === ' ') {
            ereignis.preventDefault()
            springeZuDiagnose(diagnose)
          }
        }}
      >
        <span class="schwere {diagnose.schwere}">
          <i
            class="fa-solid {diagnose.schwere === 'fehler'
              ? 'fa-circle-xmark'
              : 'fa-triangle-exclamation'}"
          ></i>
        </span>
        {#if diagnose.pfad !== ''}
          <span class="d-pfad">{diagnose.pfad}</span>
        {/if}
        <span>{diagnose.meldung}</span>
        <span class="d-position">{positionsText(diagnose.position)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Wirt-Container des Editors: Abstände per padding, nie margin am
     .cm-editor selbst (bricht die Klick-Geometrie). */
  .editor-wirt {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background: var(--flaeche-eingabe);
    padding: var(--a2) 0;
  }

  /* Kompakte Format-Auswahl in der Werkzeugzeile (Höhe wie die kleinen Knöpfe). */
  .ed-format {
    height: 24px;
    padding: 0 var(--a1);
    font-size: 0.8rem;
  }

  .diagnose-karte {
    flex: none;
    margin: var(--a3);
    max-height: 200px;
    overflow-y: auto;
  }

  /* Platzhalter statt Editor bei binären Dokumenten. */
  .binaer-hinweis {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--a2);
    padding: var(--a5);
    color: var(--text-3);
    text-align: center;
  }

  .binaer-hinweis i {
    font-size: 2rem;
    color: var(--text-4, var(--text-3));
  }
</style>
