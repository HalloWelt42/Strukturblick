<script lang="ts">
  // Statistik-Ansicht nach mockups/statistik.html: Werkzeugzeile (Neu
  // berechnen, Dauer, Mustererkennung einbeziehen), Kennzahl-Kacheln und
  // Karten (Typverteilung, Häufigste Schlüssel, Histogramme, Muster).
  // Die CSS-Balken des Mockups SIND die Diagramm-Darstellung - bewusst
  // keine Diagramm-Bibliothek. Darunter das Feld-Profil: eine vollständige
  // Tabelle aller Pfade mit Kennzahlen (Vorkommen, Breite, Bereich usw.).
  import type { FeldProfil, MusterFund, SchluesselStat } from '../../api/typen'
  import { menschenlesbareGroesse } from '../../dienste/groessenFormat'
  import { MUSTER_NAME } from '../../dienste/musterZuordnung'
  import { segmenteAusPointer } from '../../dienste/pfade'
  import { TYP_NAME, WERT_KLASSE } from '../../dienste/wertDarstellung'
  import type { WertTyp } from '../../dienste/wertZugriff'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import {
    extrasFuer,
    ladeMuster,
    ladeProfil,
    ladeStatistik,
  } from '../../zustand/analyseExtras.svelte'
  import { setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab } from '../../zustand/tabs.svelte'

  /** Höchstens so viele Histogramm-Karten anzeigen. */
  const MAX_HISTOGRAMME = 2
  /** Reihenfolge und Balken-Klassen der Typverteilung wie im Mockup. */
  const TYP_BALKEN: { typ: WertTyp; klasse: string }[] = [
    { typ: 'objekt', klasse: 'typ-objekt' },
    { typ: 'liste', klasse: 'typ-liste' },
    { typ: 'text', klasse: 'typ-text' },
    { typ: 'zahl', klasse: 'typ-zahl' },
    { typ: 'wahrheitswert', klasse: 'typ-bool' },
    { typ: 'null', klasse: 'typ-null' },
  ]
  /** Breiten der Skelett-Zeilen während des Ladens. */
  const SKELETT_BREITEN = [240, 320, 280, 360, 300, 260, 340, 220]

  /** Container-Typen: nur für sie sind Unterelement-Kennzahlen sinnvoll. */
  const CONTAINER_TYPEN = new Set<string>(['objekt', 'liste'])

  const tab = $derived(aktiverTab())
  const eintrag = $derived(
    tab !== null && tab.analyse !== null ? extrasFuer(tab.analyse.dokument_hash) : undefined,
  )
  const statistik = $derived(eintrag?.statistik)
  const muster = $derived(eintrag?.muster)
  const profil = $derived(eintrag?.profil)

  let musterEinbeziehen = $state(true)

  interface TypReihe {
    name: string
    klasse: string
    anzahl: number
  }

  const typReihen = $derived.by((): TypReihe[] => {
    if (statistik === undefined) return []
    return TYP_BALKEN.map(({ typ, klasse }) => ({
      name: TYP_NAME[typ],
      klasse,
      anzahl: statistik.typverteilung[typ] ?? 0,
    })).filter((reihe) => reihe.anzahl > 0)
  })
  const typMaximum = $derived(Math.max(...typReihen.map((reihe) => reihe.anzahl), 0))
  const schluesselMaximum = $derived(
    statistik === undefined
      ? 0
      : Math.max(...statistik.schluessel_haeufigkeit.map((stat: SchluesselStat) => stat.anzahl), 0),
  )
  const histogramme = $derived(statistik?.zahlen_histogramme.slice(0, MAX_HISTOGRAMME) ?? [])

  // Beim ersten Anzeigen laden; die Guards (schon geladen, läuft bereits,
  // Fehler steht an) verhindern Wiederholungen - "Neu berechnen" erzwingt.
  $effect(() => {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null) return
    const extras = extrasFuer(aktuell.analyse.dokument_hash)
    if (extras !== undefined && extras.fehler !== null) return
    if (extras?.statistik === undefined) void ladeStatistik(aktuell)
    if (extras?.profil === undefined) void ladeProfil(aktuell)
    if (musterEinbeziehen && extras?.muster === undefined) void ladeMuster(aktuell)
  })

  function neuBerechnen(): void {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null) return
    void ladeStatistik(aktuell, true)
    void ladeProfil(aktuell, true)
    if (musterEinbeziehen) void ladeMuster(aktuell, true)
  }

  /** Balkenbreite bzw. -höhe in Prozent des größten Werts. */
  function anteilProzent(anzahl: number, maximum: number): number {
    if (maximum <= 0) return 0
    return Math.round((anzahl / maximum) * 100)
  }

  /** Zahl mit deutschem Dezimalkomma, höchstens zwei Nachkommastellen. */
  function zahlText(wert: number): string {
    return wert.toLocaleString('de-DE', { maximumFractionDigits: 2 })
  }

  /** Ganzzahlige Millisekunden, mindestens 1, für "Berechnet in X ms". */
  function dauerText(dauerMs: number): string {
    return String(Math.max(1, Math.round(dauerMs)))
  }

  /** Letztes benanntes Segment des Pfad-Musters als Feldname. */
  function feldName(pfadMuster: string): string {
    const segmente = segmenteAusPointer(pfadMuster).filter((segment) => segment !== '*')
    return segmente[segmente.length - 1] ?? pfadMuster
  }

  /** Anzahl der Werte, die dem Muster entsprechen (aus der Abdeckung). */
  function trefferAnzahl(fund: MusterFund): number {
    return Math.round(fund.abdeckung * fund.anzahl_werte)
  }

  // ----- Feld-Profil ---------------------------------------------------------

  type ProfilSpalte =
    | 'feld'
    | 'vorkommen'
    | 'verschiedene'
    | 'breite'
    | 'bereich'
    | 'unterelemente'
    | 'leer'
  type SortRichtung = 'auf' | 'ab'

  interface SpaltenKopf {
    id: ProfilSpalte
    beschriftung: string
    /** Rechtsbündige Zahlenspalte. */
    zahl: boolean
    /** Erklärung der Bedeutung (als Kopf-Tooltip), falls nicht selbsterklärend. */
    erklaerung?: string
  }

  const PROFIL_SPALTEN: SpaltenKopf[] = [
    { id: 'feld', beschriftung: 'Feld', zahl: false },
    {
      id: 'vorkommen',
      beschriftung: 'Vorkommen',
      zahl: true,
      erklaerung: 'Wie oft das Feld vorkommt',
    },
    {
      id: 'verschiedene',
      beschriftung: 'Verschiedene',
      zahl: true,
      erklaerung: 'Anzahl verschiedener Werte',
    },
    {
      id: 'breite',
      beschriftung: 'Textbreite',
      zahl: true,
      erklaerung: 'Zeichenlänge der Textwerte - vom kürzesten bis zum längsten Wert',
    },
    {
      id: 'bereich',
      beschriftung: 'Bereich',
      zahl: true,
      erklaerung: 'Wertebereich der Zahlen - vom kleinsten bis zum größten Wert',
    },
    {
      id: 'unterelemente',
      beschriftung: 'Unterelemente',
      zahl: true,
      erklaerung: 'Anzahl der Kind-Elemente bei Objekten und Listen',
    },
    { id: 'leer', beschriftung: 'Leer-Anteil', zahl: true, erklaerung: 'Anteil leerer Werte' },
  ]

  let sortSpalte = $state<ProfilSpalte>('vorkommen')
  let sortRichtung = $state<SortRichtung>('ab')

  /** Kompakter Pfad des Feldes; die Wurzel ("") wird zu "(Wurzel)". */
  function feldPfad(pfadMuster: string): string {
    if (pfadMuster === '') return '(Wurzel)'
    return segmenteAusPointer(pfadMuster).join('/')
  }

  /** Dominanter Werttyp an einem Pfad (der mit den meisten Vorkommen). */
  function dominanterTyp(feld: FeldProfil): string | null {
    let bester: string | null = null
    let hoechste = -1
    for (const anteil of feld.typen) {
      if (anteil.anzahl > hoechste) {
        hoechste = anteil.anzahl
        bester = anteil.typ
      }
    }
    return bester
  }

  /** Anzeigename eines Typs als Abzeichen-Text (unbekannt -> roher Wert). */
  function typName(typ: string): string {
    return TYP_NAME[typ as WertTyp] ?? typ
  }

  /** Farbklasse eines Typs (unbekannt -> keine besondere Farbe). */
  function typKlasse(typ: string): string {
    return WERT_KLASSE[typ as WertTyp] ?? ''
  }

  /** true, wenn an einem Pfad Container-Werte vorkommen (Unterelemente sinnvoll). */
  function hatContainer(feld: FeldProfil): boolean {
    return feld.typen.some((anteil) => CONTAINER_TYPEN.has(anteil.typ))
  }

  /** Textbreite als "min-max" bzw. "n", nur wenn Textlängen vorliegen; sonst "-". */
  function breiteText(feld: FeldProfil): string {
    const { text_min_laenge: min, text_max_laenge: max } = feld
    if (min === null || max === null) return '-'
    return min === max ? zahlText(min) : `${zahlText(min)}-${zahlText(max)}`
  }

  /** Wertebereich als "min-max" bzw. "n", nur wenn Zahlenwerte vorliegen; sonst "-". */
  function bereichText(feld: FeldProfil): string {
    const { zahl_minimum: min, zahl_maximum: max } = feld
    if (min === null || max === null) return '-'
    return min === max ? zahlText(min) : `${zahlText(min)}-${zahlText(max)}`
  }

  /** Anzahl Unterelemente als "min-max" bzw. "n", nur bei Containern; sonst "-". */
  function unterelementeText(feld: FeldProfil): string {
    if (!hatContainer(feld)) return '-'
    const { kind_min: min, kind_max: max } = feld
    if (min === null || max === null) return '-'
    return min === max ? zahlText(min) : `${zahlText(min)}-${zahlText(max)}`
  }

  /** Leer-Anteil (null/fehlend) als Prozent mit einer Nachkommastelle. */
  function leerText(feld: FeldProfil): string {
    return `${(feld.null_anteil * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`
  }

  /** Sortierschlüssel je Spalte: Zahl (fehlend als -Infinity) oder Pfad-Text. */
  function sortWert(feld: FeldProfil, spalte: ProfilSpalte): number | string {
    switch (spalte) {
      case 'feld':
        return feld.pfad_muster
      case 'vorkommen':
        return feld.vorkommen
      case 'verschiedene':
        return feld.verschiedene
      case 'breite':
        return feld.text_max_laenge ?? Number.NEGATIVE_INFINITY
      case 'bereich':
        return feld.zahl_maximum ?? Number.NEGATIVE_INFINITY
      case 'unterelemente':
        return hatContainer(feld) ? (feld.kind_max ?? Number.NEGATIVE_INFINITY) : Number.NEGATIVE_INFINITY
      case 'leer':
        return feld.null_anteil
    }
  }

  const sortierteFelder = $derived.by((): FeldProfil[] => {
    if (profil === undefined) return []
    const richtung = sortRichtung === 'auf' ? 1 : -1
    return [...profil.felder].sort((links, rechts) => {
      const a = sortWert(links, sortSpalte)
      const b = sortWert(rechts, sortSpalte)
      let vergleich: number
      if (typeof a === 'string' && typeof b === 'string') {
        vergleich = a.localeCompare(b, 'de-DE')
      } else {
        vergleich = (a as number) - (b as number)
      }
      // Stabiler Nebenschlüssel: bei Gleichstand nach Pfad-Muster.
      if (vergleich === 0) vergleich = links.pfad_muster.localeCompare(rechts.pfad_muster, 'de-DE')
      return vergleich * richtung
    })
  })

  function sortiereNach(spalte: ProfilSpalte): void {
    if (sortSpalte === spalte) {
      sortRichtung = sortRichtung === 'auf' ? 'ab' : 'auf'
    } else {
      sortSpalte = spalte
      // Textspalte aufsteigend, Zahlenspalten absteigend (größte zuerst).
      sortRichtung = spalte === 'feld' ? 'auf' : 'ab'
    }
  }

  /** Klick auf eine Feld-Zeile: Pfad selektieren, "*" wird zum ersten Treffer (0). */
  function waehleFeld(feld: FeldProfil): void {
    const aktuell = tab
    if (aktuell === null) return
    const pfad = feld.pfad_muster.replaceAll('/*', '/0')
    setzeSelektion({ tabId: aktuell.id, pfad, quelle: 'statistik' })
  }
