<script lang="ts">
  // Rechte Seitenleiste nach Mockup: Inspektor zur aktuellen Selektion
  // (Pfad, Typ, Wert, Länge, Position, "Pfad kopieren als") und der
  // KI-Bereich. Die KI-Anbindung fehlt in dieser Ausbaustufe - die Aktionen
  // sind ausgegraut, der Status-Punkt steht auf "aus".
  import type { JsonWert, KnotenSpannen } from '../api/typen'
  import {
    alsJsonPath,
    alsPythonZugriff,
    alsTypescriptZugriff,
    alsZeiger,
  } from '../dienste/pfade'
  import { TYP_NAME, WERT_KLASSE } from '../dienste/wertDarstellung'
  import { typVon, wertAnPfad, type WertTyp } from '../dienste/wertZugriff'
  import { selektion } from '../zustand/selektion.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  interface KiAktion {
    icon: string
    name: string
  }

  // Kopier-Knöpfe: der title zeigt beim Zeigen die fertige Schreibweise als Vorschau.
  interface PfadSchreibweise {
    name: string
    wandler: (pfad: string) => string
  }

  const PFAD_SCHREIBWEISEN: PfadSchreibweise[] = [
    { name: 'Zeiger', wandler: alsZeiger },
    { name: 'JSONPath', wandler: alsJsonPath },
    { name: 'Python', wandler: (pfad) => alsPythonZugriff(pfad) },
    { name: 'TypeScript', wandler: (pfad) => alsTypescriptZugriff(pfad) },
  ]

  const KI_AKTIONEN: KiAktion[] = [
    { icon: 'fa-comment-dots', name: 'Daten erklären' },
    { icon: 'fa-magnifying-glass', name: 'Frage in Abfrage übersetzen' },
    { icon: 'fa-diagram-project', name: 'Schema aus Beschreibung' },
    { icon: 'fa-file-lines', name: 'Beschreibung aus Schema' },
    { icon: 'fa-cubes', name: 'Testdaten vorschlagen' },
  ]

  interface InspektorDaten {
    pfad: string
    typ: WertTyp
    wert: JsonWert
    spanne: KnotenSpannen | null
  }

  const daten = $derived.by((): InspektorDaten | null => {
    const auswahl = selektion.aktuell
    const tab = aktiverTab()
    if (auswahl === null || auswahl.pfad === null || tab === null) return null
    if (auswahl.tabId !== tab.id || tab.analyse === null) return null
    const wert = wertAnPfad(tab.analyse.wurzel, auswahl.pfad)
    if (wert === undefined) return null
    return {
      pfad: auswahl.pfad,
      typ: typVon(wert),
      wert,
      spanne: tab.analyse.positionen[auswahl.pfad] ?? null,
    }
  })

  const laengeText = $derived.by((): string | null => {
    if (daten === null) return null
    const wert = daten.wert
    if (typeof wert === 'string') return `${wert.length} Zeichen`
    if (Array.isArray(wert)) {
      return wert.length === 1 ? '1 Eintrag' : `${wert.length} Einträge`
    }
    if (wert !== null && typeof wert === 'object') {
      return `${Object.keys(wert).length} Schlüssel`
    }
    return null
  })

  const positionsText = $derived.by((): string | null => {
    if (daten === null || daten.spanne === null) return null
    const start = daten.spanne.wert.start
    if (start.zeile < 1) return null
    if (start.spalte < 1) return `Zeile ${start.zeile}`
    return `Zeile ${start.zeile}, Spalte ${start.spalte}`
  })

  /** Kürzt einen kopierten Wert für die Toast-Vorschau (der Zwischenablage-Inhalt bleibt vollständig). */
  function fuerVorschau(text: string): string {
    const eine_zeile = text.replace(/\s+/g, ' ').trim()
    return eine_zeile.length > 160 ? `${eine_zeile.slice(0, 160)} …` : eine_zeile
  }

  /** Kopiert den Pfad in der gewünschten Schreibweise in die Zwischenablage. */
  async function kopiere(name: string, wandler: (pfad: string) => string): Promise<void> {
    if (daten === null) return
    const wert = wandler(daten.pfad)
    try {
      await navigator.clipboard.writeText(wert)
      zeige(`Pfad als ${name} kopiert.`, 'erfolg', wert)
    } catch {
      zeige('Der Pfad konnte nicht kopiert werden.', 'fehler')
    }
  }

  // Der Baum zeigt nur eine einzeilige Kurzvorschau - hier steht der Wert
  // VOLLSTÄNDIG (Texte roh, Container als eingerücktes JSON). Nur die Anzeige
  // ist bei sehr großen Teilbäumen gedeckelt; "Wert kopieren" liefert immer alles.
  const ANZEIGE_GRENZE = 20_000

  const wertVoll = $derived.by((): string => {
    if (daten === null) return ''
    if (typeof daten.wert === 'string') return daten.wert
    return JSON.stringify(daten.wert, null, 2) ?? 'null'
  })

  const wertAnzeige = $derived(
    wertVoll.length > ANZEIGE_GRENZE ? wertVoll.slice(0, ANZEIGE_GRENZE) : wertVoll,
  )

  async function kopiereWert(): Promise<void> {
    try {
      await navigator.clipboard.writeText(wertVoll)
      zeige('Wert vollständig kopiert.', 'erfolg', fuerVorschau(wertVoll))
    } catch {
      zeige('Der Wert konnte nicht kopiert werden.', 'fehler')
    }
  }
