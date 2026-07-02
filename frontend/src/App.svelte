<script lang="ts">
  // App-Schale: Raster aus app.css (.app), zusammengesetzt aus den
  // Schale-Komponenten. Startet die Backend-Überwachung und lädt die
  // Capabilities einmalig.
  import Toast from './lib/hilfsteile/Toast.svelte'
  import AnsichtsWahl from './lib/schale/AnsichtsWahl.svelte'
  import HauptBereich from './lib/schale/HauptBereich.svelte'
  import Konsole from './lib/schale/Konsole.svelte'
  import KopfLeiste from './lib/schale/KopfLeiste.svelte'
  import SeitenLeisteLinks from './lib/schale/SeitenLeisteLinks.svelte'
  import SeitenLeisteRechts from './lib/schale/SeitenLeisteRechts.svelte'
  import StatusLeiste from './lib/schale/StatusLeiste.svelte'
  import { starteBackendUeberwachung } from './lib/zustand/backendStatus.svelte'
  import { ladeCapabilities } from './lib/zustand/capabilities.svelte'

  starteBackendUeberwachung()
  ladeCapabilities()
</script>

<div class="app">
  <KopfLeiste />
  <SeitenLeisteLinks />
  <main class="haupt">
    <AnsichtsWahl />
    <HauptBereich />
  </main>
  <SeitenLeisteRechts />
  <Konsole />
  <StatusLeiste />
</div>

<Toast />
