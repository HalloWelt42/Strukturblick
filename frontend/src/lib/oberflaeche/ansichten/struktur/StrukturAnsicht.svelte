<script lang="ts">
  // Ansicht Struktur (entwuerfe/struktur.html): das abgeleitete Schema als Baum von Typkarten. Pflichtfelder tragen *,
  // Kanten nennen die Vielfalt (1, 0..1, 0..n). Zoom und Einpassen über CSS-Zoom der Leinwand; "Als JSON Schema" lädt
  // das Schema herunter; bei XML legt "XML Schema ableiten" ein XSD neben das Dokument. Ein Klick auf einen Typ zeigt ihn
  // im Inspektor, auf ein Feld wählt sein erstes Vorkommen.
  import "../ansichten.css";
  import "./struktur.css";
  import { zeigerVon } from "../../../kern/pfade";
  import { alsJsonSchema, beschreiben, type Schemafeld, type Typ } from "../../../analyse/schema";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { xmlSchemaAbleitbar, xmlSchemaAblegen } from "../../../zustand/schemaAbleiten";
  import { herunterladen } from "../../schale/dateien";
  import { strukturZustand, ZOOM_STUFEN } from "./strukturZustand.svelte";
  import TypZweig from "./TypZweig.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(strukturZustand(blatt));
  const schema = $derived(z.schema(blatt));
  const wurzelTyp = $derived(schema?.typen.find((t) => t.pfad === "") ?? null);
  // Ist die Wurzel eine Liste, hängen ihre Eintragstypen direkt an ihr (Pfad "[]"; bei Listen in Listen der erste Typ)
  const obersteTypen = $derived.by(() => {
    if (!schema || wurzelTyp) return [];
    const eintraege = schema.typen.filter((t) => t.pfad === "[]");
    return eintraege.length ? eintraege : schema.typen.slice(0, 1);
  });
  const gewaehlt = $derived(z.typ ?? schema?.typen[0]?.name ?? "");
  const xml = $derived(xmlSchemaAbleitbar(blatt));

  let leinwand: HTMLElement | undefined = $state();

  function waehlen(t: Typ): void {
    const index = blatt.analyse?.index;
    z.typ = t.name;
    if (index) blatt.waehlen(zeigerVon(index, blatt.analyseText, t.erster));
  }

  function feldWaehlen(f: Schemafeld): void {
    const index = blatt.analyse?.index;
    if (index) blatt.waehlen(zeigerVon(index, blatt.analyseText, f.erster));
  }

  function zoomen(richtung: -1 | 1): void {
    const i = ZOOM_STUFEN.findIndex((s) => s >= z.zoom - 0.001);
    z.zoom = ZOOM_STUFEN[Math.max(0, Math.min(ZOOM_STUFEN.length - 1, (i < 0 ? ZOOM_STUFEN.length - 1 : i) + richtung))];
  }

  /** Ganzes Diagramm ins Feld: Verhältnis von Feld zu Inhalt bei Zoom 1, höchstens 1 */
  function einpassen(): void {
    const feld = leinwand?.parentElement;
    if (!leinwand || !feld) return;
    const breite = leinwand.scrollWidth / z.zoom;
    const hoehe = leinwand.scrollHeight / z.zoom;
    z.zoom = Math.max(0.3, Math.min(1, feld.clientWidth / breite, feld.clientHeight / hoehe));
  }

  function schemaLaden(): void {
    if (!schema) return;
    const stamm = blatt.name.replace(/\.[^.]+$/, "");
    herunterladen(`${stamm}.schema.json`, JSON.stringify(alsJsonSchema(schema, blatt.name), null, 2) + "\n");
  }
</script>

<div class="an-ansicht">
  <div class="werkzeugzeile an-umbruch">
    <div class="an-legende">
      <span><b class="an-pflicht">*</b> in jedem Eintrag</span>
      <span><span class="an-kante-zahl">1</span> genau eines</span>
      <span><span class="an-kante-zahl">0..1</span> keins oder eines</span>
      <span><span class="an-kante-zahl">0..n</span> beliebig viele</span>
    </div>
    <div class="rechts">
      <div class="an-zoom" title="Zoom">
        <button class="knopf nur-symbol" title="Verkleinern" disabled={z.zoom <= ZOOM_STUFEN[0]} onclick={() => zoomen(-1)}><i class="fa-solid fa-magnifying-glass-minus"></i></button>
        <span class="an-zoom-wert">{Math.round(z.zoom * 100)} %</span>
        <button class="knopf nur-symbol" title="Vergrößern" disabled={z.zoom >= ZOOM_STUFEN.at(-1)!} onclick={() => zoomen(1)}><i class="fa-solid fa-magnifying-glass-plus"></i></button>
        <button class="knopf" title="Ganzes Diagramm ins Feld einpassen" onclick={einpassen}><i class="fa-solid fa-expand"></i><span class="nur-breit"> Einpassen</span></button>
      </div>
      <button class="knopf" class:primaer={!xml} disabled={!schema?.typen.length} title="Abgeleitetes Schema als Datei (JSON Schema 2020-12)" onclick={schemaLaden}><i class="fa-solid fa-file-export"></i>{#if xml}<span class="nur-breit"> Als JSON Schema</span>{:else} Als JSON Schema{/if}</button>
      {#if xml}
        <button class="knopf primaer" disabled={!blatt.analyse} title="XML Schema (XSD) aus den Daten ableiten und neben das Dokument legen, je Namensraum eine Datei" onclick={() => void xmlSchemaAblegen(blatt)}><i class="fa-solid fa-sitemap"></i> XML Schema ableiten</button>
      {/if}
    </div>
  </div>
  <div class="inhalt">
    {#if !blatt.analyse}
      <p class="an-tafel-fuss an-leer">Das Dokument wird gelesen ...</p>
    {:else if !schema}
      <p class="an-tafel-fuss an-leer">Das Dokument lässt sich so nicht lesen; Struktur braucht ein lesbares Dokument.</p>
    {:else if !schema.typen.length}
      <p class="an-tafel-fuss an-leer">Keine Objekte im Dokument: Es ist {beschreiben(schema.wurzel)}.</p>
    {:else}
      <div class="an-leinwand an-weit" bind:this={leinwand} style="zoom: {z.zoom}">
        {#if wurzelTyp}
          <TypZweig {schema} typ={wurzelTyp} {gewaehlt} onwahl={waehlen} onfeld={feldWaehlen} />
        {:else}
          <div class="an-zweig">
            <div class="an-tk">
              <div class="an-tk-kopf"><i class="fa-solid fa-list w-liste"></i><span class="an-tk-name">Wurzel</span></div>
              <div class="an-tk-felder"><span class="an-tk-feld">$</span><span class="w-liste">{beschreiben(schema.wurzel)}</span><span></span></div>
            </div>
            <div class="an-kinder">
              {#each obersteTypen as t (t.name)}
                <TypZweig {schema} typ={t} {gewaehlt} kante={{ feld: "Einträge", zahl: "0..n" }} onwahl={waehlen} onfeld={feldWaehlen} />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