</script>

<aside class="seite-rechts">
  <div class="leisten-titel">Inspektor</div>
  {#if daten !== null}
    <div class="inspektor-block">
      <code class="pfad-code">{daten.pfad}</code>
      <dl>
        <dt>Typ</dt>
        <dd><span class="{WERT_KLASSE[daten.typ]} mono">{TYP_NAME[daten.typ]}</span></dd>
        {#if laengeText !== null}
          <dt>Länge</dt>
          <dd>{laengeText}</dd>
        {/if}
        {#if positionsText !== null}
          <dt>Position</dt>
          <dd>{positionsText}</dd>
        {/if}
      </dl>
      <div class="wert-kopf">
        <span class="beschriftung">Wert (vollständig)</span>
        <span class="luecke"></span>
        <button class="icon-knopf" title="Wert vollständig kopieren" onclick={() => void kopiereWert()}>
          <i class="fa-solid fa-copy"></i>
        </button>
      </div>
      <code class="wert-voll">{wertAnzeige}</code>
      {#if wertVoll.length > ANZEIGE_GRENZE}
        <div class="hinweis-text" style="margin-top: 4px">
          Anzeige nach {ANZEIGE_GRENZE.toLocaleString('de-DE')} Zeichen gekürzt - "Wert kopieren" liefert alles.
        </div>
      {/if}
    </div>
    <div class="inspektor-block">
      <div class="beschriftung" style="margin-bottom: 6px">Pfad kopieren als</div>
      <div class="feld-zeile" style="flex-wrap: wrap; gap: 4px">
        {#each PFAD_SCHREIBWEISEN as schreibweise (schreibweise.name)}
          <button
            class="knopf klein"
            title={schreibweise.wandler(daten.pfad)}
            onclick={() => void kopiere(schreibweise.name, schreibweise.wandler)}
          >
            {schreibweise.name}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="inspektor-block">
      <div class="hinweis-text">Kein Element ausgewählt.</div>
    </div>
  {/if}

  <div class="ki-kopfzeile">
    <i class="fa-solid fa-wand-magic-sparkles"></i> KI-Werkzeuge
    <span class="luecke"></span>
    <span class="status-punkt aus"></span>
  </div>
  <div class="bereich-ausgegraut">
    {#each KI_AKTIONEN as aktion (aktion.name)}
      <button class="ki-aktion">
        <i class="fa-solid {aktion.icon}"></i>
        {aktion.name}
      </button>
    {/each}
  </div>
  <div class="ki-hinweis">
    <i class="fa-solid fa-circle-info"></i>
    <span>Die KI-Anbindung folgt in einer späteren Ausbaustufe.</span>
  </div>
</aside>

<style>
  .wert-kopf {
    display: flex;
    align-items: center;
    margin-top: var(--a2);
  }

  .wert-voll {
    display: block;
    font-family: var(--schrift-mono);
    font-size: 0.78rem;
    line-height: 1.45;
    background: var(--flaeche-eingabe);
    border: 1px solid var(--rand-1);
    padding: var(--a2);
    max-height: 200px;
    overflow: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
