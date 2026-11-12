<script lang="ts">
  // Inspektor der Ansicht Schema: die gewählte Stelle im Elementbaum (Vielfalt, Typ, Vorgabe, Erklärung) oder ein Typ
  // aus Liste und Statistik, mit seiner Karte und wo er verwendet wird. Die Fundstelle springt in den Editor; liegt sie in
  // einer eingebundenen Datei, öffnet "Öffnen" diese aus der Ablage.
  import { knotenAn, KEIN, zeigerVon } from "../../../kern";
  import { typVon } from "../../../analyse/xsd/elementbaum";
  import { anzeigename, type QName, type Quelle } from "../../../analyse/xsd/modell";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { anzahl } from "../tabelle/zahlen";
  import { schemaZustand } from "./schemaZustand.svelte";
  import { VERWENDUNG_NAME } from "./texte";
  import TypKarte from "./TypKarte.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(schemaZustand(blatt));
  const u = $derived(z.uebersicht(blatt));
  const m = $derived(u?.modell ?? null);

  /** So viele Verwendungen stehen in der Karte */
  const VERWENDUNGEN = 12;

  const knoten = $derived(u && z.wahl?.art === "knoten" ? z.knoten(u, z.wahl.kennung) : null);
  const typ = $derived.by(() => {
    if (!m) return null;
    if (z.wahl?.art === "typ") return m.typen.get(z.wahl.schluessel) ?? null;
    if (knoten?.element) return typVon(m, knoten.element);
    if (knoten?.attribut) return knoten.attribut.lokalerTyp ?? (knoten.attribut.typ ? (m.typen.get(knoten.attribut.typ) ?? null) : null);
    return null;
  });
  const verwendet = $derived(u && typ?.schluessel ? (u.verwendungen.get(typ.schluessel) ?? []) : []);
  const typWaehlen = (q: QName): void => { z.wahl = { art: "typ", schluessel: q }; };

  const ARTNAME = { element: "Element", attribut: "Attribut", auswahl: "Auswahl", folge: "Folge", ersetzung: "Ersetzungsgruppe", beliebig: "Beliebig" } as const;

  function zeile(q: Quelle): number {
    const text = q.datei === m?.haupt ? blatt.analyseText : (z.nachbarn?.dateien.find((d) => d.pfad === q.datei)?.text ?? "");
    let n = 1;
    for (let i = text.indexOf("\n"); i !== -1 && i < q.von; i = text.indexOf("\n", i + 1)) n++;
    return n;
  }

  function imEditor(q: Quelle): void {
    const index = blatt.analyse?.index;
    if (!index) return;
    const k = knotenAn(index, q.von);
    if (k !== KEIN) blatt.waehlen(zeigerVon(index, blatt.analyseText, k));
    blatt.zeigen({ art: "ansicht", kennung: "editor" });
  }

  const inAblage = (datei: string) => arbeitsplatz.dokumente.find((d) => d.name === datei && d.ordner === blatt.ordner);
</script>

{#snippet fundstelle(q: Quelle)}
  <dt>Fundstelle</dt>
  <dd>
    Zeile {anzahl(zeile(q))}{q.datei !== m?.haupt ? ` in ${q.datei}` : ""}
    {#if q.datei === m?.haupt}
      <button class="knopf still sc-sprung" title="Editor an dieser Stelle öffnen" onclick={() => imEditor(q)}><i class="fa-solid fa-code"></i> Im Editor</button>
    {:else if inAblage(q.datei)}
      <button class="knopf still sc-sprung" title="Diese Datei aus der Ablage öffnen" onclick={() => void arbeitsplatz.ausAblageOeffnen(inAblage(q.datei)!.kennung)}><i class="fa-solid fa-up-right-from-square"></i> Öffnen</button>
    {/if}
  </dd>
{/snippet}

{#if !u || !m}
  <div class="karte"><p class="an-tafel-fuss">Kein XML Schema gelesen.</p></div>
{:else}
  {#if knoten}
    <div class="karte">
      <div class="karte-titel">Gewählte Stelle <span class="rechts abzeichen">{ARTNAME[knoten.art]}</span></div>
      <div class="wertfeld mono">{knoten.name}</div>
      <dl class="paare an-oben">
        <dt>Vielfalt</dt><dd><span class="mono">{knoten.vielfalt}</span>, {knoten.pflicht ? "Pflicht" : "kann fehlen"}</dd>
        {#if knoten.typ}<dt>Typ</dt><dd class="mono">{#if knoten.typSchluessel && m.typen.has(knoten.typSchluessel)}<button class="sc-verweis mono" onclick={() => typWaehlen(knoten.typSchluessel!)}>{knoten.typ}</button>{:else}{knoten.typ}{/if}</dd>{/if}
        {#if knoten.element?.fest != null}<dt>Fester Wert</dt><dd class="mono">{knoten.element.fest}</dd>{:else if knoten.element?.vorgabe != null}<dt>Vorgabe</dt><dd class="mono">{knoten.element.vorgabe}</dd>{/if}
        {#if knoten.element?.nillable}<dt>Leer erlaubt</dt><dd>ja (xsi:nil)</dd>{/if}
        {#if knoten.element?.ersetzt}<dt>Steht für</dt><dd class="mono">{anzeigename(m, knoten.element.ersetzt)}</dd>{/if}
        {#if knoten.rekursiv}<dt>Rekursiv</dt><dd>Der Typ steht weiter oben schon; der Zweig wiederholt sich ab hier.</dd>{/if}
        {#if knoten.quelle}{@render fundstelle(knoten.quelle)}{/if}
      </dl>
      {#if knoten.doku}<p class="sc-doku an-oben">{knoten.doku}</p>{/if}
    </div>
  {/if}
  {#if typ}
    <TypKarte {m} {typ} titel={knoten ? "Typ der Stelle" : "Gewählter Typ"} onwahl={typWaehlen} />
    {#if typ.schluessel}
      <div class="karte">
        <div class="karte-titel">Verwendet <span class="rechts mono">{anzahl(verwendet.length)}</span></div>
        {#if verwendet.length}
          <ul class="sc-liste">
            {#each verwendet.slice(0, VERWENDUNGEN) as v, i (i)}<li><span class="mono sc-umbruch">{v.von}</span><span class="text-3">{VERWENDUNG_NAME[v.art]}</span></li>{/each}
          </ul>
          {#if verwendet.length > VERWENDUNGEN}<p class="an-tafel-fuss an-oben">und {anzahl(verwendet.length - VERWENDUNGEN)} weitere</p>{/if}
        {:else}
          <p class="an-tafel-fuss">Nichts im gelesenen Schema verweist auf diesen Typ.</p>
        {/if}
        <dl class="paare an-oben">{@render fundstelle(typ.quelle)}</dl>
      </div>
    {/if}
  {/if}
  {#if !knoten && !typ}
    <div class="karte">
      <div class="karte-titel">Schema</div>
      <dl class="paare">
        <dt>Namensraum</dt><dd class="mono sc-umbruch">{m.teile[0]?.zielnamensraum || "ohne"}</dd>
        <dt>Wurzeln</dt><dd>{anzahl(u.wurzeln.length)}</dd>
        <dt>Typen</dt><dd>{anzahl(m.typen.size)}</dd>
        <dt>Dateien</dt><dd>{anzahl(m.teile.length)}{#if m.fehlend.length}, {anzahl(m.fehlend.length)} fehlt{/if}</dd>
      </dl>
      <p class="an-tafel-fuss an-oben">Klick auf eine Stelle im Elementbaum oder einen Typ zeigt ihn hier.</p>
    </div>
  {/if}
{/if}
