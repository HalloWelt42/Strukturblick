<script lang="ts">
  // Kleines Eingabe-Modal für KI-Aktionen, die zuerst eine Texteingabe brauchen
  // (Frage in Alltagssprache bzw. Struktur-Beschreibung). Eigenes Modal statt
  // Browser-Dialog. Bestätigen gibt den getrimmten Text an onBestaetige.
  import Modal from '../hilfsteile/Modal.svelte'

  interface Props {
    offen: boolean
    titel: string
    beschriftung: string
    platzhalter: string
    knopfText: string
    onBestaetige: (text: string) => void
    onSchliessen: () => void
  }

  let {
    offen = $bindable(false),
    titel,
    beschriftung,
    platzhalter,
    knopfText,
    onBestaetige,
    onSchliessen,
  }: Props = $props()

  let text = $state('')

  // Bei jedem Öffnen das Feld leeren.
  $effect(() => {
    if (offen) text = ''
  })

  function bestaetige(): void {
    const wert = text.trim()
    if (wert === '') return
    onBestaetige(wert)
    offen = false
  }
</script>

<Modal {titel} bind:offen {onSchliessen}>
  <label class="beschriftung" for="ki-eingabe-feld">{beschriftung}</label>
  <textarea
    id="ki-eingabe-feld"
    class="feld ki-eingabe-feld"
    placeholder={platzhalter}
    bind:value={text}
  ></textarea>
  {#snippet fuss()}
    <button class="knopf" onclick={onSchliessen}>Abbrechen</button>
    <button class="knopf primaer" disabled={text.trim() === ''} onclick={bestaetige}>
      {knopfText}
    </button>
  {/snippet}
</Modal>

<style>
  .ki-eingabe-feld {
    display: block;
    width: 100%;
    min-height: 96px;
    margin-top: var(--a2);
    resize: vertical;
  }
</style>
