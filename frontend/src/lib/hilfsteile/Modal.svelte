<script lang="ts">
  // Eigenes Modal (Ersatz für Browser-Dialoge). Nutzt die globalen Klassen
  // modal-hintergrund/modal/modal-kopf/modal-inhalt/modal-fuss aus app.css.
  // Escape und ein Klick auf den Hintergrund schließen das Modal.
  import type { Snippet } from 'svelte'

  interface Props {
    titel: string
    offen?: boolean
    /** Wird gerufen, wenn das Modal sich selbst schließt (Escape, Hintergrund, Kreuz). */
    onSchliessen?: () => void
    children: Snippet
    fuss?: Snippet
  }

  let { titel, offen = $bindable(false), onSchliessen, children, fuss }: Props = $props()

  function schliesse(): void {
    offen = false
    onSchliessen?.()
  }

  function beiHintergrundKlick(ereignis: MouseEvent): void {
    if (ereignis.target === ereignis.currentTarget) schliesse()
  }

  function beiTastendruck(ereignis: KeyboardEvent): void {
    if (offen && ereignis.key === 'Escape') schliesse()
  }
</script>

<svelte:window onkeydown={beiTastendruck} />

{#if offen}
  <div class="modal-hintergrund" role="presentation" onclick={beiHintergrundKlick}>
    <div class="modal" role="dialog" aria-modal="true" aria-label={titel}>
      <div class="modal-kopf">
        {titel}
        <button class="icon-knopf" aria-label="Schließen" onclick={schliesse}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-inhalt">
        {@render children()}
      </div>
      {#if fuss}
        <div class="modal-fuss">
          {@render fuss()}
        </div>
      {/if}
    </div>
  </div>
{/if}
