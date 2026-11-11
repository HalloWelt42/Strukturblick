<script lang="ts">
  // Vorschlag für eine Spalte: was erkannt wurde, Vorher und Nachher an Beispielen, nicht lesbare Werte mit Grund.
  // Bei "Text bleibt" nur die Warnung, was als Zahl verloren ginge; sonst Umwandeln als ein Vorgang.
  import { vorschlagFuer } from "../../../analyse/bereinigen/typen";
  import type { NeuerWert } from "../../../kern/format";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { zellenSetzen } from "./vorgaenge";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { blatt, z, s, spalte }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand; spalte: string } = $props();

  /** So viele Beispiele stehen in der Vorschau (nicht lesbare zusätzlich) */
  const BEISPIELE = 6;
  const v = $derived(vorschlagFuer(s.tabelle, s.index, s.text, s.tabelle.spalteNach.get(spalte) ?? 0));
  const zeile = (i: number): string => anzahl(s.tabelle.zeileImText[i]);
  const nachher = (n: NeuerWert): string => (n.art === "zahl" ? n.roh : n.art === "text" ? n.wert : "");
  const leer: NeuerWert = $derived(s.analyse.format.faehigkeiten.typen ? { art: "nichts" } : { art: "text", wert: "" });
  const ziel = $derived(v?.art === "betrag" ? "Betrag" : v?.art === "datum" ? "Datum JJJJ-MM-TT" : "Text");
  const aendert = $derived(v ? v.aenderungen.length + (z.unlesbarLeeren ? v.unlesbar.length : 0) : 0);

  async function umwandeln(): Promise<void> {
    if (!v) return;
    const liste = [...v.aenderungen.map((a) => ({ zeiger: a.zeiger, neu: a.neu })), ...(z.unlesbarLeeren ? v.unlesbar.map((u) => ({ zeiger: u.zeiger, neu: leer })) : [])];
    await zellenSetzen(blatt, liste, `${spalte}: als ${ziel} umgewandelt (${anzahl(liste.length)} Zellen)`);
  }
</script>

{#if v}
  <article class="br-tafel" aria-label="Vorschlag für {spalte}">
    <header class="br-tafel-kopf">
      <strong>{spalte}</strong>
      <span class="abzeichen zweit">{v.stehtAls}</span>
      {#if v.art === "text-bleibt"}
        <span class="br-rechts"><span class="abzeichen warn"><i class="fa-solid fa-triangle-exclamation"></i> Nicht in Zahl wandeln</span></span>
      {:else}
        <i class="fa-solid fa-arrow-right br-typ-pfeil"></i><span class="abzeichen">{ziel}</span>
        <span class="br-rechts"><span class="abzeichen" class:gut={v.art === "betrag"} class:warn={v.art === "datum"}>{v.erkannt}</span></span>
      {/if}
    </header>
    <div class="br-tafel-inhalt">
      <p class="br-typ-text">{v.erklaerung}</p>
      {#if v.art === "text-bleibt"}
        <div class="br-warnung"><i class="fa-solid fa-triangle-exclamation"></i><span>Als Zahl verlören <strong class="mono">{anzahl(v.fuehrendeNullen)}</strong> Werte ihre führende Null{#if v.nullBeispiele[0]}, aus {v.nullBeispiele[0].wert.trim()} würde {v.nullBeispiele[0].wert.trim().replace(/^0+(?=\d)/, "")}{/if}.</span></div>
        <table class="br-vergleich">
          <thead><tr><th class="br-nr">Zeile</th><th>Text, bleibt</th><th class="br-pfeil"></th><th>Als Zahl</th><th></th></tr></thead>
          <tbody>
            {#each v.nullBeispiele as b (b.zeile)}
              {@const w = b.wert.trim()}
              {@const nullen = w.length - w.replace(/^0+(?=\d)/, "").length}
              <tr><td class="br-nr">{zeile(b.zeile)}</td><td>{w}</td><td class="br-pfeil"><i class="fa-solid fa-arrow-right"></i></td><td><span class="br-verlust">{w.slice(0, nullen)}</span>{w.slice(nullen)}</td><td class="br-anm">{nullen === 1 ? "Null fällt weg" : "Nullen fallen weg"}</td></tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <table class="br-vergleich">
          <thead><tr><th class="br-nr">Zeile</th><th>Vorher</th><th class="br-pfeil"></th><th>Nachher</th><th></th></tr></thead>
          <tbody>
            {#each v.aenderungen.slice(0, BEISPIELE) as a (a.zeiger)}
              <tr><td class="br-nr">{zeile(a.zeile)}</td><td class="w-text">"{a.vorher}"</td><td class="br-pfeil"><i class="fa-solid fa-arrow-right"></i></td><td class:w-zahl={a.neu.art === "zahl"} class:w-text={a.neu.art === "text"}>{nachher(a.neu)}</td><td class="br-anm"></td></tr>
            {/each}
            {#each v.unlesbar.slice(0, BEISPIELE) as u (u.zeiger)}
              <tr class="br-unlesbar"><td class="br-nr">{zeile(u.zeile)}</td><td>"{u.wert}"</td><td class="br-pfeil"><i class="fa-solid fa-xmark"></i></td><td>nicht lesbar</td><td class="br-anm">{u.grund}</td></tr>
            {/each}
          </tbody>
        </table>
        {#if v.aenderungen.length > BEISPIELE}<p class="br-typ-text klein">... und {anzahl(v.aenderungen.length - BEISPIELE)} weitere wie diese.</p>{/if}
        {#if v.unlesbar.length}
          <div class="br-unlesbar-wahl">
            <span>{v.unlesbar.length === 1 ? "Der nicht lesbare Wert" : `Die ${anzahl(v.unlesbar.length)} nicht lesbaren Werte`}</span>
            <nav class="segment">
              <button class:aktiv={!z.unlesbarLeeren} onclick={() => (z.unlesbarLeeren = false)}>Unverändert lassen</button>
              <button class:aktiv={z.unlesbarLeeren} onclick={() => (z.unlesbarLeeren = true)}>Leer setzen</button>
            </nav>
          </div>
        {/if}
      {/if}
    </div>
    <footer class="br-tafel-fuss">
      {#if v.art === "text-bleibt"}
        <span>Ändert keine Zelle: {spalte} bleibt Text, so wie es steht.</span>
      {:else}
        <span>Ändert <strong class="mono">{anzahl(aendert)}</strong> Zellen{#if v.unlesbar.length && !z.unlesbarLeeren}, {anzahl(v.unlesbar.length)} {v.unlesbar.length === 1 ? "bleibt" : "bleiben"} Text{/if}{#if v.bleiben}, {anzahl(v.bleiben)} stehen schon richtig{/if}</span>
        <span class="br-rechts"><button class="knopf primaer" disabled={!aendert || !s.aktuell} onclick={() => void umwandeln()}><i class="fa-solid fa-arrow-right-arrow-left"></i> Umwandeln</button></span>
      {/if}
    </footer>
  </article>
{/if}
