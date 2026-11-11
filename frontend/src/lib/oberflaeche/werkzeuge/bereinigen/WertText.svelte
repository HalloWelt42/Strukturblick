<script lang="ts">
  // Ein Wert, wie er im Text steht: Leerzeichen am Ende werden sichtbar, ein leerer Wert heißt "(leer)".
  let { wert }: { wert: string } = $props();
  const kern = $derived(wert.trimEnd());
  const rest = $derived(wert.length - kern.length);
</script>

{#if wert === ""}<span class="br-leer-wert">(leer)</span>{:else}{kern}{#each { length: rest } as _, i (i)}<span class="br-leerzeichen" title="Leerzeichen am Ende"></span>{/each}{/if}
