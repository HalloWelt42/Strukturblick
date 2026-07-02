<script lang="ts">
  // Editor-Ansicht: Werkzeugzeile, CodeMirror-Editor und Diagnose-Liste nach
  // mockups/editor.html. Der Editor ist an den aktiven Tab gebunden; beim
  // Tab-Wechsel wird er neu aufgebaut, damit die Undo-Historie nicht in ein
  // fremdes Dokument hinüberreicht.
  import { foldEffect, foldNodeProp, syntaxTree, unfoldAll } from '@codemirror/language'
  import { openSearchPanel } from '@codemirror/search'
  import type { StateEffect } from '@codemirror/state'
  import type { EditorView } from '@codemirror/view'
  import { untrack } from 'svelte'

  import type { QuellSpanne } from '../../api/typen'
  import { analysiere } from '../../dienste/analyseDienst'
  import {
    baueIndex,
    pfadAnOffset,
    pfadZuSpanne,
    type PfadIndex,
  } from '../../dienste/pfadIndex'
  import { aktualisiereDokument, speichereDokument } from '../../speicher/dokumente'
  import { ladeNeu } from '../../zustand/dokumentListe.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { setzeCursor } from '../../zustand/statusInfo.svelte'
  import { aktiverTab, markiereGespeichert, setzeInhalt, tabs } from '../../zustand/tabs.svelte'
  import { zeige } from '../../zustand/toaster.svelte'
  import {
    alsOffsetBereich,
    erzeugeEditor,
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

  // Sprache folgt dem (vom Backend erkannten) Format des Tabs.
  $effect(() => {
    const tab = aktiverTab()
    if (tab === null || view === null || tab.id !== angezeigteTabId) return
    setzeSprache(view, tab.format)
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

  function transformationFolgt(): void {
    zeige('Folgt in der Ausbaustufe Transformation.', 'info')
  }

  /** Faltet alle faltbaren Knoten ab Tiefe N; vorher wird alles aufgeklappt. */
  function falteAbEbene(ebene: number): void {
    if (view === null) return
    unfoldAll(view)
    const state = view.state
    const effekte: StateEffect<unknown>[] = []
    const stapel: boolean[] = []
    let tiefe = 0
    syntaxTree(state).iterate({
      enter: (knoten) => {
        const falter = knoten.type.prop(foldNodeProp)
        const bereich = falter !== undefined ? falter(knoten.node, state) : null
        const faltbar = bereich !== null && bereich.to > bereich.from
        stapel.push(faltbar)
        if (faltbar) {
          tiefe += 1
          if (tiefe >= ebene) effekte.push(foldEffect.of(bereich))
        }
      },
      leave: () => {
        if (stapel.pop() === true) tiefe -= 1
      },
    })
    if (effekte.length > 0) view.dispatch({ effects: effekte })
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
    <button class="knopf klein" onclick={transformationFolgt}>
      <i class="fa-solid fa-indent"></i> Formatieren
    </button>
    <button class="knopf klein" onclick={transformationFolgt}>
      <i class="fa-solid fa-compress"></i> Minify
    </button>
    <button class="knopf klein" onclick={transformationFolgt}>
      <i class="fa-solid fa-arrow-down-a-z"></i> Schlüssel sortieren
    </button>
    <span class="beschriftung">Falten:</span>
    <button class="knopf klein" onclick={() => falteAbEbene(1)}>Ebene 1</button>
    <button class="knopf klein" onclick={() => falteAbEbene(2)}>Ebene 2</button>
    <button class="knopf klein" onclick={() => falteAbEbene(3)}>Ebene 3</button>
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
