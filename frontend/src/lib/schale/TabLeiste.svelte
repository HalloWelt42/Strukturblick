<script lang="ts">
  // Dokument-Tabs in der Kopfleiste: Icon je Format, Titel, Ungespeichert-Punkt
  // und Schließen-Knopf. Tabs mit ungespeicherten Änderungen fragen vor dem
  // Schließen nach.
  import { iconFuerFormat } from '../dienste/formatDarstellung'
  import { ausZwischenablageOeffnen, oeffneUeberDialog } from '../dienste/dokumenteLaden'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import {
    oeffneTab,
    schliesseTab,
    setzeAktiv,
    tabs,
    type DokumentTab,
  } from '../zustand/tabs.svelte'
  import { vergleichStatus } from '../zustand/vergleichStatus.svelte'

  /** Ist dieser Tab an einem gerade laufenden Vergleich beteiligt? */
  function imVergleich(id: string): boolean {
    if (!vergleichStatus.aktiv) return false
    return id === vergleichStatus.linksTabId || id === vergleichStatus.rechtsTabId
  }

  let listeEl = $state<HTMLDivElement>()

  /** Mausrad über der Tab-Liste scrollt sie horizontal statt die Seite. */
  function beiRad(ereignis: WheelEvent): void {
    if (listeEl === undefined) return
    if (Math.abs(ereignis.deltaY) > Math.abs(ereignis.deltaX)) {
      listeEl.scrollLeft += ereignis.deltaY
      ereignis.preventDefault()
    }
  }

  // Aktiven Tab ins Sichtfeld rollen (etwa einen neu geöffneten Tab am Ende).
  $effect(() => {
    const id = tabs.aktiveTabId
    if (id === null || listeEl === undefined) return
    const el = listeEl.querySelector<HTMLElement>(`[data-tab-id="${id}"]`)
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  })

  let schliessDialogOffen = $state(false)
  let zuSchliessendeTabId: string | null = null

  function schliesseMitNachfrage(tab: DokumentTab): void {
    if (tab.geaendert) {
      zuSchliessendeTabId = tab.id
      schliessDialogOffen = true
    } else {
      schliesseTab(tab.id)
    }
  }

  function beiSchliessErgebnis(bestaetigt: boolean): void {
    if (bestaetigt && zuSchliessendeTabId !== null) {
      schliesseTab(zuSchliessendeTabId)
    }
    zuSchliessendeTabId = null
  }

  function neuerTab(): void {
    oeffneTab({ titel: 'unbenannt', inhalt: '' })
  }

  // Datei öffnen ist immer erreichbar (nicht nur auf der Willkommensfläche).
  // Große Dateien fragen über ein eigenes Bestätigungsfeld nach (kein Browser-Dialog).
  let ladeDialogOffen = $state(false)
  let ladeDialogFrage = $state('')
  let ladeDialogAufloeser: ((bestaetigt: boolean) => void) | null = null

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
</script>

<div class="tabs">
  <div class="tab-liste" bind:this={listeEl} onwheel={beiRad}>
    {#each tabs.liste as tab (tab.id)}
    <div
      class="tab"
      data-tab-id={tab.id}
      class:aktiv={tab.id === tabs.aktiveTabId}
      class:im-vergleich={imVergleich(tab.id)}
      role="button"
      tabindex="0"
      onclick={() => setzeAktiv(tab.id)}
      onkeydown={(ereignis) => {
        if (ereignis.key === 'Enter' || ereignis.key === ' ') {
          ereignis.preventDefault()
          setzeAktiv(tab.id)
        }
      }}
    >
      {#if imVergleich(tab.id)}
        <i class="fa-solid fa-code-compare vergleich-symbol" aria-hidden="true"></i>
      {/if}
      <i class="fa-solid {iconFuerFormat(tab.format)}"></i>
      {tab.titel}
      {#if tab.geaendert}
        <span class="punkt"></span>
      {/if}
      <button
        class="tab-zu"
        aria-label="Tab schließen"
        onclick={(ereignis) => {
          ereignis.stopPropagation()
          schliesseMitNachfrage(tab)
        }}
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    {/each}
  </div>
  <button
    class="tab-neu"
    aria-label="Datei öffnen"
    title="Datei öffnen"
    onclick={() => void oeffneUeberDialog(frageNach)}
  >
    <i class="fa-solid fa-folder-open"></i>
  </button>
  <button
    class="tab-neu"
    aria-label="Aus Zwischenablage einfügen"
    title="Aus Zwischenablage einfügen"
    onclick={() => void ausZwischenablageOeffnen()}
  >
    <i class="fa-solid fa-clipboard"></i>
  </button>
  <button class="tab-neu" aria-label="Neues, leeres Dokument" title="Neues, leeres Dokument" onclick={neuerTab}>
    <i class="fa-solid fa-plus"></i>
  </button>
</div>

<Bestaetigung
  bind:offen={schliessDialogOffen}
  titel="Tab schließen"
  frage="Der Tab hat ungespeicherte Änderungen. Trotzdem schließen?"
  bestaetigenText="Schließen"
  onErgebnis={beiSchliessErgebnis}
/>

<Bestaetigung
  bind:offen={ladeDialogOffen}
  titel="Große Datei"
  frage={ladeDialogFrage}
  bestaetigenText="Laden"
  onErgebnis={beiLadeErgebnis}
/>

<style>
  /* Scrollbare Tab-Liste: die Tabs rollen horizontal, die Aktionsknöpfe
     (Öffnen/Zwischenablage/Neu) bleiben rechts daneben immer erreichbar. */
  .tab-liste {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
  }

  /* Hervorhebung der beiden am aktiven Vergleich beteiligten Tabs. Wirkt
     zusätzlich zum aktiv-Zustand: aktiv trägt einen oberen --akzent-Streifen
     (app.css), diese Markierung legt einen weichen Zweitakzent-Hintergrund und
     einen unteren Zweitakzent-Streifen darüber - kein seitlicher Rand. */
  .tab.im-vergleich {
    background: var(--zweitakzent-weich);
    box-shadow: inset 0 -2px 0 var(--zweitakzent);
  }

  /* Aktiver UND im Vergleich: oberer Akzentstreifen (aktiv) und unterer
     Zweitakzentstreifen zugleich sichtbar halten. */
  .tab.im-vergleich.aktiv {
    box-shadow:
      inset 0 2px 0 var(--akzent),
      inset 0 -2px 0 var(--zweitakzent);
  }

  .vergleich-symbol {
    color: var(--zweitakzent);
    font-size: 0.8rem;
  }
</style>
