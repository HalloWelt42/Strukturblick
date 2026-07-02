<script lang="ts">
  // Linke Seitenleiste nach Mockup: Dokumente, Werkzeuge, Nachschlagen und
  // der Leisten-Fuß mit der Versionsnummer.
  import { zeige } from '../zustand/toaster.svelte'

  interface Werkzeug {
    icon: string
    name: string
  }

  const WERKZEUGE: Werkzeug[] = [
    { icon: 'fa-magnifying-glass', name: 'Abfrage' },
    { icon: 'fa-shuffle', name: 'Konvertieren' },
    { icon: 'fa-clipboard-check', name: 'Validieren' },
    { icon: 'fa-screwdriver-wrench', name: 'Reparatur' },
    { icon: 'fa-code', name: 'Code erzeugen' },
    { icon: 'fa-cubes', name: 'Testdaten' },
  ]

  function folgtSpaeter(name: string): void {
    zeige(`"${name}" folgt in einer späteren Ausbaustufe.`, 'info')
  }
</script>

<nav class="seite-links">
  <div class="leisten-titel">
    Dokumente
    <button
      class="icon-knopf"
      aria-label="Dokumente verwalten"
      onclick={() => folgtSpaeter('Dokumente verwalten')}
    >
      <i class="fa-solid fa-folder-open"></i>
    </button>
  </div>
  <div class="hinweis-text" style="padding: 0 var(--a3) var(--a2)">
    Noch keine Dokumente gespeichert.
  </div>

  <div class="leisten-titel">Werkzeuge</div>
  {#each WERKZEUGE as werkzeug (werkzeug.name)}
    <button class="werkzeug-eintrag" onclick={() => folgtSpaeter(werkzeug.name)}>
      <i class="fa-solid {werkzeug.icon}"></i>
      {werkzeug.name}
    </button>
  {/each}

  <div class="leisten-titel">Nachschlagen</div>
  <button class="werkzeug-eintrag" onclick={() => folgtSpaeter('Lexikon')}>
    <i class="fa-solid fa-book-open"></i> Lexikon
  </button>

  <div class="leisten-fuss">Strukturblick v{__APP_VERSION__}</div>
</nav>

<style>
  /* Button-Reset: die Mockups nutzen <a>-Elemente, in der App sind die
     Werkzeug-Einträge echte Knöpfe. Optik kommt aus .werkzeug-eintrag. */
  button.werkzeug-eintrag {
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: var(--schrift-anzeige);
  }

  button.werkzeug-eintrag:hover {
    background: var(--akzent-weich);
  }
</style>
