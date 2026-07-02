<script lang="ts">
  // Abfragekonsole nach mockups/abfrage.html (ausgeklappt) und mockups/baum.html
  // (eingeklappt). Eingeklappt zeigt sie nur den Kopf; ausgeklappt die
  // Eingabezeile (Sprache, Ausdruck, nur-Schlüssel-Schalter, Knöpfe) und die
  // Trefferliste. Ein Klick auf einen Treffer setzt die Selektion mit der
  // Quelle "suche" - Baum und Editor springen darüber zur Fundstelle.
  import { onMount } from 'svelte'

  import type { AbfrageSprache, QuellSpanne, Treffer } from '../api/typen'
  import { sofortAnalysieren } from '../dienste/analyseDienst'
  import FachbegriffLink from '../lexikon/FachbegriffLink.svelte'
  import { leere as leereVerlauf, lies, type HistorieEintrag } from '../speicher/abfrageHistorie'
  import { fuehreAus, konsole, umschalten } from '../zustand/konsole.svelte'
  import { setzeSelektion } from '../zustand/selektion.svelte'
  import { aktiverTab, oeffneTab, setzeAnsicht } from '../zustand/tabs.svelte'
  import { zeige } from '../zustand/toaster.svelte'

  const tab = $derived(aktiverTab())
  const istXml = $derived(tab?.format === 'xml')

  // Ergebnis nur zeigen, wenn es zum aktiven Tab gehört.
  const ergebnis = $derived(
    tab !== null && konsole.tabId === tab.id ? konsole.ergebnis : null,
  )
  const zeigeSchluesselSchalter = $derived(
    konsole.sprache === 'volltext' || konsole.sprache === 'regex',
  )
  const ergebnisBereit = $derived(ergebnis !== null && ergebnis.anzahl > 0)

  // Bei XML-Wechsel eine deaktivierte XPath-Auswahl nicht hängen lassen: ist
  // XPath gewählt, aber das Dokument kein XML, auf JSONPath zurückfallen.
  $effect(() => {
    if (!istXml && konsole.sprache === 'xpath') {
      konsole.sprache = 'jsonpath'
    }
  })

  // Verlaufs-Popover: lokale Sichtbarkeit und geladene Einträge.
  let verlaufOffen = $state(false)
  let verlaufEintraege = $state<HistorieEintrag[]>([])

  const SPRACH_NAMEN: Record<AbfrageSprache, string> = {
    jsonpath: 'JSONPath',
    xpath: 'XPath',
    volltext: 'Volltext',
    regex: 'Regulärer Ausdruck',
  }

  /** Fachbegriff-Thema zur Sprache; volltext/regex haben keins. */
  const FACHTHEMA: Partial<Record<AbfrageSprache, string>> = {
    jsonpath: 'jsonpath',
    xpath: 'xpath',
  }
  const fachthema = $derived(FACHTHEMA[konsole.sprache] ?? null)

  function starte(): void {
    verlaufOffen = false
    const aktuell = tab
    if (aktuell === null) return
    void fuehreAus(aktuell)
  }

  function beiTaste(ereignis: KeyboardEvent): void {
    if (ereignis.key === 'Enter') {
      ereignis.preventDefault()
      starte()
    }
  }

  /** "Z X" wie in der Aufgabe - die Quelltextzeile des Treffers, falls bekannt. */
  function positionsText(position: QuellSpanne): string {
    return `Z ${position.start.zeile}`
  }

  /** Klick auf einen Treffer: Selektion setzen; Baum/Editor springen darüber. */
  function springe(treffer: Treffer): void {
    const aktuell = tab
    if (aktuell === null) return
    setzeSelektion({ tabId: aktuell.id, pfad: treffer.pfad, quelle: 'suche' })
    // Ansicht bewusst nicht wechseln - die aktuelle Ansicht springt selbst.
    setzeAnsicht(aktuell.id, aktuell.aktiveAnsicht)
  }

  /** Baut aus den Treffer-Werten ein JSON-Array und öffnet es als neuen Tab. */
  function alsNeuerTab(): void {
    const aktuell = tab
    if (aktuell === null || ergebnis === null || ergebnis.treffer.length === 0) return
    const werte = ergebnis.treffer.map((treffer) => treffer.wert)
    const kurz = konsole.ausdruck.trim().slice(0, 40)
    const neu = oeffneTab({
      titel: `Abfrage: ${kurz}`,
      inhalt: JSON.stringify(werte, null, 2),
      format: 'json',
    })
    void sofortAnalysieren(neu)
    zeige(`${werte.length} Treffer als neuen Tab geöffnet.`, 'erfolg')
  }

  async function oeffneVerlauf(): Promise<void> {
    if (verlaufOffen) {
      verlaufOffen = false
      return
    }
    verlaufEintraege = await lies()
    verlaufOffen = true
  }

  function setzeEin(eintrag: HistorieEintrag): void {
    konsole.sprache = eintrag.sprache
    konsole.ausdruck = eintrag.ausdruck
    verlaufOffen = false
  }

  async function leereVerlaufKlick(): Promise<void> {
    await leereVerlauf()
    verlaufEintraege = []
  }

  /** Zeitpunkt als kurze deutsche Datum-Uhrzeit-Angabe. */
  function zeitText(zeitpunkt: number): string {
    return new Date(zeitpunkt).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Popover bei Klick außerhalb schließen.
  onMount(() => {
    function beiKlickAussen(ereignis: MouseEvent): void {
      if (!(ereignis.target instanceof Element)) return
      if (ereignis.target.closest('.konsole-verlauf') === null) verlaufOffen = false
    }
    document.addEventListener('click', beiKlickAussen)
    return () => document.removeEventListener('click', beiKlickAussen)
  })
</script>

{#if !konsole.offen}
  <!-- Eingeklappt: nur der Kopf wie im Baum-Mockup. -->
  <section class="konsole">
    <div class="konsole-kopf">
      <i class="fa-solid fa-terminal"></i> Abfrage
      <span class="luecke"></span>
      <button class="icon-knopf" aria-label="Konsole ausklappen" onclick={umschalten}>
        <i class="fa-solid fa-chevron-up"></i>
      </button>
    </div>
  </section>
{:else}
  <!-- Ausgeklappt: Kopf, Eingabezeile, Trefferliste. -->
  <section class="konsole abfr-offen">
    <div class="konsole-kopf">
      <i class="fa-solid fa-terminal"></i> Abfrage
      {#if fachthema !== null}
        <FachbegriffLink topic={fachthema}>{SPRACH_NAMEN[konsole.sprache]}</FachbegriffLink>
      {/if}
      <span class="luecke"></span>
      {#if ergebnis !== null}
        <span class="abzeichen info">{ergebnis.anzahl} Treffer</span>
        {#if ergebnis.abgeschnitten}
          <span class="hinweis-text">(abgeschnitten)</span>
        {/if}
      {/if}
      <button class="icon-knopf" aria-label="Konsole einklappen" onclick={umschalten}>
        <i class="fa-solid fa-chevron-down"></i>
      </button>
    </div>

    <div class="konsole-zeile">
      <select class="feld" aria-label="Abfragesprache" bind:value={konsole.sprache}>
        <option value="jsonpath">JSONPath</option>
        <option value="xpath" disabled={!istXml} title={istXml ? undefined : 'Nur für XML'}>
          XPath
        </option>
        <option value="volltext">Volltext</option>
        <option value="regex">Regulärer Ausdruck</option>
      </select>
      <input
        class="feld mono ausdruck"
        type="text"
        placeholder="Ausdruck eingeben ..."
        bind:value={konsole.ausdruck}
        onkeydown={beiTaste}
      />
      {#if zeigeSchluesselSchalter}
        <label class="beschriftung konsole-schluessel">
          <button
            type="button"
            class="checkbox"
            class:an={konsole.nurSchluessel}
            role="checkbox"
            aria-checked={konsole.nurSchluessel}
            aria-label="Nur Schlüssel durchsuchen"
            onclick={() => (konsole.nurSchluessel = !konsole.nurSchluessel)}
          >
            <i class="fa-solid fa-check"></i>
          </button>
          nur Schlüssel
        </label>
      {/if}
      <button class="knopf primaer" disabled={tab === null || konsole.laeuft} onclick={starte}>
        <i class="fa-solid fa-play"></i> Ausführen
      </button>
      <button class="knopf" disabled={!ergebnisBereit} onclick={alsNeuerTab}>
        <i class="fa-solid fa-up-right-from-square"></i> Als neuen Tab öffnen
      </button>
      <div class="konsole-verlauf">
        <button class="knopf" onclick={() => void oeffneVerlauf()}>
          <i class="fa-solid fa-clock-rotate-left"></i> Verlauf
        </button>
        {#if verlaufOffen}
          <div class="verlauf-popover">
            {#if verlaufEintraege.length === 0}
              <div class="verlauf-leer hinweis-text">Noch keine Abfragen im Verlauf.</div>
            {:else}
              {#each verlaufEintraege as eintrag (eintrag.id)}
                <button class="verlauf-zeile" onclick={() => setzeEin(eintrag)}>
                  <span class="abzeichen">{SPRACH_NAMEN[eintrag.sprache]}</span>
                  <span class="verlauf-ausdruck mono">{eintrag.ausdruck}</span>
                  <span class="verlauf-meta">{eintrag.trefferAnzahl} · {zeitText(eintrag.zeitpunkt)}</span>
                </button>
              {/each}
              <button class="verlauf-leeren" onclick={() => void leereVerlaufKlick()}>
                <i class="fa-solid fa-trash-can"></i> Verlauf leeren
              </button>
            {/if}
          </div>
        {/if}
      </div>
    </div>

    <div class="konsole-ergebnis">
      {#if tab === null}
        <div class="konsole-hinweis hinweis-text">Kein Dokument geöffnet</div>
      {:else if konsole.laeuft}
        <div class="konsole-skelett">
          <div class="skelett"></div>
          <div class="skelett"></div>
          <div class="skelett"></div>
        </div>
      {:else if konsole.fehler !== null}
        <div class="konsole-hinweis hinweis-text">
          <i class="fa-solid fa-triangle-exclamation"></i>
          {konsole.fehler}
        </div>
      {:else if ergebnis !== null}
        {#if ergebnis.treffer.length === 0}
          <div class="konsole-hinweis hinweis-text">Keine Treffer.</div>
        {:else}
          {#each ergebnis.treffer as treffer, index (index)}
            <div
              class="treffer-zeile"
              role="button"
              tabindex="0"
              onclick={() => springe(treffer)}
              onkeydown={(ereignis) => {
                if (ereignis.key === 'Enter' || ereignis.key === ' ') {
                  ereignis.preventDefault()
                  springe(treffer)
                }
              }}
            >
              <span class="t-pfad">{treffer.pfad}</span>
              <span class="t-wert">{treffer.kontext}</span>
              {#if treffer.position !== null}
                <span class="t-position">{positionsText(treffer.position)}</span>
              {/if}
            </div>
          {/each}
        {/if}
      {:else}
        <div class="konsole-hinweis hinweis-text">
          Ausdruck eingeben und ausführen, um Treffer zu sehen.
        </div>
      {/if}
    </div>
  </section>
{/if}

<style>
  /* Ausgeklappt darf die Konsole ihre volle Höhe nutzen (Deckel in app.css). */
  .konsole.abfr-offen .konsole-ergebnis {
    flex: 1;
    min-height: 0;
  }

  .konsole-schluessel {
    display: inline-flex;
    align-items: center;
    gap: var(--a1);
    white-space: nowrap;
    cursor: pointer;
  }

  .konsole-schluessel .checkbox {
    border: 1px solid var(--rand-2);
  }

  .konsole-hinweis {
    padding: var(--a2) var(--a3);
  }

  .konsole-skelett {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    padding: var(--a3);
  }

  /* Verlaufs-Popover über dem Knopf. */
  .konsole-verlauf {
    position: relative;
  }

  .verlauf-popover {
    position: absolute;
    right: 0;
    bottom: calc(100% + var(--a1));
    z-index: 20;
    width: min(420px, 60vw);
    max-height: 260px;
    overflow-y: auto;
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-2);
    border-radius: var(--radius-eingabe);
    box-shadow: var(--schatten-schwebend, 0 6px 24px rgba(0, 0, 0, 0.25));
    padding: var(--a1);
  }

  .verlauf-leer {
    padding: var(--a2) var(--a3);
  }

  .verlauf-zeile {
    display: flex;
    align-items: center;
    gap: var(--a2);
    width: 100%;
    padding: var(--a1) var(--a2);
    background: none;
    border: none;
    border-radius: var(--radius-eingabe);
    color: var(--text-1);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .verlauf-zeile:hover {
    background: var(--akzent-weich);
  }

  .verlauf-ausdruck {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8rem;
  }

  .verlauf-meta {
    flex: none;
    color: var(--text-3);
    font-size: 0.72rem;
    white-space: nowrap;
  }

  .verlauf-leeren {
    display: flex;
    align-items: center;
    gap: var(--a2);
    width: 100%;
    margin-top: var(--a1);
    padding: var(--a1) var(--a2);
    background: none;
    border: none;
    border-top: 1px solid var(--rand-1);
    color: var(--text-3);
    font: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;
  }

  .verlauf-leeren:hover {
    color: var(--zustand-warnung, var(--text-1));
  }
</style>
