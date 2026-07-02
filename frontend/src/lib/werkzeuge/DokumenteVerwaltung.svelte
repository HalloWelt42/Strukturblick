<script lang="ts">
  // Dokumentverwaltung (linke Leiste, Ordner-Symbol) nach mockups/dokumente.html:
  // Datei öffnen und Zwischenablage, Ablagezone, eine Tabelle aller gespeicherten
  // Dokumente (öffnen, herunterladen, löschen, durchsuchen, nach Name sortieren)
  // sowie die Arbeitsstand-Sicherung. Wird als Werkzeug in der Ansichtsfläche
  // gezeigt; das Ablegen von Dateien übernimmt die umgebende Ansichtsfläche.
  import {
    ausZwischenablageOeffnen,
    oeffneGespeichertesDokument,
    oeffneUeberDialog,
  } from '../dienste/dokumenteLaden'
  import { formatKuerzel, iconFuerFormat } from '../dienste/formatDarstellung'
  import { menschenlesbareGroesse } from '../dienste/groessenFormat'
  import ArbeitsstandEinspielen from '../hilfsteile/ArbeitsstandEinspielen.svelte'
  import Bestaetigung from '../hilfsteile/Bestaetigung.svelte'
  import { loescheDokument, type SpeicherDokument } from '../speicher/dokumente'
  import {
    exportiereAlsText,
    lesePaket,
    speicherSchaetzung,
    type SpeicherSchaetzung,
    type TransferPaket,
  } from '../speicher/transfer'
  import { dokumentListe, ladeNeu } from '../zustand/dokumentListe.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'
  import { schliesseWerkzeug } from '../zustand/werkzeug.svelte'

  let suche = $state('')
  let sortRichtung = $state<'auf' | 'ab'>('auf')
  let verbrauch = $state<SpeicherSchaetzung | null>(null)

  // Große-Datei-Rückfrage beim "Datei öffnen".
  let ladeDialogOffen = $state(false)
  let ladeDialogFrage = $state('')
  let ladeDialogAufloeser: ((bestaetigt: boolean) => void) | null = null

  // Löschen bestätigen.
  let loeschKandidat = $state<SpeicherDokument | null>(null)

  // Import des Arbeitsstands.
  let dateiFeld: HTMLInputElement | null = $state(null)
  let einspielPaket = $state<TransferPaket | null>(null)

  const aktiveDokumentId = $derived(aktiverTab()?.dokumentId ?? null)

  void ladeNeu()
  void aktualisiereVerbrauch()

  async function aktualisiereVerbrauch(): Promise<void> {
    verbrauch = await speicherSchaetzung()
  }

  const gefiltert = $derived.by((): SpeicherDokument[] => {
    const text = suche.trim().toLowerCase()
    const liste = dokumentListe.eintraege.filter(
      (dokument) => text === '' || dokument.titel.toLowerCase().includes(text),
    )
    const richtung = sortRichtung === 'auf' ? 1 : -1
    return [...liste].sort((a, b) => a.titel.localeCompare(b.titel, 'de') * richtung)
  })

  function sortiereNachName(): void {
    sortRichtung = sortRichtung === 'auf' ? 'ab' : 'auf'
  }

  function frageNach(frage: string): Promise<boolean> {
    ladeDialogFrage = frage
    ladeDialogOffen = true
    return new Promise((resolve) => {
      ladeDialogAufloeser = resolve
    })
  }

  function beiLadeErgebnis(bestaetigt: boolean): void {
    ladeDialogAufloeser?.(bestaetigt)
    ladeDialogAufloeser = null
  }

  /** Öffnet das Dokument und schließt die Verwaltung, damit es sichtbar wird. */
  function oeffneUndZeige(dokument: SpeicherDokument): void {
    oeffneGespeichertesDokument(dokument)
    schliesseWerkzeug()
  }

  function datumText(ms: number): string {
    const datum = new Date(ms)
    const zwei = (n: number): string => String(n).padStart(2, '0')
    return (
      `${zwei(datum.getDate())}.${zwei(datum.getMonth() + 1)}.${datum.getFullYear()}, ` +
      `${zwei(datum.getHours())}:${zwei(datum.getMinutes())}`
    )
  }

  /** Lädt den Dokumentinhalt als Datei herunter (Textformate). */
  function herunterladen(dokument: SpeicherDokument): void {
    const blob = new Blob([dokument.inhalt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anker = document.createElement('a')
    anker.href = url
    anker.download = dokument.titel
    anker.click()
    URL.revokeObjectURL(url)
  }

  async function beiLoeschErgebnis(bestaetigt: boolean): Promise<void> {
    const dokument = loeschKandidat
    loeschKandidat = null
    if (!bestaetigt || dokument === null) return
    try {
      await loescheDokument(dokument.id)
      await ladeNeu()
      await aktualisiereVerbrauch()
      zeige('Dokument gelöscht.', 'erfolg')
    } catch {
      zeige('Das Dokument konnte nicht gelöscht werden.', 'fehler')
    }
  }

  async function exportiere(): Promise<void> {
    try {
      const text = await exportiereAlsText()
      const marke = new Date().toISOString().slice(0, 10)
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anker = document.createElement('a')
      anker.href = url
      anker.download = `strukturblick-arbeitsstand-${marke}.json`
      anker.click()
      URL.revokeObjectURL(url)
      zeige('Arbeitsstand exportiert.', 'erfolg')
    } catch {
      zeige('Der Arbeitsstand konnte nicht exportiert werden.', 'fehler')
    }
  }

  async function dateiGewaehlt(ereignis: Event): Promise<void> {
    const feld = ereignis.currentTarget as HTMLInputElement
    const datei = feld.files?.[0]
    feld.value = ''
    if (!datei) return
    try {
      const roh: unknown = JSON.parse(await datei.text())
      einspielPaket = lesePaket(roh)
    } catch (grund: unknown) {
      const meldung =
        grund instanceof Error ? grund.message : 'Die Datei konnte nicht gelesen werden.'
      zeige(meldung, 'fehler')
    }
  }

  async function nachEinspielen(): Promise<void> {
    await ladeNeu()
    await aktualisiereVerbrauch()
  }

  const verbrauchText = $derived(
    verbrauch === null ? 'unbekannt' : menschenlesbareGroesse(verbrauch.verwendetBytes),
  )
  const verbrauchProzent = $derived(
    verbrauch === null ? 0 : Math.min(100, Math.round(verbrauch.anteil * 100)),
  )
</script>

<div class="werkzeugzeile">
  <button class="knopf primaer" onclick={() => void oeffneUeberDialog(frageNach)}>
    <i class="fa-solid fa-folder-open"></i> Datei öffnen
  </button>
  <button class="knopf" onclick={() => void ausZwischenablageOeffnen()}>
    <i class="fa-solid fa-clipboard"></i> Aus Zwischenablage
  </button>
  <span class="luecke"></span>
  <div class="feld-zeile">
    <input class="feld dv-suche" type="text" placeholder="Dokumente durchsuchen ..." bind:value={suche} />
  </div>
</div>

<div class="dokm-inhalt">
  <div class="dokm-ablagezone">
    <i class="fa-solid fa-file-arrow-up"></i>
    <strong>Dateien hierher ziehen</strong>
    <span class="hinweis-text">Format und Dialekt werden automatisch erkannt.</span>
  </div>

  <div class="karte">
    <div class="karte-kopf">
      <i class="fa-solid fa-folder-open"></i> Gespeicherte Dokumente
      <span class="luecke"></span>
      <span class="abzeichen">
        {gefiltert.length}
        {gefiltert.length === 1 ? 'Eintrag' : 'Einträge'}
      </span>
    </div>
    {#if dokumentListe.eintraege.length === 0}
      <div class="hinweis-text dv-leer">Noch keine Dokumente gespeichert.</div>
    {:else}
      <table class="tabelle">
        <thead>
          <tr>
            <th>
              <button class="dv-sortknopf" onclick={sortiereNachName}>
                Name
                <i class="fa-solid fa-caret-{sortRichtung === 'auf' ? 'up' : 'down'} sortier-pfeil"></i>
              </button>
            </th>
            <th>Format</th>
            <th class="zahl">Größe</th>
            <th>Geändert am</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {#each gefiltert as dokument (dokument.id)}
            <tr class:selektiert={dokument.id === aktiveDokumentId}>
              <td>
                <i class="fa-solid {iconFuerFormat(dokument.format)}"></i>
                {dokument.titel}
              </td>
              <td>
                {#if dokument.format !== null}
                  <span class="abzeichen">{formatKuerzel(dokument.format)}</span>
                {/if}
              </td>
              <td class="zahl">{menschenlesbareGroesse(dokument.groesse)}</td>
              <td>{datumText(dokument.geaendertAm)}</td>
              <td>
                <button
                  class="icon-knopf"
                  aria-label="Öffnen"
                  title="Öffnen"
                  onclick={() => oeffneUndZeige(dokument)}
                >
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </button>
                <button
                  class="icon-knopf"
                  aria-label="Herunterladen"
                  title="Herunterladen"
                  onclick={() => herunterladen(dokument)}
                >
                  <i class="fa-solid fa-download"></i>
                </button>
                <button
                  class="icon-knopf gefahr"
                  aria-label="Löschen"
                  title="Löschen"
                  onclick={() => (loeschKandidat = dokument)}
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <div class="karte dokm-arbeitsstand">
    <div class="karte-kopf"><i class="fa-solid fa-box-archive"></i> Arbeitsstand</div>
    <div class="karte-inhalt">
      <p>Alle Dokumente, Ansichten und Einstellungen liegen nur in diesem Browser.</p>
      <div class="feld-zeile">
        <button class="knopf" onclick={() => void exportiere()}>
          <i class="fa-solid fa-file-export"></i> Arbeitsstand exportieren
        </button>
        <button class="knopf" onclick={() => dateiFeld?.click()}>
          <i class="fa-solid fa-file-import"></i> Arbeitsstand importieren
        </button>
      </div>
      <span class="beschriftung">Speicherverbrauch: {verbrauchText}</span>
      <div class="fortschritt"><i style="width: {verbrauchProzent}%"></i></div>
    </div>
  </div>
</div>

<input
  bind:this={dateiFeld}
  class="dv-versteckt"
  type="file"
  accept=".json,application/json"
  onchange={dateiGewaehlt}
/>

<Bestaetigung
  bind:offen={ladeDialogOffen}
  titel="Große Datei"
  frage={ladeDialogFrage}
  bestaetigenText="Laden"
  onErgebnis={beiLadeErgebnis}
/>

<Bestaetigung
  offen={loeschKandidat !== null}
  titel="Dokument löschen"
  frage={loeschKandidat !== null ? `Soll "${loeschKandidat.titel}" endgültig gelöscht werden?` : ''}
  bestaetigenText="Löschen"
  onErgebnis={(bestaetigt) => void beiLoeschErgebnis(bestaetigt)}
/>

<ArbeitsstandEinspielen
  paket={einspielPaket}
  onSchliessen={() => (einspielPaket = null)}
  onEingespielt={nachEinspielen}
/>

<style>
  .dv-suche {
    width: 220px;
  }

  .dokm-inhalt {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--a3);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }

  .dokm-ablagezone {
    border: 1px dashed var(--rand-2);
    padding: var(--a5);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--a2);
    color: var(--text-3);
  }

  .dokm-ablagezone i {
    font-size: 1.6rem;
    color: var(--rand-2);
  }

  .dokm-arbeitsstand p {
    margin: 0 0 var(--a3);
    font-size: 0.86rem;
  }

  .dokm-arbeitsstand .feld-zeile {
    margin-bottom: var(--a3);
  }

  .dokm-arbeitsstand .beschriftung {
    display: block;
    margin-bottom: var(--a1);
  }

  .dv-leer {
    padding: var(--a3);
  }

  .dv-sortknopf {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: var(--a1);
  }

  .dv-versteckt {
    display: none;
  }
</style>
