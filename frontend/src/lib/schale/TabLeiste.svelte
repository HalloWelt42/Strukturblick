<script lang="ts">
  // Dokument-Tabs in der Kopfleiste: Icon je Format, Titel, Ungespeichert-Punkt
  // und Schließen-Knopf. Tabs mit ungespeicherten Änderungen fragen vor dem
  // Schließen nach.
  import { iconFuerFormat } from '../dienste/formatDarstellung'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import {
    oeffneTab,
    schliesseTab,
    setzeAktiv,
    tabs,
    type DokumentTab,
  } from '../zustand/tabs.svelte'

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
</script>

<div class="tabs">
  {#each tabs.liste as tab (tab.id)}
    <div
      class="tab"
      class:aktiv={tab.id === tabs.aktiveTabId}
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
  <button class="tab-neu" aria-label="Neues Dokument" onclick={neuerTab}>
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
