<script lang="ts">
  // Tabellen-Ansicht nach mockups/tabelle.html: Werkzeugzeile (bei CSV mit
  // Dialekt-Abzeichen, sonst nur Filter + Export), darunter eine echte
  // <table class="tabelle"> mit sortierbaren Köpfen und Typ-Abzeichen.
  //
  // Ausbau: Der Nutzer kann Spalten umsortieren, aus- und einblenden, umbenennen
  // und Werte je Spalte per Übersetzungstabelle abbilden. Bei CSV lässt sich der
  // Trenner wechseln (löst ein Neu-Parsen aus), beim Export der Zieltrenner. All
  // das wirkt zusammen: die Tabelle rendert nur die sichtbaren Spalten in der
  // gewählten Reihenfolge mit Anzeigenamen und übersetzten Werten; Sortieren und
  // Filter arbeiten auf den angezeigten (übersetzten) Werten; der Export liefert
  // genau diesen umgebauten View.
  //
  // Virtualisierung: Statt der generischen VirtuelleListe (die auf <div>-Zeilen
  // baut und die Element-Selektoren .tabelle td/th nicht bekäme) wird hier die
  // Tabellen-Semantik bewahrt und von Hand virtualisiert - nur der sichtbare
  // Zeilen-Ausschnitt wird gerendert, zwei Abstandshalter-Zeilen (oben/unten)
  // halten die Scrollhöhe korrekt. So bleibt die Mockup-Optik (Zebra, Hover,
  // .selektiert, .zahl, .null-wert) exakt erhalten und auch sehr viele Zeilen
  // bleiben flüssig.
  import { dokumentParsen } from '../../api/dokumente'
  import type { ParseAntwort } from '../../api/typen'
  import { kindPointer } from '../../dienste/pfade'
  import {
    alleZeilen,
    alsCsvAngezeigt,
    anzeigeName,
    filtereAngezeigt,
    istTabellarisch,
    sichtbareSpalten,
    sortiereAngezeigt,
    spaltenAus,
    trennerKollisionen,
    typVonSpalte,
    verschiedeneRohwerte,
    zellAnzeige,
    zellwert,
    type Sortierrichtung,
  } from '../../dienste/tabellenModell'
  import { ladeHerunter } from '../../dienste/dateiEinAusgabe'
  import { typVon } from '../../dienste/wertZugriff'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import Modal from '../../hilfsteile/Modal.svelte'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab, setzeAnsicht } from '../../zustand/tabs.svelte'
  import {
    schalteSichtbar,
    setzeAnzeigename,
    setzeWertErsatz,
    tabellenZustandFuer,
    verschiebeSpalte,
  } from './tabellenAnsichtZustand.svelte'

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

  /** Wählbare CSV-Trenner (Wert = tatsächliches Zeichen, Name = Beschriftung). */
  const TRENNER_KANDIDATEN: { zeichen: string; name: string }[] = [
    { zeichen: ',', name: 'Komma' },
    { zeichen: ';', name: 'Semikolon' },
    { zeichen: '\t', name: 'Tabulator' },
    { zeichen: '|', name: 'Senkrechtstrich' },
  ]

  const tab = $derived(aktiverTab())
  const wurzel = $derived(tab?.analyse?.wurzel ?? null)
  const tabellarisch = $derived(wurzel !== null && istTabellarisch(wurzel))
  const dialekt = $derived(tab?.analyse?.dialekt_info ?? null)
  const istCsv = $derived(tab?.format === 'csv')
  const spalten = $derived(wurzel !== null ? spaltenAus(wurzel) : [])
  const basisZeilen = $derived(wurzel !== null ? alleZeilen(wurzel) : [])

  // Anzeige-Zustand je Tab (Reihenfolge/Sichtbarkeit/Umbenennung/Wert-Karten).
  // Wird bei jedem Lauf mit dem aktuellen Spaltensatz abgeglichen.
  const ansichtZustand = $derived(
    tab !== null ? tabellenZustandFuer(tab.id, spalten) : null,
  )

  /** Die tatsächlich gerenderten Spalten: Reihenfolge, ohne versteckte. */
  const angezeigteSpalten = $derived.by((): string[] => {
    if (ansichtZustand === null) return spalten
    return sichtbareSpalten(spalten, ansichtZustand.spaltenReihenfolge, ansichtZustand.versteckt)
  })

  let filterText = $state('')
  let sortSpalte = $state<string | null>(null)
  let sortRichtung = $state<Sortierrichtung>('auf')

  /** Sichtbare Zeilen-Indizes: erst filtern, dann (falls gewählt) sortieren. */
  const sichtbareZeilen = $derived.by((): number[] => {
    if (wurzel === null || ansichtZustand === null) return []
    const karten = ansichtZustand.wertKarten
    const gefiltert = filtereAngezeigt(basisZeilen, wurzel, angezeigteSpalten, filterText, karten)
    if (sortSpalte === null) return gefiltert
    return sortiereAngezeigt(gefiltert, wurzel, sortSpalte, sortRichtung, karten)
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

  // ----- Trenner wechseln (CSV neu parsen) ----------------------------------

  /** Der erkannte Trenner aus der Vorermittlung (Dialekt), Basis der Vorauswahl. */
  const erkannterTrenner = $derived(dialekt?.trennzeichen ?? null)

  /** Aktuell gewählter Trenner; initial der erkannte, sonst Semikolon. */
  let gewaehlterTrenner = $state<string | null>(null)

  /** Der wirksame Trenner: die explizite Wahl, sonst der erkannte. */
  const wirksamerTrenner = $derived(gewaehlterTrenner ?? erkannterTrenner ?? ';')

  let trennerLaeuft = $state(false)

  /**
   * Neu-Parsen mit gewähltem Trenner und Übernahme in tab.analyse - analog zum
   * analyseDienst, aber gezielt mit csv_trennzeichen. Die Anzeige-Einstellungen
   * (Reihenfolge/Umbenennung/Werte) bleiben erhalten, weil der Spaltensatz gleich
   * bleibt; nur die Zellwerte werden neu aufgeteilt.
   */
  async function wechsleTrenner(zeichen: string): Promise<void> {
    if (tab === null || zeichen === wirksamerTrenner) return
    gewaehlterTrenner = zeichen
    trennerLaeuft = true
    const zielTab = tab
    try {
      const antwort: ParseAntwort = await dokumentParsen({
        inhalt_text: zielTab.inhalt,
        format_id: 'csv',
        dateiname: zielTab.titel,
        parse_optionen: { csv_trennzeichen: zeichen },
      })
      // Nur übernehmen, wenn der Tab noch existiert und aktiv geblieben ist.
      const aktuell = aktiverTab()
      if (aktuell !== null && aktuell.id === zielTab.id) {
        aktuell.analyse = antwort
        aktuell.format = antwort.format_id
        aktuell.analyseStand = 'frisch'
        aktuell.analyseFehler = null
      }
    } catch (grund: unknown) {
      console.error('Neu-Parsen mit gewähltem Trenner fehlgeschlagen:', grund)
    } finally {
      trennerLaeuft = false
    }
  }

  function beiTrennerWahl(ereignis: Event): void {
    const wert = (ereignis.currentTarget as HTMLSelectElement).value
    void wechsleTrenner(wert)
  }

  // ----- Modal "Spalten verwalten" ------------------------------------------

  let spaltenModalOffen = $state(false)

  // ----- Modal "Werte übersetzen" -------------------------------------------

  let werteModalOffen = $state(false)
  let werteSpalte = $state<string | null>(null)

  /** Bei geöffnetem Modal ohne Wahl die erste Spalte vorbelegen. */
  const werteSpalteWirksam = $derived(werteSpalte ?? spalten[0] ?? null)

  /** Verschiedene Rohwerte der gewählten Spalte (bis 50), für die Eingabefelder. */
  const rohwerteDerSpalte = $derived.by((): string[] => {
    if (wurzel === null || werteSpalteWirksam === null) return []
    return verschiedeneRohwerte(basisZeilen, wurzel, werteSpalteWirksam, 50)
  })

  function ersatzVon(spalte: string, rohwert: string): string {
    if (ansichtZustand === null) return ''
    return ansichtZustand.wertKarten[spalte]?.[rohwert] ?? ''
  }

  function beiErsatzEingabe(spalte: string, rohwert: string, ereignis: Event): void {
    if (ansichtZustand === null) return
    const wert = (ereignis.currentTarget as HTMLInputElement).value
    setzeWertErsatz(ansichtZustand, spalte, rohwert, wert)
  }

  // ----- Modal "Exportieren" ------------------------------------------------

  let exportModalOffen = $state(false)
  let exportTrenner = $state(';')

  /** Anzahl Felder, in denen der gewählte Export-Trenner vorkommt (Kollision). */
  const exportKollisionen = $derived.by((): number => {
    if (wurzel === null || ansichtZustand === null) return 0
    return trennerKollisionen(
      sichtbareZeilen,
      wurzel,
      angezeigteSpalten,
      ansichtZustand.umbenennung,
      ansichtZustand.wertKarten,
      exportTrenner,
    )
  })

  function oeffneExport(): void {
    // Der Export-Trenner startet beim wirksamen Trenner, falls wählbar.
    const passend = TRENNER_KANDIDATEN.some((k) => k.zeichen === wirksamerTrenner)
    exportTrenner = passend ? wirksamerTrenner : ';'
    exportModalOffen = true
  }

  function fuehreExportDurch(): void {
    if (wurzel === null || ansichtZustand === null) return
    const text = alsCsvAngezeigt(
      sichtbareZeilen,
      wurzel,
      angezeigteSpalten,
      ansichtZustand.umbenennung,
      ansichtZustand.wertKarten,
      exportTrenner,
    )
    const basis = (tab?.titel ?? 'tabelle').replace(/\.[^.]+$/, '')
    ladeHerunter(`${basis}.csv`, text, 'text/csv;charset=utf-8')
    exportModalOffen = false
  }
</script>

{#if tab !== null}
  {#if tabellarisch}
    <div class="werkzeugzeile">
      {#if dialekt !== null}
        <span class="beschriftung">
          <FachbegriffLink topic="dialekt">Dialekt</FachbegriffLink>:
        </span>
        {#if istCsv}
          <span class="beschriftung">Trenner:</span>
          <select
            class="feld"
            style="width: 150px"
            value={wirksamerTrenner}
            disabled={trennerLaeuft}
            onchange={beiTrennerWahl}
          >
            {#each TRENNER_KANDIDATEN as kandidat (kandidat.zeichen)}
              <option value={kandidat.zeichen}>{kandidat.name}</option>
            {/each}
          </select>
          {#if erkannterTrenner !== null}
            <span class="beschriftung">erkannt: {trennzeichenName(erkannterTrenner)}</span>
          {/if}
          {#if trennerLaeuft}
            <i class="fa-solid fa-spinner fa-spin" aria-label="Neu parsen ..."></i>
          {/if}
        {:else}
          <span class="abzeichen">Trennzeichen: {trennzeichenName(dialekt.trennzeichen)}</span>
        {/if}
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
      <button class="knopf klein" onclick={() => (spaltenModalOffen = true)}>
        <i class="fa-solid fa-table-columns"></i> Spalten
      </button>
      <button class="knopf klein" onclick={() => (werteModalOffen = true)}>
        <i class="fa-solid fa-language"></i> Werte übersetzen
      </button>
      <button class="knopf klein" onclick={oeffneExport}>
        <i class="fa-solid fa-file-export"></i> Exportieren
      </button>
    </div>

    <div class="tabelle-flaeche" bind:this={flaeche} bind:clientHeight={sichtHoehe} onscroll={anScroll}>
      <table class="tabelle">
        <thead>
          <tr>
            {#each angezeigteSpalten as spalte (spalte)}
              {@const typ = spaltenTyp[spalte] ?? 'text'}
              {@const kopf = ansichtZustand !== null
                ? anzeigeName(spalte, ansichtZustand.umbenennung)
                : spalte}
              <th
                class:zahl={typ === 'zahl'}
                onclick={() => sortiereNach(spalte)}
                title="Nach {kopf} sortieren"
              >
                {kopf}
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
              <td colspan={angezeigteSpalten.length}></td>
            </tr>
          {/if}
          {#each fensterZeilen as zeile (zeile)}
            <tr
              class:selektiert={auswahlZeile === zeile}
              style="height: {ZEILEN_HOEHE}px"
            >
              {#each angezeigteSpalten as spalte (spalte)}
                {@const roh = zellwert(wurzel, zeile, spalte)}
                {@const leer = roh === undefined || roh === null}
                {@const zahl = roh !== undefined && typVon(roh) === 'zahl'}
                {@const text = ansichtZustand !== null
                  ? zellAnzeige(wurzel, zeile, spalte, ansichtZustand.wertKarten)
                  : ''}
                <td
                  class:zahl
                  class:null-wert={leer && text === ''}
                  onclick={() => waehleZelle(zeile, spalte)}
                >
                  {#if leer && text === ''}(leer){:else}{text}{/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if platzUnten > 0}
            <tr class="abstand" style="height: {platzUnten}px" aria-hidden="true">
              <td colspan={angezeigteSpalten.length}></td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <div class="tabelle-fuss">
      {sichtbareZeilen.length}
      {sichtbareZeilen.length === 1 ? 'Zeile' : 'Zeilen'}{filterText.trim() !== ''
        ? ` (von ${basisZeilen.length})`
        : ''}, {angezeigteSpalten.length}
      {angezeigteSpalten.length === 1 ? 'Spalte' : 'Spalten'}{angezeigteSpalten.length <
      spalten.length
        ? ` (von ${spalten.length})`
        : ''}
    </div>

    <!-- Modal: Spalten verwalten (Reihenfolge, Sichtbarkeit, Umbenennung) -->
    <Modal titel="Spalten verwalten" bind:offen={spaltenModalOffen}>
      {#if ansichtZustand !== null}
        <div class="spalten-liste">
          {#each ansichtZustand.spaltenReihenfolge as spalte, index (spalte)}
            {@const sichtbar = !ansichtZustand.versteckt.has(spalte)}
            <div class="spalten-zeile">
              <button
                class="checkbox"
                class:an={sichtbar}
                role="checkbox"
                aria-checked={sichtbar}
                aria-label="{spalte} {sichtbar ? 'ausblenden' : 'einblenden'}"
                onclick={() => schalteSichtbar(ansichtZustand, spalte)}
              >
                <i class="fa-solid fa-check"></i>
              </button>
              <span class="spalten-roh" title={spalte}>{spalte}</span>
              <input
                class="feld"
                type="text"
                placeholder={spalte}
                value={ansichtZustand.umbenennung[spalte] ?? ''}
                oninput={(e) =>
                  setzeAnzeigename(ansichtZustand, spalte, e.currentTarget.value)}
              />
              <button
                class="icon-knopf"
                title="Nach oben"
                disabled={index === 0}
                onclick={() => verschiebeSpalte(ansichtZustand, spalte, -1)}
              >
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <button
                class="icon-knopf"
                title="Nach unten"
                disabled={index === ansichtZustand.spaltenReihenfolge.length - 1}
                onclick={() => verschiebeSpalte(ansichtZustand, spalte, 1)}
              >
                <i class="fa-solid fa-arrow-down"></i>
              </button>
            </div>
          {/each}
        </div>
      {/if}
      {#snippet fuss()}
        <button class="knopf primaer" onclick={() => (spaltenModalOffen = false)}>Fertig</button>
      {/snippet}
    </Modal>

    <!-- Modal: Werte übersetzen (Rohwert -> Ersatz je Spalte) -->
    <Modal titel="Werte übersetzen" bind:offen={werteModalOffen}>
      <div class="werte-kopf">
        <span class="beschriftung">Spalte:</span>
        <select class="feld" bind:value={werteSpalte}>
          {#each spalten as spalte (spalte)}
            <option value={spalte}>
              {ansichtZustand !== null ? anzeigeName(spalte, ansichtZustand.umbenennung) : spalte}
            </option>
          {/each}
        </select>
      </div>
      {#if werteSpalteWirksam !== null}
        {#if rohwerteDerSpalte.length === 0}
          <p class="werte-leer">Diese Spalte enthält keine übersetzbaren Werte.</p>
        {:else}
          <div class="werte-liste">
            {#each rohwerteDerSpalte as rohwert (rohwert)}
              <div class="werte-zeile">
                <span class="werte-roh" title={rohwert}>{rohwert}</span>
                <i class="fa-solid fa-arrow-right werte-pfeil"></i>
                <input
                  class="feld"
                  type="text"
                  placeholder="(unverändert)"
                  value={ersatzVon(werteSpalteWirksam, rohwert)}
                  oninput={(e) => beiErsatzEingabe(werteSpalteWirksam, rohwert, e)}
                />
              </div>
            {/each}
          </div>
          <p class="werte-hinweis">
            Leeres Feld = unverändert. Es werden bis zu 50 verschiedene Werte gezeigt.
          </p>
        {/if}
      {/if}
      {#snippet fuss()}
        <button class="knopf primaer" onclick={() => (werteModalOffen = false)}>Fertig</button>
      {/snippet}
    </Modal>

    <!-- Modal: Exportieren (Zieltrenner mit Kollisionskontrolle) -->
    <Modal titel="Exportieren" bind:offen={exportModalOffen}>
      <div class="export-zeile">
        <span class="beschriftung">Trenner:</span>
        <select class="feld" bind:value={exportTrenner}>
          {#each TRENNER_KANDIDATEN as kandidat (kandidat.zeichen)}
            <option value={kandidat.zeichen}>{kandidat.name}</option>
          {/each}
        </select>
      </div>
      {#if exportKollisionen > 0}
        <p class="export-warnung">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Der Trenner kommt in den Daten vor - Felder werden in Anführungszeichen gesetzt.
        </p>
      {/if}
      <p class="export-hinweis">
        Exportiert werden die aktuell sichtbaren, sortierten und gefilterten Zeilen mit
        Anzeigenamen und übersetzten Werten.
      </p>
      {#snippet fuss()}
        <button class="knopf" onclick={() => (exportModalOffen = false)}>Abbrechen</button>
        <button class="knopf primaer" onclick={fuehreExportDurch}>
          <i class="fa-solid fa-download"></i> Herunterladen
        </button>
      {/snippet}
    </Modal>
  {:else if tab.analyseStand === 'fehler'}
    <AnalyseFehler {tab} titel="Keine Tabelle verfügbar" />
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

  /* ----- Modal "Spalten verwalten" ---------------------------------------- */

  .spalten-liste {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
  }

  .spalten-zeile {
    display: flex;
    align-items: center;
    gap: var(--a2);
  }

  .spalten-roh {
    width: 130px;
    flex: none;
    color: var(--text-2);
    font-size: 0.82rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spalten-zeile .feld {
    flex: 1;
    min-width: 0;
  }

  /* ----- Modal "Werte übersetzen" ----------------------------------------- */

  .werte-kopf {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin-bottom: var(--a3);
  }

  .werte-kopf .feld {
    flex: 1;
    min-width: 0;
  }

  .werte-liste {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
  }

  .werte-zeile {
    display: flex;
    align-items: center;
    gap: var(--a2);
  }

  .werte-roh {
    width: 200px;
    flex: none;
    font-family: var(--schrift-mono);
    font-size: 0.82rem;
    color: var(--text-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .werte-pfeil {
    flex: none;
    color: var(--text-3);
    font-size: 0.75rem;
  }

  .werte-zeile .feld {
    flex: 1;
    min-width: 0;
  }

  .werte-leer,
  .werte-hinweis,
  .export-hinweis {
    color: var(--text-2);
    font-size: 0.82rem;
    margin-top: var(--a3);
  }

  /* ----- Modal "Exportieren" ---------------------------------------------- */

  .export-zeile {
    display: flex;
    align-items: center;
    gap: var(--a2);
  }

  .export-zeile .feld {
    width: 180px;
  }

  .export-warnung {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin-top: var(--a3);
    padding: var(--a2) var(--a3);
    border-radius: var(--radius-eingabe);
    background: var(--zustand-warnung-weich);
    color: var(--zustand-warnung);
    font-size: 0.82rem;
  }
</style>
