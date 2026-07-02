<script lang="ts">
  // Statusleiste: links die Brotkrumen (in dieser Ausbaustufe nur "Bereit"),
  // rechts die Backend-Erreichbarkeit und die Frontend-Version.
  import { backendStatus } from '../zustand/backendStatus.svelte'
</script>

<footer class="status">
  <nav class="brotkrumen">
    <span class="aktuell">Bereit</span>
  </nav>
  <div class="status-rechts">
    <span class="backend-anzeige">
      {#if backendStatus.erreichbar === null}
        Prüfe ...
      {:else if backendStatus.erreichbar}
        <span class="status-punkt"></span> Backend erreichbar
      {:else}
        <span class="status-punkt aus"></span> Backend nicht erreichbar
      {/if}
    </span>
    <span class="trenner-v"></span>
    <span>v{__APP_VERSION__}</span>
  </div>
</footer>

<style>
  .backend-anzeige {
    display: inline-flex;
    align-items: center;
    gap: var(--a2);
  }
</style>
