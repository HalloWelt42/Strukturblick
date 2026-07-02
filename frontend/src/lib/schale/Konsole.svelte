<script lang="ts">
  // Abfragekonsole (eingeklappt). In dieser Ausbaustufe nur der Kopf -
  // Eingabezeile und Trefferliste kommen mit dem Abfrage-Werkzeug.
  import { zeige } from '../zustand/toaster.svelte'
</script>

<section class="konsole">
  <div class="konsole-kopf">
    <i class="fa-solid fa-terminal"></i> Abfrage
    <span class="luecke"></span>
    <button
      class="icon-knopf"
      aria-label="Konsole ausklappen"
      onclick={() => zeige('Die Abfragekonsole folgt in einer späteren Ausbaustufe.', 'info')}
    >
      <i class="fa-solid fa-chevron-up"></i>
    </button>
  </div>
</section>
