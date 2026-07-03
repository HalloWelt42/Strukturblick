<script lang="ts">
  // Testdaten-Werkzeug nach mockups/testdaten.html: aus dem aktiven Dokument
  // wird eine Generator-Spezifikation abgeleitet (heuristisch beim Öffnen, auf
  // Wunsch per Sprachmodell) und in einer editierbaren Tabelle gezeigt. Die
  // Erzeugung läuft deterministisch (fester Seed) und blockweise: das Frontend
  // ruft erzeugeTestdaten in Blöcken mit steigendem offset, sammelt die
  // Datensätze und aktualisiert den Fortschritt echt. Vorschau und Ausgabe
  // (neuer Tab, Herunterladen) erfolgen im gewählten Zielformat.
  import { schlageTestdatenSpezifikationVor } from '../api/ki'
  import { erzeugeTestdaten, leiteSpezifikationAb } from '../api/generieren'
  import { ApiError } from '../api/http'
  import { konvertiere } from '../api/transform'
  import type {
    ErzeugerArt,
    FeldErzeuger,
    FormatId,
    JsonWert,
    Spezifikation,
  } from '../api/typen'
  import { ladeHerunter } from '../dienste/dateiEinAusgabe'
  import { mitRetry } from '../dienste/dokumentReferenz'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import { kiEinstellungen, kontext } from '../zustand/kiEinstellungen.svelte'
  import { kiStatus } from '../zustand/kiStatus.svelte'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { aktiverTab, oeffneTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  /** Wählbare Zielformate der Ausgabe (Reihenfolge wie im Mockup). */
  type ZielFormat = 'ndjson' | 'json' | 'csv' | 'yaml'

  const ZIEL_FORMATE: { id: ZielFormat; label: string }[] = [
    { id: 'ndjson', label: 'NDJSON' },
    { id: 'json', label: 'JSON' },
    { id: 'csv', label: 'CSV' },
    { id: 'yaml', label: 'YAML' },
  ]

  /** Blockgröße der blockweisen Erzeugung. */
  const BLOCK_GROESSE = 200
  /** Anzahl der Datensätze in der Vorschau. */
  const VORSCHAU_ZEILEN = 10

  const tab = $derived(aktiverTab())
  const erzeuger = $derived(capabilities.daten?.testdaten_erzeuger ?? [])

  // Parameter-Schlüssel je Erzeuger-Art aus den Capabilities (für die Eingabefelder).
  const parameterSchluessel = $derived.by((): Map<ErzeugerArt, string[]> => {
    const karte = new Map<ErzeugerArt, string[]>()
    for (const info of erzeuger) karte.set(info.id, info.parameter)
    return karte
  })

  let spezifikation = $state<Spezifikation | null>(null)
  let spezTabId = $state<string | null>(null)
  let ableitungLaeuft = $state(false)
  let ableitungFehler = $state<string | null>(null)
  let kiLaeuft = $state(false)

  let anzahlText = $state('1000')
  let seedText = $state('42')
  let zielFormat = $state<ZielFormat>('ndjson')

  let erzeugungLaeuft = $state(false)
  let fortschrittBlock = $state(0)
  let fortschrittBloecke = $state(0)
  let fortschrittErzeugt = $state(0)
  let fortschrittGesamt = $state(0)
  let vorschauText = $state<string | null>(null)
  let vorschauFormat = $state<ZielFormat>('ndjson')
  let ergebnisText = $state<string | null>(null)
  let ergebnisFormat = $state<ZielFormat>('ndjson')

  const kiAktiv = $derived(kiStatus.erreichbar === true && kiEinstellungen.angeboten)

  const anzahl = $derived.by((): number => {
    const wert = Number.parseInt(anzahlText, 10)
    if (Number.isNaN(wert) || wert < 0) return 0
    return Math.min(wert, 100000)
  })

  const seed = $derived.by((): number => {
    const wert = Number.parseInt(seedText, 10)
    return Number.isNaN(wert) ? 42 : wert
  })

  const startBereit = $derived(
    tab !== null && spezifikation !== null && !erzeugungLaeuft && anzahl > 0,
  )
  const fortschrittProzent = $derived(
    fortschrittGesamt === 0 ? 0 : Math.round((fortschrittErzeugt / fortschrittGesamt) * 100),
  )
  const zielLabel = $derived(
    ZIEL_FORMATE.find((z) => z.id === zielFormat)?.label ?? zielFormat.toUpperCase(),
  )
  const vorschauLabel = $derived(
    ZIEL_FORMATE.find((z) => z.id === vorschauFormat)?.label ?? vorschauFormat.toUpperCase(),
  )

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  function erzeugerName(art: ErzeugerArt): string {
    return erzeuger.find((e) => e.id === art)?.name ?? art
  }

  // Beim Öffnen und bei Tab-Wechsel die Spezifikation automatisch ableiten.
  $effect(() => {
    const aktuell = tab
    if (aktuell === null) {
      spezifikation = null
      spezTabId = null
      return
    }
    if (spezTabId === aktuell.id) return
    void leiteAb(aktuell.id)
  })

  async function leiteAb(tabId: string): Promise<void> {
    const aktuell = tab
    if (aktuell === null || aktuell.id !== tabId) return
    ableitungLaeuft = true
    ableitungFehler = null
    spezifikation = null
    spezTabId = tabId
    try {
      const ergebnis = await mitRetry(aktuell, (dokument) => leiteSpezifikationAb(dokument))
      if (aktiverTab()?.id !== tabId) return
      spezifikation = ergebnis
    } catch (grund: unknown) {
      if (aktiverTab()?.id !== tabId) return
      ableitungFehler = fehlerText(grund)
    } finally {
      if (aktiverTab()?.id === tabId) ableitungLaeuft = false
    }
  }

  async function schlageMitKiVor(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || !kiAktiv || kiLaeuft) return
    const tabId = aktuell.id
    kiLaeuft = true
    try {
      const ergebnis = await mitRetry(aktuell, (dokument) =>
        schlageTestdatenSpezifikationVor({ ki: kontext(), dokument }),
      )
      if (aktiverTab()?.id !== tabId) return
      spezifikation = ergebnis
      spezTabId = tabId
      ableitungFehler = null
      zeige('Spezifikation vom Sprachmodell übernommen.', 'erfolg')
    } catch (grund: unknown) {
      zeige('Der Vorschlag ist nicht möglich.', 'fehler', fehlerText(grund))
    } finally {
      kiLaeuft = false
    }
  }

  /** Ändert die Erzeuger-Art eines Feldes und leert nicht mehr passende Parameter. */
  function setzeErzeuger(feld: FeldErzeuger, art: ErzeugerArt): void {
    feld.erzeuger = art
    const erlaubt = new Set(parameterSchluessel.get(art) ?? [])
    for (const schluessel of Object.keys(feld.parameter)) {
      if (!erlaubt.has(schluessel)) delete feld.parameter[schluessel]
    }
  }

  /** Einen Parameterwert als Text lesen (leere Werte als leerer String). */
  function paramText(feld: FeldErzeuger, schluessel: string): string {
    const wert = feld.parameter[schluessel]
    if (wert === undefined || wert === null) return ''
    if (typeof wert === 'string') return wert
    return JSON.stringify(wert)
  }

  /** Einen Parameterwert aus einem Textfeld übernehmen (Zahl, wenn möglich). */
  function setzeParamText(
    feld: FeldErzeuger,
    schluessel: string,
    text: string,
    numerisch: boolean,
  ): void {
    if (numerisch) {
      const zahl = Number(text)
      feld.parameter[schluessel] = text.trim() === '' || Number.isNaN(zahl) ? text : zahl
      return
    }
    feld.parameter[schluessel] = text
  }

  /** JSON-Datensätze im gewählten Zielformat serialisieren. */
  async function serialisiere(datensaetze: JsonWert[], format: ZielFormat): Promise<string> {
    if (format === 'json') return JSON.stringify(datensaetze, null, 2)
    if (format === 'ndjson') return datensaetze.map((d) => JSON.stringify(d)).join('\n')
    const zielFormatId: FormatId = format === 'csv' ? 'csv' : 'yaml'
    const antwort = await konvertiere({
      dokument: { inhalt_text: JSON.stringify(datensaetze), format_id: 'json' },
      ziel_format: zielFormatId,
    })
    return antwort.ergebnis.inhalt_text ?? ''
  }

  async function starteErzeugung(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || spezifikation === null || erzeugungLaeuft || anzahl === 0) return
    const gesamt = anzahl
    const bloecke = Math.ceil(gesamt / BLOCK_GROESSE)
    // Tiefe Kopie der reaktiven Spezifikation als schlichtes Objekt (JsonWert ist
    // rekursiv - ein JSON-Klon bricht die sonst zu tiefe Typinstanziierung).
    const spez = JSON.parse(JSON.stringify(spezifikation)) as Spezifikation
    const gewaehltesFormat = zielFormat

    erzeugungLaeuft = true
    fortschrittGesamt = gesamt
    fortschrittBloecke = bloecke
    fortschrittBlock = 0
    fortschrittErzeugt = 0
    vorschauText = null
    ergebnisText = null

    const gesammelt: JsonWert[] = []
    try {
      for (let index = 0; index < bloecke; index++) {
        const offset = index * BLOCK_GROESSE
        const blockAnzahl = Math.min(BLOCK_GROESSE, gesamt - offset)
        fortschrittBlock = index + 1
        const antwort = await erzeugeTestdaten({
          spezifikation: spez,
          anzahl: blockAnzahl,
          seed,
          offset,
        })
        gesammelt.push(...antwort.datensaetze)
        fortschrittErzeugt = gesammelt.length
      }
      vorschauText = await serialisiere(gesammelt.slice(0, VORSCHAU_ZEILEN), gewaehltesFormat)
      vorschauFormat = gewaehltesFormat
      ergebnisText = await serialisiere(gesammelt, gewaehltesFormat)
      ergebnisFormat = gewaehltesFormat
      zeige(`${gesammelt.length} Datensätze erzeugt.`, 'erfolg')
    } catch (grund: unknown) {
      zeige('Die Erzeugung ist nicht möglich.', 'fehler', fehlerText(grund))
    } finally {
      erzeugungLaeuft = false
    }
  }

  /** Dateiendung des Zielformats für Download und Tab. */
  function endung(format: ZielFormat): string {
    if (format === 'ndjson') return 'ndjson'
    if (format === 'json') return 'json'
    if (format === 'csv') return 'csv'
    return 'yaml'
  }

  /** FormatId des Zielformats (für den Tab-Syntaxmodus). */
  function formatId(format: ZielFormat): FormatId {
    if (format === 'ndjson') return 'ndjson'
    if (format === 'json') return 'json'
    if (format === 'csv') return 'csv'
    return 'yaml'
  }

  function alsNeuerTab(): void {
    if (ergebnisText === null) return
    const basis = (tab?.titel ?? 'daten').replace(/\.[^.]+$/, '')
    oeffneTab({
      titel: `${basis}-testdaten.${endung(ergebnisFormat)}`,
      inhalt: ergebnisText,
      format: formatId(ergebnisFormat),
    })
  }

  function herunterladen(): void {
    if (ergebnisText === null) return
    const basis = (tab?.titel ?? 'daten').replace(/\.[^.]+$/, '')
    ladeHerunter(`${basis}-testdaten.${endung(ergebnisFormat)}`, ergebnisText, 'text/plain')
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-cubes"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein Dokument, um daraus eine Testdaten-Spezifikation abzuleiten."
  />
{:else}
  <div class="werkzeugzeile">
    <button
      class="knopf klein"
      disabled={!kiAktiv || kiLaeuft}
      title={kiAktiv ? 'Spezifikation vom Sprachmodell vorschlagen lassen' : 'Kein lokales Sprachmodell erreichbar'}
      onclick={() => void schlageMitKiVor()}
    >
      <i class="fa-solid {kiLaeuft ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}"></i>
      Spezifikation von KI vorschlagen lassen
    </button>
    <span class="beschriftung">Basis: {tab.titel}</span>
    <span class="luecke"></span>
    <span class="abzeichen info">Deterministisch</span>
  </div>

  <div class="testx-inhalt">
    <div class="karte">
      <div class="karte-kopf"><i class="fa-solid fa-cubes"></i> Generator-Spezifikation</div>
      {#if ableitungLaeuft}
        <div class="karte-inhalt hinweis-text">
          <i class="fa-solid fa-spinner fa-spin"></i> Spezifikation wird abgeleitet …
        </div>
      {:else if ableitungFehler !== null}
        <div class="karte-inhalt hinweis-text">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Die Spezifikation ist nicht ableitbar: {ableitungFehler}
        </div>
      {:else if spezifikation !== null && spezifikation.felder.length > 0}
        <div class="testx-tabelle-huelle">
          <table class="tabelle">
            <thead>
              <tr>
                <th>Feld</th>
                <th>Erzeuger</th>
                <th>Parameter</th>
              </tr>
            </thead>
            <tbody>
              {#each spezifikation.felder as feld (feld.pfad_muster)}
                <tr>
                  <td class="mono">{feld.pfad_muster}</td>
                  <td>
                    <select
                      class="feld"
                      value={feld.erzeuger}
                      onchange={(e) =>
                        setzeErzeuger(feld, (e.currentTarget as HTMLSelectElement).value as ErzeugerArt)}
                    >
                      {#each erzeuger as art (art.id)}
                        <option value={art.id}>{art.name}</option>
                      {/each}
                    </select>
                  </td>
                  <td>
                    {#if (parameterSchluessel.get(feld.erzeuger) ?? []).length === 0}
                      <span class="hinweis-text">-</span>
                    {:else}
                      <div class="testx-param-felder">
                        {#each parameterSchluessel.get(feld.erzeuger) ?? [] as schl (schl)}
                          {@const numerisch =
                            schl === 'min' ||
                            schl === 'max' ||
                            schl === 'nachkommastellen'}
                          <label class="testx-param">
                            <span class="testx-param-name">{schl}</span>
                            <input
                              class="feld mono"
                              type="text"
                              value={paramText(feld, schl)}
                              oninput={(e) =>
                                setzeParamText(
                                  feld,
                                  schl,
                                  (e.currentTarget as HTMLInputElement).value,
                                  numerisch,
                                )}
                            />
                          </label>
                        {/each}
                      </div>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="karte-inhalt hinweis-text">
          Für dieses Dokument ließen sich keine Felder ableiten. Das Werkzeug eignet sich für
          strukturierte Datensätze (z. B. ein JSON-Array gleichartiger Objekte).
        </div>
      {/if}
    </div>

    <div class="feld-zeile">
      <span class="beschriftung">Anzahl</span>
      <input class="feld mono" type="text" style="width: 90px" bind:value={anzahlText} />
      <span class="beschriftung"><span class="fachbegriff">Seed</span></span>
      <input class="feld mono" type="text" style="width: 70px" bind:value={seedText} />
      <span class="beschriftung">Zielformat</span>
      <select class="feld" bind:value={zielFormat}>
        {#each ZIEL_FORMATE as format (format.id)}
          <option value={format.id}>{format.label}</option>
        {/each}
      </select>
      <span class="luecke"></span>
      <button class="knopf primaer" disabled={!startBereit} onclick={() => void starteErzeugung()}>
        <i class="fa-solid fa-play"></i> Erzeugen
      </button>
    </div>

    {#if erzeugungLaeuft || vorschauText !== null}
      <div class="karte">
        <div class="karte-kopf"><i class="fa-solid fa-gears"></i> Erzeugung läuft</div>
        <div class="karte-inhalt">
          <div class="fortschritt"><i style="width: {fortschrittProzent}%"></i></div>
          <div class="testx-fortschritt-zeile">
            <span class="hinweis-text">
              Block {fortschrittBlock} von {fortschrittBloecke} - {fortschrittErzeugt} von {fortschrittGesamt}
              Datensätzen
            </span>
            <span class="hinweis-text mono">{fortschrittProzent} %</span>
          </div>
        </div>
      </div>
    {/if}

    {#if vorschauText !== null}
      <div class="karte">
        <div class="karte-kopf">
          <i class="fa-solid fa-eye"></i> Vorschau (erste Zeilen,
          <span class="fachbegriff">{vorschauLabel}</span>)
        </div>
        <div class="karte-inhalt">
          <div class="code-block">{vorschauText}</div>
          <div class="feld-zeile" style="margin-top: var(--a3)">
            <button class="knopf" onclick={alsNeuerTab}>
              <i class="fa-solid fa-arrow-up-right-from-square"></i> Als neuer Tab öffnen
            </button>
            <button class="knopf" onclick={herunterladen}>
              <i class="fa-solid fa-download"></i> Herunterladen
            </button>
          </div>
        </div>
      </div>
    {/if}

    <div class="karte">
      <div class="karte-kopf"><i class="fa-solid fa-circle-info"></i> Hinweis</div>
      <div class="karte-inhalt hinweis-text">
        Die Spezifikation kann von der KI vorgeschlagen werden - die Erzeugung selbst läuft
        deterministisch mit festem <span class="fachbegriff">Seed</span>
        (gleicher Seed, gleiche Daten).
      </div>
    </div>
  </div>
{/if}

<style>
  /* Seiten-spezifisch (im Mockup im <style> der Seite). */
  .testx-inhalt {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--a4);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
    max-width: 880px;
  }

  .testx-fortschritt-zeile {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--a2);
    margin-top: var(--a2);
  }

  .testx-tabelle-huelle {
    overflow-x: auto;
  }

  .testx-param-felder {
    display: flex;
    flex-wrap: wrap;
    gap: var(--a2);
  }

  .testx-param {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .testx-param-name {
    font-size: 0.7rem;
    color: var(--text-3);
  }

  .testx-param .feld {
    width: 120px;
  }

  .testx-inhalt .code-block {
    flex: none;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
