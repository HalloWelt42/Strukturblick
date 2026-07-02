<script lang="ts">
  // Eigener Hover-Tooltip (kein title-Attribut). Die Blase wird fest
  // positioniert, damit sie nicht von overflow-Containern (zum Beispiel
  // der Ansichtswahl) abgeschnitten wird.
  import type { Snippet } from 'svelte'

  interface Props {
    text: string
    children: Snippet
  }

  let { text, children }: Props = $props()

  let sichtbar = $state(false)
  let x = $state(0)
  let y = $state(0)

  function zeigeBlase(ereignis: MouseEvent | FocusEvent): void {
    const anker = ereignis.currentTarget as HTMLElement
    const box = anker.getBoundingClientRect()
    x = box.left + box.width / 2
    y = box.bottom + 6
    sichtbar = true
  }

  function versteckeBlase(): void {
    sichtbar = false
  }
</script>

<span
  class="tooltip-anker"
  role="presentation"
  onmouseenter={zeigeBlase}
  onmouseleave={versteckeBlase}
  onfocusin={zeigeBlase}
  onfocusout={versteckeBlase}
>
  {@render children()}
</span>

{#if sichtbar}
  <span class="tooltip-blase" role="tooltip" style="left: {x}px; top: {y}px">{text}</span>
{/if}

<style>
  .tooltip-anker {
    display: inline-flex;
    align-items: stretch;
  }

  .tooltip-blase {
    position: fixed;
    transform: translateX(-50%);
    padding: var(--a1) var(--a2);
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-2);
    border-radius: var(--radius-panel);
    box-shadow: var(--schatten-1);
    color: var(--text-1);
    font-size: 0.76rem;
    white-space: nowrap;
    pointer-events: none;
    z-index: 55;
  }
</style>
