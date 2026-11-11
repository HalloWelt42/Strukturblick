<script lang="ts">
  // Werkzeugzeile der Tabelle: Pfad der gezeigten Liste, Zeilenfilter, Zähler, Filter aufheben, Export der sichtbaren
  // Zeilen und bei tabellarischen Formaten die Leseweise (Dialekt) mit Menü zum Ändern. Dazu "Duplikate prüfen" (Blatt)
  // und, solange eine Spalte gewählt ist, "Spalte entfernen".
  import { untrack } from "svelte";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { Analyse } from "../../../kern/befehl";
  import { zeigerAus } from "../../../kern/pfade";
  import type { Tabelle } from "../../../analyse/tabelle";
  import type { TabellenZustand } from "./tabellenZustand.svelte";
  import { anzahl } from "./zahlen";
  import DialektWahl from "./DialektWahl.svelte";
  import ExportMenue from "../../bausteine/ExportMenue.svelte";
  import { AUSGABEFORMATE, sichtWerte, werteAusgeben, type Ausgabeformat } from "../../../analyse/ausgabe";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { duplikateFinden, schluesselVorschlag } from "../../../analyse/duplikate";
  import DuplikateBlatt from "./DuplikateBlatt.svelte";

  let { blatt, zustand, analyse, tabelle, sicht, text, liest, spalteGewaehlt }: { blatt: Arbeitsblatt; zustand: TabellenZustand; analyse: Analyse; tabelle: Tabelle; sicht: Int32Array; text: string; liest: boolean; spalteGewaehlt: number } = $props();

  const zeilenGezeigt = $derived(sicht.length);

  /** Wartezeit nach dem Tippen, bevor gefiltert wird (100.000 Zeilen je Taste wären zu viel) */
  const FILTER_NACH_MS = 150;

  let getippt = $state(untrack(() => zustand.filter));
  let filterZeit: ReturnType<typeof setTimeout> | null = null;

  function tippen(): void {
    if (filterZeit) clearTimeout(filterZeit);
    filterZeit = setTimeout(() => {
      filterZeit = null;
      zustand.filter = getippt;
    }, FILTER_NACH_MS);
  }

  function aufheben(): void {
    if (filterZeit) clearTimeout(filterZeit);
    getippt = "";
    zustand.filter = "";
  }

  const gefiltert = $derived(zustand.filter.trim() !== "");
  const segmente = $derived([
    { titel: "$", zeiger: "" },
    ...tabelle.listeTeile.map((t, i) => ({ titel: typeof t === "number" ? `[${t}]` : t, zeiger: zeigerAus(tabelle.listeTeile.slice(0, i + 1)) })),
  ]);
  const dialekt = $derived(analyse.format.leseoptionen.length > 0);

  // ----- Export der sichtbaren Zeilen (Filter und Sortierung wie angezeigt) -----
  const auswahl = $derived(gefiltert || zustand.sortierung !== null ? "auswahl" : "tabelle");
  const stamm = $derived(blatt.name.replace(/\.[^.]+$/, ""));
  const endung = (f: Ausgabeformat) => AUSGABEFORMATE.find((x) => x.kennung === f)?.endung ?? f;
  const werte = () => (analyse.index ? sichtWerte(tabelle, analyse.index, text, sicht) : []);
  /** Ein neues Dokument bleibt bei Tabellen ohne Typen (CSV) eine CSV, sonst JSON */
  const neuFormat = $derived<Ausgabeformat>(analyse.format.faehigkeiten.tabellarisch && !analyse.format.faehigkeiten.typen ? "csv" : "json");

  // ----- Duplikate und Spalte entfernen -----
  /** Bis zu so vielen Zeilen zählt die Werkzeugzeile Duplikate vorab (sonst erst im Blatt) */
  const DUPLIKATE_VORAB = 20_000;
  let duplikateOffen = $state(false);
  const vorschlag = $derived(analyse.index ? schluesselVorschlag(tabelle, analyse.index, text) : null);
  const duplikate = $derived(analyse.index && tabelle.zeilen.length <= DUPLIKATE_VORAB ? duplikateFinden(tabelle, analyse.index, text, vorschlag === null ? [] : [vorschlag]).length : null);
  const entfernbar = $derived(spalteGewaehlt >= 0 && !tabelle.spalten[spalteGewaehlt]?.selbst ? tabelle.spalten[spalteGewaehlt].name : null);

  async function spalteEntfernen(): Promise<void> {
    if (entfernbar === null) return;
    await blatt.ausfuehrenMitMeldung("spalte.entfernen", { liste: zeigerAus(tabelle.listeTeile), spalte: entfernbar }, { ort: "Tabelle", rezeptschritt: { art: "spalte-entfernen", spalte: entfernbar, an: true } });
  }

  async function alsDokument(): Promise<void> {
    const neu = await arbeitsplatz.neu(`${stamm}-${auswahl}.${endung(neuFormat)}`, werteAusgeben(werte(), neuFormat), blatt.ordner);
    neu.zeigen({ art: "ansicht", kennung: "tabelle" });
    meldungen.zeigen({ text: `Neues Dokument ${neu.name} mit ${anzahl(sicht.length)} Zeilen`, art: "erfolg" });
  }
