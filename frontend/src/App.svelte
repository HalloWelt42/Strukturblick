<script lang="ts">
  // App-Schale: Raster aus app.css (.app), zusammengesetzt aus den
  // Schale-Komponenten. Startet die Backend-Überwachung, lädt die
  // Capabilities einmalig und stellt den Arbeitsstand wieder her.
  import { onMount } from 'svelte'

  import { sofortAnalysieren } from './lib/dienste/analyseDienst'
  import Toast from './lib/hilfsteile/Toast.svelte'
  import LexikonPanel from './lib/lexikon/LexikonPanel.svelte'
  import AnsichtsWahl from './lib/schale/AnsichtsWahl.svelte'
  import EinstellungenModal from './lib/schale/EinstellungenModal.svelte'
  import HauptBereich from './lib/schale/HauptBereich.svelte'
  import Konsole from './lib/schale/Konsole.svelte'
  import KopfLeiste from './lib/schale/KopfLeiste.svelte'
  import LeistenGriff from './lib/schale/LeistenGriff.svelte'
  import SeitenLeisteLinks from './lib/schale/SeitenLeisteLinks.svelte'
  import SeitenLeisteRechts from './lib/schale/SeitenLeisteRechts.svelte'
  import StatusLeiste from './lib/schale/StatusLeiste.svelte'
  import { starteBackendUeberwachung } from './lib/zustand/backendStatus.svelte'
  import { ladeCapabilities } from './lib/zustand/capabilities.svelte'
  import { einstellungenModal, schliesseEinstellungen } from './lib/zustand/einstellungenModal.svelte'
  import { layout } from './lib/zustand/layout.svelte'
  import { ladeKiEinstellungen } from './lib/zustand/kiEinstellungen.svelte'
  import { starteKiUeberwachung } from './lib/zustand/kiStatus.svelte'
  import { stelleWieder, tabs } from './lib/zustand/tabs.svelte'

  starteBackendUeberwachung()
  ladeCapabilities()

  // Spaltenbreiten des Rasters aus dem gemerkten Layout. Eingeklappt = 0.
  const spalten = $derived(
    `${layout.linksEingeklappt ? 0 : layout.breiteLinks}px 1fr ${layout.breiteRechts}px`,
  )

  onMount(() => {
    void (async () => {
      // KI-Adresse und -Modell laden, dann die Erreichbarkeit überwachen.
      await ladeKiEinstellungen()
      starteKiUeberwachung()
      await stelleWieder()
      if (tabs.aktiveTabId !== null) {
        void sofortAnalysieren(tabs.aktiveTabId)
      }
    })()
  })
</script>

<div class="app" class:links-zu={layout.linksEingeklappt} style="grid-template-columns: {spalten}">
  <KopfLeiste />
  <SeitenLeisteLinks />
  <main class="haupt">
    <AnsichtsWahl />
    <HauptBereich />
  </main>
  <SeitenLeisteRechts />
  <Konsole />
  <StatusLeiste />
  {#if !layout.linksEingeklappt}
    <LeistenGriff seite="links" />
  {/if}
  <LeistenGriff seite="rechts" />
</div>

<EinstellungenModal offen={einstellungenModal.offen} onSchliessen={schliesseEinstellungen} />
<LexikonPanel />
<Toast />
