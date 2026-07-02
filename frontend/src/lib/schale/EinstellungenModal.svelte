<script lang="ts">
  // Großes Einstellungen-Modal nach Mockup: KI (Adresse, Modell, Status, KI
  // anbieten), Grenzen (Warnung/Ablehnung nach Dokumentgröße), Darstellung
  // (Theme-Kacheln) und Arbeitsstand (Export/Import, Speicherverbrauch). Alle
  // Werte werden sofort in IndexedDB bzw. localStorage persistiert.
  import { menschenlesbareGroesse } from '../dienste/groessenFormat'
  import ArbeitsstandEinspielen from '../hilfsteile/ArbeitsstandEinspielen.svelte'
  import KiEinstellungenFelder from '../ki/KiEinstellungenFelder.svelte'
  import Modal from '../hilfsteile/Modal.svelte'
  import {
    ablehnungAbBytes,
    SCHLUESSEL_ABLEHNUNG_AB_BYTES,
    SCHLUESSEL_WARNUNG_AB_BYTES,
    setzeEinstellung,
    warnungAbBytes,
  } from '../speicher/einstellungenSpeicher'
  import {
    exportiereAlsText,
    lesePaket,
    speicherSchaetzung,
    type SpeicherSchaetzung,
    type TransferPaket,
  } from '../speicher/transfer'
  import { theme, wendeThemeAn } from '../theme/theme.svelte'
  import { THEMES } from '../theme/themes'
  import { kiEinstellungen, setzeAngeboten } from '../zustand/kiEinstellungen.svelte'
  import { ladeNeu } from '../zustand/dokumentListe.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  interface Props {
    offen: boolean
    onSchliessen: () => void
  }

  let { offen = $bindable(false), onSchliessen }: Props = $props()

  const MB = 1024 * 1024

  // Grenzen als MB-Zahlen im Entwurf; beim Öffnen aus dem Speicher geladen.
  let warnungMb = $state(10)
  let ablehnungMb = $state(50)
  let verbrauch = $state<SpeicherSchaetzung | null>(null)

  // Verstecktes Dateifeld für den Import und das gelesene Paket zur Modus-Wahl.
  let dateiFeld: HTMLInputElement | null = $state(null)
  let einspielPaket = $state<TransferPaket | null>(null)

  $effect(() => {
    if (!offen) return
    void (async () => {
      warnungMb = Math.round((await warnungAbBytes()) / MB)
      ablehnungMb = Math.round((await ablehnungAbBytes()) / MB)
      verbrauch = await speicherSchaetzung()
    })()
  })

  function speichereWarnung(): void {
    if (!Number.isFinite(warnungMb) || warnungMb <= 0) return
    void setzeEinstellung(SCHLUESSEL_WARNUNG_AB_BYTES, Math.round(warnungMb * MB))
  }

  function speichereAblehnung(): void {
    if (!Number.isFinite(ablehnungMb) || ablehnungMb <= 0) return
    void setzeEinstellung(SCHLUESSEL_ABLEHNUNG_AB_BYTES, Math.round(ablehnungMb * MB))
  }

  /** Baut den aktuellen Stand als Datei und lädt sie herunter. */
  async function exportiere(): Promise<void> {
    try {
      const text = await exportiereAlsText()
      const marke = new Date().toISOString().slice(0, 10)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anker = document.createElement('a')
      anker.href = url
      anker.download = `strukturblick-arbeitsstand-${marke}.json`
      anker.click()
      URL.revokeObjectURL(url)
      zeige('Arbeitsstand exportiert.', 'erfolg')
    } catch {
      zeige('Der Arbeitsstand konnte nicht exportiert werden.', 'fehler')
    }
  }

  function starteImport(): void {
    dateiFeld?.click()
  }

  async function dateiGewaehlt(ereignis: Event): Promise<void> {
    const feld = ereignis.currentTarget as HTMLInputElement
    const datei = feld.files?.[0]
    feld.value = '' // erneute Auswahl derselben Datei ermöglichen
    if (!datei) return
    try {
      const roh: unknown = JSON.parse(await datei.text())
      einspielPaket = lesePaket(roh)
    } catch (grund: unknown) {
      const meldung = grund instanceof Error ? grund.message : 'Die Datei konnte nicht gelesen werden.'
      zeige(meldung, 'fehler')
    }
  }

  async function nachEinspielen(): Promise<void> {
    await ladeNeu()
    verbrauch = await speicherSchaetzung()
  }

  const verbrauchText = $derived(
    verbrauch === null ? 'unbekannt' : menschenlesbareGroesse(verbrauch.verwendetBytes),
  )
  const verbrauchProzent = $derived(
    verbrauch === null ? 0 : Math.min(100, Math.round(verbrauch.anteil * 100)),
  )