</script>

<div class="werkzeugzeile tb-werkzeugzeile">
  <nav class="pfad" aria-label="Gezeigte Liste">
    {#each segmente as s, i (s.zeiger)}
      {#if i > 0}<span class="trenner"><i class="fa-solid fa-chevron-right"></i></span>{/if}
      <button class="tb-pfadteil" class:letzter={i === segmente.length - 1} title="Im Inspektor zeigen" onclick={() => blatt.waehlen(s.zeiger)}>{s.titel}</button>
    {/each}
  </nav>
  <label class="feld tb-filter" title="Zeigt nur Zeilen, in denen der Text in einer Zelle vorkommt; Groß- und Kleinschreibung egal">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input bind:value={getippt} oninput={tippen} onkeydown={(e) => e.key === "Escape" && aufheben()} placeholder="Zeilen filtern ..." aria-label="Zeilen filtern" spellcheck="false" />
  </label>
  <span class="tb-zaehler"><strong>{anzahl(zeilenGezeigt)}</strong> von {anzahl(tabelle.zeilen.length)} Zeilen</span>
  {#if gefiltert}
    <button class="knopf still" onclick={aufheben} title="Filter aufheben"><i class="fa-solid fa-xmark"></i><span class="tb-lang">Filter aufheben</span></button>
  {/if}
  <div class="rechts">
    {#if entfernbar !== null}
      <button class="knopf still" disabled={liest} title="Spalte {entfernbar} aus allen Einträgen entfernen (ein Vorgang, rückgängig möglich)" onclick={() => void spalteEntfernen()}><i class="fa-solid fa-trash"></i><span class="tb-lang">Spalte entfernen</span></button>
    {/if}
    <button class="knopf" class:tb-gedrueckt={duplikateOffen} disabled={!analyse.index} title={vorschlag !== null ? `Zeilen mit gleichem ${tabelle.spalten[vorschlag].name} zeigen und auflösen` : "Ganz gleiche Zeilen zeigen und auflösen"} onclick={() => (duplikateOffen = true)}>
      <i class="fa-solid fa-clone"></i><span class="tb-lang">Duplikate prüfen</span>{#if duplikate}<span class="abzeichen warn">{anzahl(duplikate)}</span>{/if}
    </button>
    <ExportMenue
      titel="Exportieren"
      erklaerung="Die {anzahl(zeilenGezeigt)} sichtbaren Zeilen (Filter und Sortierung wie angezeigt) als Datei oder neues Dokument"
      gesperrt={zeilenGezeigt === 0}
      rechtsbuendig
      holen={(f) => werteAusgeben(werte(), f)}
      dateiname={(f) => `${stamm}-${auswahl}.${endung(f)}`}
      neuesDokument={() => void alsDokument()}
    />
    {#if liest}<span class="abzeichen warn" title="Das Dokument wird nach einer Änderung neu gelesen; bis dahin lässt sich nichts bearbeiten">liest</span>{/if}
    {#if dialekt}<DialektWahl {blatt} {analyse} />{/if}
  </div>
</div>

{#if duplikateOffen && analyse.index}
  <DuplikateBlatt {blatt} index={analyse.index} {text} {tabelle} {vorschlag} onschliessen={() => (duplikateOffen = false)} />
{/if}
