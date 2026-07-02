<script lang="ts">
  // Rechte Seitenleiste nach Mockup: Inspektor (noch ohne Auswahl) und der
  // KI-Bereich. Die KI-Anbindung fehlt in dieser Ausbaustufe - die Aktionen
  // sind ausgegraut, der Status-Punkt steht auf "aus".
  interface KiAktion {
    icon: string
    name: string
  }

  const KI_AKTIONEN: KiAktion[] = [
    { icon: 'fa-comment-dots', name: 'Daten erklären' },
    { icon: 'fa-magnifying-glass', name: 'Frage in Abfrage übersetzen' },
    { icon: 'fa-diagram-project', name: 'Schema aus Beschreibung' },
    { icon: 'fa-file-lines', name: 'Beschreibung aus Schema' },
    { icon: 'fa-cubes', name: 'Testdaten vorschlagen' },
  ]
</script>

<aside class="seite-rechts">
  <div class="leisten-titel">Inspektor</div>
  <div class="inspektor-block">
    <div class="hinweis-text">Kein Element ausgewählt.</div>
  </div>

  <div class="ki-kopfzeile">
    <i class="fa-solid fa-wand-magic-sparkles"></i> KI-Werkzeuge
    <span class="luecke"></span>
    <span class="status-punkt aus"></span>
  </div>
  <div class="bereich-ausgegraut">
    {#each KI_AKTIONEN as aktion (aktion.name)}
      <button class="ki-aktion">
        <i class="fa-solid {aktion.icon}"></i>
        {aktion.name}
      </button>
    {/each}
  </div>
  <div class="ki-hinweis">
    <i class="fa-solid fa-circle-info"></i>
    <span>Die KI-Anbindung folgt in einer späteren Ausbaustufe.</span>
  </div>
</aside>
