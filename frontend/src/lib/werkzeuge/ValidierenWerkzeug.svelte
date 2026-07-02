<script lang="ts">
  // Validieren-Werkzeug nach mockups/validierung.html: Werkzeugzeile mit
  // Schema-Quelle (JSON Schema aus anderen Tabs bzw. der Bibliothek, bei
  // XML-Dokumenten ein XSD-Eingabefeld), Validieren-Knopf und Abzeichen;
  // darunter die Fehlerliste als Diagnose-Zeilen. Ein Klick auf eine Zeile
  // springt über die Selektions-Kopplung in den Editor zur Fundstelle.
  import { validieren } from '../api/analyse'
  import { ApiError } from '../api/http'
  import type {
    DokumentReferenz,
    QuellSpanne,
    ValidierungsAnfrage,
    ValidierungsAntwort,
    ValidierungsFehler,
  } from '../api/typen'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import FachbegriffLink from '../lexikon/FachbegriffLink.svelte'
  import { holeDokument } from '../speicher/dokumente'
  import { dokumentListe } from '../zustand/dokumentListe.svelte'
  import { setzeSelektion } from '../zustand/selektion.svelte'
  import { aktiverTab, setzeAnsicht, tabs, type DokumentTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'
  import { schliesseWerkzeug } from '../zustand/werkzeug.svelte'

  /** Auswählbare Schema-Quelle: anderer offener Tab oder gespeichertes Dokument. */
  interface SchemaQuelle {
    wert: string
    anzeige: string
  }

  /** Ergebnis (oder Fehlschlag) eines Laufs, gebunden an den geprüften Tab. */
  interface LaufErgebnis {
    tabId: string
    antwort: ValidierungsAntwort | null
    fehler: string | null
  }

  const tab = $derived(aktiverTab())
  const istXml = $derived(tab?.format === 'xml')

  // Alle ANDEREN offenen JSON-Tabs und alle gespeicherten JSON-Dokumente.
  const schemaQuellen = $derived.by((): SchemaQuelle[] => {
    const aktuelleId = tab?.id ?? null
    const quellen: SchemaQuelle[] = []
    for (const offen of tabs.liste) {
      if (offen.id === aktuelleId || offen.format !== 'json') continue
      quellen.push({ wert: `tab:${offen.id}`, anzeige: `${offen.titel} (Tab)` })
    }
    for (const dokument of dokumentListe.eintraege) {
      if (dokument.format !== 'json') continue
      quellen.push({ wert: `dok:${dokument.id}`, anzeige: `${dokument.titel} (gespeichert)` })
    }
    return quellen
  })

  let schemaWahl = $state('')
  let xsdText = $state('')
  let laeuft = $state(false)
  let lauf = $state<LaufErgebnis | null>(null)

  // Ergebnis nur zum passenden Tab anzeigen - beim Tab-Wechsel verschwindet es.
  const anzeige = $derived(tab !== null && lauf?.tabId === tab.id ? lauf : null)
  const antwort = $derived(anzeige?.antwort ?? null)

  const startBereit = $derived(
    tab !== null && !laeuft && (istXml ? xsdText.trim() !== '' : schemaWahl !== ''),
  )

  /** Löst die Auswahl in eine Dokument-Referenz auf (immer als inhalt_text). */
  async function schemaReferenz(): Promise<DokumentReferenz | null> {
    if (schemaWahl.startsWith('tab:')) {
      const id = schemaWahl.slice(4)
      const quelle = tabs.liste.find((eintrag) => eintrag.id === id)
      if (quelle === undefined) return null
      return { inhalt_text: quelle.inhalt, dateiname: quelle.titel }
    }
    if (schemaWahl.startsWith('dok:')) {
      const id = schemaWahl.slice(4)
      const dokument = await holeDokument(id)
      if (dokument === null) return null
      return { inhalt_text: dokument.inhalt, dateiname: dokument.titel }
    }
    return null
  }

  /** Ruft die Validierung mit dem Hash auf; bei 410 einmal mit vollem Inhalt. */
  async function mitCacheWiederholung(
    aktuell: DokumentTab,
    rufe: (dokument: DokumentReferenz) => Promise<ValidierungsAntwort>,
  ): Promise<ValidierungsAntwort> {
    const hash = aktuell.analyse?.dokument_hash
    if (hash === undefined) {
      return rufe({ inhalt_text: aktuell.inhalt, dateiname: aktuell.titel })
    }
    try {
      return await rufe({ dokument_hash: hash })
    } catch (grund: unknown) {
      if (grund instanceof ApiError && grund.code === 'dokument_nicht_im_cache') {
        return await rufe({ inhalt_text: aktuell.inhalt, dateiname: aktuell.titel })
      }
      throw grund
    }
  }

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  async function starteValidierung(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || laeuft) return
    let schema: DokumentReferenz | null = null
    if (!istXml) {
      schema = await schemaReferenz()
      if (schema === null) {
        zeige('Bitte zuerst ein Schema wählen.', 'info')
        return
      }
    }
    const xsd = xsdText
    const rest: Omit<ValidierungsAnfrage, 'dokument'> = istXml
      ? { schema_art: 'xsd', xsd_text: xsd }
      : { schema_art: 'json_schema', schema_dokument: schema }
    laeuft = true
    try {
      const ergebnis = await mitCacheWiederholung(aktuell, (dokument) =>
        validieren({ dokument, ...rest }),
      )
      lauf = { tabId: aktuell.id, antwort: ergebnis, fehler: null }
      if (ergebnis.gueltig) {
        zeige('Das Dokument ist gültig.', 'erfolg')
      } else {
        zeige(`Validierung: ${ergebnis.fehler.length} Fehler gefunden.`, 'fehler')
      }
    } catch (grund: unknown) {
      lauf = { tabId: aktuell.id, antwort: null, fehler: fehlerText(grund) }
    } finally {
      laeuft = false
    }
  }

  /** Klick auf eine Fehlerzeile: Selektion setzen und in den Editor springen. */
  function springeZuFundstelle(fund: ValidierungsFehler): void {
    const aktuell = tab
    if (aktuell === null) return
    if (fund.pfad !== null) {
      setzeSelektion({ tabId: aktuell.id, pfad: fund.pfad, quelle: 'diagnose' })
    }
    schliesseWerkzeug()
    setzeAnsicht(aktuell.id, 'editor')
  }

  /** "Zeile X, Spalte Y" wie im Mockup; ohne bekannte Spalte nur die Zeile. */
  function positionsText(position: QuellSpanne): string {
    if (position.start.spalte > 0) {
      return `Zeile ${position.start.zeile}, Spalte ${position.start.spalte}`
    }
    return `Zeile ${position.start.zeile}`
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-clipboard-check"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein Dokument, um es gegen ein Schema zu prüfen."
  />
{:else}
  <div class="werkzeugzeile">
    {#if istXml}
      <span class="beschriftung">XSD:</span>
      <textarea
        class="feld mono wz-xsd"
        rows="6"
        placeholder="XSD-Text hier einfügen ..."
        bind:value={xsdText}
      ></textarea>
    {:else}
      <span class="beschriftung">Schema:</span>
      <select class="feld" style="width: 300px" bind:value={schemaWahl}>
        <option value="">Schema wählen ...</option>
        {#each schemaQuellen as quelle (quelle.wert)}
          <option value={quelle.wert}>{quelle.anzeige}</option>
        {/each}
      </select>
    {/if}
    <button
      class="knopf primaer"
      disabled={!startBereit}
      onclick={() => void starteValidierung()}
    >
      <i class="fa-solid fa-clipboard-check"></i> Validieren
    </button>
    {#if antwort !== null}
      {#if antwort.gueltig}
        <span class="abzeichen gut">Gültig</span>
      {:else}
        <span class="abzeichen fehler">{antwort.fehler.length} Fehler</span>
      {/if}
    {/if}
    <span class="luecke"></span>
    <span class="hinweis-text">
      JSON wird gegen
      <FachbegriffLink topic="json-schema">JSON Schema</FachbegriffLink>
      geprüft, XML gegen eine
      <FachbegriffLink topic="xsd">XSD</FachbegriffLink>-Datei.
    </span>
  </div>

  {#if anzeige !== null && anzeige.fehler !== null}
    <div class="wz-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Die Validierung ist fehlgeschlagen: {anzeige.fehler}
      </span>
    </div>
  {:else if antwort !== null}
    <div class="karte wz-karte">
      <div class="karte-kopf">
        <i class="fa-solid fa-clipboard-check"></i> Ergebnis der Validierung
        {#if antwort.gueltig}
          <span class="abzeichen gut">Gültig</span>
        {:else}
          <span class="abzeichen fehler">{antwort.fehler.length} Fehler</span>
        {/if}
        <span class="luecke"></span>
        <span class="hinweis-text">Klick springt zur Fundstelle</span>
      </div>
      {#if antwort.fehler.length === 0}
        <div class="karte-inhalt">
          <span class="hinweis-text">Keine Fehler - das Dokument entspricht dem Schema.</span>
        </div>
      {/if}
      {#each antwort.fehler as fund, index (index)}
        <div
          class="diagnose-zeile"
          role="button"
          tabindex="0"
          onclick={() => springeZuFundstelle(fund)}
          onkeydown={(ereignis) => {
            if (ereignis.key === 'Enter' || ereignis.key === ' ') {
              ereignis.preventDefault()
              springeZuFundstelle(fund)
            }
          }}
        >
          <span class="schwere fehler"><i class="fa-solid fa-circle-xmark"></i></span>
          {#if fund.pfad !== null}
            <span class="d-pfad">{fund.pfad}</span>
          {/if}
          <span>{fund.meldung}</span>
          {#if fund.position !== null}
            <span class="d-position">{positionsText(fund.position)}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
{/if}

<style>
  /* Seiten-spezifische Anordnung wie im Mockup (dort inline am Element). */
  .wz-karte {
    flex: none;
    margin: var(--a3);
  }

  .wz-inhalt {
    padding: var(--a4);
  }

  .wz-xsd {
    width: min(480px, 100%);
  }
</style>
