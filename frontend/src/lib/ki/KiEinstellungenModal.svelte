<script lang="ts">
  // KI-Einstellungen als eigenes Modal (kein Browser-Dialog): Adresse des
  // Sprachmodells mit Preset-Knöpfen, Modell-Auswahl und Status-Zeile. Nutzt
  // dieselben Felder wie das große Einstellungen-Modal.
  import Modal from '../hilfsteile/Modal.svelte'
  import KiEinstellungenFelder from './KiEinstellungenFelder.svelte'

  interface Props {
    offen: boolean
    onSchliessen: () => void
  }

  let { offen = $bindable(false), onSchliessen }: Props = $props()
</script>

<Modal titel="KI-Einstellungen" bind:offen {onSchliessen}>
  <div class="einst-gruppe">
    <KiEinstellungenFelder {offen} />
  </div>
  <div class="hinweis-text">
    Ohne erreichbares Sprachmodell bleibt die App vollständig nutzbar - die KI-Funktionen sind dann
    ausgegraut.
  </div>
  {#snippet fuss()}
    <button class="knopf" onclick={onSchliessen}>Schließen</button>
  {/snippet}
</Modal>
