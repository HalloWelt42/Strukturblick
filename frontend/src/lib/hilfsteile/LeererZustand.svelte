<script lang="ts">
  // Leerzustand nach Mockup-Klasse .leer-zustand: Icon, Titel, Text und
  // optional ein Snippet mit Aktionen (Knöpfe, Abzeichen, ...).
  import type { Snippet } from 'svelte'

  interface Props {
    /** Icon-Klasse ohne Stil-Präfix, zum Beispiel "fa-sitemap". */
    icon: string
    titel: string
    text: string
    aktionen?: Snippet
  }

  let { icon, titel, text, aktionen }: Props = $props()
</script>

<div class="leer-zustand">
  <i class="fa-solid {icon}"></i>
  <strong>{titel}</strong>
  <span>{text}</span>
  {@render aktionen?.()}
</div>
