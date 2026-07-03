<script lang="ts">
  // Duplikat-Auflösung nach mockups/tabelle-duplikate.html (05c): findet auf den
  // aktuell EDITIERTEN Zeilen inhaltsgleiche Datensätze und redundante Spalten.
  // Je Gruppe wählt der Nutzer per Auswahlknopf, welcher Datensatz bleibt (die
  // übrigen werden entfernt); doppelte Spalten werden getrennt angeboten. Das
  // Entfernen wirkt als weitere Vorschau-Änderung auf den Editier-Zustand - NICHT
  // sofort ins Dokument. Ein Hinweis-Banner erinnert daran, dass Duplikate auch
  // beim Bearbeiten entstehen.
  import type { JsonWert } from '../../api/typen'
  import { SvelteSet } from 'svelte/reactivity'
  import {
    findeDoppelteSpalten,
    findeDoppelteZeilen,
    type DoppelSpalte,
    type DuplikatGruppe,
  } from '../../dienste/tabellenDuplikate'
  import { zellText } from '../../dienste/tabellenModell'
  import type { TabellenZeile } from '../../dienste/tabellenZeilen'
  import Modal from '../../hilfsteile/Modal.svelte'
  import { zeige } from '../../zustand/toaster.svelte'
  import {
    ersetzeZeilen,
    kopfName,
    spalteLoeschen,
    type TabellenBearbeitung,
  } from './tabellenBearbeitung.svelte'

  interface Props {
    offen: boolean
    bearbeitung: TabellenBearbeitung
    onSchliessen: () => void
  }

  let { offen = $bindable(false), bearbeitung, onSchliessen }: Props = $props()

  // Auswahl "welcher Datensatz bleibt" je Gruppe: Gruppen-Index -> zu behaltender
  // Zeilenindex. Standard: der erste (kleinste) Index der Gruppe.
  let behalten = $state<Record<number, number>>({})
  // Doppelte Spalten, die entfernt werden sollen (Rohname der Kopie).
  let spaltenEntfernen = $state<Set<string>>(new Set())
  // Spalten, die für die Datensatz-Duplikatprüfung verglichen werden. Standard:
  // alle. Sind nur einzelne markiert, gelten Datensätze schon als doppelt, wenn
  // sie in genau diesen Spalten übereinstimmen (der Rest wird ignoriert).
  let verglSpalten = $state<SvelteSet<string>>(new SvelteSet())

  /** Vergleichsspalten in Dokumentreihenfolge (nur die markierten). */
  const verglReihenfolge = $derived(
    bearbeitung.spaltenReihenfolge.filter((s) => verglSpalten.has(s)),
  )

  const gruppen = $derived.by((): DuplikatGruppe[] =>
    verglReihenfolge.length === 0
      ? []
      : findeDoppelteZeilen(bearbeitung.zeilen, verglReihenfolge),
  )
  const doppelSpalten = $derived.by((): DoppelSpalte[] =>
    findeDoppelteSpalten(bearbeitung.zeilen, bearbeitung.spaltenReihenfolge),
  )

  // Beim Öffnen zurücksetzen: alle Spalten als Vergleichsspalten, keine Spalte
  // zum Entfernen vorgewählt.
  let warOffen = $state(false)
  $effect(() => {
    if (offen && !warOffen) {
      verglSpalten = new SvelteSet(bearbeitung.spaltenReihenfolge)
      spaltenEntfernen = new Set()
    }
    warOffen = offen
  })

  // Vorauswahl "welcher Datensatz bleibt" bei jeder Änderung der Gruppen neu
  // setzen (Öffnen oder geänderte Vergleichsspalten): der erste Index bleibt.
  $effect(() => {
    const vor: Record<number, number> = {}
    gruppen.forEach((gruppe, i) => {
      vor[i] = gruppe.indizes[0]
    })
    behalten = vor
  })

  /** Anzahl der zu entfernenden Datensätze über alle Gruppen. */
  const zuEntfernendeZeilen = $derived.by((): number => {
    let summe = 0
    gruppen.forEach((gruppe, i) => {
      const bleibt = behalten[i] ?? gruppe.indizes[0]
      summe += gruppe.indizes.filter((index) => index !== bleibt).length
    })
    return summe
  })

  const zuEntfernendeSpalten = $derived(spaltenEntfernen.size)

  /** Textwert einer Zelle (für die Vorschau-Tabellen im Dialog). */
  function zelle(zeile: TabellenZeile, spalte: string): string {
    return zellText(zeile[spalte] as JsonWert | undefined)
  }

  /** Für die Gruppen-Vorschau: die Spalten ohne die (später) entfernten. */
  const anzeigeSpalten = $derived(
    bearbeitung.spaltenReihenfolge.filter((s) => !spaltenEntfernen.has(s)),
  )

  function waehleBehalten(gruppeIndex: number, zeilenIndex: number): void {
    behalten = { ...behalten, [gruppeIndex]: zeilenIndex }
  }

  function schalteSpalte(spalte: string): void {
    const neu = new Set(spaltenEntfernen)
    if (neu.has(spalte)) neu.delete(spalte)
    else neu.add(spalte)
    spaltenEntfernen = neu
  }

  function schalteVergl(spalte: string): void {
    const neu = new SvelteSet(verglSpalten)
    if (neu.has(spalte)) neu.delete(spalte)
    else neu.add(spalte)
    verglSpalten = neu
  }

  function alleVergl(): void {
    verglSpalten = new SvelteSet(bearbeitung.spaltenReihenfolge)
  }

  function keineVergl(): void {
    verglSpalten = new SvelteSet()
  }

  /** Wendet die Auswahl auf den Editier-Zustand an (Vorschau, nicht ins Dokument). */
  function entfernen(): void {
    // 1) Zu entfernende Zeilen-Indizes einsammeln (aus den Gruppen).
    const raus = new Set<number>()
    gruppen.forEach((gruppe, i) => {
      const bleibt = behalten[i] ?? gruppe.indizes[0]
      for (const index of gruppe.indizes) {
        if (index !== bleibt) raus.add(index)
      }
    })

    if (raus.size > 0) {
      const neueZeilen: TabellenZeile[] = []
      const neueIds: string[] = []
      const alteMarken = bearbeitung.neueZeilen
      const neueMarken = new SvelteSet<string>()
      bearbeitung.zeilen.forEach((zeile, index) => {
        if (raus.has(index)) return
        const id = bearbeitung.zeilenIds[index]
        neueZeilen.push(zeile)
        neueIds.push(id)
        if (alteMarken.has(id)) neueMarken.add(id)
      })
      ersetzeZeilen(bearbeitung, neueZeilen, neueIds, neueMarken)
    }

    // 2) Ausgewählte doppelte Spalten löschen (nutzt die Spalten-Op des Zustands).
    for (const spalte of spaltenEntfernen) {
      spalteLoeschen(bearbeitung, spalte)
    }

    const teile: string[] = []
    if (raus.size > 0) teile.push(`${raus.size} ${raus.size === 1 ? 'Datensatz' : 'Datensätze'}`)
    if (spaltenEntfernen.size > 0)
      teile.push(`${spaltenEntfernen.size} ${spaltenEntfernen.size === 1 ? 'Spalte' : 'Spalten'}`)
    zeige(
      teile.length > 0 ? `Duplikate entfernt: ${teile.join(', ')} (Vorschau).` : 'Keine Duplikate ausgewählt.',
      teile.length > 0 ? 'erfolg' : 'info',
    )
    onSchliessen()
  }
