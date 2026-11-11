<script lang="ts">
  // Rechte Seite der Facetten: aktive Filter als Chips, Treffer, Knöpfe, die Zeilen seitenweise und, wenn "Nur diese
  // Zeilen behalten" gewählt ist, die Leiste zum Bestätigen (auch ohne Inspektor auf schmalen Bildschirmen).
  import { KEIN, KnotenArt } from "../../../kern/strukturindex";
  import { vorschau, zelle } from "../../../analyse/tabelle";
  import type { Auswahl } from "../../../analyse/bereinigen/facetten";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ZEILEN_JE_SEITE, type BereinigenZustand, type Tabellenstand } from "./bereinigenZustand.svelte";
  import { alsNeuesDokument, zeilenBehalten } from "./vorgaenge";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import WertText from "./WertText.svelte";

  let { blatt, z, s }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand } = $props();

  const ZAHL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
  const ergebnis = $derived(z.gefiltert(s));
  const gesamt = $derived(s.tabelle.zeilen.length);
  const treffer = $derived(ergebnis.zeilen.length);
  const filter = $derived(z.filter.filter((f) => s.tabelle.spalteNach.has(f.spalte)));
  const gefiltert = $derived(new Set(filter.map((f) => f.spalte)));
  const seiten = $derived(Math.max(1, Math.ceil(treffer / ZEILEN_JE_SEITE)));
  const seite = $derived(Math.min(z.seite, seiten - 1));
  const zeilen = $derived(ergebnis.zeilen.subarray(seite * ZEILEN_JE_SEITE, (seite + 1) * ZEILEN_JE_SEITE));
  const kannBehalten = $derived(s.aktuell && treffer > 0 && treffer < gesamt);

  function chip(a: Auswahl): string {
    if (a.art === "werte") return a.werte.length === 1 ? a.werte[0] || "(leer)" : `${a.werte.length} Werte`;
    const f = (x: number | string): string => (typeof x === "number" ? ZAHL.format(x) : x);
    return spanne(a.von === null ? null : f(a.von), a.bis === null ? null : f(a.bis));
  }

  const spanne = (von: string | null, bis: string | null): string => (von !== null && bis !== null ? `${von} bis ${bis}` : von !== null ? `ab ${von}` : `bis ${bis}`);

  async function uebernehmen(): Promise<void> {
    await zeilenBehalten(blatt, z, s, ergebnis);
    z.behaltenVorschau = false;
  }
</script>

<section class="br-ergebnis" aria-label="Gefilterte Zeilen">
  {#if filter.length}
    <div class="br-chips" aria-label="Aktive Filter">
      {#each filter as f (f.spalte)}
        <span class="br-chip" title={f.auswahl.art === "werte" ? f.auswahl.werte.map((w) => w || "(leer)").join(", ") : undefined}>
          <span class="br-chip-spalte">{f.spalte}</span> <span class="mono">{chip(f.auswahl)}</span>
          <button title="Filter entfernen" onclick={() => z.auswahlSetzen(f.spalte, null)}><i class="fa-solid fa-xmark"></i></button>
        </span>
      {/each}
      <button class="knopf still" onclick={() => z.filterLeeren()}><i class="fa-solid fa-filter-circle-xmark"></i> Alle entfernen</button>
    </div>
  {:else}
    <div class="br-chips"><span class="text-3 klein">Kein Filter: In einer Facette Werte anklicken, dann zeigt die Tabelle nur noch passende Zeilen.</span></div>
  {/if}
  <div class="br-trefferzeile">
    <span class="br-treffer"><strong>{anzahl(treffer)}</strong> von <span class="br-gesamt">{anzahl(gesamt)}</span> Zeilen</span>
    <span class="br-rechts">
      <button class="knopf" disabled={!treffer || !filter.length} title="Kopie mit diesen Zeilen anlegen, {blatt.name} bleibt ganz" onclick={() => void alsNeuesDokument(blatt, s, ergebnis.zeilen)}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
      <button class="knopf primaer" disabled={!kannBehalten} aria-pressed={z.behaltenVorschau} title={s.aktuell ? "Erst Vorschau, dann übernehmen" : "Wird gerade gelesen ..."} onclick={() => (z.behaltenVorschau = !z.behaltenVorschau)}><i class="fa-solid fa-scissors"></i> Nur diese Zeilen behalten</button>
    </span>
  </div>
  <div class="br-tabellenfeld">
    <table class="br-tabelle">
      <thead>
        <tr>
          <th class="br-nr" title="Zeile im Text">Zeile</th>
          {#each s.tabelle.spalten as sp (sp.name)}
            <th class:br-gefiltert={gefiltert.has(sp.name)}>{sp.name}{#if gefiltert.has(sp.name)}<i class="fa-solid fa-filter"></i>{/if}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each zeilen as i (i)}
          <tr>
            <td class="br-nr">{anzahl(s.tabelle.zeileImText[i])}</td>
            {#each s.tabelle.spalten as _, j (j)}
              {@const k = zelle(s.tabelle, s.index, i, j)}
              {#if k === KEIN}
                <td></td>
              {:else}
                <td class:br-zahl={s.index.art[k] === KnotenArt.zahl}><WertText wert={vorschau(s.index, s.text, k).text} /></td>
              {/if}
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="br-blaettern">
    <button class="knopf nur-symbol" title="Vorige Seite" disabled={seite === 0} onclick={() => (z.seite = seite - 1)}><i class="fa-solid fa-arrow-left"></i></button>
    <span>Zeilen <span class="mono">{anzahl(treffer ? seite * ZEILEN_JE_SEITE + 1 : 0)}</span> bis <span class="mono">{anzahl(seite * ZEILEN_JE_SEITE + zeilen.length)}</span> von <span class="mono">{anzahl(treffer)}</span></span>
    <button class="knopf nur-symbol" title="Nächste Seite" disabled={seite >= seiten - 1} onclick={() => (z.seite = seite + 1)}><i class="fa-solid fa-arrow-right"></i></button>
  </div>
  {#if z.behaltenVorschau && kannBehalten}
    <div class="br-anwenden">
      <span class="br-anwenden-text"><i class="fa-solid fa-eye"></i> Vorschau: <strong class="mono">{anzahl(treffer)}</strong> bleiben, <strong class="mono">{anzahl(gesamt - treffer)}</strong> werden entfernt</span>
      <span>Ein Vorgang im Verlauf, rückgängig möglich.</span>
      <span class="br-rechts">
        <button class="knopf" onclick={() => (z.behaltenVorschau = false)}>Abbrechen</button>
        <button class="knopf primaer" onclick={() => void uebernehmen()}><i class="fa-solid fa-check"></i> Übernehmen</button>
      </span>
    </div>
  {/if}
</section>
