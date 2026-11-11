<script lang="ts">
  // Inspektor zu den Facetten: Treffer mit Zählung je Filterschritt, Vorschau "Nur diese Zeilen behalten" und die
  // Spalte des letzten Filters (oder der ersten Facette) mit Auffälligem.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ZEILEN_JE_SEITE, type BereinigenZustand, type Tabellenstand } from "./bereinigenZustand.svelte";
  import { zeilenBehalten } from "./vorgaenge";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { blatt, z, s }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand } = $props();

  const ergebnis = $derived(z.gefiltert(s));
  const gesamt = $derived(s.tabelle.zeilen.length);
  const treffer = $derived(ergebnis.zeilen.length);
  const filter = $derived(z.filter.filter((f) => s.tabelle.spalteNach.has(f.spalte)));
  const spalte = $derived(filter.at(-1)?.spalte ?? z.offeneFacetten(s)[0] ?? s.tabelle.spalten[0].name);
  const werte = $derived(z.werte(s, s.tabelle.spalteNach.get(spalte) ?? 0));
  const leer = $derived(werte.find((w) => w.wert.trim() === "")?.anzahl ?? 0);
  const gruppen = $derived(z.gruppen(s, s.tabelle.spalteNach.get(spalte) ?? 0, "kern"));
  const auffaellig = $derived(gruppen.slice(0, 3).map((g) => `${g.ziel} in ${g.varianten.length}`).join(", "));
  const anteil = $derived(gesamt ? (treffer / gesamt) * 100 : 0);
  const seiten = $derived(Math.ceil(treffer / ZEILEN_JE_SEITE));

  async function uebernehmen(): Promise<void> {
    await zeilenBehalten(blatt, z, s, ergebnis);
    z.behaltenVorschau = false;
  }
</script>

<div class="karte">
  <div class="karte-titel">Treffer</div>
  <div class="br-kennzahl"><strong>{anzahl(treffer)}</strong> von <span class="mono">{anzahl(gesamt)}</span> Zeilen</div>
  {#if filter.length}
    <dl class="paare br-oben">
      {#each filter as f, i (f.spalte)}
        <dt>{i ? "+ " : ""}{f.spalte}</dt><dd><span class="mono">{anzahl(ergebnis.schritte[i] ?? 0)}</span> Zeilen</dd>
      {/each}
    </dl>
  {:else}
    <p class="br-karten-text br-oben">Noch kein Filter. Jeder Filter zählt hier, wie viele Zeilen nach ihm bleiben.</p>
  {/if}
  {#if seiten > 1}<p class="br-karten-text br-oben">{anzahl(seiten)} Seiten zu je {ZEILEN_JE_SEITE} Zeilen.</p>{/if}
</div>

{#if z.behaltenVorschau && treffer > 0 && treffer < gesamt}
  <div class="karte">
    <div class="karte-titel">Vorschau <span class="rechts abzeichen warn">Nur diese Zeilen behalten</span></div>
    <div class="br-anteil" title="{anzahl(treffer)} bleiben, {anzahl(gesamt - treffer)} werden entfernt"><span class="br-bleibt" style="width: {anteil}%"></span><span class="br-weg" style="width: {100 - anteil}%"></span></div>
    <dl class="paare">
      <dt>Bleiben</dt><dd class="mono">{anzahl(treffer)} Zeilen</dd>
      <dt>Entfernt</dt><dd class="mono">{anzahl(gesamt - treffer)} Zeilen</dd>
      <dt>Danach</dt><dd>Stand {blatt.verlauf.zeiger + 1}, ein Vorgang im Verlauf</dd>
    </dl>
    <p class="br-karten-text br-oben">Lässt sich rückgängig machen. Lieber getrennt? "Als neues Dokument" legt eine Kopie mit den {anzahl(treffer)} Zeilen an, {blatt.name} bleibt ganz.</p>
    <div class="knopf-reihe">
      <button class="knopf" onclick={() => (z.behaltenVorschau = false)}>Abbrechen</button>
      <button class="knopf primaer" disabled={!s.aktuell} onclick={() => void uebernehmen()}><i class="fa-solid fa-check"></i> Übernehmen</button>
    </div>
  </div>
{/if}

<div class="karte">
  <div class="karte-titel">Spalte {spalte}</div>
  <dl class="paare">
    <dt>Verschieden</dt><dd class="mono">{anzahl(werte.length)} {werte.length === 1 ? "Wert" : "Werte"}</dd>
    <dt>Leer</dt><dd class="mono">{anzahl(leer)}</dd>
    {#if auffaellig}<dt>Auffällig</dt><dd>{auffaellig} Schreibweisen</dd>{/if}
  </dl>
  {#if gruppen.length}
    <div class="knopf-reihe br-oben">
      <button class="knopf" onclick={() => z.aehnlicheZeigen(spalte)}><i class="fa-solid fa-object-group"></i> Ähnliche Werte</button>
    </div>
  {/if}
</div>
