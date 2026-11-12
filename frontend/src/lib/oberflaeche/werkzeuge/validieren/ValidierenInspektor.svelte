<script lang="ts">
  // Inspektor zu Validieren: gewählter Befund (Wert, Regel, Ort im Schema, Eintrag), Beheben (nur wo eindeutig: fehlende
  // führende Nullen), das Schema und der Hinweis, dass alles im Browser rechnet.
  import "../werkzeuge.css";
  import { eintragKennung } from "../../../analyse/validieren";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { validierenZustand } from "./validierenZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(validierenZustand(blatt));
  const ergebnis = $derived(z.pruefung(blatt));
  const p = $derived(ergebnis?.pruefung ?? null);
  const gezeigt = $derived(p?.ok ? p.befunde.filter((b) => z.filter === "alle" || b.art === z.filter) : []);
  const befund = $derived(gezeigt[Math.min(z.gewaehlt, gezeigt.length - 1)] ?? null);
  const fassung = $derived.by(() => {
    const s = String(ergebnis?.schema?.$schema ?? "");
    return s.includes("draft-04") ? "JSON Schema Entwurf 4" : s.includes("draft-07") || s.includes("draft-06") ? "JSON Schema Entwurf 7" : s.includes("2019-09") ? "JSON Schema 2019-09" : "JSON Schema 2020-12";
  });

  async function beheben(): Promise<void> {
    if (!befund?.vorschlag) return;
    await blatt.ausfuehrenMitMeldung("wert.setzen", { zeiger: befund.zeiger, neu: { art: "text", wert: befund.vorschlag } }, { ort: "Validieren" });
  }
</script>

{#if befund && blatt.analyse?.index}
  <div class="karte">
    <div class="karte-titel">Gewählter Befund <span class="rechts abzeichen {befund.art === 'fehler' ? 'fehler' : 'warn'}">{befund.art === "fehler" ? "Fehler" : "Warnung"}</span></div>
    <div class="wertfeld mono">{befund.gefunden}</div>
    <dl class="paare wz-abstand">
      <dt>Regel</dt><dd class="mono">{befund.regel}</dd>
      <dt>Im Schema</dt><dd class="mono">{befund.imSchema}</dd>
      {#if eintragKennung(blatt.analyse.index, blatt.analyseText, befund.knoten)}<dt>Eintrag</dt><dd>{eintragKennung(blatt.analyse.index, blatt.analyseText, befund.knoten)}</dd>{/if}
    </dl>
  </div>
  {#if befund.vorschlag}
    <div class="karte">
      <div class="karte-titel">Beheben</div>
      <p class="wz-satz">Nur diese Stelle: gilt sofort, Rückgängig im Kopf.</p>
      <div class="knopf-reihe wz-abstand"><button class="knopf" disabled={!blatt.aktuell} onclick={() => void beheben()}><i class="fa-solid fa-wrench"></i> Auf "{befund.vorschlag}" setzen</button></div>
      <p class="wz-satz wz-abstand">Alle Stellen auf einmal: mit Bereinigen und als Rezept.</p>
    </div>
  {/if}
{/if}
<div class="karte">
  <div class="karte-titel">Schema</div>
  <dl class="paare">
    {#if blatt.analyse?.format.faehigkeiten.schemasprache === "xml-schema"}
      <dt>Quelle</dt><dd class="mono">{z.xsd.wahl ? (z.xsd.wahl.art === "paket" ? z.xsd.wahl.pfad : z.xsd.wahl.name) : "noch keins"}</dd>
      <dt>Fassung</dt><dd>XML Schema 1.0, geprüft mit libxml2</dd>
      {#if z.xsd.ergebnis}<dt>Importe</dt><dd>{anzahl(z.xsd.ergebnis.importe)} {z.xsd.ergebnis.importe === 1 ? "Schema" : "Schemas"} bereit{z.xsd.paket ? ` (Paket ${z.xsd.paket.name})` : ""}</dd>{/if}
      {#if z.xsd.aktuell(blatt)?.fehlend?.length}<dt>Fehlt</dt><dd class="mono">{z.xsd.aktuell(blatt)?.fehlend?.join(", ")}</dd>{/if}
    {:else}
      <dt>Quelle</dt><dd class="mono">{z.quelle.art === "daten" ? `aus ${blatt.name} abgeleitet` : z.quelle.name}</dd>
      <dt>Fassung</dt><dd>{fassung}</dd>
    {/if}
    {#if p?.ok}<dt>Geprüft</dt><dd>{anzahl(p.befunde.length)} Befunde in {(Math.max(1, p.dauer) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} s</dd>{/if}
  </dl>
</div>
<div class="karte">
  <div class="karte-titel">Im Browser</div>
  <p class="wz-satz">Die Prüfung rechnet ganz in diesem Browser; dafür gehen keine Daten an einen Server.</p>
</div>
