<script lang="ts">
  // Ein Wert, wie er im Text steht: Leerzeichen am Ende werden sichtbar (je eins ein gelbes Kästchen), ein leerer Wert
  // heißt "(leer)". Für Bereinigen, Rezepte und überall, wo Schreibweisen verglichen werden.
  let { wert }: { wert: string } = $props();
  const kern = $derived(wert.trimEnd());
  const rest = $derived(wert.length - kern.length);
</script>

{#if wert === ""}<span class="leer">(leer)</span>{:else}{kern}{#each { length: rest } as _, i (i)}<span class="leerzeichen" title="Leerzeichen am Ende"></span>{/each}{/if}

<style>
  .leer {
    font-style: italic;
    color: var(--text-3);
  }
  .leerzeichen {
    display: inline-block;
    width: 0.6em;
    height: 1em;
    margin-left: 1px;
    vertical-align: -0.15em;
    background: var(--warn-weich);
    box-shadow: inset 0 0 0 1px var(--warn);
  }
</style>