</script>

<Modal titel="Duplikate auflösen" breit bind:offen {onSchliessen}>
  <div class="dupl-hinweis">
    <i class="fa-solid fa-triangle-exclamation"></i>
    <span>
      Duplikate entstehen auch beim Bearbeiten: Wird eine Merkmalsspalte gelöscht, sind
      Datensätze nicht mehr eindeutig - dadurch können Gruppen doppelt werden.
    </span>
  </div>

  <div class="dupl-vergl">
    <div class="dupl-vergl-kopf">
      <span class="beschriftung">Vergleichsspalten für doppelte Datensätze</span>
      <span class="luecke"></span>
      <button class="knopf klein" onclick={alleVergl}>Alle</button>
      <button class="knopf klein" onclick={keineVergl}>Keine</button>
    </div>
    <div class="dupl-vergl-chips">
      {#each bearbeitung.spaltenReihenfolge as spalte (spalte)}
        {@const an = verglSpalten.has(spalte)}
        <button
          class="dupl-chip"
          class:an
          role="checkbox"
          aria-checked={an}
          onclick={() => schalteVergl(spalte)}
        >
          <i class="fa-solid {an ? 'fa-check' : 'fa-xmark'}"></i>
          {kopfName(bearbeitung, spalte)}
        </button>
      {/each}
    </div>
    {#if verglReihenfolge.length === 0}
      <p class="hinweis-text dupl-vergl-warn">
        <i class="fa-solid fa-circle-info"></i>
        Ohne Vergleichsspalte werden keine doppelten Datensätze gesucht.
      </p>
    {:else}
      <p class="hinweis-text">
        Nur diese Spalten zählen für doppelte Datensätze - der Rest wird ignoriert. Standard: alle.
      </p>
    {/if}
  </div>

  {#if gruppen.length === 0 && doppelSpalten.length === 0}
    <p class="hinweis-text dupl-leer">
      <i class="fa-solid fa-circle-check"></i>
      Keine doppelten Datensätze oder Spalten gefunden.
    </p>
  {/if}

  {#if gruppen.length > 0}
    <h3>Doppelte Datensätze ({gruppen.length} {gruppen.length === 1 ? 'Gruppe' : 'Gruppen'})</h3>
    <p class="hinweis-text">
      Wähle je Gruppe, welcher Datensatz bleibt - die übrigen werden entfernt, sodass genau
      einer übrig bleibt.
    </p>

    {#each gruppen as gruppe, gi (gi)}
      <div class="karte dupl-gruppe">
        <div class="karte-kopf">
          <i class="fa-solid fa-layer-group"></i> Gruppe {gi + 1}
          <span class="luecke"></span>
          <span class="abzeichen">{gruppe.indizes.length} identisch</span>
        </div>
        <div class="dupl-tabelle-rollen">
          <table class="tabelle">
            <thead>
              <tr>
                <th>behalten</th>
                {#each anzeigeSpalten as spalte (spalte)}
                  <th>{kopfName(bearbeitung, spalte)}</th>
                {/each}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each gruppe.indizes as zeilenIndex (zeilenIndex)}
                {@const bleibt = (behalten[gi] ?? gruppe.indizes[0]) === zeilenIndex}
                <tr class:dupl-behalten={bleibt} class:dupl-entfernen={!bleibt}>
                  <td>
                    <button
                      class="radio"
                      class:an={bleibt}
                      role="radio"
                      aria-checked={bleibt}
                      aria-label="Diesen Datensatz behalten"
                      onclick={() => waehleBehalten(gi, zeilenIndex)}
                    ></button>
                  </td>
                  {#each anzeigeSpalten as spalte (spalte)}
                    <td class="mono">{zelle(bearbeitung.zeilen[zeilenIndex], spalte)}</td>
                  {/each}
                  <td class="dupl-marke">
                    {#if !bleibt}<i class="fa-solid fa-trash"></i> wird entfernt{/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/each}
  {/if}

  {#if doppelSpalten.length > 0}
    <h3>Doppelte Spalten ({doppelSpalten.length})</h3>
    {#each doppelSpalten as doppel (doppel.spalte)}
      {@const entfernt = spaltenEntfernen.has(doppel.spalte)}
      <div class="karte dupl-gruppe">
        <div class="karte-inhalt">
          <div class="einst-zeile">
            <div class="einst-text">
              Spalte "{kopfName(bearbeitung, doppel.spalte)}" ist inhaltlich identisch mit
              "{kopfName(bearbeitung, doppel.gleichWie)}"
              <span>In allen Zeilen dieselben Werte.</span>
            </div>
            <div class="einst-steuer">
              <button
                class="knopf klein"
                class:primaer={!entfernt}
                onclick={() => {
                  if (entfernt) schalteSpalte(doppel.spalte)
                }}
              >
                Beide behalten
              </button>
              <button
                class="knopf klein"
                class:gefahr={entfernt}
                onclick={() => {
                  if (!entfernt) schalteSpalte(doppel.spalte)
                }}
              >
                <i class="fa-solid fa-trash"></i> "{kopfName(bearbeitung, doppel.spalte)}" entfernen
              </button>
            </div>
          </div>
        </div>
      </div>
    {/each}
  {/if}

  {#snippet fuss()}
    <button class="knopf" onclick={onSchliessen}>Abbrechen</button>
    <button
      class="knopf primaer"
      disabled={zuEntfernendeZeilen === 0 && zuEntfernendeSpalten === 0}
      onclick={entfernen}
    >
      <i class="fa-solid fa-check"></i> Duplikate entfernen
      {#if zuEntfernendeZeilen > 0 || zuEntfernendeSpalten > 0}
        - {zuEntfernendeZeilen} {zuEntfernendeZeilen === 1 ? 'Datensatz' : 'Datensätze'}{zuEntfernendeSpalten >
        0
          ? `, ${zuEntfernendeSpalten} ${zuEntfernendeSpalten === 1 ? 'Spalte' : 'Spalten'}`
          : ''}
      {/if}
    </button>
  {/snippet}
</Modal>

<style>
  /* Duplikate-Dialog (nach 05c). */
  .dupl-hinweis {
    display: flex;
    align-items: flex-start;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    margin-bottom: var(--a3);
    background: var(--zustand-warnung-weich);
    border: 1px solid var(--rand-1);
    font-size: 0.86rem;
    color: var(--text-2);
  }

  .dupl-hinweis i {
    color: var(--zustand-warnung);
    margin-top: 2px;
  }

  /* Auswahl der Vergleichsspalten für die Datensatz-Duplikatprüfung. */
  .dupl-vergl {
    padding: var(--a2) var(--a3);
    margin-bottom: var(--a3);
    background: var(--flaeche-panel);
    border: 1px solid var(--rand-1);
  }

  .dupl-vergl-kopf {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin-bottom: var(--a2);
  }

  .dupl-vergl-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--a1);
  }

  /* Chip als Ein/Aus-Schalter je Spalte (kein natives Kontrollkästchen). */
  .dupl-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border: 1px solid var(--rand-2);
    background: none;
    cursor: pointer;
    font-family: var(--schrift-anzeige);
    font-size: 0.82rem;
    color: var(--text-3);
  }

  .dupl-chip.an {
    border-color: var(--akzent);
    background: var(--akzent-weich);
    color: var(--text-1);
  }

  .dupl-chip i {
    font-size: 0.72rem;
  }

  .dupl-vergl-warn {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin-top: var(--a2);
    color: var(--zustand-warnung);
  }

  .dupl-leer {
    display: flex;
    align-items: center;
    gap: var(--a2);
    color: var(--text-2);
  }

  .dupl-leer i {
    color: var(--zustand-erfolg);
  }

  :global(.modal-inhalt) h3 {
    margin: var(--a3) 0 var(--a1);
  }

  .dupl-gruppe {
    margin-bottom: var(--a3);
  }

  /* Vorschau-Tabellen im Dialog rollen bei vielen Spalten waagerecht. */
  .dupl-tabelle-rollen {
    overflow-x: auto;
  }

  .dupl-gruppe .tabelle th,
  .dupl-gruppe .tabelle td {
    font-size: 0.82rem;
  }

  tr.dupl-behalten td {
    background: var(--zustand-erfolg-weich);
  }

  tr.dupl-entfernen td {
    color: var(--text-3);
  }

  .dupl-marke {
    color: var(--zustand-fehler);
    font-size: 0.76rem;
    white-space: nowrap;
  }

  /* Runder Auswahlknopf (behalten) - Gegenstück zur .checkbox aus app.css. */
  .radio {
    display: inline-block;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 1px solid var(--rand-2);
    border-radius: 50%;
    background: none;
    vertical-align: middle;
    position: relative;
    cursor: pointer;
  }

  .radio.an {
    border-color: var(--akzent);
  }

  .radio.an::after {
    content: '';
    position: absolute;
    inset: 3px;
    border-radius: 50%;
    background: var(--akzent);
  }
</style>
