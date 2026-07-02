<script lang="ts">
  // Konvertieren-Werkzeug nach mockups/konvertieren.html: Werkzeugzeile mit
  // Quellformat-Abzeichen, Zielformat-Auswahl, Einrückung, Schlüssel-Sortier-
  // Schalter, Konvertieren- und Herunterladen-Knopf. Nach dem Lauf erscheint
  // bei Verlusten zuerst die Verlustwarnung-Karte, das Ergebnis wird rechts in
  // der zweigeteilten Ansicht Quelle/Ergebnis gezeigt.
  import { konvertiere } from '../api/transform'
  import { ApiError } from '../api/http'
  import type {
    FormatFaehigkeiten,
    FormatId,
    KonvertierAntwort,
    SerialisierungsOptionen,
  } from '../api/typen'
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import { mitRetry } from '../dienste/dokumentReferenz'
  import { ladeHerunter } from '../dienste/dateiEinAusgabe'
  import { formatKuerzel } from '../dienste/formatDarstellung'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import FachbegriffLink from '../lexikon/FachbegriffLink.svelte'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { aktiverTab, oeffneTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  /** Ergebnis (oder Fehlschlag) eines Laufs, gebunden an den konvertierten Tab. */
  interface LaufErgebnis {
    tabId: string
    antwort: KonvertierAntwort | null
    fehler: string | null
    /** true, sobald der Nutzer die Verluste bestätigt hat (oder keine da waren). */
    bestaetigt: boolean
  }

  const tab = $derived(aktiverTab())
  const formate = $derived(capabilities.daten?.formate ?? [])

  // Alle beschreibbaren Formate als Ziel - auch das Quellformat selbst, dann ist
  // die Konvertierung reines Umformatieren/Sortieren.
  const zielFormate = $derived(
    formate.filter((faehigkeit) => faehigkeit.kann_schreiben),
  )

  let zielWahl = $state<FormatId | ''>('')
  let einrueckung = $state(2)
  let sortiere = $state(false)
  let laeuft = $state(false)
  let lauf = $state<LaufErgebnis | null>(null)

  // Beim ersten Rendern (und wenn die Auswahl leer ist) ein sinnvolles Ziel
  // vorbelegen: das erste Format, das nicht dem Quellformat entspricht.
  $effect(() => {
    if (zielWahl !== '' || zielFormate.length === 0) return
    const quelle = tab?.format ?? null
    const anders = zielFormate.find((faehigkeit) => faehigkeit.format_id !== quelle)
    zielWahl = (anders ?? zielFormate[0]).format_id
  })

  // Ergebnis nur zum passenden Tab anzeigen - beim Tab-Wechsel verschwindet es.
  const anzeige = $derived(tab !== null && lauf?.tabId === tab.id ? lauf : null)
  const antwort = $derived(anzeige?.antwort ?? null)
  const ergebnisText = $derived(antwort?.ergebnis.inhalt_text ?? null)
  const ergebnisBase64 = $derived(antwort?.ergebnis.inhalt_base64 ?? null)
  const verluste = $derived(antwort?.verluste ?? [])
  // Verlustwarnung zeigen, solange Verluste da sind und noch nicht bestätigt.
  const warnungOffen = $derived(
    anzeige !== null && verluste.length > 0 && !anzeige.bestaetigt,
  )
  const herunterladenBereit = $derived(
    antwort !== null && anzeige !== null && anzeige.bestaetigt,
  )

  const startBereit = $derived(tab !== null && !laeuft && zielWahl !== '')

  function faehigkeitFuer(format: FormatId): FormatFaehigkeiten | undefined {
    return formate.find((faehigkeit) => faehigkeit.format_id === format)
  }

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  function optionen(): SerialisierungsOptionen {
    return {
      einrueckung: Number.isFinite(einrueckung) ? Math.max(0, Math.trunc(einrueckung)) : 2,
      sortiere_schluessel: sortiere,
      csv_trennzeichen: ';',
    }
  }

  async function starteKonvertierung(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || laeuft || zielWahl === '') return
    const ziel = zielWahl
    laeuft = true
    try {
      const ergebnis = await mitRetry(aktuell, (dokument) =>
        konvertiere({ dokument, ziel_format: ziel, optionen: optionen() }),
      )
      lauf = {
        tabId: aktuell.id,
        antwort: ergebnis,
        fehler: null,
        // Ohne Verluste ist das Ergebnis sofort freigegeben.
        bestaetigt: ergebnis.verluste.length === 0,
      }
      if (ergebnis.verluste.length > 0) {
        zeige(`Konvertierung mit ${ergebnis.verluste.length} Verlusten - bitte prüfen.`, 'info')
      } else {
        zeige('Konvertierung abgeschlossen.', 'erfolg')
      }
    } catch (grund: unknown) {
      lauf = { tabId: aktuell.id, antwort: null, fehler: fehlerText(grund), bestaetigt: false }
    } finally {
      laeuft = false
    }
  }

  /** "Trotzdem übernehmen": Verluste akzeptieren, Ergebnis freigeben. */
  function bestaetigeVerluste(): void {
    if (lauf !== null) lauf.bestaetigt = true
  }

  /** "Abbrechen": den Lauf verwerfen, Ausgangszustand herstellen. */
  function verwerfeLauf(): void {
    lauf = null
  }

  /** Dateiname mit der Endung des Zielformats aus dem Tab-Titel ableiten. */
  function zielDateiname(basis: string, format: FormatId): string {
    const faehigkeit = faehigkeitFuer(format)
    const endung = faehigkeit?.dateiendungen[0] ?? `.${format}`
    const punkt = basis.lastIndexOf('.')
    const stamm = punkt > 0 ? basis.slice(0, punkt) : basis
    return `${stamm}${endung}`
  }

  function zielMime(format: FormatId): string {
    return faehigkeitFuer(format)?.mime_typen[0] ?? 'text/plain'
  }

  function herunterladen(): void {
    if (antwort === null || tab === null) return
    const format = antwort.ziel_format
    const dateiname = zielDateiname(tab.titel, format)
    if (ergebnisText !== null) {
      ladeHerunter(dateiname, ergebnisText, zielMime(format))
      return
    }
    if (ergebnisBase64 !== null) {
      // Binäres Ziel: Base64 in Bytes wandeln und als Blob anbieten.
      const roh = atob(ergebnisBase64)
      const bytes = Uint8Array.from(roh, (zeichen) => zeichen.charCodeAt(0))
      const blob = new Blob([bytes], { type: zielMime(format) })
      const url = URL.createObjectURL(blob)
      const anker = document.createElement('a')
      anker.href = url
      anker.download = dateiname
      document.body.appendChild(anker)
      anker.click()
      anker.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
  }

  function alsNeuenTab(): void {
    if (antwort === null || tab === null || ergebnisText === null) return
    const format = antwort.ziel_format
    const titel = zielDateiname(tab.titel, format)
    const neueId = oeffneTab({ titel, inhalt: ergebnisText, format })
    void sofortAnalysieren(neueId)
    zeige('Ergebnis als neuen Tab geöffnet.', 'erfolg')
  }

  /** Quelltext in Zeilen für die linke Ansicht. */
  function zeilen(text: string): string[] {
    const geteilt = text.split('\n')
    // Ein abschließender Zeilenumbruch erzeugt eine leere letzte Zeile - weg damit.
    if (geteilt.length > 1 && geteilt[geteilt.length - 1] === '') geteilt.pop()
    return geteilt
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-shuffle"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein Dokument, um es in ein anderes Format zu konvertieren."
  />
{:else}
  <div class="werkzeugzeile">
    <span class="beschriftung">Von:</span>
    {#if tab.format !== null}
      <span class="abzeichen info">{formatKuerzel(tab.format)}</span>
    {:else}
      <span class="abzeichen">unbekannt</span>
    {/if}
    <span class="beschriftung">Nach:</span>
    <select class="feld" bind:value={zielWahl}>
      {#each zielFormate as faehigkeit (faehigkeit.format_id)}
        <option value={faehigkeit.format_id}>{formatKuerzel(faehigkeit.format_id)}</option>
      {/each}
    </select>
    <span class="beschriftung">Einrückung:</span>
    <input class="feld" type="number" min="0" max="8" style="width: 56px" bind:value={einrueckung} />
    <label class="beschriftung kv-check">
      <span class="checkbox" class:an={sortiere}><i class="fa-solid fa-check"></i></span>
      <input type="checkbox" class="kv-check-eingabe" bind:checked={sortiere} />
      Schlüssel sortieren
    </label>
    <span class="luecke"></span>
    <button
      class="knopf primaer"
      disabled={!startBereit}
      onclick={() => void starteKonvertierung()}
    >
      <i class="fa-solid fa-shuffle"></i> Konvertieren
    </button>
    <button class="knopf" disabled={!herunterladenBereit} onclick={herunterladen}>
      <i class="fa-solid fa-download"></i> Herunterladen
    </button>
    <button
      class="knopf"
      disabled={!herunterladenBereit || ergebnisText === null}
      onclick={alsNeuenTab}
    >
      <i class="fa-solid fa-arrow-up-right-from-square"></i> Als neuen Tab
    </button>
  </div>

  {#if anzeige !== null && anzeige.fehler !== null}
    <div class="kv-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Die Konvertierung ist nicht möglich: {anzeige.fehler}
      </span>
    </div>
  {:else if antwort !== null}
    {#if warnungOffen}
      <div class="karte kv-warnkarte">
        <div class="karte-kopf">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <FachbegriffLink topic="verlustwarnung">Verlustwarnung</FachbegriffLink>
          <span class="abzeichen warnung">{verluste.length} Verluste</span>
        </div>
        <div class="karte-inhalt">
          <ul class="kv-warnliste">
            {#each verluste as hinweis, index (index)}
              <li>
                {hinweis.meldung}{#if hinweis.betroffene_pfade.length > 0}
                  <span class="kv-pfade">({hinweis.betroffene_pfade.join(', ')})</span>
                {/if}
              </li>
            {/each}
          </ul>
          <div class="feld-zeile">
            <button class="knopf primaer" onclick={bestaetigeVerluste}>Trotzdem übernehmen</button>
            <button class="knopf" onclick={verwerfeLauf}>Abbrechen</button>
          </div>
        </div>
      </div>
    {/if}

    <div class="diff-split">
      <div class="diff-pane">
        <div class="diff-pane-kopf">
          Quelle{#if tab.format !== null} ({formatKuerzel(tab.format)}){/if}
        </div>
        <div class="editor">
          {#each zeilen(tab.inhalt) as zeile, index (index)}
            <div class="ed-zeile">
              <span class="zn">{index + 1}</span>
              <span class="ed-code">{zeile}</span>
            </div>
          {/each}
        </div>
      </div>
      <div class="diff-pane">
        <div class="diff-pane-kopf">
          Ergebnis ({formatKuerzel(antwort.ziel_format)})
          <span class="luecke"></span>
          <span class="abzeichen">Vorschau</span>
        </div>
        <div class="editor">
          {#if ergebnisText !== null}
            {#each zeilen(ergebnisText) as zeile, index (index)}
              <div class="ed-zeile">
                <span class="zn">{index + 1}</span>
                <span class="ed-code">{zeile}</span>
              </div>
            {/each}
          {:else if ergebnisBase64 !== null}
            <div class="kv-inhalt">
              <span class="hinweis-text">
                <i class="fa-solid fa-file-arrow-down"></i>
                Das Zielformat ist binär und lässt sich nicht als Text anzeigen.
                Nutze "Herunterladen", um die Datei zu speichern.
              </span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Seiten-spezifische Anordnung wie im Mockup (dort inline bzw. im <style>). */
  .kv-warnkarte {
    flex: none;
    margin: var(--a3);
  }

  .kv-warnliste {
    margin: 0 0 var(--a3);
    padding-left: var(--a5);
    font-size: 0.86rem;
  }

  .kv-warnliste li {
    margin-bottom: var(--a1);
  }

  .kv-pfade {
    color: var(--text-3);
    margin-left: 4px;
  }

  .kv-inhalt {
    padding: var(--a4);
  }

  /* Checkbox als Abzeichen-Optik wie im Mockup; die echte Eingabe liegt
     unsichtbar darunter und trägt den Zustand für die Tastatur. */
  .kv-check {
    display: inline-flex;
    align-items: center;
    gap: var(--a2);
    cursor: pointer;
    position: relative;
  }

  .kv-check-eingabe {
    position: absolute;
    opacity: 0;
    width: 16px;
    height: 16px;
    margin: 0;
    cursor: pointer;
  }
</style>
