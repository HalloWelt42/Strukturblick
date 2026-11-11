<script lang="ts">
  // Blatt "Duplikate prüfen" (entwuerfe/tabelle-duplikate.html): Gruppen gleicher Zeilen nach Schlüsselspalte oder
  // ganzer Zeile, abweichende Werte markiert, je Gruppe die bleibende Zeile (Regel oder eigene Wahl), Vorschau und
  // Übernehmen als ein Vorgang. Nach einer Regel aufgelöst, reist der Schritt für Rezepte mit; eigene Wahl nicht.
  import "./duplikate.css";
  import { untrack } from "svelte";
  import type { Strukturindex } from "../../../kern/strukturindex";
  import { zeigerAus } from "../../../kern/pfade";
  import type { Tabelle } from "../../../analyse/tabelle";
  import { BEHALTEN, duplikateFinden, vorauswahl, wegfallendeDuplikate, zellText, type Behalten, type Duplikatgruppe } from "../../../analyse/duplikate";
  import type { Rezeptschritt } from "../../../analyse/rezepte/rezept";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import SpaltenMenue from "../../bausteine/SpaltenMenue.svelte";
  import { anzahl } from "./zahlen";

  let { blatt, index, text, tabelle, vorschlag, onschliessen }: {
    blatt: Arbeitsblatt;
    index: Strukturindex;
    text: string;
    tabelle: Tabelle;
    /** Vorgeschlagene Schlüsselspalte oder null (dann ganze Zeile) */
    vorschlag: number | null;
    onschliessen: () => void;
  } = $props();

  /** So viele Gruppen stehen da; die übrigen folgen derselben Regel */
  const GEZEIGT = 50;

  let spalten = $state<number[]>(untrack(() => (vorschlag === null ? [] : [vorschlag])));
  let regel = $state<Behalten>("erste");
  /** Eigene Wahl je Gruppe (Schlüssel: erste Zeile der Gruppe) */
  let wahl = $state<Record<number, number>>({});

  const gruppen = $derived(duplikateFinden(tabelle, index, text, spalten));
  const bleibt = (g: Duplikatgruppe): number => wahl[g.zeilen[0]] ?? vorauswahl(tabelle, index, text, g, regel);
  const weg = $derived(wegfallendeDuplikate(gruppen, bleibt));
  const eigene = $derived(Object.keys(wahl).length > 0);
  const titel = $derived(spalten.length ? `Doppelte ${spalten.map((j) => tabelle.spalten[j].name).join(", ")}` : "Doppelte Zeilen");
  const zeile = (i: number): string => anzahl(tabelle.zeileImText[i]);

  function spaltenSetzen(neu: number[]): void {
    spalten = neu;
    wahl = {};
  }

  async function uebernehmen(): Promise<void> {
    if (!weg.length) return;
    const namen = spalten.map((j) => tabelle.spalten[j].name);
    const rezeptschritt: Rezeptschritt | undefined = eigene ? undefined : { art: "duplikate", spalten: namen, behalten: regel, an: true };
    const e = await blatt.ausfuehrenMitMeldung(
      "eintraege.entfernen",
      { liste: zeigerAus(tabelle.listeTeile), stellen: weg, titel: `${titel} aufgelöst (${anzahl(weg.length)} ${weg.length === 1 ? "Zeile" : "Zeilen"} entfernt)` },
      { ort: "Tabelle", ...(rezeptschritt ? { rezeptschritt } : {}) },
    );
    if (e.ok) onschliessen();
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onschliessen()} />

