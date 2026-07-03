<script lang="ts">
  // Baum-Ansicht nach mockups/baum.html: Werkzeugzeile (Auf-/Zuklappen,
  // Ebenen-Knöpfe, Suche mit "Nur Treffer zeigen") über dem virtualisierten
  // Strukturbaum. Reagiert auf fremde Selektionen (Editor, Diagnose,
  // Brotkrumen) mit Aufklappen des Pfads und Scrollen zur Zeile.
  import { tick, untrack } from 'svelte'

  import { baueSichtbareZeilen, type BaumZeileDaten } from '../../dienste/baumZeilen'
  import { markeFuerPfad } from '../../dienste/musterZuordnung'
  import { ebenenAnzahl } from '../../dienste/tiefe'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import VirtuelleListe from '../../hilfsteile/VirtuelleListe.svelte'
  import { extrasFuer, ladeMuster } from '../../zustand/analyseExtras.svelte'
  import {
    klappeAlleAuf,
    klappeAlleZu,
    klappeBisEbene,
    oeffnePfadZu,
    zustandFuer,
  } from '../../zustand/baumZustand.svelte'
  import { selektion } from '../../zustand/selektion.svelte'
  import { aktiverTab } from '../../zustand/tabs.svelte'
  import BaumZeile from './BaumZeile.svelte'

  /** Zeilenhöhe des Baums in Pixeln (24, wie .baum-zeile in app.css). */
  const ZEILEN_HOEHE = 24
  const SUCH_VERZOEGERUNG_MS = 250
  /** Tiefenstaffel und Breiten der Skelett-Zeilen während der Analyse. */
  const SKELETT_ZEILEN: { tiefe: number; breite: number }[] = [
    { tiefe: 0, breite: 90 },
    { tiefe: 1, breite: 160 },
    { tiefe: 2, breite: 220 },
    { tiefe: 2, breite: 180 },
    { tiefe: 2, breite: 240 },
    { tiefe: 1, breite: 140 },
    { tiefe: 2, breite: 200 },
    { tiefe: 3, breite: 260 },
    { tiefe: 3, breite: 170 },
    { tiefe: 2, breite: 210 },
  ]

  const tab = $derived(aktiverTab())
  const zustand = $derived(tab === null ? null : zustandFuer(tab.id))
  const positionen = $derived(tab?.analyse?.positionen ?? {})
  const zeilen = $derived.by((): BaumZeileDaten[] => {
    if (tab === null || tab.analyse === null || zustand === null) return []
    return baueSichtbareZeilen(tab.analyse.wurzel, tab.analyse.positionen, zustand)
  })
  const begriff = $derived(zustand?.suchbegriff.trim().toLowerCase() ?? '')
  // Anzahl sinnvoller Ebenen-Knoepfe aus der tatsaechlichen Verschachtelungs-
  // tiefe des Dokuments (mind. 1, gedeckelt bei 9). Ein flaches Dokument zeigt
  // so nur den Knopf "1", tiefere Strukturen entsprechend mehr.
  const ebenen = $derived(
    tab !== null && tab.analyse !== null ? ebenenAnzahl(tab.analyse.wurzel) : 1,
  )
  /** Muster-Funde zum Dokument (leer, solange nichts geladen ist). */
  const musterFunde = $derived(
    tab !== null && tab.analyse !== null
      ? (extrasFuer(tab.analyse.dokument_hash)?.muster?.funde ?? [])
      : [],
  )
  const auswahlPfad = $derived(
    selektion.aktuell !== null && tab !== null && selektion.aktuell.tabId === tab.id
      ? selektion.aktuell.pfad
      : null,
  )

  let liste = $state<{ scrollZuIndex: (index: number) => void }>()
  let suchText = $state('')
  let suchTimer: ReturnType<typeof setTimeout> | null = null

  // Muster leise im Hintergrund laden, sobald die Analyse frisch ist - die
  // Abzeichen erscheinen dann, ohne dass der Baum darauf warten muss.
  $effect(() => {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null || aktuell.analyseStand !== 'frisch') return
    const extras = extrasFuer(aktuell.analyse.dokument_hash)
    if (extras !== undefined && extras.fehler !== null) return
    if (extras?.muster === undefined) void ladeMuster(aktuell)
  })

  // Tab-Wechsel: Suchfeld aus dem (je Tab gemerkten) Baum-Zustand befüllen.
  $effect(() => {
    const tabId = tab?.id
    if (tabId === undefined) return
    if (suchTimer !== null) {
      clearTimeout(suchTimer)
      suchTimer = null
    }
    suchText = untrack(() => zustandFuer(tabId).suchbegriff)
  })

  // Fremde Selektion (Editor, Diagnose, Brotkrumen, Inspektor): Pfad
  // aufklappen und die Zeile ins Bild rollen. Getrackt wird nur die
  // Selektion selbst - Analyse-Updates lösen keinen erneuten Sprung aus.
  $effect(() => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null || auswahl.quelle === 'baum') return
    const pfad = auswahl.pfad
    untrack(() => {
      const aktuell = aktiverTab()
      if (aktuell === null || auswahl.tabId !== aktuell.id || aktuell.analyse === null) return
      oeffnePfadZu(aktuell.id, pfad)
      void tick().then(() => {
        const index = zeilen.findIndex((zeile) => zeile.pfad === pfad)
        if (index !== -1) liste?.scrollZuIndex(index)
      })
    })
  })

  function beiSuchEingabe(): void {
    const tabId = tab?.id
    if (tabId === undefined) return
    if (suchTimer !== null) clearTimeout(suchTimer)
    suchTimer = setTimeout(() => {
      suchTimer = null
      zustandFuer(tabId).suchbegriff = suchText
    }, SUCH_VERZOEGERUNG_MS)
  }

  function schalteNurTreffer(): void {
    if (zustand === null) return
    zustand.nurTreffer = !zustand.nurTreffer
  }

  function allesAufklappen(): void {
    if (tab === null) return
    klappeAlleAuf(tab.id, positionen)
  }

  function allesZuklappen(): void {
    if (tab === null) return
    klappeAlleZu(tab.id, positionen)
  }

  function zeigeEbene(ebene: number): void {
    if (tab === null) return
    klappeBisEbene(tab.id, positionen, ebene)
  }

