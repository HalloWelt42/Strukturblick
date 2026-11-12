<script lang="ts">
  // Linke Leiste: Dokumente der obersten Ebene und Ordner der Ablage (Bauart ohne Server: dieser Browser), Öffnen,
  // Herunterladen; der Ordnerknopf öffnet die Seite Ablage.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { aktion } from "../aktionen/aktionen";
  import { ABSCHNITTE, WERKZEUGE, werkzeugSichtbar } from "../werkzeuge/registrierung";
  import { lexikon } from "../lexikon/lexikonZustand.svelte";
  import { rezepte } from "../../zustand/rezepte.svelte";
  import { knopfTitel } from "../aktionen/tastatur";
  import { kontext } from "../bausteine/kontextstand.svelte";
  import { dokumentMenue, ordnerMenue } from "../aktionen/kontextmenues";
  import { fokussieren } from "../bausteine/fokus";
  import { leistenStand } from "./leistenStand.svelte";
  import { einstellungen } from "../../zustand/einstellungen.svelte";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const offen = $derived(new Set(arbeitsplatz.blaetter.map((b) => b.kennung)));

  const oben = $derived(arbeitsplatz.dokumente.filter((d) => !d.ordner));
  const anzahl = (o: string): number => arbeitsplatz.dokumente.filter((d) => d.ordner === o).length;
  const ablageOffen = $derived(arbeitsplatz.seite === "ablage");

  // ----- Umbenennen an Ort und Stelle (aus dem Kontextmenü oder mit F2) -----
  const umbenennt = (art: "dokument" | "ordner", wert: string): boolean => {
    const u = leistenStand.umbenennen;
    return u !== null && u.art === art && (u.art === "dokument" ? u.kennung : u.name) === wert;
  };

  function umbenennenFertig(e: Event): void {
    const u = leistenStand.umbenennen;
    if (!u) return;
    leistenStand.umbenennen = null;
    const neu = (e.currentTarget as HTMLInputElement).value.trim();
    if (!neu) return;
    if (u.art === "dokument") void ablageverwaltung.umbenennen(u.kennung, neu);
    else if (neu !== u.name) void ablageverwaltung.ordnerUmbenennen(u.name, neu);
  }

  function umbenennenTaste(e: KeyboardEvent): void {
    if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
    else if (e.key === "Escape") leistenStand.umbenennen = null;
  }

  function ordnerOeffnen(o: string): void {
    ablageverwaltung.ordnerWahl = o;
    ablageverwaltung.oeffnen();
  }

  const oeffnen = aktion("datei-oeffnen");
  const laden = aktion("herunterladen");
  const verwalten = aktion("ablage");
  const leisteAktion = aktion("leiste");
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
        {#if umbenennt("dokument", d.kennung)}
          <label class="eintrag umbenennen"><i class="fa-solid fa-file-lines"></i><input value={d.name} aria-label="Neuer Name für {d.name}" use:fokussieren onkeydown={umbenennenTaste} onblur={umbenennenFertig} /></label>
        {:else}
          <div class="dok-zeile" use:kontext={() => dokumentMenue(d, () => (leistenStand.umbenennen = { art: "dokument", kennung: d.kennung }))}>
            <a
              class="eintrag"
              class:aktiv={!ablageOffen && blatt?.kennung === d.kennung}
              href="#{d.kennung}"
              title="{d.name} (Rechtsklick: Menü, F2: Umbenennen)"
              onclick={(e) => { e.preventDefault(); void arbeitsplatz.ausAblageOeffnen(d.kennung); }}
              onkeydown={(e) => e.key === "F2" && (e.preventDefault(), (leistenStand.umbenennen = { art: "dokument", kennung: d.kennung }))}
            >
              <i class="fa-solid fa-file-lines"></i><span class="name">{d.name}</span>
              <span class="rechts">{#if offen.has(d.kennung)}<span class="abzeichen" title="Als Reiter geöffnet">offen</span>{/if}</span>
            </a>
            <button class="knopf still nur-symbol dok-weg" title="{d.name} in den Papierkorb (Rückgängig in der Meldung)" aria-label="{d.name} in den Papierkorb" onclick={() => void ablageverwaltung.entfernen([d.kennung])}><i class="fa-solid fa-trash-can"></i></button>
          </div>
        {/if}
      {/each}
      {#each ablageverwaltung.ordner as o (o)}
        {#if umbenennt("ordner", o)}
          <label class="eintrag umbenennen"><i class="fa-solid fa-folder"></i><input value={o} aria-label="Neuer Name für Ordner {o}" use:fokussieren onkeydown={umbenennenTaste} onblur={umbenennenFertig} /></label>
        {:else}
          <a class="eintrag" class:aktiv={ablageOffen && ablageverwaltung.ordnerWahl === o} href="#{o}" title="Ordner {o} (Rechtsklick: Menü, F2: Umbenennen)" onclick={(e) => { e.preventDefault(); ordnerOeffnen(o); }} onkeydown={(e) => e.key === "F2" && (e.preventDefault(), (leistenStand.umbenennen = { art: "ordner", name: o }))} use:kontext={() => ordnerMenue(o)}>
            <i class="fa-solid fa-folder"></i><span class="name">{o}</span><span class="rechts"><span class="text-3 klein mono">{anzahl(o)}</span></span>
          </a>
        {/if}
      {/each}
    {/if}
    {#each ABSCHNITTE as abschnitt (abschnitt.kennung)}
      <div class="leiste-titel">{abschnitt.titel}</div>
      {#each WERKZEUGE.filter((w) => w.abschnitt === abschnitt.kennung && werkzeugSichtbar(w)) as w (w.kennung)}
        {@const a = werkzeugAktion(w.kennung)}
        <button class="eintrag" class:aktiv={offenesWerkzeug === w.kennung} disabled={!a.verfuegbar()} title={a.verfuegbar() ? w.beschreibung : "Erst ein Dokument öffnen"} onclick={() => a.ausfuehren()}>
          <i class="fa-solid {w.symbol}"></i><span class="name">{w.titel}</span>
        </button>
      {/each}
    {/each}
    <div class="leiste-titel">Rezepte <span class="rechts"><button class="knopf still nur-symbol" class:aktiv-knopf={offenesWerkzeug === "rezepte"} disabled={!rezepteAktion.verfuegbar()} title={rezepteAktion.verfuegbar() ? "Alle Rezepte" : "Erst ein Dokument öffnen"} onclick={() => rezepteAktion.ausfuehren()}><i class="fa-solid fa-list"></i></button></span></div>
    {#each rezepte.liste as r (r.kennung)}
      <button class="eintrag" class:aktiv={offenesWerkzeug === "rezepte" && rezepte.aktuell?.kennung === r.kennung} disabled={!blatt} title={blatt ? `${r.name}: ${r.schritte.length} Schritte, aus ${r.quelle}` : "Erst ein Dokument öffnen"} onclick={() => rezeptOeffnen(r.kennung)}>
        <i class="fa-solid fa-scroll"></i><span class="name">{r.name}</span><span class="rechts"><span class="text-3 klein mono">{r.schritte.length}</span></span>
      </button>
    {:else}
      <button class="eintrag" disabled={!rezepteAktion.verfuegbar()} title="Was Rezepte sind und wie eins entsteht" onclick={() => rezepteAktion.ausfuehren()}><i class="fa-solid fa-scroll"></i><span class="name text-3">Noch keine Rezepte</span></button>
    {/each}
    <div class="leiste-titel">Nachschlagen</div>
    <button class="eintrag" class:aktiv={lexikon.offen} title="Lexikon: Pfade, Abfragen, Formate, Ansichten, Werkzeuge und Fachwörter (F1)" onclick={() => lexikon.umschalten()}>
      <i class="fa-solid fa-book-open"></i><span class="name">Lexikon</span>
    </button>
  </div>
  <div class="leiste-fuss">
    <i class="fa-solid fa-circle-info" title={arbeitsplatz.ablage.hinweis}></i><span>{arbeitsplatz.ablage.hinweis}</span>
    <button class="knopf still nur-symbol leisten-knopf" title={knopfTitel(leisteAktion)} aria-label={leisteAktion.titel} aria-pressed={einstellungen.leiste === "schmal"} onclick={() => leisteAktion.ausfuehren()}><i class="fa-solid {einstellungen.leiste === 'schmal' ? 'fa-angles-right' : 'fa-angles-left'}"></i></button>
  </div>
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
  /* Umbenennen an Ort und Stelle: das Feld nimmt die Zeile ein */
  .umbenennen input {
    flex: 1;
    min-width: 0;
    height: calc(var(--zeile) - 6px);
    padding: 0 var(--a1);
    border: 0;
    background: var(--flaeche-eingabe);
    box-shadow: var(--vertieft), 0 0 0 2px var(--akzent-flaeche);
    font: inherit;
    color: var(--text-1);
  }
  .umbenennen input:focus {
    outline: 0;
  }
  /* Papierkorb je Dokument: erscheint beim Darüberfahren und mit der Tastatur; auf Touch-Geräten immer */
  .dok-zeile {
    position: relative;
  }
  .dok-weg {
    position: absolute;
    top: 50%;
    right: var(--a1);
    translate: 0 -50%;
    opacity: 0;
  }
  .dok-zeile:hover .dok-weg,
  .dok-weg:focus-visible {
    opacity: 1;
  }
  .dok-zeile:hover .rechts {
    visibility: hidden;
  }
  @media (hover: none) {
    .dok-weg {
      opacity: 1;
    }
  }
  @media (max-width: 899px) {
    .dok-weg {
      display: none;
    }
  }
</style>
