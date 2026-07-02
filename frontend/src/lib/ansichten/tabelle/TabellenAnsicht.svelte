<script lang="ts">
  // Tabellen-Ansicht nach mockups/tabelle.html: Werkzeugzeile (bei CSV mit
  // Dialekt-Abzeichen, sonst nur Filter + Export), darunter eine echte
  // <table class="tabelle"> mit sortierbaren Köpfen und Typ-Abzeichen.
  //
  // Virtualisierung: Statt der generischen VirtuelleListe (die auf <div>-Zeilen
  // baut und die Element-Selektoren .tabelle td/th nicht bekäme) wird hier die
  // Tabellen-Semantik bewahrt und von Hand virtualisiert - nur der sichtbare
  // Zeilen-Ausschnitt wird gerendert, zwei Abstandshalter-Zeilen (oben/unten)
  // halten die Scrollhöhe korrekt. So bleibt die Mockup-Optik (Zebra, Hover,
  // .selektiert, .zahl, .null-wert) exakt erhalten und auch sehr viele Zeilen
  // bleiben flüssig.
  import { kindPointer } from '../../dienste/pfade'
  import {
    alsCsv,
    alleZeilen,
    filtere,
    istTabellarisch,
    sortiere,
    spaltenAus,
    typVonSpalte,
    zellText,
    zellwert,
    type Sortierrichtung,
  } from '../../dienste/tabellenModell'
  import { ladeHerunter } from '../../dienste/dateiEinAusgabe'
  import { typVon } from '../../dienste/wertZugriff'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab, setzeAnsicht } from '../../zustand/tabs.svelte'

  /** Feste Zeilenhöhe in Pixeln (Padding 5px + Text ~19px, wie .tabelle td). */
  const ZEILEN_HOEHE = 29
  /** Zusätzlich gerenderte Zeilen ober- und unterhalb des Sichtfensters. */
  const UEBERHANG = 12

  /** Kurze Typnamen für das Kopf-Abzeichen (knapp, wie im Mockup). */
  const KOPF_TYP_NAME: Record<string, string> = {
    objekt: 'Objekt',
    liste: 'Liste',
    text: 'Text',
    zahl: 'Zahl',
    wahrheitswert: 'Boole',
    null: 'Null',
  }

  const tab = $derived(aktiverTab())
  const wurzel = $derived(tab?.analyse?.wurzel ?? null)
  const tabellarisch = $derived(wurzel !== null && istTabellarisch(wurzel))
  const dialekt = $derived(tab?.analyse?.dialekt_info ?? null)
  const spalten = $derived(wurzel !== null ? spaltenAus(wurzel) : [])
  const basisZeilen = $derived(wurzel !== null ? alleZeilen(wurzel) : [])

  let filterText = $state('')
  let sortSpalte = $state<string | null>(null)
  let sortRichtung = $state<Sortierrichtung>('auf')

  /** Sichtbare Zeilen-Indizes: erst filtern, dann (falls gewählt) sortieren. */
  const sichtbareZeilen = $derived.by((): number[] => {
    if (wurzel === null) return []
    const gefiltert = filtere(basisZeilen, wurzel, spalten, filterText)
    if (sortSpalte === null) return gefiltert
    return sortiere(gefiltert, wurzel, sortSpalte, sortRichtung)
  })

  /** Typ je Spalte (dominanter Werttyp) für das Kopf-Abzeichen. */
  const spaltenTyp = $derived.by((): Record<string, string> => {
    const karte: Record<string, string> = {}
    if (wurzel === null) return karte
    for (const spalte of spalten) {
      karte[spalte] = typVonSpalte(basisZeilen, wurzel, spalte)
    }
    return karte
  })

  // Virtualisierung: Scrollzustand des Tabellen-Behälters.
  let flaeche = $state<HTMLDivElement>()
  let scrollTop = $state(0)
  let sichtHoehe = $state(0)

  const vonIndex = $derived(
    Math.max(0, Math.floor(scrollTop / ZEILEN_HOEHE) - UEBERHANG),
  )
  const bisIndex = $derived(
    Math.min(
      sichtbareZeilen.length,
      Math.ceil((scrollTop + sichtHoehe) / ZEILEN_HOEHE) + UEBERHANG,
    ),
  )
  const fensterZeilen = $derived(sichtbareZeilen.slice(vonIndex, bisIndex))
  const platzOben = $derived(vonIndex * ZEILEN_HOEHE)
  const platzUnten = $derived(Math.max(0, (sichtbareZeilen.length - bisIndex) * ZEILEN_HOEHE))

  /** Pointer, dessen Zeile (falls in dieser Ansicht) hervorgehoben wird. */
  const auswahlZeile = $derived.by((): number | null => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null || tab === null) return null
    if (auswahl.tabId !== tab.id) return null
    // Erstes Segment des Pointers als Zeilenindex ("/3" oder "/3/spalte").
    const treffer = /^\/(0|[1-9][0-9]*)(?:\/|$)/.exec(auswahl.pfad)
    return treffer !== null ? Number(treffer[1]) : null
  })

  function anScroll(): void {
    if (flaeche !== undefined) scrollTop = flaeche.scrollTop
  }

  /** Rollt eine Zeile ins Bild (mittig, falls außerhalb) - für fremde Selektionen. */
  function scrollZuIndex(index: number): void {
    if (flaeche === undefined || sichtbareZeilen.length === 0) return
    const begrenzt = Math.max(0, Math.min(index, sichtbareZeilen.length - 1))
    const oben = begrenzt * ZEILEN_HOEHE
    const sichtOben = flaeche.scrollTop
    const sichtUnten = sichtOben + flaeche.clientHeight
    if (oben >= sichtOben && oben + ZEILEN_HOEHE <= sichtUnten) return
    flaeche.scrollTop = Math.max(0, oben - (flaeche.clientHeight - ZEILEN_HOEHE) / 2)
  }

  // Fremde Selektion (Baum, Editor, ...): zeigt sie auf eine Zeile dieser
  // Tabelle, dorthin scrollen. Getrackt wird nur die Selektion selbst.
  $effect(() => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null || auswahl.quelle === 'tabelle') return
    if (tab === null || auswahl.tabId !== tab.id) return
    const treffer = /^\/(0|[1-9][0-9]*)(?:\/|$)/.exec(auswahl.pfad)
    if (treffer === null) return
    const zeilenIndex = Number(treffer[1])
    const position = sichtbareZeilen.indexOf(zeilenIndex)
    if (position !== -1) scrollZuIndex(position)
  })

  /** Klick auf einen Spaltenkopf: auf -> ab -> Sortierung aus (dreistufig). */
  function sortiereNach(spalte: string): void {
    if (sortSpalte !== spalte) {
      sortSpalte = spalte
      sortRichtung = 'auf'
    } else if (sortRichtung === 'auf') {
      sortRichtung = 'ab'
    } else {
      sortSpalte = null
      sortRichtung = 'auf'
    }
  }

  /** Klick auf eine Zelle: Selektion auf die Zelle (Zeile + Spalte) setzen. */
  function waehleZelle(zeile: number, spalte: string): void {
    if (tab === null) return
    const zeilenPfad = kindPointer('', zeile)
    setzeSelektion({ tabId: tab.id, pfad: kindPointer(zeilenPfad, spalte), quelle: 'tabelle' })
  }

  function exportiere(): void {
    if (wurzel === null) return
    const text = alsCsv(sichtbareZeilen, wurzel, spalten)
    const basis = (tab?.titel ?? 'tabelle').replace(/\.[^.]+$/, '')
    ladeHerunter(`${basis}.csv`, text, 'text/csv;charset=utf-8')
  }

  function zumBaum(): void {
    if (tab === null) return
    setzeAnsicht(tab.id, 'baum')
  }

  /** Lesbarer Name eines CSV-Trennzeichens für das Dialekt-Abzeichen. */
  function trennzeichenName(zeichen: string): string {
    switch (zeichen) {
      case ';':
        return 'Semikolon'
      case ',':
        return 'Komma'
      case '\t':
        return 'Tabulator'
      case '|':
        return 'Senkrechter Strich'
      case ' ':
        return 'Leerzeichen'
      default:
        return zeichen
    }
  }
