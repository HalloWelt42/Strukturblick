<script lang="ts">
  // Werkzeug Konvertieren (entwuerfe/konvertieren.html): Zielformat und seine Optionen wählen, die Verlustkarte steht
  // vor dem Ergebnis, darunter Quelle und Ergebnis nebeneinander. Das Dokument selbst bleibt unverändert; das Ergebnis
  // wird ein neues Dokument oder eine Datei.
  import "../werkzeuge.css";
  import { ziel, zieleFuer, zielname, type Konvertieroptionen, type Zielkennung } from "../../../analyse/konvertieren/konvertieren";
  import type { Trennzeichen } from "../../../analyse/konvertieren/tabellieren";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { herunterladen } from "../../schale/dateien";
  import { konvertierenZustand } from "./konvertierenZustand.svelte";
  import Verlustkarte from "./Verlustkarte.svelte";
  import Textvorschau from "./Textvorschau.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(konvertierenZustand(blatt));
  const zk = $derived(z.ziel(blatt));
  const zielInfo = $derived(zk ? ziel(zk) : null);
  const u = $derived(z.umwandlung(blatt));
  const ziele = $derived(zieleFuer(blatt.analyse?.format.kennung ?? ""));
  const neuerName = $derived(zk ? zielname(blatt.name, zk) : "");
  const hat = (o: keyof Konvertieroptionen): boolean => zielInfo?.optionen.includes(o) ?? false;

  const TRENNER: readonly { wert: Trennzeichen; zeichen: string; titel: string }[] = [
    { wert: ";", zeichen: ";", titel: "Semikolon, wie es Tabellenprogramme im deutschen Raum erwarten" },
    { wert: ",", zeichen: ",", titel: "Komma" },
    { wert: "\t", zeichen: "Tab", titel: "Tabulator" },
  ];

  async function alsDokument(): Promise<void> {
    if (!u || !zk) return;
    // Nach dem Anlegen ist das neue Dokument aktiv; Name und Ziel der Quelle vorher festhalten
    const quelle = blatt.name;
    const ziel = zk;
    const neu = await arbeitsplatz.neu(neuerName, u.text, blatt.ordner);
    neu.zeigen({ art: "ansicht", kennung: ziel === "csv" ? "tabelle" : "baum" });
    meldungen.zeigen({ text: `Neues Dokument ${neu.name}; ${quelle} bleibt unverändert`, art: "erfolg" });
  }

  function zielWaehlen(k: Zielkennung): void {
    z.gewaehltesZiel = k;
  }
</script>

<div class="kv-ansicht">
  <div class="wz-optionen">
    <div class="wz-option">
      <span class="wz-etikett">Von {blatt.analyse?.format.name ?? ""} nach</span>
      <nav class="segment" aria-label="Zielformat">
        {#each ziele as x (x.kennung)}
          <button class:aktiv={x.kennung === zk} onclick={() => zielWaehlen(x.kennung)}>{x.name}</button>
        {/each}
      </nav>
    </div>
    {#if hat("trennzeichen")}
      <div class="wz-option">
        <span class="wz-etikett">Trennzeichen</span>
        <nav class="segment" aria-label="Trennzeichen">
          {#each TRENNER as t (t.wert)}
            <button class:aktiv={z.optionen.trennzeichen === t.wert} title={t.titel} onclick={() => z.setzen("trennzeichen", t.wert)}><span class:mono={t.zeichen.length === 1}>{t.zeichen}</span></button>
          {/each}
        </nav>
      </div>
    {/if}
    {#if hat("objekte")}
      <div class="wz-option">
        <span class="wz-etikett">Objekte</span>
        <nav class="segment" aria-label="Verschachtelte Objekte">
          <button class:aktiv={z.optionen.objekte === "spalten"} title="kunde wird zu kunde.name, kunde.plz ..." onclick={() => z.setzen("objekte", "spalten")}>Als Spalten <span class="mono">a.b</span></button>
          <button class:aktiv={z.optionen.objekte === "json"} title="Das Objekt als JSON-Text in einer Zelle" onclick={() => z.setzen("objekte", "json")}>Als JSON-Text</button>
        </nav>
      </div>
    {/if}
    {#if hat("kopfzeile")}
      <div class="wz-option">
        <span class="wz-etikett">Kopfzeile</span>
        <nav class="segment" aria-label="Kopfzeile">
          <button class:aktiv={z.optionen.kopfzeile} onclick={() => z.setzen("kopfzeile", true)}>Mit</button>
          <button class:aktiv={!z.optionen.kopfzeile} onclick={() => z.setzen("kopfzeile", false)}>Ohne</button>
        </nav>
      </div>
    {/if}
  </div>

  <div class="inhalt">
    <div class="wz-flaeche">
      {#if !u || !zielInfo}
        <p class="wz-satz">{blatt.analyse ? "Das Dokument lässt sich so nicht lesen; erst reparieren, dann umwandeln." : "Das Dokument wird gelesen ..."}</p>
      {:else}
        <Verlustkarte {z} zielName={zielInfo.name} verluste={u.verluste} />
        <div class="wz-raster">
          <Textvorschau titel="Quelle" symbol="fa-file-code" name={blatt.name} abzeichen={blatt.analyse?.format.name ?? ""} text={blatt.analyseText} />
          <Textvorschau titel="Ergebnis" symbol={zielInfo.symbol} name={neuerName} abzeichen={zielInfo.datei ? "Zellen als Text" : "Vorschau"} text={u.text} rest={u.tabelle ? "Zeilen" : u.datensaetze !== null ? "Datensätze" : "Zeilen"} />
        </div>
      {/if}
    </div>
  </div>

  <div class="wz-aktionen">
    <i class="fa-solid fa-circle-info"></i>
    <span>{blatt.name} bleibt unverändert.</span>
    <span class="rechts">
      <button class="knopf" class:primaer={zielInfo?.datei} disabled={!u} onclick={() => u && herunterladen(neuerName, u.daten ?? u.text, zielInfo?.datei?.art)}><i class="fa-solid fa-download"></i> Herunterladen</button>
      {#if !zielInfo?.datei}<button class="knopf primaer" disabled={!u} onclick={() => void alsDokument()}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>{/if}
    </span>
  </div>
</div>

<style>
  .kv-ansicht {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
