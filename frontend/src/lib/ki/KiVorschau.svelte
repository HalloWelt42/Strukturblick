<script lang="ts">
  // Vorschau eines KI-Ergebnisses als Karte in der rechten Leiste. Je nach
  // Aufgabenart wird das Ergebnis dargestellt und - wo sinnvoll - über
  // "Übernehmen" in die App gespiegelt. Nichts wird automatisch angewendet:
  // erst der Klick auf "Übernehmen" ändert etwas (Vorschau-vor-Anwenden-Regel).
  // Bei den Testdaten lässt sich je Datensatz per Kontrollkästchen wählen,
  // welche übernommen werden (Optik ki-vorschau-zeile wie im Mockup).
  import type { JsonWert } from '../api/typen'
  import { setzeAbfrage } from '../zustand/konsole.svelte'
  import { oeffneTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import { kiAufgabe, verwerfeAufgabe, type KiErgebnis } from './kiAufgaben.svelte'

  // Die Vorschau rendert nur, wenn ein Ergebnis vorliegt.
  const ergebnis = $derived<KiErgebnis | null>(kiAufgabe.ergebnis)

  // Auswahl der Testdaten-Datensätze (Index -> übernehmen ja/nein).
  let testdatenAuswahl = $state<boolean[]>([])

  // Bei jedem neuen Testdaten-Ergebnis alle Datensätze vorausgewählt setzen.
  $effect(() => {
    if (ergebnis !== null && ergebnis.art === 'testdaten') {
      testdatenAuswahl = ergebnis.daten.dokumente.map(() => true)
    }
  })

  function schoen(wert: JsonWert): string {
    return JSON.stringify(wert, null, 2) ?? 'null'
  }

  function kurz(wert: JsonWert): string {
    const text = JSON.stringify(wert) ?? 'null'
    return text.length > 90 ? `${text.slice(0, 90)} …` : text
  }

  function schliesse(): void {
    verwerfeAufgabe()
  }

  // --- Übernehmen je Aufgabenart -------------------------------------------

  function uebernehmeAbfrage(sprache: string, ausdruck: string): void {
    setzeAbfrage(sprache, ausdruck)
    zeige('Abfrage in die Konsole übernommen.', 'erfolg', ausdruck)
    verwerfeAufgabe()
  }

  function uebernehmeSchema(schema: JsonWert): void {
    const id = oeffneTab({ titel: 'schema.json', inhalt: schoen(schema) })
    void sofortAnalysieren(id)
    zeige('Schema als neuer Tab übernommen.', 'erfolg')
    verwerfeAufgabe()
  }

  function uebernehmeTestdaten(dokumente: JsonWert[]): void {
    const gewaehlt = dokumente.filter((_, index) => testdatenAuswahl[index] === true)
    if (gewaehlt.length === 0) {
      zeige('Kein Datensatz ausgewählt.', 'info')
      return
    }
    const id = oeffneTab({ titel: 'testdaten.json', inhalt: schoen(gewaehlt) })
    void sofortAnalysieren(id)
    const wieViele =
      gewaehlt.length === 1 ? '1 Datensatz' : `${gewaehlt.length} Datensätze`
    zeige(`${wieViele} als neuer Tab übernommen.`, 'erfolg')
    verwerfeAufgabe()
  }

  function schalteTestdaten(index: number): void {
    testdatenAuswahl[index] = !testdatenAuswahl[index]
  }
</script>

{#if ergebnis !== null}
  <div class="karte">
    {#if ergebnis.art === 'erklaeren'}
      <div class="karte-kopf"><i class="fa-solid fa-comment-dots"></i> Erklärung (Vorschau)</div>
      <div class="karte-inhalt">
        <p class="ki-fliesstext">{ergebnis.daten.zusammenfassung}</p>
        {#each ergebnis.daten.abschnitte as abschnitt (abschnitt.titel)}
          <div class="ki-abschnitt">
            <div class="ki-abschnitt-titel">{abschnitt.titel}</div>
            <p class="ki-fliesstext">{abschnitt.text}</p>
          </div>
        {/each}
        <div class="feld-zeile" style="margin-top: var(--a3)">
          <button class="knopf klein" onclick={schliesse}>Schließen</button>
        </div>
      </div>
    {:else if ergebnis.art === 'abfrage'}
      <div class="karte-kopf">
        <i class="fa-solid fa-magnifying-glass"></i> Abfrage-Vorschlag (Vorschau)
      </div>
      <div class="karte-inhalt">
        <div class="beschriftung">Sprache</div>
        <div class="ki-mono-zeile">{ergebnis.daten.sprache}</div>
        <div class="beschriftung" style="margin-top: var(--a2)">Ausdruck</div>
        <code class="code-block ki-ausdruck">{ergebnis.daten.ausdruck}</code>
        {#if ergebnis.daten.probelauf_treffer !== null}
          <div class="ki-treffer">
            <i class="fa-solid fa-circle-check"></i>
            Probelauf: {ergebnis.daten.probelauf_treffer}
            {ergebnis.daten.probelauf_treffer === 1 ? 'Treffer' : 'Treffer'}
          </div>
        {/if}
        <p class="ki-fliesstext" style="margin-top: var(--a2)">{ergebnis.daten.erklaerung}</p>
        <div class="feld-zeile" style="flex-wrap: wrap; margin-top: var(--a3)">
          <button
            class="knopf klein primaer"
            onclick={() => uebernehmeAbfrage(ergebnis.daten.sprache, ergebnis.daten.ausdruck)}
          >
            <i class="fa-solid fa-check"></i> In Abfrage übernehmen
          </button>
          <button class="knopf klein" onclick={schliesse}>Verwerfen</button>
        </div>
      </div>
    {:else if ergebnis.art === 'schema_text'}
      <div class="karte-kopf">
        <i class="fa-solid fa-diagram-project"></i> Schema (Vorschau)
      </div>
      <div class="karte-inhalt">
        <code class="code-block ki-schema">{schoen(ergebnis.daten.schema)}</code>
        {#if ergebnis.daten.annahmen.length > 0}
          <div class="beschriftung" style="margin-top: var(--a3)">Annahmen</div>
          <ul class="ki-annahmen">
            {#each ergebnis.daten.annahmen as annahme, i (i)}
              <li>{annahme}</li>
            {/each}
          </ul>
        {/if}
        <div class="feld-zeile" style="flex-wrap: wrap; margin-top: var(--a3)">
          <button
            class="knopf klein primaer"
            onclick={() => uebernehmeSchema(ergebnis.daten.schema)}
          >
            <i class="fa-solid fa-check"></i> Als neuer Tab übernehmen
          </button>
          <button class="knopf klein" onclick={schliesse}>Verwerfen</button>
        </div>
      </div>
    {:else if ergebnis.art === 'text_schema'}
      <div class="karte-kopf">
        <i class="fa-solid fa-file-lines"></i> Beschreibung (Vorschau)
      </div>
      <div class="karte-inhalt">
        <p class="ki-fliesstext">{ergebnis.daten.beschreibung}</p>
        <div class="feld-zeile" style="margin-top: var(--a3)">
          <button class="knopf klein" onclick={schliesse}>Schließen</button>
        </div>
      </div>
    {:else}
      <div class="karte-kopf"><i class="fa-solid fa-cubes"></i> Testdaten (Vorschau)</div>
      {#each ergebnis.daten.dokumente as dokument, index (index)}
        <div class="ki-vorschau-zeile">
          <button
            type="button"
            class="checkbox {testdatenAuswahl[index] ? 'an' : ''}"
            aria-label="Datensatz {index + 1} übernehmen"
            aria-pressed={testdatenAuswahl[index] === true}
            onclick={() => schalteTestdaten(index)}
          >
            <i class="fa-solid fa-check"></i>
          </button>
          <span class="vorschau-feld">Datensatz {index + 1}</span>
          <span class="vorschau-wert">{kurz(dokument)}</span>
        </div>
      {/each}
      <div class="karte-inhalt">
        <div class="feld-zeile" style="flex-wrap: wrap">
          <button
            class="knopf klein primaer"
            onclick={() => uebernehmeTestdaten(ergebnis.daten.dokumente)}
          >
            <i class="fa-solid fa-check"></i> Ausgewählte übernehmen
          </button>
          <button class="knopf klein" onclick={schliesse}>Verwerfen</button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .karte {
    margin: 0 var(--a3) var(--a3);
  }

  .ki-fliesstext {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--text-2);
  }

  .ki-abschnitt {
    margin-top: var(--a3);
  }

  .ki-abschnitt-titel {
    font-weight: 600;
    font-size: 0.84rem;
    margin-bottom: 2px;
  }

  .ki-mono-zeile {
    font-family: var(--schrift-mono);
    font-size: 0.82rem;
    color: var(--text-1);
  }

  .ki-ausdruck,
  .ki-schema {
    display: block;
    max-height: 220px;
    margin-top: var(--a1);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ki-treffer {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin-top: var(--a2);
    font-size: 0.82rem;
    color: var(--zustand-erfolg);
  }

  .ki-annahmen {
    margin: var(--a1) 0 0;
    padding-left: 1.1rem;
    font-size: 0.82rem;
    color: var(--text-2);
  }

  .ki-annahmen li {
    margin-bottom: 2px;
  }
</style>
