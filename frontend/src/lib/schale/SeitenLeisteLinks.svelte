<script lang="ts">
  // Linke Seitenleiste nach Mockup: gespeicherte Dokumente aus der Bibliothek,
  // Werkzeuge, Nachschlagen und der Leisten-Fuß mit der Versionsnummer.
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import { formatKuerzel, iconFuerFormat } from '../dienste/formatDarstellung'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import { lexikon } from '../lexikon/lexikon.svelte'
  import { loescheDokument, type SpeicherDokument } from '../speicher/dokumente'
  import { dokumentListe, ladeNeu } from '../zustand/dokumentListe.svelte'
  import { aktiverTab, oeffneTab, setzeAktiv, tabs } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'
  import { oeffneWerkzeug, schliesseWerkzeug, werkzeug } from '../zustand/werkzeug.svelte'

  interface Werkzeug {
    icon: string
    name: string
    // Gesetzt, sobald das Werkzeug umgesetzt ist; sonst folgt ein Hinweis.
    werkzeugId?: string
  }

  const WERKZEUGE: Werkzeug[] = [
    { icon: 'fa-magnifying-glass', name: 'Abfrage' },
    { icon: 'fa-shuffle', name: 'Konvertieren' },
    { icon: 'fa-clipboard-check', name: 'Validieren', werkzeugId: 'validieren' },
    { icon: 'fa-screwdriver-wrench', name: 'Reparatur' },
    { icon: 'fa-code', name: 'Code erzeugen' },
    { icon: 'fa-cubes', name: 'Testdaten' },
  ]

  /** Klick auf einen Werkzeug-Eintrag: umgesetztes Werkzeug umschalten, sonst Hinweis. */
  function beiWerkzeug(eintrag: Werkzeug): void {
    if (eintrag.werkzeugId === undefined) {
      folgtSpaeter(eintrag.name)
      return
    }
    if (werkzeug.aktiv === eintrag.werkzeugId) {
      schliesseWerkzeug()
    } else {
      oeffneWerkzeug(eintrag.werkzeugId)
    }
  }

  void ladeNeu()

  const aktiveDokumentId = $derived(aktiverTab()?.dokumentId ?? null)

  let loeschDialogOffen = $state(false)
  let loeschKandidat = $state<SpeicherDokument | null>(null)

  function folgtSpaeter(name: string): void {
    zeige(`"${name}" folgt in einer späteren Ausbaustufe.`, 'info')
  }

  /** Öffnet das Dokument als Tab; ist es schon offen, wird sein Tab aktiv. */
  function oeffneDokument(dokument: SpeicherDokument): void {
    const vorhanden = tabs.liste.find((tab) => tab.dokumentId === dokument.id)
    if (vorhanden !== undefined) {
      setzeAktiv(vorhanden.id)
      return
    }
    const tabId = oeffneTab({
      titel: dokument.titel,
      inhalt: dokument.inhalt,
      format: dokument.format,
      dokumentId: dokument.id,
    })
    void sofortAnalysieren(tabId)
  }

  function frageLoeschen(dokument: SpeicherDokument, ereignis: MouseEvent): void {
    ereignis.stopPropagation()
    loeschKandidat = dokument
    loeschDialogOffen = true
  }

  async function beiLoeschErgebnis(bestaetigt: boolean): Promise<void> {
    const dokument = loeschKandidat
    loeschKandidat = null
    if (!bestaetigt || dokument === null) return
    try {
      await loescheDokument(dokument.id)
      await ladeNeu()
      zeige('Dokument gelöscht.', 'erfolg')
    } catch {
      zeige('Das Dokument konnte nicht gelöscht werden.', 'fehler')
    }
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
  {#if dokumentListe.eintraege.length === 0}
    <div class="hinweis-text" style="padding: 0 var(--a3) var(--a2)">
      Noch keine Dokumente gespeichert.
    </div>
  {:else}
    {#each dokumentListe.eintraege as dokument (dokument.id)}
      <div
        class="dok-eintrag"
        class:aktiv={dokument.id === aktiveDokumentId}
        role="button"
        tabindex="0"
        onclick={() => oeffneDokument(dokument)}
        onkeydown={(ereignis) => {
          if (ereignis.key === 'Enter' || ereignis.key === ' ') {
            ereignis.preventDefault()
            oeffneDokument(dokument)
          }
        }}
      >
        <i class="fa-solid {iconFuerFormat(dokument.format)}"></i>
        <span class="dok-titel">{dokument.titel}</span>
        {#if dokument.format !== null}
          <span class="abzeichen dok-format">{formatKuerzel(dokument.format)}</span>
        {/if}
        <button
          class="icon-knopf gefahr dok-loeschen"
          aria-label="Dokument löschen"
          onclick={(ereignis) => frageLoeschen(dokument, ereignis)}
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    {/each}
  {/if}

  <div class="leisten-titel">Werkzeuge</div>
  {#each WERKZEUGE as eintrag (eintrag.name)}
    <button
      class="werkzeug-eintrag"
      class:aktiv={eintrag.werkzeugId !== undefined && werkzeug.aktiv === eintrag.werkzeugId}
      onclick={() => beiWerkzeug(eintrag)}
    >
      <i class="fa-solid {eintrag.icon}"></i>
      {eintrag.name}
    </button>
  {/each}

  <div class="leisten-titel">Nachschlagen</div>
  <button class="werkzeug-eintrag" onclick={() => lexikon.oeffne()}>
    <i class="fa-solid fa-book-open"></i> Lexikon
  </button>

  <div class="leisten-fuss">Strukturblick v{__APP_VERSION__}</div>
</nav>

<Bestaetigung
  bind:offen={loeschDialogOffen}
  titel="Dokument löschen"
  frage={loeschKandidat !== null
    ? `Soll "${loeschKandidat.titel}" endgültig gelöscht werden?`
    : ''}
  bestaetigenText="Löschen"
  onErgebnis={(bestaetigt) => void beiLoeschErgebnis(bestaetigt)}
/>

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

  .dok-titel {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  button.dok-loeschen {
    flex: none;
    width: 22px;
    height: 22px;
    font-size: 0.74rem;
  }
</style>
