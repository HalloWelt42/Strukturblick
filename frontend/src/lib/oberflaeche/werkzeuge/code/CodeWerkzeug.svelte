<script lang="ts">
  // Werkzeug "Code erzeugen" (entwuerfe/codegen.html): Klassen in PHP, TypeScript oder Python aus dem Schema der Daten
  // (wie in der Ansicht Struktur abgeleitet) oder aus einem JSON Schema der Ablage. Oben die Einstellungen, darunter der
  // Code nur zum Lesen mit Kopieren und Herunterladen; bei "Je Klasse" wählen Reiter die Datei. Alles im Browser.
  import "../werkzeuge.css";
  import { strToU8, zipSync } from "fflate";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { CODEZIELE, codeziel } from "../../../analyse/codegen/codeziele";
  import { herunterladen } from "../../schale/dateien";
  import CodeAnzeige from "../../bausteine/CodeAnzeige.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { FASSUNG } from "../../../zustand/app";
  import { codeZustand } from "./codeZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(codeZustand(blatt));
  const e = $derived(z.ergebnis(blatt));
  const ziel = $derived(codeziel(z.ziel));
  const dateien = $derived(e?.ok ? e.ausgabe.dateien : []);
  const datei = $derived(dateien[Math.min(z.datei, dateien.length - 1)] ?? null);
  const zeilen = $derived(datei ? datei.text.split("\n").length - (datei.text.endsWith("\n") ? 1 : 0) : 0);
  const schemaDokumente = $derived(arbeitsplatz.dokumente.filter((d) => d.kennung !== blatt.kennung && /\.json$/i.test(d.name)).sort((a, b) => Number(/schema/i.test(b.name)) - Number(/schema/i.test(a.name)) || a.name.localeCompare(b.name, "de")));
  let menueOffen = $state(false);

  async function kopieren(): Promise<void> {
    if (!datei) return;
    try {
      await navigator.clipboard.writeText(datei.text);
      meldungen.zeigen({ text: `${datei.name} kopiert`, art: "erfolg" });
    } catch {
      meldungen.zeigen({ text: "Kopieren ging nicht: Der Browser erlaubt hier keinen Zugriff auf die Zwischenablage.", art: "fehler" });
    }
  }

  /** Gesamtpaket: lauffähiges Miniprojekt mit Klassen, Daten, Leseprogramm und README als ZIP */
  function projektHerunterladen(): void {
    const projekt = z.miniprojekt(blatt);
    if (!projekt) return;
    const ordner = `${z.wurzel(blatt)}-${ziel.kennung}`;
    const zip = zipSync(Object.fromEntries(projekt.map((d) => [`${ordner}/${d.name}`, strToU8(d.text)])));
    herunterladen(`${ordner}.zip`, zip, "application/zip");
    meldungen.zeigen({ text: `${ordner}.zip: ${projekt.length} Dateien. Entpacken und den Befehl aus der README ausführen.`, art: "erfolg" });
  }

  /** Eine Datei direkt, mehrere als ZIP (Browser blocken viele Downloads auf einmal) */
  function alleHerunterladen(): void {
    if (dateien.length === 1) return herunterladen(dateien[0].name, dateien[0].text);
    const zip = zipSync(Object.fromEntries(dateien.map((d) => [d.name, strToU8(d.text)])));
    herunterladen(`${z.wurzel(blatt)}-${ziel.kennung}.zip`, zip, "application/zip");
  }
</script>

<svelte:window onpointerdown={(ev) => menueOffen && !(ev.target as HTMLElement).closest(".cg-menue") && (menueOffen = false)} />

