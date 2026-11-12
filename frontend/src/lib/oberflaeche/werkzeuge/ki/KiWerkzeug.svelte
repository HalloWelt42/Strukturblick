<script lang="ts">
  // Werkzeug "Mit KI" (STB-60, entwuerfe/ki.html): Aufgabe wählen, Frage stellen, Vorschlag als Vorschau mit
  // Erklärung und Probelauf; übernommen wird nur auf Klick. Gerechnet wird über den eigenen Server und die Leitstelle,
  // gesendet nur der Auszug (Felder, Typen, 20 Beispiele).
  import "../werkzeuge.css";
  import "./ki.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ki } from "../../../zustand/ki.svelte";
  import { AUFGABEN, aufgabe, SPRACH_NAME } from "../../../analyse/ki/aufgaben";
  import { BEISPIELE } from "../../../analyse/ki/auszug";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { kiZustand } from "./kiZustand.svelte";
  import Vorschlagkarte from "./Vorschlagkarte.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(kiZustand(blatt));
  const eintrag = $derived(aufgabe(z.aufgabe));
  const sprachen = $derived(z.sprachen(blatt));
  const sprache = $derived(z.sprache(blatt));
  const knoten = $derived(blatt.analyse?.index?.anzahl ?? 0);

  function taste(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void z.fragen(blatt);
    }
  }

  const knopfText = $derived(z.vorschlag ? (z.aufgabe === "abfrage" ? "Neu übersetzen" : "Neu fragen") : z.aufgabe === "abfrage" ? "Übersetzen" : "Fragen");
</script>

<div class="ki-ansicht">
  <div class="wz-optionen">
    <div class="wz-option ki-grundlage">
      <span class="abzeichen">{blatt.analyse?.format.name ?? ""}</span>
      <span>Grundlage <span class="mono">{blatt.name}</span>{knoten ? `, ${anzahl(knoten)} Knoten` : ""}</span>
    </div>
    <div class="rechts">
      {#if ki.stand}
        <span class="ki-modell" title={ki.stand.meldung || "Das Modell nennt Strukturblick; die Leitstelle wählt den Rechner"}>
          <span class="punkt" class:warn={!ki.stand.bereit}></span><i class="fa-solid fa-microchip"></i> {ki.stand.modellname} über die Leitstelle
        </span>
      {/if}
    </div>
  </div>
  <div class="inhalt ki-inhalt">
    {#if !ki.verfuegbar}
      <div class="wz-band">
        <i class="fa-solid fa-circle-info"></i>
        <span>{ki.laedt ? "Frage die Leitstelle ..." : ki.stand && !ki.stand.an ? "KI ist ausgeschaltet. Einschalten am Zahnrad oben rechts, unter KI." : (ki.stand?.meldung ?? ki.fehler ?? "KI gibt es nur mit dem Server.")}</span>
      </div>
    {:else if !blatt.analyse?.index}
      <div class="wz-band"><i class="fa-solid fa-triangle-exclamation"></i><span>Das Dokument lässt sich so nicht lesen; die KI braucht eine lesbare Grundlage.</span></div>
    {:else}
      <section class="karte">
        <div class="ki-karte-kopf"><h2>Aufgabe</h2></div>
        <div class="ki-aufgaben" role="radiogroup" aria-label="Aufgabe">
          {#each AUFGABEN as a (a.kennung)}
            <button class="ki-aufgabe" class:aktiv={z.aufgabe === a.kennung} role="radio" aria-checked={z.aufgabe === a.kennung} onclick={() => z.aufgabeWaehlen(a.kennung)}>
              <strong><i class="fa-solid {a.symbol}"></i> {a.titel}</strong><span>{a.unterzeile}</span>
            </button>
          {/each}
        </div>
      </section>
      <section class="karte">
        <div class="ki-karte-kopf">
          <h2>{eintrag.frage === "pflicht" ? "Frage" : "Frage oder Wunsch"}</h2>
          {#if z.aufgabe === "abfrage"}
            <div class="rechts">
              <span class="text-3 klein">Antwort als</span>
              <nav class="segment" aria-label="Antwort als">
                {#each sprachen as s (s)}<button class:aktiv={sprache === s} onclick={() => (z.sprachWahl = s)}>{SPRACH_NAME[s]}</button>{/each}
              </nav>
            </div>
          {/if}
        </div>
        <textarea class="ki-frage" aria-label="Frage" placeholder={eintrag.platzhalter} spellcheck="true" bind:value={z.frage} onkeydown={taste}></textarea>
        <div class="ki-frage-fuss">
          <i class="fa-solid fa-paper-plane"></i>
          <span>An die Leitstelle gehen {z.aufgabe === "abfrage" && sprache === "sql" ? "Tabellen, Spalten" : "Felder"}, Typen und bis zu {BEISPIELE} Beispiele, nicht das ganze Dokument.</span>
          <span class="rechts">
            {#if z.laeuft}
              <button class="knopf" onclick={() => z.verwerfen()}><i class="fa-solid fa-xmark"></i> Abbrechen</button>
            {:else}
              <button class="knopf primaer" title="⌘ Enter" disabled={eintrag.frage === "pflicht" && !z.frage.trim()} onclick={() => void z.fragen(blatt)}><i class="fa-solid fa-wand-magic-sparkles"></i> {knopfText}</button>
            {/if}
          </span>
        </div>
      </section>
      {#if z.laeuft || z.vorschlag || z.fehler}
        <Vorschlagkarte {blatt} {z} />
      {/if}
    {/if}
  </div>
</div>