<div class="tb-abdunkeln" aria-hidden="true"></div>
<div class="tb-blatt" role="dialog" aria-modal="true" aria-labelledby="tb-blatt-titel">
  <div class="tb-blatt-kopf">
    <i class="fa-solid fa-clone"></i>
    <div class="tb-blatt-titel"><h2 id="tb-blatt-titel">{titel}</h2><p>{anzahl(gruppen.length)} {gruppen.length === 1 ? "Gruppe" : "Gruppen"} in {blatt.name}, geprüft über alle {anzahl(tabelle.zeilen.length)} Zeilen</p></div>
    <span class="rechts"><button class="knopf still nur-symbol" title="Schließen ohne Änderung (Esc)" onclick={onschliessen}><i class="fa-solid fa-xmark"></i></button></span>
  </div>
  <div class="tb-blatt-inhalt">
    <div class="tb-optionen">
      <span>Gleich in</span>
      <div class="segment">
        {#if vorschlag !== null}<button class:aktiv={spalten.length === 1 && spalten[0] === vorschlag} onclick={() => spaltenSetzen([vorschlag])}>{tabelle.spalten[vorschlag].name}</button>{/if}
        <button class:aktiv={spalten.length === 0} onclick={() => spaltenSetzen([])}>Ganze Zeile</button>
      </div>
      <SpaltenMenue spalten={tabelle.spalten.map((s) => s.name)} markiert={spalten.map((j) => tabelle.spalten[j].name)} markierung="gewählt" titel="Spalten wählen, die gleich sein müssen" onwahl={(n) => { const j = tabelle.spalteNach.get(n)!; spaltenSetzen(spalten.includes(j) ? spalten.filter((x) => x !== j) : [...spalten, j]); }}>
        {#snippet knopf()}<i class="fa-solid fa-table-columns"></i> Spalten wählen{/snippet}
      </SpaltenMenue>
      <span>Vorauswahl</span>
      <div class="segment">
        {#each BEHALTEN as b (b.kennung)}
          <button class:aktiv={!eigene && regel === b.kennung} onclick={() => { regel = b.kennung; wahl = {}; }}>{b.name}</button>
        {/each}
        {#if eigene}<button class="aktiv" title="Zurück zur Regel" onclick={() => (wahl = {})}>Eigene Wahl <i class="fa-solid fa-xmark"></i></button>{/if}
      </div>
      <span class="tb-legende"><span class="tb-muster"></span> Wert weicht ab</span>
    </div>
    {#each gruppen.slice(0, GEZEIGT) as g (g.zeilen[0])}
      {@const b = bleibt(g)}
      <div class="tb-gruppe">
        <div class="tb-gruppe-kopf">
          <span class="tb-schluessel">{g.wert || "gleiche Zeile"}</span>
          <span>{g.zeilen.length} Zeilen</span>
          <span>{g.unterschiede.length ? `Unterschied${g.unterschiede.length > 1 ? "e" : ""} in ${g.unterschiede.map((j) => tabelle.spalten[j].name).join(", ")}` : "ganz gleich"}</span>
          <span class="rechts abzeichen gut">Zeile {zeile(b)} bleibt</span>
        </div>
        <div class="tb-gruppe-feld">
          <table class="tb-vergleich">
            <thead><tr><th>Behalten</th><th>Zeile</th>{#each tabelle.spalten as s (s.name)}<th>{s.name}</th>{/each}</tr></thead>
            <tbody>
              {#each g.zeilen as i (i)}
                <tr class:tb-weg={i !== b}>
                  <td class="tb-wahl-zelle">
                    {#if i === b}
                      <button class="tb-wahl tb-bleibt" title="Diese Zeile bleibt"><i class="fa-solid fa-circle-dot"></i> bleibt</button>
                    {:else}
                      <button class="tb-wahl" title="Stattdessen Zeile {zeile(i)} behalten" onclick={() => (wahl[g.zeilen[0]] = i)}><i class="fa-regular fa-circle"></i> wird entfernt</button>
                    {/if}
                  </td>
                  <td class="mono">{zeile(i)}</td>
                  {#each tabelle.spalten as _, j (j)}<td class:tb-anders={g.unterschiede.includes(j)}>{zellText(tabelle, index, text, i, j)}</td>{/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <p class="tb-vorschau tb-oben">Keine doppelten Zeilen{spalten.length ? ` mit gleichem ${spalten.map((j) => tabelle.spalten[j].name).join(", ")}` : ""}.</p>
    {/each}
    {#if gruppen.length > GEZEIGT}<p class="tb-vorschau tb-oben">und {anzahl(gruppen.length - GEZEIGT)} weitere Gruppen, aufgelöst nach der gewählten Vorauswahl.</p>{/if}
  </div>
  <div class="tb-blatt-fuss">
    <div class="tb-vorschau"><span class="abzeichen warn"><i class="fa-solid fa-eye"></i> Vorschau</span> Entfernt {anzahl(weg.length)} {weg.length === 1 ? "Zeile" : "Zeilen"}, danach {anzahl(tabelle.zeilen.length - weg.length)} Zeilen. Rückgängig über den Verlauf.</div>
    <span class="rechts">
      <button class="knopf" onclick={onschliessen}>Abbrechen</button>
      <button class="knopf primaer" disabled={!weg.length || !blatt.aktuell} onclick={() => void uebernehmen()}><i class="fa-solid fa-check"></i> Übernehmen</button>
    </span>
  </div>
</div>
