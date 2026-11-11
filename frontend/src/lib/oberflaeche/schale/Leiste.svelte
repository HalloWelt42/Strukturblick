<script lang="ts">
  // Linke Leiste: Dokumente der obersten Ebene und Ordner der Ablage (Bauart ohne Server: dieser Browser), Öffnen,
  // Herunterladen; der Ordnerknopf öffnet die Seite Ablage.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { aktion } from "../aktionen/aktionen";
  import { WERKZEUGE } from "../werkzeuge/registrierung";
  import { rezepte } from "../../zustand/rezepte.svelte";
  import { knopfTitel } from "../aktionen/tastatur";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const offen = $derived(new Set(arbeitsplatz.blaetter.map((b) => b.kennung)));

  const oben = $derived(arbeitsplatz.dokumente.filter((d) => !d.ordner));
  const anzahl = (o: string): number => arbeitsplatz.dokumente.filter((d) => d.ordner === o).length;
  const ablageOffen = $derived(arbeitsplatz.seite === "ablage");

  function ordnerOeffnen(o: string): void {
    ablageverwaltung.ordnerWahl = o;
    ablageverwaltung.oeffnen();
  }

  const oeffnen = aktion("datei-oeffnen");
  const laden = aktion("herunterladen");
  const verwalten = aktion("ablage");
  const offenesWerkzeug = $derived(!ablageOffen && blatt?.platz.art === "werkzeug" ? blatt.platz.kennung : null);
  const werkzeugAktion = (kennung: string) => aktion(`werkzeug-${kennung}`);
  const rezepteAktion = werkzeugAktion("rezepte");
  rezepte.sicherGeladen();

  function rezeptOeffnen(kennung: string): void {
    if (!blatt) return;
    ablageverwaltung.schliessen();
    rezepte.oeffnen(blatt, kennung);
  }
</script>

<aside class="leiste">
  <div class="leiste-feld">
    <div class="leiste-titel">{arbeitsplatz.ablage.ort} <span class="rechts"><button class="knopf still nur-symbol" class:aktiv-knopf={ablageOffen} title={knopfTitel(verwalten, ablageOffen ? "Ablage schließen" : "Ablage verwalten: Ordner, Umbenennen, Papierkorb")} onclick={() => verwalten.ausfuehren()}><i class="fa-solid fa-folder-open"></i></button></span></div>
    <div class="knopf-spalte">
      <button class="knopf" title={knopfTitel(oeffnen)} onclick={() => oeffnen.ausfuehren()}><i class="fa-solid fa-folder-open"></i> <span class="name">Datei öffnen</span></button>
      <button class="knopf" disabled={!laden.verfuegbar()} title={knopfTitel(laden)} onclick={() => laden.ausfuehren()}><i class="fa-solid fa-download"></i> <span class="name">Herunterladen</span></button>
    </div>
    {#if arbeitsplatz.dokumente.length || ablageverwaltung.ordner.length}
      <div class="leiste-titel">Dokumente</div>
      {#each oben as d (d.kennung)}
        <a
          class="eintrag"
          class:aktiv={!ablageOffen && blatt?.kennung === d.kennung}
          href="#{d.kennung}"
          title={d.name}
          onclick={(e) => { e.preventDefault(); void arbeitsplatz.ausAblageOeffnen(d.kennung); }}
        >
          <i class="fa-solid fa-file-lines"></i><span class="name">{d.name}</span>
          <span class="rechts">{#if offen.has(d.kennung)}<span class="abzeichen" title="Als Reiter geöffnet">offen</span>{/if}</span>
        </a>
      {/each}
      {#each ablageverwaltung.ordner as o (o)}
        <a class="eintrag" class:aktiv={ablageOffen && ablageverwaltung.ordnerWahl === o} href="#{o}" title="Ordner {o}" onclick={(e) => { e.preventDefault(); ordnerOeffnen(o); }}>
          <i class="fa-solid fa-folder"></i><span class="name">{o}</span><span class="rechts"><span class="text-3 klein mono">{anzahl(o)}</span></span>
        </a>
      {/each}
    {/if}
    <div class="leiste-titel">Prüfen und umbauen</div>
    {#each WERKZEUGE.filter((w) => w.abschnitt === "pruefen") as w (w.kennung)}
      {@const a = werkzeugAktion(w.kennung)}
      <button class="eintrag" class:aktiv={offenesWerkzeug === w.kennung} disabled={!a.verfuegbar()} title={a.verfuegbar() ? w.beschreibung : "Erst ein Dokument öffnen"} onclick={() => a.ausfuehren()}>
        <i class="fa-solid {w.symbol}"></i><span class="name">{w.titel}</span>
      </button>
    {/each}
    <div class="leiste-titel">Rezepte <span class="rechts"><button class="knopf still nur-symbol" class:aktiv-knopf={offenesWerkzeug === "rezepte"} disabled={!rezepteAktion.verfuegbar()} title={rezepteAktion.verfuegbar() ? "Alle Rezepte" : "Erst ein Dokument öffnen"} onclick={() => rezepteAktion.ausfuehren()}><i class="fa-solid fa-list"></i></button></span></div>
    {#each rezepte.liste as r (r.kennung)}
      <button class="eintrag" class:aktiv={offenesWerkzeug === "rezepte" && rezepte.aktuell?.kennung === r.kennung} disabled={!blatt} title={blatt ? `${r.name}: ${r.schritte.length} Schritte, aus ${r.quelle}` : "Erst ein Dokument öffnen"} onclick={() => rezeptOeffnen(r.kennung)}>
        <i class="fa-solid fa-scroll"></i><span class="name">{r.name}</span><span class="rechts"><span class="text-3 klein mono">{r.schritte.length}</span></span>
      </button>
    {:else}
      <button class="eintrag" disabled={!rezepteAktion.verfuegbar()} title="Was Rezepte sind und wie eins entsteht" onclick={() => rezepteAktion.ausfuehren()}><i class="fa-solid fa-scroll"></i><span class="name text-3">Noch keine Rezepte</span></button>
    {/each}
  </div>
  <div class="leiste-fuss"><i class="fa-solid fa-circle-info"></i><span>{arbeitsplatz.ablage.hinweis}</span></div>
</aside>

<style>
  .aktiv-knopf {
    color: var(--akzent);
  }
  .knopf-spalte {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    padding: 0 var(--a2) var(--a2);
  }
  .knopf-spalte .knopf {
    justify-content: flex-start;
  }
  .leiste-fuss span {
    white-space: normal;
  }
</style>
