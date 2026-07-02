<script lang="ts">
  // Vergleichs-Ansicht nach mockups/diff.html: Werkzeugzeile ("Links:" fest =
  // Dokument des aktiven Tabs, "Rechts:" wählbar aus anderen Tabs und
  // gespeicherten Dokumenten, Schalter "Listen-Reihenfolge ignorieren",
  // "Vergleichen"). Nach dem Vergleich zeigt die diff-split zwei nebeneinander
  // gestellte Nur-Lese-Editoren (@codemirror/merge) mit hervorgehobenen
  // Textunterschieden; darunter die STRUKTURELLE Unterschieds-Liste vom
  // Backend. Ein Klick auf einen Eintrag koppelt über die Selektion Baum,
  // Editor und Brotkrumen (Quelle "diff").
  import type { MergeView } from '@codemirror/merge'
  import { untrack } from 'svelte'

  import { ApiError } from '../../api/http'
  import { berechneDiff } from '../../api/transform'
  import type {
    DiffAntwort,
    DiffArt,
    DiffEintrag,
    DokumentReferenz,
    FormatId,
    JsonWert,
    QuellSpanne,
  } from '../../api/typen'
  import { kurzVorschau } from '../../dienste/wertZugriff'
  import LeererZustand from '../../hilfsteile/LeererZustand.svelte'
  import { holeDokument } from '../../speicher/dokumente'
  import { dokumentListe } from '../../zustand/dokumentListe.svelte'
  import { setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab, tabs, type DokumentTab } from '../../zustand/tabs.svelte'
  import { beendeVergleich, setzeVergleich } from '../../zustand/vergleichStatus.svelte'
  import { erzeugeMergeAnsicht } from './erzeugeMergeAnsicht'

  /** Wählbare Vergleichsquelle: anderer offener Tab oder gespeichertes Dokument. */
  interface Quelle {
    wert: string
    anzeige: string
  }

  /** Aufgelöste rechte Seite - Text, Format und Anzeigename für den Pane-Kopf. */
  interface RechtsSeite {
    text: string
    format: FormatId | null
    titel: string
    herkunft: 'Tab' | 'gespeichert'
  }

  /** Ergebnis eines Laufs, gebunden an den verglichenen Tab. */
  interface Lauf {
    tabId: string
    /** id des rechten Tabs, falls die rechte Seite ein offener Tab war, sonst null. */
    rechtsTabId: string | null
    linksText: string
    linksFormat: FormatId | null
    linksTitel: string
    rechts: RechtsSeite
    antwort: DiffAntwort
  }

  const tab = $derived(aktiverTab())

  // Alle ANDEREN offenen Tabs und alle gespeicherten Dokumente.
  const quellen = $derived.by((): Quelle[] => {
    const aktuelleId = tab?.id ?? null
    const liste: Quelle[] = []
    for (const offen of tabs.liste) {
      if (offen.id === aktuelleId) continue
      liste.push({ wert: `tab:${offen.id}`, anzeige: `${offen.titel} (Tab)` })
    }
    for (const dokument of dokumentListe.eintraege) {
      liste.push({ wert: `dok:${dokument.id}`, anzeige: `${dokument.titel} (gespeichert)` })
    }
    return liste
  })

  let wahl = $state('')
  let ignoriereReihenfolge = $state(false)
  let laeuft = $state(false)
  let fehler = $state<string | null>(null)
  let lauf = $state<Lauf | null>(null)

  // Ergebnis nur zum passenden Tab zeigen - beim Tab-Wechsel verschwindet es.
  const anzeige = $derived(tab !== null && lauf?.tabId === tab.id ? lauf : null)

  const startBereit = $derived(tab !== null && !laeuft && wahl !== '')

  let wirt = $state<HTMLDivElement>()
  let merge: MergeView | null = null

  // MergeView-Lebenszyklus: bei jedem neuen Ergebnis sauber neu aufbauen.
  $effect(() => {
    const daten = anzeige
    const ziel = wirt
    merge?.destroy()
    merge = null
    if (daten === null || ziel === undefined) return
    untrack(() => {
      merge = erzeugeMergeAnsicht(ziel, {
        linksText: daten.linksText,
        rechtsText: daten.rechts.text,
        linksFormat: daten.linksFormat,
        rechtsFormat: daten.rechts.format,
      })
    })
  })

  // Aufräumen beim Verlassen der Ansicht.
  $effect(() => () => {
    merge?.destroy()
    merge = null
  })

  // Tab-Hervorhebung: solange ein Ergebnis für den aktiven Tab angezeigt wird,
  // die beiden beteiligten Tabs in der Tab-Leiste markieren. Verschwindet das
  // Ergebnis (Tab-Wechsel, kein Lauf), wird die Markierung wieder aufgehoben;
  // ebenso beim Verlassen der Ansicht (Cleanup).
  $effect(() => {
    const daten = anzeige
    if (daten === null) {
      beendeVergleich()
      return
    }
    setzeVergleich(daten.tabId, daten.rechtsTabId)
    return () => beendeVergleich()
  })

  /** Löst die gewählte rechte Seite in Text, Format und Namen auf. */
  async function loeseRechts(): Promise<RechtsSeite | null> {
    if (wahl.startsWith('tab:')) {
      const id = wahl.slice(4)
      const quelle = tabs.liste.find((eintrag) => eintrag.id === id)
      if (quelle === undefined) return null
      return { text: quelle.inhalt, format: quelle.format, titel: quelle.titel, herkunft: 'Tab' }
    }
    if (wahl.startsWith('dok:')) {
      const id = wahl.slice(4)
      const dokument = await holeDokument(id)
      if (dokument === null) return null
      return {
        text: dokument.inhalt,
        format: dokument.format,
        titel: dokument.titel,
        herkunft: 'gespeichert',
      }
    }
    return null
  }

  /** Ruft den Diff mit dem Hash der linken Seite auf; bei 410 einmal mit vollem Inhalt. */
  async function mitCacheWiederholung(
    links: DokumentTab,
    rechts: DokumentReferenz,
  ): Promise<DiffAntwort> {
    const hash = links.analyse?.dokument_hash
    const anfrage = (linksRef: DokumentReferenz): Promise<DiffAntwort> =>
      berechneDiff({ links: linksRef, rechts, ignoriere_reihenfolge: ignoriereReihenfolge })
    const voll: DokumentReferenz = { inhalt_text: links.inhalt, dateiname: links.titel }
    if (hash === undefined) return anfrage(voll)
    try {
      return await anfrage({ dokument_hash: hash })
    } catch (grund: unknown) {
      if (grund instanceof ApiError && grund.code === 'dokument_nicht_im_cache') {
        return anfrage(voll)
      }
      throw grund
    }
  }

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  async function vergleiche(): Promise<void> {
    const links = tab
    if (links === null || laeuft || wahl === '') return
    laeuft = true
    fehler = null
    try {
      const rechts = await loeseRechts()
      if (rechts === null) {
        fehler = 'Die gewählte Vergleichsquelle ist nicht mehr verfügbar.'
        return
      }
      const rechtsRef: DokumentReferenz = { inhalt_text: rechts.text, dateiname: rechts.titel }
      const antwort = await mitCacheWiederholung(links, rechtsRef)
      // rechte Seite als offener Tab? Dann seine id für die Tab-Hervorhebung merken.
      const rechtsTabId = wahl.startsWith('tab:') ? wahl.slice(4) : null
      lauf = {
        tabId: links.id,
        rechtsTabId,
        linksText: links.inhalt,
        linksFormat: links.format,
        linksTitel: links.titel,
        rechts,
        antwort,
      }
    } catch (grund: unknown) {
      fehler = fehlerText(grund)
    } finally {
      laeuft = false
    }
  }

  /** Klick auf einen Unterschied: Selektion setzen (koppelt Baum/Editor/Brotkrumen). */
  function springeZuEintrag(eintrag: DiffEintrag): void {
    if (anzeige === null) return
    setzeSelektion({ tabId: anzeige.tabId, pfad: eintrag.pfad, quelle: 'diff' })
  }

  /** Symbol je Diff-Art: + für hinzugefügt, - für entfernt, ~ für geändert. */
  function symbolFuer(art: DiffArt): string {
    if (art === 'hinzugefuegt') return '+'
    if (art === 'entfernt') return '-'
    return '~'
  }

  /** Farb-Klasse je Diff-Art (Zustandsfarben aus app.css: hinzu/weg/geaendert). */
  function klasseFuer(art: DiffArt): 'hinzu' | 'weg' | 'geaendert' {
    if (art === 'hinzugefuegt') return 'hinzu'
    if (art === 'entfernt') return 'weg'
    return 'geaendert'
  }

  /** Deutsche Beschriftung je Diff-Art (rendert im Unterschieds-Eintrag). */
  function textFuer(art: DiffArt): string {
    switch (art) {
      case 'hinzugefuegt':
        return 'hinzugefügt'
      case 'entfernt':
        return 'entfernt'
      case 'typ_geaendert':
        return 'Typ geändert'
      default:
        return 'geändert'
    }
  }

  /** Kurzdarstellung der Werte: "links -> rechts", je nach Art gekürzt. */
  function wertText(eintrag: DiffEintrag): string {
    const links = kurzWert(eintrag.wert_links)
    const rechts = kurzWert(eintrag.wert_rechts)
    if (eintrag.art === 'hinzugefuegt') return `(${rechts})`
    if (eintrag.art === 'entfernt') return `(${links})`
    return `${links} -> ${rechts}`
  }

  function kurzWert(wert: JsonWert | null): string {
    if (wert === null) return 'null'
    return kurzVorschau(wert, 40)
  }

  /** Positionstext wie im Mockup: "Zeile X / Y", sonst nur die bekannte Seite. */
  function positionsText(eintrag: DiffEintrag): string {
    const links = zeileVon(eintrag.position_links)
    const rechts = zeileVon(eintrag.position_rechts)
    if (links !== null && rechts !== null) return `Zeile ${links} / ${rechts}`
    if (rechts !== null) return `rechts Zeile ${rechts}`
    if (links !== null) return `links Zeile ${links}`
    return ''
  }

  function zeileVon(position: QuellSpanne | null): number | null {
    if (position === null || position.start.zeile < 1) return null
    return position.start.zeile
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-code-compare"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein Dokument, um es mit einem anderen zu vergleichen."
  />
{:else}
  <div class="werkzeugzeile">
    <span class="beschriftung">Links:</span>
    <span class="abzeichen">{tab.titel} (Tab)</span>
    <span class="beschriftung">Rechts:</span>
    <select class="feld" style="width: 300px" bind:value={wahl}>
      <option value="">Vergleichsquelle wählen ...</option>
      {#each quellen as quelle (quelle.wert)}
        <option value={quelle.wert}>{quelle.anzeige}</option>
      {/each}
    </select>
    <div class="feld-zeile">
      <span
        class="schalter"
        class:an={ignoriereReihenfolge}
        role="switch"
        aria-checked={ignoriereReihenfolge}
        tabindex="0"
        onclick={() => (ignoriereReihenfolge = !ignoriereReihenfolge)}
        onkeydown={(ereignis) => {
          if (ereignis.key === 'Enter' || ereignis.key === ' ') {
            ereignis.preventDefault()
            ignoriereReihenfolge = !ignoriereReihenfolge
          }
        }}
      ></span>
      <span class="beschriftung">Listen-Reihenfolge ignorieren</span>
    </div>
    <span class="luecke"></span>
    <button class="knopf primaer" disabled={!startBereit} onclick={() => void vergleiche()}>
      <i class="fa-solid fa-code-compare"></i> Vergleichen
    </button>
  </div>

  {#if quellen.length === 0}
    <LeererZustand
      icon="fa-code-compare"
      titel="Nichts zu vergleichen"
      text="Öffne ein zweites Dokument oder speichere eines, um zu vergleichen."
    />
  {:else if fehler !== null}
    <div class="v-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Der Vergleich ist fehlgeschlagen: {fehler}
      </span>
    </div>
  {:else if anzeige !== null}
    <div class="v-koepfe">
      <div class="diff-pane-kopf">
        <i class="fa-solid fa-file-code"></i>
        {anzeige.linksTitel}
        <span class="abzeichen">Tab</span>
      </div>
      <div class="diff-pane-kopf">
        <i class="fa-solid fa-file-code"></i>
        {anzeige.rechts.titel}
        <span class="abzeichen">{anzeige.rechts.herkunft}</span>
      </div>
    </div>
    <div class="merge-wirt" bind:this={wirt}></div>

    <div class="v-liste">
      <div class="leisten-titel">
        {anzeige.antwort.anzahl === 1
          ? '1 Unterschied'
          : `${anzeige.antwort.anzahl} Unterschiede`}
      </div>
      {#if anzeige.antwort.eintraege.length === 0}
        <div class="v-inhalt">
          <span class="hinweis-text">Keine strukturellen Unterschiede gefunden.</span>
        </div>
      {/if}
      {#each anzeige.antwort.eintraege as eintrag, index (index)}
        <div
          class="diagnose-zeile"
          role="button"
          tabindex="0"
          onclick={() => springeZuEintrag(eintrag)}
          onkeydown={(ereignis) => {
            if (ereignis.key === 'Enter' || ereignis.key === ' ') {
              ereignis.preventDefault()
              springeZuEintrag(eintrag)
            }
          }}
        >
          <span class="diff-art {klasseFuer(eintrag.art)}">{symbolFuer(eintrag.art)}</span>
          <span>{textFuer(eintrag.art)}</span>
          <span class="d-pfad">{eintrag.pfad}</span>
          <span class="mono">{wertText(eintrag)}</span>
          {#if positionsText(eintrag) !== ''}
            <span class="d-position">{positionsText(eintrag)}</span>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <LeererZustand
      icon="fa-code-compare"
      titel="Bereit zum Vergleich"
      text="Wähle rechts eine Vergleichsquelle und starte den Vergleich."
    />
  {/if}
{/if}

<style>
  /* Der Schalter ist im Mockup ein reines <span>; hier wird er per role/tabindex
     bedienbar gemacht. Optik kommt aus .schalter in app.css. */
  .schalter {
    outline: none;
  }

  .schalter:focus-visible {
    outline: 2px solid var(--akzent);
    outline-offset: 2px;
  }

  /* Nur die Pane-Köpfe (Dateiname + Abzeichen) sitzen in einer schlanken
     Zwei-Spalten-Leiste (flex: none); die eigentlichen Editoren rendert die
     MergeView im flex:1-Wirt darunter. Nicht .diff-split verwenden - das trägt
     in app.css flex:1 und würde die Höhe der Editoren nach unten drücken. */
  .v-koepfe {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    flex: none;
    background: var(--rand-2);
    border-bottom: 1px solid var(--rand-2);
  }

  .v-koepfe .diff-pane-kopf {
    background: var(--flaeche-panel-2);
  }

  /* Wirt-Container der MergeView: Abstände per padding, nie margin am
     .cm-editor selbst (bricht die Klick-Geometrie). Die MergeView ist ohne
     Höhe nicht scrollbar - deshalb hier begrenzen und Überlauf zulassen. */
  .merge-wirt {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: var(--flaeche-eingabe);
  }

  .merge-wirt :global(.cm-mergeView),
  .merge-wirt :global(.cm-mergeViewEditors) {
    height: 100%;
  }

  .v-liste {
    flex: none;
    max-height: 240px;
    overflow-y: auto;
    border-top: 1px solid var(--rand-1);
  }

  .v-inhalt {
    padding: var(--a4);
  }
</style>