</script>

<Modal titel="Einstellungen" breit bind:offen {onSchliessen}>
  <div class="einst-gruppe">
    <h3>KI</h3>
    <KiEinstellungenFelder {offen} />
    <div class="einst-zeile">
      <div class="einst-text">
        KI-Funktionen anbieten
        <span>Ohne Sprachmodell bleibt die App vollständig nutzbar</span>
      </div>
      <div class="einst-steuer">
        <button
          class="schalter {kiEinstellungen.angeboten ? 'an' : ''}"
          role="switch"
          aria-checked={kiEinstellungen.angeboten}
          aria-label="KI-Funktionen anbieten"
          onclick={() => setzeAngeboten(!kiEinstellungen.angeboten)}
        ></button>
      </div>
    </div>
  </div>

  <div class="einst-gruppe">
    <h3>Grenzen</h3>
    <div class="einst-zeile">
      <div class="einst-text">
        Warnung ab Dokumentgröße
        <span>Vor dem Öffnen großer Dateien nachfragen</span>
      </div>
      <div class="einst-steuer">
        <input
          class="feld grenz-feld"
          type="number"
          min="1"
          bind:value={warnungMb}
          onchange={speichereWarnung}
        />
        <span class="beschriftung">MB</span>
      </div>
    </div>
    <div class="einst-zeile">
      <div class="einst-text">
        Ablehnung ab
        <span>Größere Dateien werden nicht geladen</span>
      </div>
      <div class="einst-steuer">
        <input
          class="feld grenz-feld"
          type="number"
          min="1"
          bind:value={ablehnungMb}
          onchange={speichereAblehnung}
        />
        <span class="beschriftung">MB</span>
      </div>
    </div>
  </div>

  <div class="einst-gruppe">
    <h3>Darstellung</h3>
    <div class="theme-reihe">
      {#each THEMES as eintrag (eintrag.id)}
        <button
          class="theme-kachel {theme.aktivId === eintrag.id ? 'aktiv' : ''}"
          aria-pressed={theme.aktivId === eintrag.id}
          onclick={() => wendeThemeAn(eintrag.id)}
        >
          <div class="tk-vorschau">
            <i style="background: {eintrag.vorschau.flaeche}"></i>
            <i style="background: {eintrag.vorschau.akzent}"></i>
            <i style="background: {eintrag.vorschau.text}"></i>
          </div>
          <div class="tk-name">{eintrag.name}</div>
        </button>
      {/each}
    </div>
    <div class="hinweis-text">Weitere Themes lassen sich zentral ergänzen.</div>
  </div>

  <div class="einst-gruppe">
    <h3>Arbeitsstand</h3>
    <div class="einst-zeile">
      <div class="einst-text">
        Sichern und Wiederherstellen
        <span>Alle Dokumente und Einstellungen als Datei</span>
      </div>
      <div class="einst-steuer">
        <button class="knopf klein" onclick={() => void exportiere()}>
          <i class="fa-solid fa-download"></i> Exportieren
        </button>
        <button class="knopf klein" onclick={starteImport}>
          <i class="fa-solid fa-upload"></i> Importieren
        </button>
      </div>
    </div>
    <div class="einst-zeile">
      <div class="einst-text">Speicherverbrauch: {verbrauchText}</div>
      <div class="einst-steuer">
        <div class="fortschritt grenz-verbrauch">
          <i style="width: {verbrauchProzent}%"></i>
        </div>
      </div>
    </div>
  </div>

  <input
    bind:this={dateiFeld}
    class="versteckt-feld"
    type="file"
    accept=".json,application/json"
    onchange={dateiGewaehlt}
  />

  {#snippet fuss()}
    <button class="knopf" onclick={onSchliessen}>Schließen</button>
  {/snippet}
</Modal>

<!-- Einspiel-Modus wählen (kein Auto-Ersetzen). -->
<ArbeitsstandEinspielen
  paket={einspielPaket}
  onSchliessen={() => (einspielPaket = null)}
  onEingespielt={nachEinspielen}
/>

<style>
  .theme-reihe {
    display: flex;
    gap: var(--a3);
    padding: var(--a2) 0;
  }

  .grenz-feld {
    width: 90px;
  }

  .grenz-verbrauch {
    width: 160px;
  }

  .versteckt-feld {
    display: none;
  }
</style>
