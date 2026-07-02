<script lang="ts">
  // Reparatur-Werkzeug nach mockups/reparatur.html: schlägt für defekte
  // JSON-/NDJSON-Dokumente eine deterministische Reparatur vor. Links das
  // Original, rechts der Vorschlag; abweichende Zeilen sind als Zusatz markiert.
  // Übernommen wird erst nach Bestätigung über "Übernehmen".
  import { repariere } from '../api/transform'
  import { ApiError } from '../api/http'
  import type { FormatId, ReparaturAntwort } from '../api/typen'
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import { mitRetry } from '../dienste/dokumentReferenz'
  import { formatAusDateiname } from '../dienste/formatErkennung'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import { aktiverTab, setzeInhalt } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'
  import { schliesseWerkzeug } from '../zustand/werkzeug.svelte'

  /** Ergebnis (oder Fehlschlag) eines Laufs, gebunden an den reparierten Tab. */
  interface LaufErgebnis {
    tabId: string
    antwort: ReparaturAntwort | null
    fehler: string | null
  }

  const tab = $derived(aktiverTab())
  // Reparatur ist nur für JSON und NDJSON sinnvoll. Ein defektes Dokument
  // lässt sich nicht parsen, deshalb kann tab.format null sein - dann zählt
  // ersatzweise die Dateiendung, damit gerade der Reparaturfall nicht ausfällt.
  const effektivesFormat = $derived<FormatId | null>(
    tab === null ? null : (tab.format ?? formatAusDateiname(tab.titel)),
  )
  const reparierbaresFormat = $derived(
    effektivesFormat === 'json' || effektivesFormat === 'ndjson',
  )

  let laeuft = $state(false)
  let lauf = $state<LaufErgebnis | null>(null)

  // Ergebnis nur zum passenden Tab anzeigen - beim Tab-Wechsel verschwindet es.
  const anzeige = $derived(tab !== null && lauf?.tabId === tab.id ? lauf : null)
  const antwort = $derived(anzeige?.antwort ?? null)

  const startBereit = $derived(tab !== null && !laeuft && reparierbaresFormat)

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  /** Text in Zeilen; ein abschließender Umbruch erzeugt keine Leerzeile. */
  function zeilen(text: string): string[] {
    const geteilt = text.split('\n')
    if (geteilt.length > 1 && geteilt[geteilt.length - 1] === '') geteilt.pop()
    return geteilt
  }

  const originalZeilen = $derived(tab !== null ? zeilen(tab.inhalt) : [])
  const vorschlagZeilen = $derived(antwort !== null ? zeilen(antwort.ergebnis_text) : [])

  /** true, wenn die Vorschlagszeile vom Original an gleicher Position abweicht. */
  function istGeaendert(index: number): boolean {
    if (antwort === null || !antwort.veraendert) return false
    return originalZeilen[index] !== vorschlagZeilen[index]
  }

  async function starteReparatur(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || laeuft || !reparierbaresFormat) return
    laeuft = true
    try {
      const ergebnis = await mitRetry(aktuell, (dokument) => repariere({ dokument }))
      lauf = { tabId: aktuell.id, antwort: ergebnis, fehler: null }
      if (!ergebnis.reparierbar) {
        zeige('Keine gültige Reparatur möglich.', 'fehler')
      } else if (ergebnis.veraendert) {
        zeige(`Reparatur vorgeschlagen: ${ergebnis.aenderungen.length} Änderungen.`, 'info')
      } else {
        zeige('Das Dokument ist bereits gültig.', 'erfolg')
      }
    } catch (grund: unknown) {
      lauf = { tabId: aktuell.id, antwort: null, fehler: fehlerText(grund) }
    } finally {
      laeuft = false
    }
  }

  /** "Übernehmen": Vorschlag in den Tab schreiben, neu analysieren, schließen. */
  function uebernehmen(): void {
    const aktuell = tab
    if (aktuell === null || antwort === null || !antwort.veraendert) return
    setzeInhalt(aktuell.id, antwort.ergebnis_text)
    void sofortAnalysieren(aktuell.id)
    zeige('Reparatur übernommen.', 'erfolg')
    schliesseWerkzeug()
  }

  /** "Verwerfen": Werkzeug schließen, Original bleibt unangetastet. */
  function verwerfen(): void {
    schliesseWerkzeug()
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-screwdriver-wrench"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein defektes JSON-Dokument, um eine Reparatur vorzuschlagen."
  />
{:else if !reparierbaresFormat}
  <LeererZustand
    icon="fa-screwdriver-wrench"
    titel="Reparatur nicht verfügbar"
    text="Die Reparatur ist derzeit für JSON verfügbar."
  />
{:else}
  <div class="werkzeugzeile">
    <button
      class="knopf"
      disabled={!startBereit}
      onclick={() => void starteReparatur()}
    >
      <i class="fa-solid fa-screwdriver-wrench"></i> Reparatur vorschlagen
    </button>
    {#if antwort !== null}
      {#if !antwort.reparierbar}
        <span class="abzeichen fehler">Keine Reparatur möglich</span>
      {:else if antwort.veraendert}
        <span class="abzeichen info">{antwort.aenderungen.length} Änderungen</span>
      {:else}
        <span class="abzeichen gut">Keine Änderungen nötig</span>
      {/if}
    {/if}
    <span class="luecke"></span>
    <button
      class="knopf primaer"
      disabled={antwort === null || !antwort.veraendert}
      onclick={uebernehmen}
    >
      <i class="fa-solid fa-check"></i> Übernehmen
    </button>
    <button class="knopf" disabled={antwort === null} onclick={verwerfen}>
      <i class="fa-solid fa-xmark"></i> Verwerfen
    </button>
  </div>

  {#if anzeige !== null && anzeige.fehler !== null}
    <div class="rp-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Die Reparatur ist fehlgeschlagen: {anzeige.fehler}
      </span>
    </div>
  {:else if antwort !== null}
    <div class="diff-split">
      <div class="diff-pane">
        <div class="diff-pane-kopf">
          <i class="fa-solid fa-file-circle-exclamation"></i> Original
        </div>
        <div class="editor">
          {#each originalZeilen as zeile, index (index)}
            <div class="ed-zeile">
              <span class="zn">{index + 1}</span>
              <span class="ed-code">{zeile}</span>
            </div>
          {/each}
        </div>
      </div>
      <div class="diff-pane">
        <div class="diff-pane-kopf">
          <i class="fa-solid fa-screwdriver-wrench"></i> Vorschlag
          <span class="luecke"></span>
          {#if antwort.reparierbar}
            <span class="abzeichen gut">wieder gültig</span>
          {:else}
            <span class="abzeichen fehler">nicht reparierbar</span>
          {/if}
        </div>
        <div class="editor">
          {#each vorschlagZeilen as zeile, index (index)}
            <div class="ed-zeile" class:diff-hinzu={istGeaendert(index)}>
              <span class="zn">{index + 1}</span>
              <span class="diff-art" class:hinzu={istGeaendert(index)}
                >{istGeaendert(index) ? '+' : ''}</span
              >
              <span class="ed-code">{zeile}</span>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="karte rp-hinweiskarte">
      <div class="karte-kopf"><i class="fa-solid fa-circle-info"></i> Deterministische Reparatur</div>
      <div class="karte-inhalt">
        {#if !antwort.reparierbar}
          <p class="rp-absatz">
            Für dieses Dokument war keine gültige Reparatur möglich. Das Original
            bleibt unangetastet.
          </p>
        {:else if antwort.veraendert}
          <p class="rp-absatz">
            Die Reparatur arbeitet regelbasiert und deterministisch: gleiches Dokument,
            gleicher Vorschlag. {antwort.aenderungen.join('; ')}.
          </p>
        {:else}
          <p class="rp-absatz">Das Dokument ist bereits gültig - es sind keine Änderungen nötig.</p>
        {/if}
        <p class="hinweis-text">Der Vorschlag wird nur nach Bestätigung übernommen.</p>
      </div>
    </div>
  {/if}
{/if}

<style>
  .rp-inhalt {
    padding: var(--a4);
  }

  .rp-hinweiskarte {
    flex: none;
    margin: var(--a3);
  }

  .rp-absatz {
    margin: 0 0 var(--a2);
  }
</style>