</script>

{#if tab !== null}
  {#if tabellarisch}
    {@const aktivesTabId = tab.id}
    <div class="werkzeugzeile">
      {#if dialekt !== null}
        <span class="beschriftung">
          <FachbegriffLink topic="dialekt">Dialekt</FachbegriffLink>:
        </span>
        <span class="abzeichen">Trennzeichen: {trennzeichenName(dialekt.trennzeichen)}</span>
        <span class="abzeichen">Kodierung: {dialekt.encoding}</span>
        <span class="abzeichen">Kopfzeile: {dialekt.hat_kopfzeile ? 'ja' : 'nein'}</span>
      {/if}
      <span class="luecke"></span>
      <input
        class="feld"
        type="text"
        placeholder="Spalten filtern ..."
        style="width: 200px"
        bind:value={filterText}
      />
      <button class="knopf klein" onclick={exportiere}>
        <i class="fa-solid fa-file-export"></i> Exportieren
      </button>
    </div>

    <div class="tabelle-flaeche" bind:this={flaeche} bind:clientHeight={sichtHoehe} onscroll={anScroll}>
      <table class="tabelle">
        <thead>
          <tr>
            {#each spalten as spalte (spalte)}
              {@const typ = spaltenTyp[spalte] ?? 'text'}
              <th
                class:zahl={typ === 'zahl'}
                onclick={() => sortiereNach(spalte)}
                title="Nach {spalte} sortieren"
              >
                {spalte}
                <span class="abzeichen">{KOPF_TYP_NAME[typ] ?? 'Text'}</span>
                {#if sortSpalte === spalte}
                  <i
                    class="fa-solid sortier-pfeil {sortRichtung === 'auf'
                      ? 'fa-arrow-up-short-wide'
                      : 'fa-arrow-down-wide-short'}"
                    title={sortRichtung === 'auf' ? 'Aufsteigend sortiert' : 'Absteigend sortiert'}
                  ></i>
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if platzOben > 0}
            <tr class="abstand" style="height: {platzOben}px" aria-hidden="true">
              <td colspan={spalten.length}></td>
            </tr>
          {/if}
          {#each fensterZeilen as zeile (zeile)}
            <tr
              class:selektiert={auswahlZeile === zeile}
              style="height: {ZEILEN_HOEHE}px"
            >
              {#each spalten as spalte (spalte)}
                {@const wert = zellwert(wurzel, zeile, spalte)}
                {@const leer = wert === undefined || wert === null}
                {@const zahl = wert !== undefined && typVon(wert) === 'zahl'}
                <td
                  class:zahl
                  class:null-wert={leer}
                  onclick={() => waehleZelle(zeile, spalte)}
                >
                  {#if leer}(leer){:else}{zellText(wert)}{/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if platzUnten > 0}
            <tr class="abstand" style="height: {platzUnten}px" aria-hidden="true">
              <td colspan={spalten.length}></td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="tabelle-fuss">
      {sichtbareZeilen.length}
      {sichtbareZeilen.length === 1 ? 'Zeile' : 'Zeilen'}{filterText.trim() !== ''
        ? ` (von ${basisZeilen.length})`
        : ''}, {spalten.length}
      {spalten.length === 1 ? 'Spalte' : 'Spalten'}
    </div>
  {:else}
    <div class="tabelle-leer">
      <i class="fa-solid fa-table"></i>
      <strong>Nicht tabellarisch</strong>
      <span>
        Dieses Dokument ist nicht tabellarisch - die Tabelle zeigt Arrays gleichförmiger Objekte
        oder CSV.
      </span>
      <button class="knopf primaer" onclick={zumBaum}>
        <i class="fa-solid fa-folder-tree"></i> Zum Baum
      </button>
    </div>
  {/if}
{/if}

<style>
  /* Scrollbehälter der Tabelle füllt die Ansichtsfläche; die Kopfzeile bleibt
     über position: sticky (aus .tabelle th in app.css) oben stehen. */
  .tabelle-flaeche {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  /* Abstandshalter-Zeilen tragen keine Zebra-/Hover-Optik. */
  .tabelle tbody tr.abstand,
  .tabelle tbody tr.abstand:hover {
    background: none;
  }

  .tabelle tbody tr.abstand td {
    padding: 0;
    border: none;
  }

  .tabelle-fuss {
    flex: none;
    padding: var(--a2) var(--a3);
    border-top: 1px solid var(--rand-1);
    background: var(--flaeche-panel);
    color: var(--text-2);
    font-size: 0.8rem;
  }

  /* Leerzustand mittig, wie .leer-zustand, aber lokal für den Sonderfall. */
  .tabelle-leer {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--a3);
    padding: var(--a5);
    text-align: center;
    color: var(--text-2);
  }

  .tabelle-leer > i {
    font-size: 2.4rem;
    color: var(--text-3);
  }

  .tabelle-leer > span {
    max-width: 420px;
  }
</style>
