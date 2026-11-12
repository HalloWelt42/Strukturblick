<script lang="ts">
  // Werkzeug Reparieren (entwuerfe/reparatur.html): liest das Dokument als JSON oder JSON Lines, schlägt je Zeile
  // Eingriffe nach festen Regeln vor (nichts wird geraten), zeigt sie als Unterschied und übernimmt die gewählten
  // Zeilen als einen Vorgang im Verlauf.
  import "../werkzeuge.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { reparierenZustand } from "./reparierenZustand.svelte";
  import Zeilenliste from "./Zeilenliste.svelte";
  import Unterschied from "./Unterschied.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(reparierenZustand(blatt));
  const lesart = $derived(z.leseart(blatt));
  const reparatur = $derived(z.reparatur(blatt));
  const gewaehlt = $derived(reparatur.befunde.find((b) => b.zeile === z.gewaehlt) ?? reparatur.befunde[0] ?? null);
  const ergebnis = $derived(z.ergebnis(blatt));
  const v = $derived(ergebnis.vorhaben);
  const danach = $derived(ergebnis.nachher);
  const handarbeit = $derived(reparatur.befunde.filter((b) => b.ungeloest).length);

  const band = $derived.by(() => {
    const unveraendert = `${anzahl(reparatur.zeilen - v.zeilen)} von ${anzahl(reparatur.zeilen)} ${reparatur.zeilen === 1 ? "Zeile" : "Zeilen"} unverändert.`;
    if (!v.zeilen) return { stark: unveraendert, rest: reparatur.befunde.length ? "Keine Änderung gewählt." : "" };
    const wo = v.zeilen === 1 ? `In Zeile ${anzahl(z.gewaehlteBefunde(blatt)[0].zeile)}` : `In ${anzahl(v.zeilen)} Zeilen`;
    return { stark: unveraendert, rest: `${wo} ${v.ergaenzt === 1 ? "wird 1 Zeichen" : `werden ${anzahl(v.ergaenzt)} Zeichen`} ergänzt, ${v.geloescht ? `${anzahl(v.geloescht)} gelöscht` : "gelöscht wird nichts"}.` };
  });

  const danachText = $derived.by(() => {
    if (danach.datensaetze !== null) {
      const zeilen = `Danach ${anzahl(danach.datensaetze)} lesbare ${danach.datensaetze === 1 ? "Zeile" : "Zeilen"}`;
      return danach.fehler ? `${zeilen}, ${anzahl(danach.fehler)} noch nicht.` : `${zeilen}.`;
    }
    return danach.fehler ? `Danach noch ${anzahl(danach.fehler)} Fehler.` : "Danach lesbar.";
  });
</script>

<div class="rp-ansicht">
  <div class="wz-optionen">
    <div class="wz-option">
      <span class="wz-etikett">Lesen als</span>
      <nav class="segment" aria-label="Format">
        <button class:aktiv={lesart.als === "ndjson"} title="Ein Datensatz je Zeile" onclick={() => { z.gewaehlteLeseart = "ndjson"; z.gewaehlt = null; }}>JSON Lines</button>
        <button class:aktiv={lesart.als === "json"} title="Ganze Datei als ein JSON-Dokument" onclick={() => { z.gewaehlteLeseart = "json"; z.gewaehlt = null; }}>JSON</button>
      </nav>
    </div>
    <div class="wz-option"><span class="abzeichen zweit">{lesart.grund}</span></div>
    <div class="rechts">
      <span class="wz-etikett"><i class="fa-solid fa-gears"></i> Feste Regeln, ohne KI: gleiche Datei, gleicher Vorschlag</span>
    </div>
  </div>

  <div class="inhalt">
    <div class="wz-flaeche">
      <div class="wz-band">
        <i class="fa-solid {reparatur.befunde.length ? 'fa-shield-halved' : 'fa-circle-check'}"></i>
        <span><strong>{band.stark}</strong> {band.rest}{#if handarbeit} {anzahl(handarbeit)} {handarbeit === 1 ? "Zeile braucht" : "Zeilen brauchen"} Handarbeit.{/if}</span>
      </div>
      <div class="wz-raster wz-liste-breit">
        <Zeilenliste {blatt} {z} {reparatur} {gewaehlt} />
        <Unterschied {blatt} {z} {reparatur} {gewaehlt} ergaenzt={v.ergaenzt} geloescht={v.geloescht} />
      </div>
    </div>
  </div>

  <div class="wz-aktionen">
    <i class="fa-solid fa-circle-info"></i>
    <span>{danachText} Rückgängig im Kopf und im Verlauf.</span>
    <span class="rechts">
      <button class="knopf" title="Nichts ändern und das Werkzeug schließen" onclick={() => blatt.werkzeugSchliessen()}><i class="fa-solid fa-xmark"></i> Verwerfen</button>
      <button class="knopf primaer" disabled={!v.aenderungen.length} onclick={() => void z.uebernehmen(blatt)}><i class="fa-solid fa-check"></i> Übernehmen</button>
    </span>
  </div>
</div>

<style>
  .rp-ansicht {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
