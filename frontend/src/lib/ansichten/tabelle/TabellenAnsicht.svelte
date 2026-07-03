<script lang="ts">
  // Tabellen-Ansicht nach mockups/tabelle.html und der Bearbeiten-Erweiterung
  // (05b/05c): Werkzeugzeile (bei CSV mit Dialekt-Abzeichen), darunter eine echte
  // <table class="tabelle"> mit sortierbaren Köpfen und Typ-Abzeichen. Zusätzlich
  // ist die Tabelle EDITIERBAR: Köpfe und Zellen per Klick, Griffe an Zeilen und
  // Spaltenköpfen, Spalten per Drag-and-Drop, Spalten-Menü, Zeilen-Aktionen,
  // "Zeile hinzufügen". Alle Änderungen sind eine Vorschau (flüchtig im
  // Editier-Zustand); erst "Übernehmen" schreibt sie ins Dokument zurück.
  //
  // Die Nur-Lese-Fähigkeiten bleiben vollständig erhalten: Sortieren, Filtern,
  // Spalten verwalten (Sichtbarkeit/Reihenfolge/Umbenennen), Werte übersetzen,
  // CSV-Trenner wechseln und Export. Gerendert wird stets aus dem Editier-Zustand
  // (der beim ersten Zugriff eine Kopie der Analyse ist), damit Lesen und
  // Bearbeiten auf denselben Daten arbeiten.
  //
  // Virtualisierung: nur der sichtbare Zeilenausschnitt wird gerendert, zwei
  // Abstandshalter-Zeilen halten die Scrollhöhe. Die Inline-Bearbeitung wirkt nur
  // auf sichtbare Zeilen - das genügt und lässt die Virtualisierung unberührt.
  import { dokumentParsen } from '../../api/dokumente'
  import type { FormatId, JsonWert, ParseAntwort } from '../../api/typen'
  import { kindPointer } from '../../dienste/pfade'
  import { formatAusDateiname } from '../../dienste/formatErkennung'
  import { sofortAnalysieren } from '../../dienste/analyseDienst'
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
  import { zeilenAlsText, SerialisierungsFehler } from '../../dienste/tabellenSerialisierung'
  import { wurzelAusZeilen } from '../../dienste/tabellenZeilen'
  import { findeDoppelteSpalten, findeDoppelteZeilen } from '../../dienste/tabellenDuplikate'
  import { ladeHerunter } from '../../dienste/dateiEinAusgabe'
  import { typVon } from '../../dienste/wertZugriff'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import Modal from '../../hilfsteile/Modal.svelte'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { zeige } from '../../zustand/toaster.svelte'
  import { ladeNeu } from '../../zustand/dokumentListe.svelte'
  import { aktiverTab, oeffneTab, setzeAnsicht, setzeInhalt } from '../../zustand/tabs.svelte'
  import {
    loescheBreite,
    schalteSichtbar,
    setzeAlleBreitenZurueck,
    setzeAnzeigename,
    setzeBreite,
    setzeSpaltenlinien,
    setzeWertErsatz,
    tabellenZustandFuer,
    verschiebeSpalte,
  } from './tabellenAnsichtZustand.svelte'
  import {
    anzahlAenderungen,
    bearbeitungFuer,
    istZelleGeaendert,
    istZeileNeu,
    kopfName,
    rueckgaengig,
    setzeKopf,
    setzeZelle,
    spalteDuplizieren,
    spalteHinzufuegen,
    spalteLoeschen,
    spaltenReihenfolgeSetzen,
    verwerfen,
    wiederherstellen,
    zeileDuplizieren,
    zeileHinzufuegen,
    zeileLoeschen,
    zeileVerschieben,
  } from './tabellenBearbeitung.svelte'
  import DuplikatDialog from './DuplikatDialog.svelte'

  /** Feste Zeilenhöhe in Pixeln (Padding 5px + Text ~19px, wie .tabelle td). */
  const ZEILEN_HOEHE = 29
  /** Zusätzlich gerenderte Zeilen ober- und unterhalb des Sichtfensters. */
  const UEBERHANG = 12

  /** Grenzen für Spaltenbreiten (px) und Breite der Aktionsspalte (= CSS). */
  const BREITE_MIN = 70
  const BREITE_MAX = 380
  const AKTIONS_BREITE = 74

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

  // Anzeige-Zustand je Tab (Sichtbarkeit/Umbenennung/Wert-Karten). Die
  // Reihenfolge wird beim Bearbeiten vom Editier-Zustand geführt; das Modal
  // "Spalten verwalten" nutzt weiter diese Reihenfolge zur Anzeige.
  const ansichtZustand = $derived(
    tab !== null ? tabellenZustandFuer(tab.id, spalten) : null,
  )

  // Editier-Zustand je Tab: die editierbaren Zeilen und Spalten (Kopie der
  // Analyse). Gerendert wird stets hieraus.
  const bearbeitung = $derived(
    tab !== null && wurzel !== null ? bearbeitungFuer(tab.id, wurzel, spalten) : null,
  )

  const aenderungen = $derived(bearbeitung !== null ? anzahlAenderungen(bearbeitung) : 0)
  const hatAenderungen = $derived(aenderungen > 0)
  const kannZurueck = $derived((bearbeitung?.zurueckTiefe ?? 0) > 0)
  const kannVor = $derived((bearbeitung?.vorTiefe ?? 0) > 0)
  // Die Bearbeiten-Leiste bleibt sichtbar, solange etwas rückgängig gemacht oder
  // wiederhergestellt werden kann - sonst wäre "Wiederherstellen" nach dem
  // Zurücknehmen aller Änderungen nicht mehr erreichbar.
  const zeigeBearbLeiste = $derived(hatAenderungen || kannZurueck || kannVor)

  /** Ad-hoc-Wurzel aus den editierten Zeilen - für die vorhandenen Lese-Helfer. */
  const editWurzel = $derived.by((): JsonWert => {
    if (bearbeitung === null) return []
    return wurzelAusZeilen(bearbeitung.zeilen, bearbeitung.spaltenReihenfolge)
  })

  /** Zeilen-Indizes (0..n-1) in editWurzel = Indizes in bearbeitung.zeilen. */
  const basisZeilen = $derived(alleZeilen(editWurzel))

  /** Die tatsächlich gerenderten Spalten: Editier-Reihenfolge ohne versteckte. */
  const angezeigteSpalten = $derived.by((): string[] => {
    if (bearbeitung === null) return []
    const versteckt = ansichtZustand?.versteckt ?? new Set<string>()
    return bearbeitung.spaltenReihenfolge.filter((spalte) => !versteckt.has(spalte))
  })

  let filterText = $state('')
  let sortSpalte = $state<string | null>(null)
  let sortRichtung = $state<Sortierrichtung>('auf')
  let breiteDrag = $state<{ spalte: string; startX: number; startBreite: number } | null>(null)
  let einstellungenOffen = $state(false)

  /** Sichtbare Zeilen-Indizes: erst filtern, dann (falls gewählt) sortieren. */
  const sichtbareZeilen = $derived.by((): number[] => {
    if (bearbeitung === null) return []
    const karten = ansichtZustand?.wertKarten ?? {}
    const gefiltert = filtereAngezeigt(basisZeilen, editWurzel, angezeigteSpalten, filterText, karten)
    if (sortSpalte === null) return gefiltert
    return sortiereAngezeigt(gefiltert, editWurzel, sortSpalte, sortRichtung, karten)
  })

  /** Typ je Spalte (dominanter Werttyp) für das Kopf-Abzeichen. */
  const spaltenTyp = $derived.by((): Record<string, string> => {
    const karte: Record<string, string> = {}
    if (bearbeitung === null) return karte
    for (const spalte of bearbeitung.spaltenReihenfolge) {
      karte[spalte] = typVonSpalte(basisZeilen, editWurzel, spalte)
    }
    return karte
  })

  /** Inhaltsbasierte Standard-Breite je Spalte (px), aus Kopf + Wertestichprobe. */
  const standardBreiten = $derived.by((): Record<string, number> => {
    const karte: Record<string, number> = {}
    if (bearbeitung === null) return karte
    const karten = ansichtZustand?.wertKarten ?? {}
    const stichprobe = basisZeilen.slice(0, 60)
    for (const spalte of angezeigteSpalten) {
      // Kopfname plus etwas Luft für Sortier-Pfeil und Spalten-Menü.
      let maxZeichen = kopfName(bearbeitung, spalte).length + 4
      for (const zeile of stichprobe) {
        const laenge = zellAnzeige(editWurzel, zeile, spalte, karten).length
        if (laenge > maxZeichen) maxZeichen = laenge
      }
      karte[spalte] = Math.min(BREITE_MAX, Math.max(BREITE_MIN, Math.round(maxZeichen * 7.5 + 30)))
    }
    return karte
  })

  /** Wirksame Breite einer Spalte: feste Nutzerbreite oder inhaltsbasierter Standard. */
  function effektiveBreite(spalte: string): number {
    const fest = ansichtZustand?.breiten[spalte]
    return fest ?? standardBreiten[spalte] ?? 140
  }

  /** Gesamtbreite der Tabelle (Aktionsspalte + alle sichtbaren Spalten). */
  const gesamtBreite = $derived.by((): number => {
    let summe = AKTIONS_BREITE
    for (const spalte of angezeigteSpalten) summe += effektiveBreite(spalte)
    return summe
  })

  /** Trefferzahl für "Duplikate prüfen" (Zeilen-Gruppen + doppelte Spalten). */
  const duplikatTreffer = $derived.by((): number => {
    if (bearbeitung === null) return 0
    const zeilen = findeDoppelteZeilen(bearbeitung.zeilen, bearbeitung.spaltenReihenfolge).length
    const spaltenD = findeDoppelteSpalten(bearbeitung.zeilen, bearbeitung.spaltenReihenfolge).length
    return zeilen + spaltenD
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

  /** Klick auf einen Spaltenkopf-Text: auf -> ab -> Sortierung aus (dreistufig). */
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

  /** Start des Breite-Ziehens am Kopf-Greifer (Pointer-Capture hält den Zug). */
  function beiBreiteStart(ereignis: PointerEvent, spalte: string): void {
    ereignis.preventDefault()
    ereignis.stopPropagation()
    ;(ereignis.currentTarget as HTMLElement).setPointerCapture(ereignis.pointerId)
    breiteDrag = { spalte, startX: ereignis.clientX, startBreite: effektiveBreite(spalte) }
  }

  function beiBreiteZug(ereignis: PointerEvent): void {
    if (breiteDrag === null || ansichtZustand === null) return
    const neu = Math.max(BREITE_MIN, breiteDrag.startBreite + (ereignis.clientX - breiteDrag.startX))
    setzeBreite(ansichtZustand, breiteDrag.spalte, neu)
  }

  function beiBreiteEnde(ereignis: PointerEvent): void {
    if (breiteDrag === null) return
    ;(ereignis.currentTarget as HTMLElement).releasePointerCapture(ereignis.pointerId)
    breiteDrag = null
  }

  /** Doppelklick auf den Greifer: feste Breite entfernen (zurück auf Inhalt). */
  function breiteAuto(spalte: string): void {
    if (ansichtZustand !== null) loescheBreite(ansichtZustand, spalte)
  }

  /** Klick auf eine Zelle (ohne Bearbeiten): Selektion auf die Zelle setzen. */
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

  // ----- Inline-Bearbeitung: aktive Zelle / aktiver Kopf --------------------

  /** Aktuell im Bearbeiten-Modus: entweder eine Zelle oder ein Kopf. */
  let aktiveZelle = $state<{ zeile: number; spalte: string } | null>(null)
  let aktiverKopf = $state<string | null>(null)
  let feldWert = $state('')

  /** Aktive Zeile (für die Zeilen-Aktionen ganz links). */
  let aktiveZeile = $state<number | null>(null)

  /** Textform eines Zellwerts als Eingabewert für das Feld. */
  function zellEingabe(zeile: number, spalte: string): string {
    if (bearbeitung === null) return ''
    const wert = bearbeitung.zeilen[zeile]?.[spalte]
    if (wert === undefined || wert === null) return wert === null ? 'null' : ''
    if (typeof wert === 'string') return wert
    if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert)
    return JSON.stringify(wert)
  }

  function beginneZelle(zeile: number, spalte: string): void {
    aktiverKopf = null
    aktiveZelle = { zeile, spalte }
    feldWert = zellEingabe(zeile, spalte)
    waehleZelle(zeile, spalte)
  }

  function beendeZelle(uebernehmen: boolean): void {
    if (aktiveZelle !== null && bearbeitung !== null && uebernehmen) {
      setzeZelle(bearbeitung, aktiveZelle.zeile, aktiveZelle.spalte, feldWert)
    }
    aktiveZelle = null
  }

  function beginneKopf(spalte: string): void {
    aktiveZelle = null
    offenesMenue = null
    aktiverKopf = spalte
    feldWert = kopfName(bearbeitung!, spalte)
  }

  function beendeKopf(uebernehmen: boolean): void {
    if (aktiverKopf !== null && bearbeitung !== null && uebernehmen) {
      setzeKopf(bearbeitung, aktiverKopf, feldWert)
    }
    aktiverKopf = null
  }

  function beiFeldTaste(ereignis: KeyboardEvent, art: 'zelle' | 'kopf'): void {
    if (ereignis.key === 'Enter') {
      ereignis.preventDefault()
      if (art === 'zelle') beendeZelle(true)
      else beendeKopf(true)
    } else if (ereignis.key === 'Escape') {
      ereignis.preventDefault()
      if (art === 'zelle') beendeZelle(false)
      else beendeKopf(false)
    }
  }

  // ----- Spalten-Menü am Kopf ----------------------------------------------

  let offenesMenue = $state<string | null>(null)

  function schalteMenue(spalte: string): void {
    offenesMenue = offenesMenue === spalte ? null : spalte
  }

  function menueUmbenennen(spalte: string): void {
    offenesMenue = null
    beginneKopf(spalte)
  }

  function menueDuplizieren(spalte: string): void {
    offenesMenue = null
    if (bearbeitung !== null) spalteDuplizieren(bearbeitung, spalte)
  }

  function menueAusblenden(spalte: string): void {
    offenesMenue = null
    if (ansichtZustand !== null) schalteSichtbar(ansichtZustand, spalte)
  }

  function menueLoeschen(spalte: string): void {
    offenesMenue = null
    if (bearbeitung !== null) spalteLoeschen(bearbeitung, spalte)
  }

  // ----- Spalten per Drag-and-Drop umsortieren -----------------------------
  // Window-Pointer-Muster wie LeistenGriff (kein setPointerCapture): der
  // gezogene Spaltenname und die aktuelle Zielposition werden im Zustand
  // gehalten; über den Köpfen ermittelt beiZiehBewegung das Ziel neu.

  let ziehSpalte = $state<string | null>(null)
  let zielSpalte = $state<string | null>(null)
  let kopfLeiste = $state<HTMLTableRowElement>()

  function beiGriffStart(ereignis: PointerEvent, spalte: string): void {
    ereignis.preventDefault()
    ereignis.stopPropagation()
    ziehSpalte = spalte
    zielSpalte = spalte

    function beiBewegung(ev: PointerEvent): void {
      if (kopfLeiste === undefined) return
      // Über welchem Kopf steht der Zeiger? Der Kopf trägt data-spalte.
      const treffer = document
        .elementsFromPoint(ev.clientX, ev.clientY)
        .find((el) => el instanceof HTMLElement && el.dataset.spalte !== undefined) as
        | HTMLElement
        | undefined
      if (treffer !== undefined && treffer.dataset.spalte !== undefined) {
        zielSpalte = treffer.dataset.spalte
      }
    }

    function beiEnde(): void {
      window.removeEventListener('pointermove', beiBewegung)
      window.removeEventListener('pointerup', beiEnde)
      window.removeEventListener('pointercancel', beiEnde)
      if (bearbeitung !== null && ziehSpalte !== null && zielSpalte !== null && ziehSpalte !== zielSpalte) {
        verschiebeVor(ziehSpalte, zielSpalte)
      }
      ziehSpalte = null
      zielSpalte = null
    }

    window.addEventListener('pointermove', beiBewegung)
    window.addEventListener('pointerup', beiEnde)
    window.addEventListener('pointercancel', beiEnde)
  }

  /** Setzt "quelle" direkt vor "ziel" in der Editier-Reihenfolge. */
  function verschiebeVor(quelle: string, ziel: string): void {
    if (bearbeitung === null) return
    const ohne = bearbeitung.spaltenReihenfolge.filter((s) => s !== quelle)
    const zielPos = ohne.indexOf(ziel)
    if (zielPos === -1) return
    const neu = [...ohne.slice(0, zielPos), quelle, ...ohne.slice(zielPos)]
    spaltenReihenfolgeSetzen(bearbeitung, neu)
  }

  // ----- Zeilen per Drag-and-Drop umsortieren -------------------------------
  // Nur ohne Sortierung/Filter sinnvoll (sonst wäre die Zielposition
  // mehrdeutig); dann ist der Zeilenindex zugleich der Datenindex. Gleiches
  // Window-Pointer-Muster wie bei den Spalten. Der Griff ist sonst ausgegraut.

  const zeilenDragMoeglich = $derived(sortSpalte === null && filterText.trim() === '')
  let ziehZeile = $state<number | null>(null)
  let zielZeile = $state<number | null>(null)

  function beiZeilenGriffStart(ereignis: PointerEvent, zeile: number): void {
    if (!zeilenDragMoeglich) return
    ereignis.preventDefault()
    ereignis.stopPropagation()
    ziehZeile = zeile
    zielZeile = zeile

    function beiBewegung(ev: PointerEvent): void {
      const treffer = document
        .elementsFromPoint(ev.clientX, ev.clientY)
        .find((el) => el instanceof HTMLElement && el.dataset.zeile !== undefined) as
        | HTMLElement
        | undefined
      if (treffer !== undefined && treffer.dataset.zeile !== undefined) {
        zielZeile = Number(treffer.dataset.zeile)
      }
    }

    function beiEnde(): void {
      window.removeEventListener('pointermove', beiBewegung)
      window.removeEventListener('pointerup', beiEnde)
      window.removeEventListener('pointercancel', beiEnde)
      if (
        bearbeitung !== null &&
        ziehZeile !== null &&
        zielZeile !== null &&
        ziehZeile !== zielZeile
      ) {
        zeileVerschieben(bearbeitung, ziehZeile, zielZeile)
      }
      ziehZeile = null
      zielZeile = null
    }

    window.addEventListener('pointermove', beiBewegung)
    window.addEventListener('pointerup', beiEnde)
    window.addEventListener('pointercancel', beiEnde)
  }

  // ----- Zeilen-Aktionen ----------------------------------------------------

  function tuZeileDuplizieren(index: number): void {
    if (bearbeitung !== null) zeileDuplizieren(bearbeitung, index)
  }

  function tuZeileLoeschen(index: number): void {
    if (bearbeitung !== null) {
      zeileLoeschen(bearbeitung, index)
      aktiveZeile = null
    }
  }

  function tuZeileHinzufuegen(): void {
    if (bearbeitung !== null) zeileHinzufuegen(bearbeitung)
  }

  function tuSpalteHinzufuegen(): void {
    if (bearbeitung !== null) {
      const name = spalteHinzufuegen(bearbeitung)
      // Direkt in den Umbenennen-Modus des neuen Kopfes gehen.
      beginneKopf(name)
    }
  }

  // ----- Bearbeiten-Leiste: Verwerfen / Als neues Dokument / Übernehmen -----

  const zielFormat = $derived<FormatId>(
    (tab?.format ?? (tab !== null ? formatAusDateiname(tab.titel) : null) ?? 'json') as FormatId,
  )

  let uebernahmeLaeuft = $state(false)

  /** Baut den Zieltext aus dem Editier-Zustand im aktuellen Format. */
  async function baueText(): Promise<string> {
    if (bearbeitung === null) throw new SerialisierungsFehler('Kein Editier-Zustand.')
    // Beim Übernehmen werden die Spalten-Umbenennungen als echte Schlüssel
    // geschrieben: Rohname -> Anzeigename. Zellen tragen dann den neuen Schlüssel.
    const umbenannteZeilen = bearbeitung.zeilen.map((zeile) => {
      const neu: Record<string, JsonWert> = {}
      for (const spalte of bearbeitung.spaltenReihenfolge) {
        const name = kopfName(bearbeitung, spalte)
        const wert = zeile[spalte]
        if (wert !== undefined) neu[name] = wert
      }
      return neu
    })
    const reihenfolge = bearbeitung.spaltenReihenfolge.map((s) => kopfName(bearbeitung, s))
    return zeilenAlsText(umbenannteZeilen, reihenfolge, zielFormat)
  }

  function tuVerwerfen(): void {
    if (tab === null || wurzel === null) return
    verwerfen(tab.id, wurzel, spalten)
    aktiveZelle = null
    aktiverKopf = null
    offenesMenue = null
    zeige('Änderungen verworfen.', 'info')
  }

  /** Schließt offene Inline-Felder/Menüs, damit Rückgängig nicht mit ihnen kollidiert. */
  function schliesseInline(): void {
    aktiveZelle = null
    aktiverKopf = null
    offenesMenue = null
  }

  function tuRueckgaengig(): void {
    if (bearbeitung === null || !kannZurueck) return
    schliesseInline()
    rueckgaengig(bearbeitung)
  }

  function tuWiederherstellen(): void {
    if (bearbeitung === null || !kannVor) return
    schliesseInline()
    wiederherstellen(bearbeitung)
  }

  // Tastenkürzel Rückgängig/Wiederherstellen (Strg/Cmd+Z, Strg/Cmd+Umschalt+Z bzw.
  // Strg+Y). Nicht, während ein Zell-/Kopf-Feld getippt wird - dort gilt das native
  // Rückgängig des Eingabefeldes.
  $effect(() => {
    function beiTaste(ereignis: KeyboardEvent): void {
      if (bearbeitung === null) return
      if (!(ereignis.ctrlKey || ereignis.metaKey) || ereignis.altKey) return
      if (aktiveZelle !== null || aktiverKopf !== null) return
      const ziel = ereignis.target
      if (
        ziel instanceof HTMLElement &&
        (ziel.tagName === 'INPUT' || ziel.tagName === 'TEXTAREA' || ziel.isContentEditable)
      ) {
        return
      }
      const taste = ereignis.key.toLowerCase()
      if (taste === 'z' && !ereignis.shiftKey) {
        ereignis.preventDefault()
        tuRueckgaengig()
      } else if ((taste === 'z' && ereignis.shiftKey) || taste === 'y') {
        ereignis.preventDefault()
        tuWiederherstellen()
      }
    }
    window.addEventListener('keydown', beiTaste)
    return () => window.removeEventListener('keydown', beiTaste)
  })

  async function tuUebernehmen(): Promise<void> {
    if (tab === null || bearbeitung === null || uebernahmeLaeuft) return
    uebernahmeLaeuft = true
    const zielId = tab.id
    try {
      const text = await baueText()
      setzeInhalt(zielId, text)
      await sofortAnalysieren(zielId)
      // Editier-Zustand aus der FRISCHEN Analyse in-place zurücksetzen, damit die
      // Vorschau sofort verschwindet (delete allein löst keine Reaktivität aus,
      // weil wurzel sich bereits gesetzt hat).
      const frisch = aktiverTab()
      const frischeWurzel = frisch?.analyse?.wurzel ?? null
      if (frisch !== null && frisch.id === zielId && frischeWurzel !== null) {
        verwerfen(zielId, frischeWurzel, spaltenAus(frischeWurzel))
      } else {
        verwerfen(zielId)
      }
      aktiveZelle = null
      aktiverKopf = null
      zeige('Änderungen übernommen.', 'erfolg')
    } catch (grund: unknown) {
      const meldung = grund instanceof Error ? grund.message : String(grund)
      zeige(`Übernehmen fehlgeschlagen: ${meldung}`, 'fehler')
    } finally {
      uebernahmeLaeuft = false
    }
  }

  async function tuAlsNeuesDokument(): Promise<void> {
    if (tab === null || bearbeitung === null || uebernahmeLaeuft) return
    uebernahmeLaeuft = true
    try {
      const text = await baueText()
      const basis = (tab.titel ?? 'tabelle').replace(/\.[^.]+$/, '')
      const endung = endungFuer(zielFormat)
      oeffneTab({ titel: `${basis}-bearbeitet${endung}`, inhalt: text, format: zielFormat })
      void ladeNeu()
      zeige('Als neues Dokument geöffnet.', 'erfolg')
    } catch (grund: unknown) {
      const meldung = grund instanceof Error ? grund.message : String(grund)
      zeige(`Neues Dokument fehlgeschlagen: ${meldung}`, 'fehler')
    } finally {
      uebernahmeLaeuft = false
    }
  }

  /** "Dokument duplizieren": den AKTUELLEN Inhalt als Kopie in einem neuen Tab. */
  function tuDokumentDuplizieren(): void {
    if (tab === null) return
    const basis = (tab.titel ?? 'tabelle').replace(/\.[^.]+$/, '')
    const endung = endungFuer(zielFormat)
    oeffneTab({
      titel: `${basis}-kopie${endung}`,
      inhalt: tab.inhalt,
      format: tab.format,
      istBinaer: tab.istBinaer,
    })
    void ladeNeu()
    zeige('Dokument dupliziert.', 'erfolg')
  }

  /** Passende Dateiendung zu einem Format. */
  function endungFuer(format: FormatId): string {
    const karte: Record<string, string> = {
      json: '.json',
      ndjson: '.ndjson',
      yaml: '.yaml',
      toml: '.toml',
      xml: '.xml',
      csv: '.csv',
      md_tabelle: '.md',
      html_tabelle: '.html',
    }
    return karte[format] ?? '.txt'
  }

  // ----- Duplikate-Dialog ---------------------------------------------------

  let duplikatOffen = $state(false)

  // ----- Trenner wechseln (CSV neu parsen) ----------------------------------

  const erkannterTrenner = $derived(dialekt?.trennzeichen ?? null)
  let gewaehlterTrenner = $state<string | null>(null)
  const wirksamerTrenner = $derived(gewaehlterTrenner ?? erkannterTrenner ?? ';')
  let trennerLaeuft = $state(false)

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
      const aktuell = aktiverTab()
      if (aktuell !== null && aktuell.id === zielTab.id) {
        aktuell.analyse = antwort
        aktuell.format = antwort.format_id
        aktuell.analyseStand = 'frisch'
        aktuell.analyseFehler = null
        verwerfen(zielTab.id)
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
  const werteSpalteWirksam = $derived(werteSpalte ?? bearbeitung?.spaltenReihenfolge[0] ?? null)

  const rohwerteDerSpalte = $derived.by((): string[] => {
    if (werteSpalteWirksam === null) return []
    return verschiedeneRohwerte(basisZeilen, editWurzel, werteSpalteWirksam, 50)
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

  const exportKollisionen = $derived.by((): number => {
    if (ansichtZustand === null) return 0
    return trennerKollisionen(
      sichtbareZeilen,
      editWurzel,
      angezeigteSpalten,
      ansichtZustand.umbenennung,
      ansichtZustand.wertKarten,
      exportTrenner,
    )
  })

  function oeffneExport(): void {
    const passend = TRENNER_KANDIDATEN.some((k) => k.zeichen === wirksamerTrenner)
    exportTrenner = passend ? wirksamerTrenner : ';'
    exportModalOffen = true
  }

  function fuehreExportDurch(): void {
    if (ansichtZustand === null) return
    const text = alsCsvAngezeigt(
      sichtbareZeilen,
      editWurzel,
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
  {#if tabellarisch && bearbeitung !== null}
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
        style="width: 160px"
        bind:value={filterText}
      />
      <button class="knopf klein" onclick={tuSpalteHinzufuegen}>
        <i class="fa-solid fa-plus"></i> Spalte
      </button>
      <button class="knopf klein" onclick={() => (duplikatOffen = true)}>
        <i class="fa-solid fa-clone"></i> Duplikate prüfen
        {#if duplikatTreffer > 0}
          <span class="abzeichen warnung">{duplikatTreffer}</span>
        {/if}
      </button>
      <button class="knopf klein" onclick={tuDokumentDuplizieren}>
        <i class="fa-solid fa-copy"></i> Dokument duplizieren
      </button>
      <button class="knopf klein" onclick={() => (spaltenModalOffen = true)}>
        <i class="fa-solid fa-table-columns"></i> Spalten verwalten
      </button>
      <button class="knopf klein" onclick={() => (werteModalOffen = true)}>
        <i class="fa-solid fa-language"></i> Werte übersetzen
      </button>
      <button class="knopf klein" onclick={oeffneExport}>
        <i class="fa-solid fa-file-export"></i> Exportieren
      </button>
      <span class="tab-einstell-wirt">
        <button
          class="knopf klein"
          title="Tabellen-Einstellungen"
          aria-label="Tabellen-Einstellungen"
          onclick={() => (einstellungenOffen = !einstellungenOffen)}
        >
          <i class="fa-solid fa-sliders"></i> Ansicht
        </button>
        {#if einstellungenOffen}
          <div class="tab-einstell-menue">
            <label class="tab-einstell-zeile">
              <span>Spaltenlinien</span>
              <select
                class="feld"
                value={String(ansichtZustand?.spaltenlinien ?? 0)}
                onchange={(ereignis) => {
                  if (ansichtZustand !== null) {
                    setzeSpaltenlinien(ansichtZustand, Number(ereignis.currentTarget.value))
                  }
                }}
              >
                <option value="0">Aus</option>
                <option value="1">Dünn</option>
                <option value="2">Mittel</option>
                <option value="3">Kräftig</option>
              </select>
            </label>
            <button
              class="knopf klein"
              onclick={() => {
                if (ansichtZustand !== null) setzeAlleBreitenZurueck(ansichtZustand)
                einstellungenOffen = false
              }}
            >
              <i class="fa-solid fa-arrows-left-right-to-line"></i> Spaltenbreiten zurücksetzen
            </button>
          </div>
        {/if}
      </span>
    </div>

    {#if zeigeBearbLeiste}
      <div class="bearb-leiste">
        {#if hatAenderungen}
          <span class="abzeichen info">
            <i class="fa-solid fa-pen"></i>
            {aenderungen} {aenderungen === 1 ? 'Änderung' : 'Änderungen'} (Vorschau)
          </span>
        {:else}
          <span class="abzeichen">
            <i class="fa-solid fa-clock-rotate-left"></i> Keine offenen Änderungen
          </span>
        {/if}
        <span class="bearb-verlauf">
          <button
            class="icon-knopf"
            title="Rückgängig (Strg+Z)"
            aria-label="Rückgängig"
            onclick={tuRueckgaengig}
            disabled={!kannZurueck || uebernahmeLaeuft}
          >
            <i class="fa-solid fa-arrow-rotate-left"></i>
          </button>
          <button
            class="icon-knopf"
            title="Wiederherstellen (Strg+Umschalt+Z)"
            aria-label="Wiederherstellen"
            onclick={tuWiederherstellen}
            disabled={!kannVor || uebernahmeLaeuft}
          >
            <i class="fa-solid fa-arrow-rotate-right"></i>
          </button>
        </span>
        <span class="hinweis-text">
          Kopf oder Zelle anklicken zum Bearbeiten - erst mit "Übernehmen" wird geschrieben.
        </span>
        <button class="knopf klein" onclick={tuVerwerfen} disabled={!hatAenderungen || uebernahmeLaeuft}>
          <i class="fa-solid fa-eraser"></i> Verwerfen
        </button>
        <button
          class="knopf"
          onclick={() => void tuAlsNeuesDokument()}
          disabled={!hatAenderungen || uebernahmeLaeuft}
        >
          <i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument
        </button>
        <button
          class="knopf primaer"
          onclick={() => void tuUebernehmen()}
          disabled={!hatAenderungen || uebernahmeLaeuft}
        >
          <i class="fa-solid fa-check"></i> Übernehmen
        </button>
      </div>
    {/if}

    <div class="tabelle-flaeche" bind:this={flaeche} bind:clientHeight={sichtHoehe} onscroll={anScroll}>
      <table
        class="tabelle tabelle-bearb"
        style="width: {gesamtBreite}px; --spalten-linie: {ansichtZustand?.spaltenlinien ?? 0}px"
      >
        <thead>
          <tr bind:this={kopfLeiste}>
            <th class="bearb-aktionsspalte"></th>
            {#each angezeigteSpalten as spalte (spalte)}
              {@const typ = spaltenTyp[spalte] ?? 'text'}
              {@const kopf = kopfName(bearbeitung, spalte)}
              <th
                data-spalte={spalte}
                class:zahl={typ === 'zahl'}
                class:bearb-wird-gezogen={ziehSpalte === spalte}
                class:bearb-drop-spalte={ziehSpalte !== null && zielSpalte === spalte && ziehSpalte !== spalte}
                class:bearb-kopf-menue-wirt={offenesMenue === spalte}
                class:bearb-zelle-aktiv={aktiverKopf === spalte}
                style="width: {effektiveBreite(spalte)}px"
              >
                <span
                  class="bearb-sp-griff"
                  title="Spalte ziehen"
                  role="button"
                  tabindex="-1"
                  aria-label="Spalte {kopf} ziehen"
                  onpointerdown={(e) => beiGriffStart(e, spalte)}
                >
                  <i class="fa-solid fa-grip-vertical"></i>
                </span>
                {#if aktiverKopf === spalte}
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    class="feld zellen-feld"
                    type="text"
                    autofocus
                    bind:value={feldWert}
                    onkeydown={(e) => beiFeldTaste(e, 'kopf')}
                    onblur={() => beendeKopf(true)}
                  />
                {:else}
                  <button
                    class="bearb-kopf-text"
                    onclick={() => sortiereNach(spalte)}
                    ondblclick={() => beginneKopf(spalte)}
                    title="Klick: sortieren - Doppelklick: umbenennen"
                  >
                    {kopf}
                  </button>
                  <i
                    class="fa-solid sortier-pfeil {sortSpalte === spalte && sortRichtung === 'ab'
                      ? 'fa-arrow-down-wide-short'
                      : 'fa-arrow-up-short-wide'}"
                    class:hinweis={sortSpalte !== spalte}
                    title={sortSpalte === spalte
                      ? sortRichtung === 'auf'
                        ? 'Aufsteigend sortiert - Klick für absteigend'
                        : 'Absteigend sortiert - Klick hebt die Sortierung auf'
                      : 'Nach dieser Spalte sortieren'}
                    aria-hidden="true"
                  ></i>
                  <button
                    class="bearb-kopf-menue-knopf"
                    title="Spalte"
                    aria-label="Spalten-Menü {kopf}"
                    onclick={() => schalteMenue(spalte)}
                  >
                    <i class="fa-solid fa-ellipsis-vertical"></i>
                  </button>
                  {#if offenesMenue === spalte}
                    <div class="bearb-menue">
                      <button onclick={() => menueUmbenennen(spalte)}>
                        <i class="fa-solid fa-pen"></i> Umbenennen
                      </button>
                      <button onclick={() => menueDuplizieren(spalte)}>
                        <i class="fa-solid fa-copy"></i> Spalte duplizieren
                      </button>
                      <button onclick={() => menueAusblenden(spalte)}>
                        <i class="fa-solid fa-eye-slash"></i> Ausblenden
                      </button>
                      <button class="gefahr" onclick={() => menueLoeschen(spalte)}>
                        <i class="fa-solid fa-trash"></i> Spalte löschen
                      </button>
                    </div>
                  {/if}
                {/if}
                <span
                  class="spalten-greifer"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Breite von {kopf} anpassen"
                  title="Ziehen: Spaltenbreite - Doppelklick: automatisch anpassen"
                  onpointerdown={(ereignis) => beiBreiteStart(ereignis, spalte)}
                  onpointermove={beiBreiteZug}
                  onpointerup={beiBreiteEnde}
                  ondblclick={() => breiteAuto(spalte)}
                ></span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#if platzOben > 0}
            <tr class="abstand" style="height: {platzOben}px" aria-hidden="true">
              <td colspan={angezeigteSpalten.length + 1}></td>
            </tr>
          {/if}
          {#each fensterZeilen as zeile (zeile)}
            <tr
              data-zeile={zeile}
              class:selektiert={auswahlZeile === zeile}
              class:bearb-neu={istZeileNeu(bearbeitung, zeile)}
              class:bearb-zeile-gezogen={ziehZeile === zeile}
              class:bearb-zeile-ziel={ziehZeile !== null && zielZeile === zeile && ziehZeile !== zeile}
              style="height: {ZEILEN_HOEHE}px"
              onmouseenter={() => (aktiveZeile = zeile)}
            >
              <td class="bearb-aktionsspalte">
                <span class="bearb-zeilen-werkzeuge">
                  <span
                    class="bearb-griff"
                    class:aus={!zeilenDragMoeglich}
                    title={zeilenDragMoeglich
                      ? 'Zeile ziehen zum Umsortieren'
                      : 'Zum Umsortieren zuerst Sortierung und Filter aufheben'}
                    role="button"
                    tabindex="-1"
                    aria-label="Zeile ziehen"
                    onpointerdown={(e) => beiZeilenGriffStart(e, zeile)}
                  ><i class="fa-solid fa-grip-vertical"></i></span>
                  {#if aktiveZeile === zeile}
                    <button
                      class="bearb-zeilen-akt"
                      title="Zeile duplizieren"
                      aria-label="Zeile duplizieren"
                      onclick={() => tuZeileDuplizieren(zeile)}
                    >
                      <i class="fa-solid fa-copy"></i>
                    </button>
                    <button
                      class="bearb-zeilen-akt gefahr"
                      title="Zeile löschen"
                      aria-label="Zeile löschen"
                      onclick={() => tuZeileLoeschen(zeile)}
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  {/if}
                </span>
              </td>
              {#each angezeigteSpalten as spalte (spalte)}
                {@const roh = zellwert(editWurzel, zeile, spalte)}
                {@const leer = roh === undefined || roh === null}
                {@const zahl = roh !== undefined && typVon(roh) === 'zahl'}
                {@const text = ansichtZustand !== null
                  ? zellAnzeige(editWurzel, zeile, spalte, ansichtZustand.wertKarten)
                  : ''}
                {@const aktiv = aktiveZelle?.zeile === zeile && aktiveZelle?.spalte === spalte}
                {@const geaendert = istZelleGeaendert(bearbeitung, zeile, spalte)}
                <td
                  class:zahl
                  class:null-wert={leer && text === '' && !aktiv}
                  class:bearb-zelle-aktiv={aktiv}
                  class:bearb-geaendert={geaendert && !aktiv}
                  ondblclick={() => beginneZelle(zeile, spalte)}
                  onclick={() => {
                    if (!aktiv) waehleZelle(zeile, spalte)
                  }}
                  title="Doppelklick zum Bearbeiten"
                >
                  {#if aktiv}
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                      class="feld zellen-feld"
                      type="text"
                      autofocus
                      bind:value={feldWert}
                      onkeydown={(e) => beiFeldTaste(e, 'zelle')}
                      onblur={() => beendeZelle(true)}
                    />
                  {:else if leer && text === ''}
                    (leer)
                  {:else}
                    {text}{#if geaendert}<span class="bearb-punkt" title="Geändert"></span>{/if}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
          {#if platzUnten > 0}
            <tr class="abstand" style="height: {platzUnten}px" aria-hidden="true">
              <td colspan={angezeigteSpalten.length + 1}></td>
            </tr>
          {/if}
          <!-- Zeile hinzufügen -->
          <tr class="bearb-neu-zeile" onclick={tuZeileHinzufuegen}>
            <td class="bearb-aktionsspalte"><i class="fa-solid fa-plus"></i></td>
            <td colspan={angezeigteSpalten.length}>Zeile hinzufügen</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="tabelle-fuss">
      {sichtbareZeilen.length}
      {sichtbareZeilen.length === 1 ? 'Zeile' : 'Zeilen'}{filterText.trim() !== ''
        ? ` (von ${basisZeilen.length})`
        : ''}, {angezeigteSpalten.length}
      {angezeigteSpalten.length === 1 ? 'Spalte' : 'Spalten'}{angezeigteSpalten.length <
      bearbeitung.spaltenReihenfolge.length
        ? ` (von ${bearbeitung.spaltenReihenfolge.length})`
        : ''}
      {#if hatAenderungen}
        <span class="fuss-aenderungen"><i class="fa-solid fa-pen"></i> {aenderungen} {aenderungen === 1 ? 'Änderung' : 'Änderungen'}</span>
      {/if}
    </div>

    <!-- Duplikate auflösen (Dialog nach 05c) -->
    <DuplikatDialog {bearbeitung} bind:offen={duplikatOffen} onSchliessen={() => (duplikatOffen = false)} />

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
          {#each bearbeitung.spaltenReihenfolge as spalte (spalte)}
            <option value={spalte}>{kopfName(bearbeitung, spalte)}</option>
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
    display: flex;
    align-items: center;
    gap: var(--a3);
    padding: var(--a2) var(--a3);
    border-top: 1px solid var(--rand-1);
    background: var(--flaeche-panel);
    color: var(--text-2);
    font-size: 0.8rem;
  }

  .fuss-aenderungen {
    color: var(--zustand-info);
  }

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

  /* ----- Bearbeiten-Leiste (nach 05b) ------------------------------------- */

  .bearb-leiste {
    display: flex;
    align-items: center;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    background: var(--zustand-info-weich);
    border-bottom: 1px solid var(--rand-1);
    flex: none;
  }

  .bearb-leiste .hinweis-text {
    margin: 0;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ----- Editierbare Tabelle: Aktionsspalte, Griffe, Zeilen-Aktionen ------- */

  .tabelle-bearb th.bearb-aktionsspalte,
  .tabelle-bearb td.bearb-aktionsspalte {
    width: 74px;
    text-align: left;
    padding-left: var(--a1);
    padding-right: var(--a1);
    color: var(--text-3);
    cursor: default;
  }

  /* Feste Spaltenbreiten: table-layout fixed macht die Kopfbreiten verbindlich,
     die Zellen folgen automatisch (Tabellenbreite wird inline gesetzt). */
  .tabelle-bearb {
    table-layout: fixed;
  }

  /* Vertikale Spaltenlinien - Stärke über --spalten-linie (0px = aus). */
  .tabelle-bearb th,
  .tabelle-bearb td {
    border-right: var(--spalten-linie, 0px) solid var(--rand-1);
  }

  /* Greifer am rechten Kopf-Rand zum Ziehen der Spaltenbreite. */
  .spalten-greifer {
    position: absolute;
    top: 0;
    right: 0;
    width: 7px;
    height: 100%;
    cursor: col-resize;
    touch-action: none;
    z-index: 3;
  }

  .spalten-greifer:hover {
    background: var(--akzent);
    opacity: 0.35;
  }

  /* Tabellen-Einstellungen: Popover am Zahnrad in der Werkzeugzeile. */
  .tab-einstell-wirt {
    position: relative;
    display: inline-flex;
  }

  .tab-einstell-menue {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 6;
    margin-top: 4px;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    padding: var(--a3);
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-2);
    box-shadow: var(--schatten-1);
  }

  .tab-einstell-zeile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--a2);
  }

  .tab-einstell-zeile .feld {
    width: 120px;
  }

  /* Griff und Zeilen-Aktionen liegen nebeneinander (nie eines statt des
     anderen), damit der Ziehgriff immer erreichbar bleibt. */
  .bearb-zeilen-werkzeuge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  .bearb-griff {
    color: var(--rand-2);
    cursor: grab;
    padding: 0 2px;
    touch-action: none;
  }

  /* Umsortieren nicht möglich (Sortierung/Filter aktiv): Griff sichtbar aus. */
  .bearb-griff.aus {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .bearb-zeilen-akt {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-2);
    padding: 2px 3px;
    font-size: 0.74rem;
  }

  .bearb-zeilen-akt.gefahr {
    color: var(--zustand-fehler);
  }

  /* Zeilen-Drag: gezogene Zeile gedimmt, Zielzeile mit Akzentlinie oben. */
  .tabelle-bearb tbody tr.bearb-zeile-gezogen td {
    opacity: 0.45;
  }

  .tabelle-bearb tbody tr.bearb-zeile-ziel td {
    box-shadow: inset 0 2px 0 var(--akzent);
  }

  /* Rückgängig/Wiederherstellen in der Bearbeiten-Leiste. */
  .bearb-verlauf {
    display: inline-flex;
    align-items: center;
    gap: 2px;
  }

  /* Zelle bzw. Kopf im Bearbeiten-Modus (Klick öffnet ein Feld). */
  .tabelle-bearb td.bearb-zelle-aktiv,
  .tabelle-bearb th.bearb-zelle-aktiv {
    padding: 2px 4px;
    background: var(--flaeche-panel);
    box-shadow: inset 0 0 0 2px var(--akzent);
  }

  .zellen-feld {
    width: 100%;
    box-sizing: border-box;
    padding: 3px 6px;
  }

  /* Geänderte, noch nicht übernommene Zelle (Vorschau). */
  .tabelle-bearb td.bearb-geaendert {
    background: var(--zustand-info-weich);
  }

  .bearb-punkt {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-left: 5px;
    border-radius: 50%;
    background: var(--zustand-info);
    vertical-align: middle;
  }

  /* Neu hinzugefügte bzw. duplizierte Zeile (Vorschau). */
  .tabelle-bearb tbody tr.bearb-neu td {
    background: var(--zustand-info-weich);
  }

  /* Klickbare "Zeile hinzufügen"-Zeile. */
  .tabelle-bearb tbody tr.bearb-neu-zeile td {
    color: var(--text-3);
    cursor: pointer;
    border-top: 1px dashed var(--rand-2);
  }

  .tabelle-bearb tbody tr.bearb-neu-zeile:hover td {
    background: var(--akzent-weich);
    color: var(--text-1);
  }

  /* Kopf-Text als reiner Text-Knopf (Sortieren per Klick). */
  .bearb-kopf-text {
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    color: inherit;
  }

  /* Spalten per Drag-and-Drop: der gezogene Kopf wird gedimmt, die Ziel-Spalte
     zeigt eine Akzentlinie (inset box-shadow). */
  .bearb-wird-gezogen {
    opacity: 0.4;
    outline: 1px dashed var(--rand-2);
  }

  .bearb-drop-spalte {
    box-shadow: inset 2px 0 0 var(--akzent);
  }

  .bearb-sp-griff {
    color: var(--rand-2);
    cursor: grab;
    margin-right: 5px;
    font-size: 0.72rem;
    touch-action: none;
  }

  /* Spalten-Menü am Kopf. Die th sind bereits sticky (app.css) und damit
     positionierter Anker für das absolut liegende Menü. */
  .bearb-kopf-menue-knopf {
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-3);
    margin-left: 4px;
    padding: 0 2px;
  }

  .bearb-menue {
    position: absolute;
    top: 100%;
    right: 0;
    z-index: 5;
    min-width: 190px;
    display: flex;
    flex-direction: column;
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-2);
    box-shadow: var(--schatten-1);
  }

  .bearb-menue button {
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    padding: 7px 12px;
    color: var(--text-2);
    font-family: var(--schrift-anzeige);
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
  }

  .bearb-menue button:hover {
    background: var(--akzent-weich);
    color: var(--text-1);
  }

  .bearb-menue button.gefahr {
    color: var(--zustand-fehler);
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
