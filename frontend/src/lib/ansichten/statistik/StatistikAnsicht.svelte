<script lang="ts">
  // Statistik-Ansicht nach mockups/statistik.html: Werkzeugzeile (Neu
  // berechnen, Dauer, Mustererkennung einbeziehen), Kennzahl-Kacheln und
  // Karten (Typverteilung, Häufigste Schlüssel, Histogramme, Muster).
  // Die CSS-Balken des Mockups SIND die Diagramm-Darstellung - bewusst
  // keine Diagramm-Bibliothek.
  import type { MusterFund, SchluesselStat } from '../../api/typen'
  import { menschenlesbareGroesse } from '../../dienste/groessenFormat'
  import { MUSTER_NAME } from '../../dienste/musterZuordnung'
  import { segmenteAusPointer } from '../../dienste/pfade'
  import { TYP_NAME } from '../../dienste/wertDarstellung'
  import type { WertTyp } from '../../dienste/wertZugriff'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import { extrasFuer, ladeMuster, ladeStatistik } from '../../zustand/analyseExtras.svelte'
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

  const tab = $derived(aktiverTab())
  const eintrag = $derived(
    tab !== null && tab.analyse !== null ? extrasFuer(tab.analyse.dokument_hash) : undefined,
  )
  const statistik = $derived(eintrag?.statistik)
  const muster = $derived(eintrag?.muster)

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
    if (musterEinbeziehen && extras?.muster === undefined) void ladeMuster(aktuell)
  })

  function neuBerechnen(): void {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null) return
    void ladeStatistik(aktuell, true)
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
    </div>
  {:else if tab.analyseStand === 'fehler'}
    <div class="statx-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Das Dokument konnte nicht analysiert werden - wechsle in den Editor, um den Fehler zu
        beheben.
      </span>
    </div>
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