<div class="cg-ansicht">
  <div class="wz-optionen">
    <div class="wz-option">
      <span class="wz-etikett">Ziel</span>
      <nav class="segment" aria-label="Zielsprache">
        {#each CODEZIELE as c (c.kennung)}<button class:aktiv={z.ziel === c.kennung} onclick={() => { z.ziel = c.kennung; z.datei = 0; }}>{c.name}</button>{/each}
      </nav>
    </div>
    <div class="wz-option cg-menue">
      <span class="wz-etikett">Aus</span>
      <nav class="segment" aria-label="Quelle">
        <button class:aktiv={z.quelle.art === "daten"} title="Schema aus den Daten dieses Dokuments ableiten (wie in der Ansicht Struktur)" onclick={() => z.datenWaehlen()}>Daten</button>
        <button class:aktiv={z.quelle.art === "dokument"} title="Ein JSON Schema aus der Ablage nehmen" onclick={() => (menueOffen = !menueOffen)}>{z.quelle.art === "dokument" ? z.quelle.name : "Schema"} <i class="fa-solid fa-caret-down"></i></button>
      </nav>
      {#if menueOffen}
        <div class="cg-liste karte" role="menu">
          {#each schemaDokumente as d (d.kennung)}
            <button role="menuitem" onclick={() => { menueOffen = false; void z.dokumentWaehlen(d.kennung, d.name); }}><i class="fa-solid fa-file-code"></i><span class="mono">{d.ordner ? `${d.ordner} / ` : ""}{d.name}</span></button>
          {:else}
            <p class="klein text-3">Kein JSON-Dokument in der Ablage. Ein Schema öffnen oder in der Ansicht Struktur ableiten und herunterladen.</p>
          {/each}
        </div>
      {/if}
    </div>
    <label class="wz-option" title="Name der obersten Klasse; leer: aus dem Dokumentnamen">
      <span class="wz-etikett">Wurzelname</span>
      <span class="feld cg-feld"><input type="text" placeholder={z.wurzel(blatt)} bind:value={z.wurzelname} /></span>
    </label>
    {#if ziel.namensraum}
      <label class="wz-option" title="PHP-Namensraum (namespace)">
        <span class="wz-etikett">Namensraum</span>
        <span class="feld cg-feld"><input type="text" bind:value={z.namensraum} /></span>
      </label>
    {/if}
    <div class="wz-option">
      <span class="wz-etikett">Klassen</span>
      <nav class="segment" aria-label="Änderbar">
        <button class:aktiv={z.unveraenderlich} title="Werte nach dem Anlegen nicht änderbar (readonly, frozen)" onclick={() => (z.unveraenderlich = true)}>readonly</button>
        <button class:aktiv={!z.unveraenderlich} onclick={() => (z.unveraenderlich = false)}>veränderbar</button>
      </nav>
    </div>
    {#if ziel.attribute}
      <div class="wz-option">
        <span class="wz-etikett">Grenzen als</span>
        <nav class="segment" aria-label="Grenzen als">
          <button class:aktiv={!z.attribute} title="Grenzen als Kommentar (PHPDoc); ohne Abhängigkeit" onclick={() => (z.attribute = false)}>PHPDoc</button>
          <button class:aktiv={z.attribute} title="Attribute des Symfony Validators (#[Assert\Count] ...); prüfbar mit symfony/validator, list<T> bleibt PHPDoc" onclick={() => (z.attribute = true)}>Attribute</button>
        </nav>
      </div>
    {/if}
    <div class="wz-option">
      <span class="wz-etikett">Dateien</span>
      <nav class="segment" aria-label="Dateien">
        <button class:aktiv={!z.jeKlasse} onclick={() => { z.jeKlasse = false; z.datei = 0; }}>Eine</button>
        <button class:aktiv={z.jeKlasse} onclick={() => { z.jeKlasse = true; z.datei = 0; }}>Je Klasse</button>
      </nav>
    </div>
  </div>
  <div class="inhalt cg-inhalt">
    {#if !e}
      <p class="wz-satz">{blatt.analyse ? "Das Dokument lässt sich so nicht lesen." : "Das Dokument wird gelesen ..."}</p>
    {:else if !e.ok}
      <div class="wz-band"><i class="fa-solid fa-triangle-exclamation"></i><span>{e.fehler}</span></div>
    {:else if datei}
      <section class="wz-tafel cg-tafel">
        <div class="wz-tafel-kopf">
          {#if dateien.length > 1}
            <nav class="segment cg-dateien" aria-label="Datei">
              {#each dateien as d, i (d.name)}<button class:aktiv={d === datei} onclick={() => (z.datei = i)}>{d.name}</button>{/each}
            </nav>
          {:else}
            <i class="fa-solid fa-file-code"></i> <span class="mono">{datei.name}</span>
          {/if}
          <span class="rechts cg-kopf-rechts">
            <span class="abzeichen" title="Ab dieser Fassung läuft der Code; steht auch im Kopf jeder Datei">{e.ausgabe.voraussetzung}</span>
            <span class="abzeichen zweit" title="Fassung des Schemas, aus dem der Code entstand ({e.quelle})">{e.schemafassung}</span>
            <span class="abzeichen zweit" title="Fassung des Erzeugers">Strukturblick {FASSUNG}</span>
            <span class="klein text-3">{anzahl(e.modell.klassen.length)} {e.modell.klassen.length === 1 ? "Klasse" : "Klassen"}, {anzahl(zeilen)} Zeilen</span>
          </span>
        </div>
        <CodeAnzeige text={datei.text} sprache={ziel.sprache} beschriftung="Erzeugter Code: {datei.name}" />
      </section>
    {/if}
  </div>
  {#if e?.ok}
    <div class="wz-aktionen">
      <i class="fa-solid fa-circle-info"></i>
      <span>{e.ausgabe.hinweis}</span>
      <span class="rechts">
        <button class="knopf" onclick={() => void kopieren()}><i class="fa-solid fa-copy"></i> Kopieren</button>
        <button class="knopf" title={dateien.length > 1 ? `Alle ${dateien.length} Klassendateien als ZIP` : `Nur ${datei?.name}`} onclick={alleHerunterladen}><i class="fa-solid fa-download"></i> Herunterladen</button>
        <button class="knopf primaer" title="Lauffähiges Miniprojekt: Klassen, die Daten dieses Dokuments, ein Leseprogramm, Abhängigkeiten und README" onclick={projektHerunterladen}><i class="fa-solid fa-file-zipper"></i> Projekt als ZIP</button>
      </span>
    </div>
  {/if}
</div>

<style>
  .cg-ansicht {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .cg-menue {
    position: relative;
  }
  .cg-liste {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    margin: 0;
    min-width: 320px;
    max-height: 380px;
    overflow-y: auto;
    padding: var(--a1);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .cg-liste button {
    display: flex;
    align-items: center;
    gap: var(--a2);
    width: 100%;
    min-height: var(--zeile);
    padding: 0 var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    font-size: var(--klein);
    color: var(--text-1);
    text-align: left;
    cursor: pointer;
  }
  .cg-liste button:hover {
    background: var(--akzent-weich);
  }
  .cg-feld {
    width: calc(var(--a6) * 6);
  }
  .cg-inhalt {
    display: flex;
    flex-direction: column;
    padding: var(--a3);
  }
  .cg-tafel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .cg-dateien {
    flex-wrap: wrap;
  }
  .cg-kopf-rechts {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: var(--a1) var(--a2);
  }
</style>