</script>

{#if tab !== null}
  <div class="werkzeugzeile">
    <button class="knopf klein" onclick={neuBerechnen} disabled={tab.analyse === null}>
      <i class="fa-solid fa-arrows-rotate"></i> Neu berechnen
    </button>
    {#if statistik !== undefined}
      <span class="beschriftung">Berechnet in {dauerText(statistik.dauer_ms)} ms</span>
    {/if}
    <span class="luecke"></span>
    <label class="beschriftung">
      <input class="check-versteckt" type="checkbox" bind:checked={musterEinbeziehen} />
      <span class="checkbox" class:an={musterEinbeziehen}>
        <i class="fa-solid fa-check"></i>
      </span>
      Mustererkennung einbeziehen
    </label>
  </div>

  {#if eintrag !== undefined && eintrag.laed}
    <div class="statx-inhalt">
      {#each SKELETT_BREITEN as breite, index (index)}
        <span class="skelett" style="width: {breite}px"></span>
      {/each}
    </div>
  {:else if eintrag !== undefined && eintrag.fehler !== null}
    <div class="statx-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Die Statistik konnte nicht berechnet werden: {eintrag.fehler}
      </span>
    </div>
  {:else if statistik !== undefined}
    <div class="statx-inhalt">
      <div class="kennzahl-raster">
        <div class="kennzahl">
          <div class="kz-wert">{zahlText(statistik.knoten_gesamt)}</div>
          <div class="kz-name">Knoten gesamt</div>
        </div>
        <div class="kennzahl">
          <div class="kz-wert">{zahlText(statistik.max_tiefe)}</div>
          <div class="kz-name">Maximale Tiefe</div>
        </div>
        <div class="kennzahl">
          <div class="kz-wert">{menschenlesbareGroesse(statistik.groesse_bytes)}</div>
          <div class="kz-name">Größe</div>
        </div>
        <div class="kennzahl">
          <div class="kz-wert">{zahlText(statistik.typverteilung['objekt'] ?? 0)}</div>
          <div class="kz-name">Objekte</div>
        </div>
        <div class="kennzahl">
          <div class="kz-wert">{zahlText(statistik.typverteilung['liste'] ?? 0)}</div>
          <div class="kz-name">Listen</div>
        </div>
        <div class="kennzahl">
          <div class="kz-wert">{zahlText(statistik.typverteilung['text'] ?? 0)}</div>
          <div class="kz-name">Textwerte</div>
        </div>
      </div>

      <div class="statx-karten">
        <div class="karte">
          <div class="karte-kopf"><i class="fa-solid fa-chart-column"></i> Typverteilung</div>
          <div class="karte-inhalt">
            {#each typReihen as reihe (reihe.klasse)}
              <div class="balken-reihe">
                <span class="b-name">{reihe.name}</span>
                <div class="balken">
                  <i
                    class={reihe.klasse}
                    style="width: {anteilProzent(reihe.anzahl, typMaximum)}%"
                  ></i>
                </div>
                <span class="b-wert">{zahlText(reihe.anzahl)}</span>
              </div>
            {/each}
          </div>
        </div>

        <div class="karte">
          <div class="karte-kopf"><i class="fa-solid fa-key"></i> Häufigste Schlüssel</div>
          <div class="karte-inhalt">
            {#if statistik.schluessel_haeufigkeit.length === 0}
              <span class="hinweis-text">Das Dokument enthält keine Objekt-Schlüssel.</span>
            {/if}
            {#each statistik.schluessel_haeufigkeit as stat (stat.schluessel)}
              <div class="balken-reihe">
                <span class="b-name">{stat.schluessel}</span>
                <div class="balken">
                  <i
                    class="zweit"
                    style="width: {anteilProzent(stat.anzahl, schluesselMaximum)}%"
                  ></i>
                </div>
                <span class="b-wert">{zahlText(stat.anzahl)}</span>
              </div>
            {/each}
          </div>
        </div>

        {#each histogramme as histogramm (histogramm.pfad_muster)}
          {@const eimerMaximum = Math.max(...histogramm.eimer.map((eimer) => eimer.anzahl), 0)}
          <div class="karte">
            <div class="karte-kopf">
              <i class="fa-solid fa-chart-simple"></i> Histogramm: {histogramm.pfad_muster}
            </div>
            <div class="karte-inhalt">
              <div class="histogramm">
                {#each histogramm.eimer as eimer, index (index)}
                  <i
                    style="height: {anteilProzent(eimer.anzahl, eimerMaximum)}%"
                    title="{zahlText(eimer.von)}-{zahlText(eimer.bis)}: {eimer.anzahl}"
                  ></i>
                {/each}
              </div>
              <div class="statx-achsen">
                <span class="hinweis-text mono">{zahlText(histogramm.minimum)}</span>
                <span class="hinweis-text mono">{zahlText(histogramm.maximum)}</span>
              </div>
            </div>
          </div>
        {/each}

        {#if musterEinbeziehen && muster !== undefined}
          <div class="karte">
            <div class="karte-kopf">
              <i class="fa-solid fa-fingerprint"></i>
              <FachbegriffLink topic="mustererkennung">Mustererkennung</FachbegriffLink>
            </div>
            <div class="karte-inhalt">
              {#if muster.funde.length === 0}
                <span class="hinweis-text">Keine Wertemuster erkannt.</span>
              {/if}
              {#each muster.funde as fund (fund.pfad_muster + fund.muster)}
                <div class="statx-muster-zeile">
                  {#if fund.muster === 'enum_kandidat'}
                    <span class="abzeichen gut">{MUSTER_NAME[fund.muster]}</span>
                    <span>
                      Feld <code>{feldName(fund.pfad_muster)}</code>: nur die Werte
                      {#each fund.enum_werte ?? [] as wert, index (wert)}{index > 0
                          ? ', '
                          : ''}<code>{wert}</code>{/each} (fester Wertevorrat)
                    </span>
                  {:else}
                    <span class="abzeichen info">{MUSTER_NAME[fund.muster]}</span>
                    <span>
                      Feld <code>{feldName(fund.pfad_muster)}</code>: {trefferAnzahl(fund)} von
                      {fund.anzahl_werte} Werten entsprechen dem Muster
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="karte statx-profil">
        <div class="karte-kopf"><i class="fa-solid fa-table-list"></i> Feld-Profil</div>
        {#if profil === undefined}
          <div class="karte-inhalt">
            {#each SKELETT_BREITEN as breite, index (index)}
              <span class="skelett" style="width: {breite}px"></span>
            {/each}
          </div>
        {:else if profil.felder.length === 0}
          <div class="karte-inhalt">
            <span class="hinweis-text">Das Dokument enthält keine auswertbaren Felder.</span>
          </div>
        {:else}
          <div class="statx-profil-tabelle">
            <table class="tabelle">
              <thead>
                <tr>
                  {#each PROFIL_SPALTEN as spalte (spalte.id)}
                    <th
                      class:zahl={spalte.zahl}
                      onclick={() => sortiereNach(spalte.id)}
                      title={spalte.erklaerung !== undefined
                        ? `${spalte.erklaerung}. Klick: nach ${spalte.beschriftung} sortieren`
                        : `Nach ${spalte.beschriftung} sortieren`}
                    >
                      {spalte.beschriftung}
                      {#if sortSpalte === spalte.id}
                        <i
                          class="fa-solid sortier-pfeil {sortRichtung === 'auf'
                            ? 'fa-arrow-up-short-wide'
                            : 'fa-arrow-down-wide-short'}"
                          title={sortRichtung === 'auf'
                            ? 'Aufsteigend sortiert'
                            : 'Absteigend sortiert'}
                        ></i>
                      {/if}
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each sortierteFelder as feld (feld.pfad_muster)}
                  {@const dominant = dominanterTyp(feld)}
                  <tr class="statx-profil-zeile" onclick={() => waehleFeld(feld)}>
                    <td
                      class="statx-feld-zelle"
                      title="Pfad {feldPfad(feld.pfad_muster)} im Baum auswählen"
                    >
                      <code>{feldPfad(feld.pfad_muster)}</code>
                    </td>
                    <td class="statx-typ-zelle">
                      <span class="statx-typen">
                        {#each feld.typen as anteil (anteil.typ)}
                          <span
                            class="abzeichen {typKlasse(anteil.typ)}"
                            class:dominant={anteil.typ === dominant && feld.typen.length > 1}
                          >
                            {typName(anteil.typ)}
                          </span>
                        {/each}
                      </span>
                    </td>
                    <td class="zahl">{zahlText(feld.vorkommen)}</td>
                    <td class="zahl">{zahlText(feld.verschiedene)}</td>
                    <td class="zahl">{breiteText(feld)}</td>
                    <td class="zahl">{bereichText(feld)}</td>
                    <td class="zahl">{unterelementeText(feld)}</td>
                    <td class="zahl">{leerText(feld)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    </div>
  {:else if tab.analyseStand === 'fehler'}
    <AnalyseFehler {tab} titel="Keine Statistik verfügbar" />
  {:else}
    <div class="statx-inhalt">
      {#each SKELETT_BREITEN as breite, index (index)}
        <span class="skelett" style="width: {breite}px"></span>
      {/each}
    </div>
  {/if}
{/if}

<style>
  /* Seiten-spezifische Anordnung wie im Mockup (dort im <style> der Seite). */
  .statx-inhalt {
    padding: var(--a4);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }

  .statx-karten {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: var(--a3);
  }

  .statx-muster-zeile {
    display: flex;
    align-items: baseline;
    gap: var(--a2);
    padding: var(--a1) 0;
    font-size: 0.84rem;
  }

  .statx-achsen {
    display: flex;
    justify-content: space-between;
    margin-top: var(--a1);
  }

  /* Feld-Profil: volle Breite, Tabelle scrollt bei Bedarf horizontal. */
  .statx-profil {
    overflow: hidden;
  }

  .statx-profil-tabelle {
    overflow-x: auto;
  }

  .statx-profil-zeile {
    cursor: pointer;
  }

  /* Pfad- und Typspalte dürfen breiter werden und (Typen) umbrechen; die
     .tabelle-Vorgaben (max-width, nowrap, ellipsis) hier bewusst lockern. */
  .statx-profil-tabelle .tabelle td.statx-feld-zelle {
    max-width: none;
  }

  .statx-feld-zelle code {
    font-family: var(--schrift-mono);
    font-size: 0.8rem;
  }

  .statx-profil-tabelle .tabelle td.statx-typ-zelle {
    max-width: none;
    white-space: normal;
    overflow: visible;
  }

  .statx-typen {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--a1);
  }

  /* Dominanter Typ bei gemischten Feldern kräftiger hervorheben. */
  .statx-typen .abzeichen.dominant {
    font-weight: 600;
    border-color: var(--akzent);
  }

  /* Echte (unsichtbare) Checkbox hinter dem Mockup-Kästchen .checkbox. */
  label.beschriftung {
    cursor: pointer;
  }

  .check-versteckt {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  .check-versteckt:focus-visible + .checkbox {
    outline: 2px solid var(--akzent);
  }
</style>
