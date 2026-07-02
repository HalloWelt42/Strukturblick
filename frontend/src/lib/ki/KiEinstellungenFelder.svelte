<script lang="ts">
  // Wiederverwendbare KI-Einstellungsfelder (ohne Gruppen-Rahmen): Adresse des
  // Sprachmodells mit Preset-Knöpfen, Modell-Auswahl und Status-Zeile mit
  // Prüfen-Knopf. Wird im KI-Einstellungen-Modal und im großen
  // Einstellungen-Modal gleichermaßen eingesetzt.
  import {
    kiEinstellungen,
    setzeBasisUrl,
    setzeModell,
    STANDARD_KI_BASIS_URL,
  } from '../zustand/kiEinstellungen.svelte'
  import { kiStatus, pruefe } from '../zustand/kiStatus.svelte'

  interface Props {
    /** Sichtbarkeit des umgebenden Modals - beim Öffnen wird der Entwurf gespiegelt. */
    offen: boolean
  }

  let { offen }: Props = $props()

  // Lokaler Entwurf der Adresse - erst beim Prüfen/Übernehmen persistiert.
  let entwurfUrl = $state('')

  $effect(() => {
    if (offen) entwurfUrl = kiEinstellungen.basisUrl
  })

  /**
   * Ersetzt den Host im aktuellen Wert durch 192.168.178.<segment>. Lässt Schema
   * und Port stehen; ist der aktuelle Wert unbrauchbar, wird der Standard-Port
   * 1234 gesetzt.
   */
  function setzePreset(segment: string): void {
    const neuerHost = `192.168.178.${segment}`
    let port = '1234'
    try {
      const url = new URL(entwurfUrl.trim())
      if (url.port !== '') port = url.port
      url.hostname = neuerHost
      entwurfUrl = url.toString().replace(/\/$/, '')
      return
    } catch {
      entwurfUrl = `http://${neuerHost}:${port}`
    }
  }

  function setzeStandard(): void {
    entwurfUrl = STANDARD_KI_BASIS_URL
  }

  /** Übernimmt die Adresse, persistiert sie und prüft neu. */
  function pruefeJetzt(): void {
    const wert = entwurfUrl.trim()
    if (wert !== kiEinstellungen.basisUrl) {
      setzeBasisUrl(wert)
    }
    void pruefe()
  }

  function aendereModell(ereignis: Event): void {
    const wert = (ereignis.currentTarget as HTMLSelectElement).value
    setzeModell(wert === '' ? null : wert)
    void pruefe()
  }

  const statusText = $derived.by((): string => {
    if (kiStatus.erreichbar === null) return 'Wird geprüft …'
    if (kiStatus.erreichbar) {
      const anzahl = kiStatus.modelle.length
      const wort = anzahl === 1 ? 'Modell' : 'Modelle'
      return `Erreichbar - ${anzahl} ${wort}`
    }
    return kiStatus.fehler ?? 'Nicht erreichbar'
  })
</script>

<div class="einst-zeile">
  <div class="einst-text">
    Adresse des Sprachmodells
    <span>Schnittstelle des lokalen Sprachmodells im Netzwerk</span>
  </div>
  <div class="einst-steuer ki-adress-steuer">
    <input class="feld mono ki-adress-feld" type="text" bind:value={entwurfUrl} />
    <button class="knopf klein" onclick={() => setzePreset('49')}>.49</button>
    <button class="knopf klein" onclick={() => setzePreset('50')}>.50</button>
    <button class="knopf klein" onclick={() => setzePreset('51')}>.51</button>
    <button class="knopf klein" title="Auf lokale Adresse zurücksetzen" onclick={setzeStandard}>
      lokal
    </button>
  </div>
</div>
<div class="einst-zeile">
  <div class="einst-text">
    Modell
    <span>Wird für alle KI-Funktionen verwendet</span>
  </div>
  <div class="einst-steuer">
    <select class="feld" value={kiEinstellungen.modell ?? ''} onchange={aendereModell}>
      <option value="">automatisch</option>
      {#each kiStatus.modelle as modellId (modellId)}
        <option value={modellId}>{modellId}</option>
      {/each}
      {#if kiEinstellungen.modell !== null && !kiStatus.modelle.includes(kiEinstellungen.modell)}
        <option value={kiEinstellungen.modell}>{kiEinstellungen.modell}</option>
      {/if}
    </select>
  </div>
</div>
<div class="einst-zeile">
  <div class="einst-text">Status</div>
  <div class="einst-steuer">
    <span class="status-punkt {kiStatus.erreichbar === false ? 'aus' : ''}"></span>
    <span class="beschriftung">{statusText}</span>
    <button class="knopf klein" onclick={pruefeJetzt}>
      <i class="fa-solid fa-rotate"></i> Prüfen
    </button>
  </div>
</div>

<style>
  .ki-adress-steuer {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ki-adress-feld {
    width: 210px;
  }
</style>
