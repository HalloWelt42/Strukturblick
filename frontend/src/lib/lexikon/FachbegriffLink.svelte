<script lang="ts">
  // Fachbegriff-Auslöser an fachlichen Stellen der Oberfläche: öffnet das
  // Lexikon beim passenden Thema; optional wird ein Begriff gleich gesucht
  // und hervorgehoben. <FachbegriffLink topic="jsonpath" find="Filter">
  // JSONPath</FachbegriffLink>
  import type { Snippet } from 'svelte'

  import { lexikon } from './lexikon.svelte'

  interface Props {
    topic: string
    find?: string
    children: Snippet
  }

  let { topic, find = '', children }: Props = $props()

  function oeffne(ereignis: MouseEvent): void {
    ereignis.preventDefault()
    ereignis.stopPropagation()
    lexikon.oeffne(topic, find === '' ? undefined : find)
  }
</script>

<button type="button" class="fachbegriff-link" onclick={oeffne}>
  {@render children()}
  <i class="fa-solid fa-circle-info"></i>
</button>

<style>
  /* Optik wie .fachbegriff aus app.css, als echter Knopf. */
  .fachbegriff-link {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: var(--akzent);
    border-bottom: 1px dotted var(--akzent);
    cursor: help;
    display: inline-flex;
    align-items: baseline;
    gap: 3px;
  }

  .fachbegriff-link > i {
    font-size: 0.72em;
    transform: translateY(-1px);
  }
</style>
