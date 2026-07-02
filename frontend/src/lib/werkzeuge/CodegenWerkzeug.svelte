<script lang="ts">
  // Codegen-Werkzeug nach mockups/codegen.html: Werkzeugzeile mit Ziel-Auswahl
  // (aus den Capabilities), Wurzelname-Feld und den Knöpfen Erzeugen, Kopieren,
  // Herunterladen. Nach dem Lauf erscheint der erzeugte Quelltext im .code-block
  // samt Warnungen und der Hinweis-Karte zum abgeleiteten JSON Schema.
  import { erzeugeCode } from '../api/generieren'
  import { ApiError } from '../api/http'
  import type { CodegenAntwort, CodegenZiel } from '../api/typen'
  import { ladeHerunter } from '../dienste/dateiEinAusgabe'
  import { mitRetry } from '../dienste/dokumentReferenz'
  import LeererZustand from '../hilfsteile/LeererZustand.svelte'
  import FachbegriffLink from '../lexikon/FachbegriffLink.svelte'
  import { capabilities } from '../zustand/capabilities.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  /** Ergebnis (oder Fehlschlag) eines Laufs, gebunden an den erzeugten Tab. */
  interface LaufErgebnis {
    tabId: string
    antwort: CodegenAntwort | null
    fehler: string | null
  }

  const tab = $derived(aktiverTab())
  const ziele = $derived(capabilities.daten?.codegen_ziele ?? [])

  let zielWahl = $state<CodegenZiel | ''>('')
  let wurzelname = $state('Wurzel')
  let laeuft = $state(false)
  let lauf = $state<LaufErgebnis | null>(null)

  // Beim ersten Rendern (und wenn die Auswahl leer ist) das erste Ziel vorbelegen.
  $effect(() => {
    if (zielWahl !== '' || ziele.length === 0) return
    zielWahl = ziele[0].id
  })

  // Ergebnis nur zum passenden Tab anzeigen - beim Tab-Wechsel verschwindet es.
  const anzeige = $derived(tab !== null && lauf?.tabId === tab.id ? lauf : null)
  const antwort = $derived(anzeige?.antwort ?? null)
  const code = $derived(antwort?.code ?? null)
  const warnungen = $derived(antwort?.warnungen ?? [])

  const startBereit = $derived(tab !== null && !laeuft && zielWahl !== '')
  const ergebnisBereit = $derived(antwort !== null && code !== null)

  function fehlerText(grund: unknown): string {
    if (grund instanceof ApiError) return grund.meldung
    return grund instanceof Error ? grund.message : String(grund)
  }

  async function starteErzeugung(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || laeuft || zielWahl === '') return
    const ziel = zielWahl
    const name = wurzelname.trim() === '' ? 'Wurzel' : wurzelname.trim()
    laeuft = true
    try {
      const ergebnis = await mitRetry(aktuell, (dokument) =>
        erzeugeCode({ dokument, ziel, wurzelname: name }),
      )
      lauf = { tabId: aktuell.id, antwort: ergebnis, fehler: null }
      if (ergebnis.warnungen.length > 0) {
        zeige(`Code erzeugt - ${ergebnis.warnungen.length} Hinweise.`, 'info')
      } else {
        zeige('Code erzeugt.', 'erfolg')
      }
    } catch (grund: unknown) {
      lauf = { tabId: aktuell.id, antwort: null, fehler: fehlerText(grund) }
    } finally {
      laeuft = false
    }
  }

  /** Erste Zeile (gekürzt) des Codes für die Toast-Vorschau. */
  function kurzeVorschau(text: string): string {
    const erste = text.split('\n', 1)[0] ?? ''
    return erste.length > 80 ? `${erste.slice(0, 79)}…` : erste
  }

  async function kopiere(): Promise<void> {
    if (code === null) return
    try {
      await navigator.clipboard.writeText(code)
      zeige('Code kopiert.', 'erfolg', kurzeVorschau(code))
    } catch {
      zeige('Der Code konnte nicht kopiert werden.', 'fehler')
    }
  }

  function herunterladen(): void {
    if (antwort === null || code === null) return
    const name = wurzelname.trim() === '' ? 'Wurzel' : wurzelname.trim()
    const dateiname = `${name}.${antwort.dateiendung}`
    ladeHerunter(dateiname, code, 'text/plain')
  }
</script>

{#if tab === null}
  <LeererZustand
    icon="fa-code"
    titel="Kein Dokument geöffnet"
    text="Öffne zuerst ein Dokument, um daraus Typdefinitionen zu erzeugen."
  />
{:else}
  <div class="werkzeugzeile">
    <span class="beschriftung">Ziel:</span>
    <select class="feld" bind:value={zielWahl}>
      {#each ziele as ziel (ziel.id)}
        <option value={ziel.id}>{ziel.name}</option>
      {/each}
    </select>
    <span class="beschriftung">Wurzelname:</span>
    <input class="feld mono" type="text" style="width: 160px" bind:value={wurzelname} />
    <span class="luecke"></span>
    <button class="knopf primaer" disabled={!startBereit} onclick={() => void starteErzeugung()}>
      <i class="fa-solid fa-code"></i> Erzeugen
    </button>
    <button class="knopf" disabled={!ergebnisBereit} onclick={() => void kopiere()}>
      <i class="fa-solid fa-copy"></i> Kopieren
    </button>
    <button class="knopf" disabled={!ergebnisBereit} onclick={herunterladen}>
      <i class="fa-solid fa-download"></i> Herunterladen
    </button>
  </div>

  {#if anzeige !== null && anzeige.fehler !== null}
    <div class="codegen-inhalt">
      <span class="hinweis-text">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Die Codegenerierung ist nicht möglich: {anzeige.fehler}
      </span>
    </div>
  {:else if antwort !== null && code !== null}
    <div class="codegen-inhalt">
      <div class="code-block">{code}</div>

      {#if warnungen.length > 0}
        <span class="hinweis-text">
          {#each warnungen as warnung, index (index)}
            <span class="codegen-warnung">
              <i class="fa-solid fa-triangle-exclamation"></i> {warnung}
            </span>
          {/each}
        </span>
      {/if}

      <div class="codegen-hinweis">
        <i class="fa-solid fa-circle-info"></i>
        <span>
          Erzeugt aus dem abgeleiteten
          <FachbegriffLink topic="json-schema">JSON Schema</FachbegriffLink> - Felder,
          die nur teilweise vorkommen, werden optional.
        </span>
      </div>
    </div>
  {:else}
    <div class="codegen-inhalt">
      <span class="hinweis-text">
        Wähle ein Ziel und einen Wurzelnamen, dann "Erzeugen".
      </span>
    </div>
  {/if}
{/if}

<style>
  /* Seiten-spezifische Anordnung wie im Mockup (dort im <style> der Seite). */
  .codegen-inhalt {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--a3);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }

  .codegen-inhalt .code-block {
    flex: none;
  }

  .codegen-warnung {
    display: block;
  }

  .codegen-hinweis {
    display: flex;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    background: var(--zustand-info-weich);
    border: 1px solid var(--rand-1);
    font-size: 0.8rem;
    color: var(--text-2);
  }

  .codegen-hinweis i {
    color: var(--zustand-info);
  }
</style>