</script>

{#if tab !== null}
  {@const tabId = tab.id}
  <div class="werkzeugzeile">
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
    <div class="feld-zeile">
      <input
        class="feld"
        type="text"
        placeholder="Im Baum suchen ..."
        style="width: 220px"
        bind:value={suchText}
        oninput={beiSuchEingabe}
      />
      <label class="beschriftung">
        <input
          class="check-versteckt"
          type="checkbox"
          checked={zustand?.nurTreffer === true}
          onchange={schalteNurTreffer}
        />
        <span class="checkbox" class:an={zustand?.nurTreffer === true}>
          <i class="fa-solid fa-check"></i>
        </span>
        Nur Treffer zeigen
      </label>
    </div>
  </div>

  {#if tab.analyse !== null}
    <div class="baum">
      <VirtuelleListe zeilenHoehe={ZEILEN_HOEHE} anzahl={zeilen.length} bind:this={liste}>
        {#snippet kinder(index)}
          {@const zeile = zeilen[index]}
          {#if zeile !== undefined}
            <BaumZeile
              {zeile}
              {tabId}
              {positionen}
              {begriff}
              selektiert={auswahlPfad === zeile.pfad}
              marke={markeFuerPfad(zeile.pfad, musterFunde)}
            />
          {/if}
        {/snippet}
      </VirtuelleListe>
    </div>
  {:else if tab.analyseStand === 'fehler'}
    <AnalyseFehler {tab} titel="Keine Struktur verfügbar" />
  {:else}
    <div class="baum">
      {#each SKELETT_ZEILEN as skelett, index (index)}
        <div class="baum-zeile" style="--tiefe: {skelett.tiefe}">
          <span class="skelett" style="width: {skelett.breite}px"></span>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  /* Der Baum füllt die Ansichtsfläche; ohne min-height kann die
     virtualisierte Liste darin nicht scrollen. Optik kommt aus app.css. */
  .baum {
    flex: 1;
    min-height: 0;
    overflow: hidden;
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
