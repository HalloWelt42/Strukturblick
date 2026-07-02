<script lang="ts">
  // Bestätigungs-Dialog auf Modal-Basis - Ersatz für window.confirm, das in
  // diesem Projekt verboten ist. Schließen über Escape, Hintergrund oder
  // Kreuz zählt als Abbruch.
  import Modal from './Modal.svelte'

  interface Props {
    offen?: boolean
    titel?: string
    frage: string
    bestaetigenText?: string
    abbrechenText?: string
    onErgebnis: (bestaetigt: boolean) => void
  }

  let {
    offen = $bindable(false),
    titel = 'Bestätigung',
    frage,
    bestaetigenText = 'Bestätigen',
    abbrechenText = 'Abbrechen',
    onErgebnis,
  }: Props = $props()

  function beende(bestaetigt: boolean): void {
    offen = false
    onErgebnis(bestaetigt)
  }
</script>

<Modal {titel} bind:offen onSchliessen={() => onErgebnis(false)}>
  {frage}
  {#snippet fuss()}
    <button class="knopf" onclick={() => beende(false)}>{abbrechenText}</button>
    <button class="knopf primaer" onclick={() => beende(true)}>{bestaetigenText}</button>
  {/snippet}
</Modal>
