<script lang="ts">
  // Rechte Seitenleiste nach Mockup: Inspektor zur aktuellen Selektion
  // (Pfad, Typ, Wert, Länge, Position, "Pfad kopieren als") und der
  // KI-Bereich. Der KI-Bereich ist an ein lokales Sprachmodell angebunden: der
  // Status-Punkt spiegelt die Erreichbarkeit, die Aktionen sind nur bei
  // erreichbarem Modell aktiv. Jedes Ergebnis erscheint als Vorschau (KiVorschau)
  // und wird erst nach Bestätigung übernommen.
  import type { JsonWert, KnotenSpannen } from '../api/typen'
  import {
    alsJsonPath,
    alsPythonZugriff,
    alsTypescriptZugriff,
    alsZeiger,
  } from '../dienste/pfade'
  import { TYP_NAME, WERT_KLASSE } from '../dienste/wertDarstellung'
  import { typVon, wertAnPfad, type WertTyp } from '../dienste/wertZugriff'
  import KiEingabeModal from '../ki/KiEingabeModal.svelte'
  import KiEinstellungenModal from '../ki/KiEinstellungenModal.svelte'
  import KiVorschau from '../ki/KiVorschau.svelte'
  import {
    kiAufgabe,
    starteAbfrage,
    starteErklaeren,
    starteSchemaAusText,
    starteTestdaten,
    starteTextAusSchema,
  } from '../ki/kiAufgaben.svelte'
  import { selektion } from '../zustand/selektion.svelte'
  import { oeffneEinstellungen } from '../zustand/einstellungenModal.svelte'
  import { kiEinstellungen } from '../zustand/kiEinstellungen.svelte'
  import { kiStatus, pruefe as pruefeKi } from '../zustand/kiStatus.svelte'
  import { aktiverTab } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  interface KiAktion {
    icon: string
    name: string
    /** true, wenn die Aktion ein offenes Dokument braucht (alle ausser Schema). */
    brauchtDokument: boolean
    starte: () => void
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

  // Modale für Aktionen, die zuerst eine Texteingabe verlangen.
  let abfrageModalOffen = $state(false)
  let schemaModalOffen = $state(false)
  let einstellungenOffen = $state(false)

  const KI_AKTIONEN: KiAktion[] = [
    {
      icon: 'fa-comment-dots',
      name: 'Daten erklären',
      brauchtDokument: true,
      starte: starteErklaeren,
    },
    {
      icon: 'fa-magnifying-glass',
      name: 'Frage in Abfrage übersetzen',
      brauchtDokument: true,
      starte: () => {
        abfrageModalOffen = true
      },
    },
    {
      icon: 'fa-diagram-project',
      name: 'Schema aus Beschreibung',
      brauchtDokument: false,
      starte: () => {
        schemaModalOffen = true
      },
    },
    {
      icon: 'fa-file-lines',
      name: 'Beschreibung aus Schema',
      brauchtDokument: true,
      starte: starteTextAusSchema,
    },
    {
      icon: 'fa-cubes',
      name: 'Testdaten vorschlagen',
      brauchtDokument: true,
      starte: starteTestdaten,
    },
  ]

  // Aktiv, wenn das Modell erreichbar ist UND die KI-Funktionen angeboten werden.
  // erreichbar === null (erste Prüfung) gilt noch nicht als erreichbar - die
  // Aktionen bleiben bis dahin ausgegraut.
  const kiAktiv = $derived(kiStatus.erreichbar === true && kiEinstellungen.angeboten)

  const statusKlasse = $derived(
    kiStatus.erreichbar === false || !kiEinstellungen.angeboten ? 'aus' : '',
  )

  const statusTitel = $derived.by((): string => {
    if (!kiEinstellungen.angeboten) return 'KI-Funktionen sind in den Einstellungen abgeschaltet'
    if (kiStatus.erreichbar === true) return 'Lokales Sprachmodell erreichbar'
    if (kiStatus.erreichbar === false) return 'Kein lokales Sprachmodell erreichbar'
    return 'Erreichbarkeit wird geprüft'
  })

  const aktionsTitel = $derived.by((): string => {
    if (!kiEinstellungen.angeboten) return 'KI-Funktionen sind abgeschaltet'
    return 'Kein lokales Sprachmodell erreichbar'
  })

  function fuehreAktionAus(aktion: KiAktion): void {
    if (!kiAktiv || kiAufgabe.laeuft) return
    if (aktion.brauchtDokument && aktiverTab() === null) {
      zeige('Zuerst ein Dokument öffnen.', 'info')
      return
    }
    aktion.starte()
  }

  function bestaetigeAbfrage(frage: string): void {
    starteAbfrage(frage)
  }

  function bestaetigeSchema(beschreibung: string): void {
    starteSchemaAusText(beschreibung)
  }

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
    <button
      class="icon-knopf"
      title="KI-Einstellungen"
      aria-label="KI-Einstellungen"
      onclick={() => (einstellungenOffen = true)}
    >
      <i class="fa-solid fa-gear"></i>
    </button>
    <span
      class="status-punkt {statusKlasse} {kiStatus.erreichbar === null ? 'wird-geprueft' : ''}"
      title={statusTitel}
    ></span>
  </div>

  <!-- Ergebnis-Vorschau der laufenden Aufgabe (nie Auto-Apply). -->
  <KiVorschau />

  <div class={kiAktiv ? '' : 'bereich-ausgegraut'}>
    {#each KI_AKTIONEN as aktion (aktion.name)}
      <button
        class="ki-aktion"
        disabled={!kiAktiv || kiAufgabe.laeuft}
        title={kiAktiv ? aktion.name : aktionsTitel}
        onclick={() => fuehreAktionAus(aktion)}
      >
        <i class="fa-solid {aktion.icon}"></i>
        {aktion.name}
      </button>
    {/each}
  </div>

  {#if kiAufgabe.laeuft}
    <div class="ki-hinweis">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Das Sprachmodell arbeitet an der Anfrage …</span>
    </div>
  {:else if kiAufgabe.fehler !== null}
    <div class="ki-hinweis ki-hinweis-fehler">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>{kiAufgabe.fehler}</span>
    </div>
  {/if}

  {#if !kiEinstellungen.angeboten}
    <div class="ki-hinweis">
      <i class="fa-solid fa-circle-info"></i>
      <span>Die KI-Funktionen sind abgeschaltet. In den Einstellungen wieder aktivieren.</span>
    </div>
    <div class="feld-zeile ki-fuss-zeile">
      <button class="knopf klein" onclick={oeffneEinstellungen}>
        <i class="fa-solid fa-gear"></i> Zu den Einstellungen
      </button>
    </div>
  {:else if kiStatus.erreichbar === false}
    <div class="ki-hinweis">
      <i class="fa-solid fa-circle-info"></i>
      <span>Kein lokales Sprachmodell erreichbar. Prüfe die Adresse in den Einstellungen.</span>
    </div>
    <div class="feld-zeile ki-fuss-zeile">
      <button class="knopf klein" onclick={() => void pruefeKi()}>
        <i class="fa-solid fa-rotate"></i> Erneut prüfen
      </button>
      <button class="knopf klein" onclick={() => (einstellungenOffen = true)}>
        <i class="fa-solid fa-gear"></i> Zu den Einstellungen
      </button>
    </div>
  {:else}
    <div class="ki-hinweis">
      <i class="fa-solid fa-circle-info"></i>
      <span>Jedes KI-Ergebnis erscheint als Vorschau und wird erst nach Bestätigung übernommen.</span>
    </div>
  {/if}
</aside>

<KiEingabeModal
  bind:offen={abfrageModalOffen}
  titel="Frage in Abfrage übersetzen"
  beschriftung="Was soll gefunden werden? (Alltagssprache)"
  platzhalter="z. B. alle Summen über 50"
  knopfText="Vorschlagen"
  onBestaetige={bestaetigeAbfrage}
  onSchliessen={() => (abfrageModalOffen = false)}
/>

<KiEingabeModal
  bind:offen={schemaModalOffen}
  titel="Schema aus Beschreibung"
  beschriftung="Beschreibe die gewünschte Struktur (Alltagssprache)"
  platzhalter="z. B. eine Bestellung mit Nummer, Kunde und Positionen"
  knopfText="Schema erzeugen"
  onBestaetige={bestaetigeSchema}
  onSchliessen={() => (schemaModalOffen = false)}
/>

<KiEinstellungenModal
  bind:offen={einstellungenOffen}
  onSchliessen={() => (einstellungenOffen = false)}
/>

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

  /* Ausgegraute Aktionen dürfen keinen Klick auslösen (zusätzlich zu disabled). */
  .ki-aktion:disabled {
    cursor: not-allowed;
  }

  /* Neutraler, dezent pulsierender Punkt, solange die erste Prüfung läuft. */
  .status-punkt.wird-geprueft {
    background: var(--text-3);
    animation: ki-puls 1.4s ease-in-out infinite;
  }

  @keyframes ki-puls {
    0%,
    100% {
      opacity: 0.35;
    }
    50% {
      opacity: 1;
    }
  }

  .ki-hinweis-fehler {
    background: var(--zustand-fehler-weich);
    color: var(--text-1);
  }

  .ki-fuss-zeile {
    margin: 0 var(--a3) var(--a3);
    flex-wrap: wrap;
  }
</style>
