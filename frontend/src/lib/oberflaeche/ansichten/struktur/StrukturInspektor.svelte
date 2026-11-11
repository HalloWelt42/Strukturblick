<script lang="ts">
  // Inspektor der Struktur: der gewählte Typ (Vorkommen, Felder, Schlüssel, woher der Name kommt), sein Ausschnitt als
  // JSON Schema zum Kopieren und das ganze Schema zum Herunterladen, dazu was abgeleitet wurde.
  import { musterJq, teileVon, zeigerVon } from "../../../kern/pfade";
  import { alsJsonSchema, typAlsJsonSchema } from "../../../analyse/schema";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { herunterladen } from "../../schale/dateien";
  import { anzahl } from "../tabelle/zahlen";
  import { strukturZustand } from "./strukturZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(strukturZustand(blatt));
  const schema = $derived(z.schema(blatt));
  const typ = $derived(schema?.typen.find((t) => t.name === z.typ) ?? schema?.typen[0] ?? null);
  const ausschnitt = $derived(typ ? JSON.stringify({ [typ.name]: typAlsJsonSchema(typ) }, null, 2) : "");
  const pfad = $derived(typ && blatt.analyse?.index ? musterJq(teileVon(blatt.analyse.index, blatt.analyseText, typ.erster)) : "");
  const felderGesamt = $derived(schema?.typen.reduce((n, t) => n + t.felder.length, 0) ?? 0);
  const QUELLE = { wurzel: "die Wurzel des Dokuments", schluessel: "aus dem Schlüssel abgeleitet", liste: "aus dem Listennamen abgeleitet" } as const;

  async function kopieren(): Promise<void> {
    try {
      await navigator.clipboard.writeText(ausschnitt);
      meldungen.zeigen({ text: `Schema von ${typ?.name} kopiert`, art: "erfolg" });
    } catch {
      meldungen.zeigen({ text: "Kopieren ging nicht: Der Browser erlaubt hier keinen Zugriff auf die Zwischenablage.", art: "fehler" });
    }
  }

  function alsTabelle(): void {
    const index = blatt.analyse?.index;
    if (!typ || !index) return;
    blatt.waehlen(zeigerVon(index, blatt.analyseText, typ.erster));
    blatt.zeigen({ art: "ansicht", kennung: "tabelle" });
  }
</script>

{#if schema && typ}
  <div class="karte">
    <div class="karte-titel">Gewählter Typ <span class="rechts abzeichen">Objekt</span></div>
    <div class="wertfeld">{typ.name}</div>
    <dl class="paare an-oben">
      <dt>Vorkommen</dt><dd>{#if typ.pfad === ""}einmal, als Wurzel{:else}{anzahl(typ.vorkommen)}, in <span class="mono">{pfad}</span>{/if}</dd>
      <dt>Felder</dt><dd>{typ.felder.length}, davon {typ.felder.filter((f) => f.pflicht).length} in jedem Eintrag</dd>
      {#if typ.felder.some((f) => f.schluessel)}<dt>Schlüssel</dt><dd><span class="mono">{typ.felder.find((f) => f.schluessel)?.name}</span>, eindeutig</dd>{/if}
      <dt>Name</dt><dd>{QUELLE[typ.namensquelle]}</dd>
    </dl>
    {#if typ.pfad !== ""}
      <div class="knopf-reihe an-oben"><button class="knopf" onclick={alsTabelle}><i class="fa-solid fa-table"></i> Als Tabelle</button></div>
    {/if}
  </div>
  <div class="karte">
    <div class="karte-titel">Als JSON Schema <span class="rechts klein">Ausschnitt</span></div>
    <pre class="wertfeld an-code-block">{ausschnitt}</pre>
    <div class="knopf-reihe an-oben">
      <button class="knopf" onclick={() => void kopieren()}><i class="fa-solid fa-copy"></i> Kopieren</button>
      <button class="knopf" title="Ganzes Schema als Datei" onclick={() => herunterladen(`${blatt.name.replace(/\.[^.]+$/, "")}.schema.json`, JSON.stringify(alsJsonSchema(schema, blatt.name), null, 2) + "\n")}><i class="fa-solid fa-download"></i> Herunterladen</button>
    </div>
  </div>
  <div class="karte">
    <div class="karte-titel">Abgeleitet</div>
    <dl class="paare">
      <dt>Typen</dt><dd>{anzahl(schema.typen.length)}</dd>
      <dt>Felder</dt><dd>{anzahl(felderGesamt)}</dd>
      <dt>Grundlage</dt><dd>alle {anzahl(schema.knoten)} Knoten</dd>
    </dl>
  </div>
{:else}
  <div class="karte"><p class="an-tafel-fuss">Ohne Objekte im Dokument gibt es keine Typen.</p></div>
{/if}
