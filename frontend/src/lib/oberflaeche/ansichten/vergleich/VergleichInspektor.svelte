<script lang="ts">
  // Inspektor zum Vergleich: gewählter Unterschied (Zeiger, Typ, Vorher, Jetzt; Wert der Gegenseite übernehmen, im Baum
  // zeigen), der JSON Patch zum Kopieren oder Herunterladen und wie abgeglichen wurde.
  import "../ansichten.css";
  import type { NeuerWert } from "../../../kern";
  import { jsonPatch } from "../../../analyse/vergleich/patch";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { herunterladen } from "../../schale/dateien";
  import { anzahl } from "../tabelle/zahlen";
  import { vergleichZustand } from "./vergleichZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(vergleichZustand(blatt));
  const v = $derived(z.vergleich(blatt).vergleich);
  const u = $derived(v?.unterschiede.find((x) => x.pfad === z.gewaehlt) ?? null);
  const patch = $derived(v ? jsonPatch(v.wurzel) : []);
  const patchText = $derived(JSON.stringify(patch, null, 2));
  /** Auf welcher Seite liegt das Blatt: Jetzt, außer die Seiten sind getauscht */
  const blattZeiger = $derived(u ? (z.getauscht ? u.zeigerVorher : u.zeigerJetzt) : null);
  const gegenWert = $derived(u ? (z.getauscht ? u.jetzt : u.vorher) : undefined);

  const typ = (w: unknown): string => (w === undefined ? "fehlt" : w === null ? "Nichts" : Array.isArray(w) ? "Liste" : typeof w === "object" ? "Objekt" : typeof w === "number" ? "Zahl" : typeof w === "boolean" ? "Wahrheitswert" : "Text");
  const zeigen = (w: unknown): string => (w === undefined ? "fehlt" : JSON.stringify(w)?.slice(0, 200) ?? "");
  const alsNeuerWert = (w: unknown): NeuerWert | null =>
    typeof w === "string" ? { art: "text", wert: w } : typeof w === "number" ? { art: "zahl", roh: String(w) } : typeof w === "boolean" ? { art: "wahrheitswert", wert: w } : w === null ? { art: "nichts" } : null;
  const uebernehmbar = $derived(u?.art === "geaendert" && blattZeiger !== null && alsNeuerWert(gegenWert) !== null);

  async function uebernehmen(): Promise<void> {
    const neu = alsNeuerWert(gegenWert);
    if (!neu || blattZeiger === null) return;
    await blatt.ausfuehrenMitMeldung("wert.setzen", { zeiger: blattZeiger, neu }, { ort: "Vergleich" });
  }

  function imBaum(): void {
    if (blattZeiger === null) return;
    blatt.waehlen(blattZeiger);
    blatt.zeigen({ art: "ansicht", kennung: "baum" });
  }

  async function kopieren(): Promise<void> {
    await navigator.clipboard.writeText(patchText);
    meldungen.zeigen({ text: `JSON Patch mit ${anzahl(patch.length)} Vorgängen kopiert`, art: "erfolg" });
  }
</script>

{#if u}
  <div class="karte">
    <div class="karte-titel">Gewählter Unterschied <span class="rechts abzeichen {u.art === 'hinzu' ? 'gut' : u.art === 'weg' ? 'fehler' : 'warn'}">{u.reihenfolge ? "Reihenfolge" : u.art === "geaendert" ? "geändert" : u.art}</span></div>
    <div class="wertfeld an-wertfeld-klein">{u.pfad || "(Wurzel)"}</div>
    <dl class="paare an-oben">
      <dt>Zeiger</dt><dd class="mono">{(z.getauscht ? u.zeigerVorher : u.zeigerJetzt) ?? u.zeigerVorher ?? ""}</dd>
      <dt>Typ</dt><dd>{typ(u.jetzt !== undefined ? u.jetzt : u.vorher)}</dd>
      {#if !u.reihenfolge}
        <dt>Vorher</dt><dd class="mono"><span class="an-alt">{zeigen(u.vorher)}</span></dd>
        <dt>Jetzt</dt><dd class="mono"><span class="an-neu">{zeigen(u.jetzt)}</span></dd>
      {/if}
    </dl>
    <div class="knopf-reihe an-oben">
      {#if uebernehmbar}<button class="knopf" title="Setzt im Dokument den Wert der Gegenseite; gilt sofort, lässt sich rückgängig machen" onclick={() => void uebernehmen()}><i class="fa-solid fa-rotate-left"></i> {z.getauscht ? "Jetzt-Wert" : "Vorher-Wert"} übernehmen</button>{/if}
      {#if blattZeiger !== null}<button class="knopf" onclick={imBaum}><i class="fa-solid fa-folder-tree"></i> Im Baum zeigen</button>{/if}
    </div>
  </div>
{/if}
{#if v}
  <div class="karte">
    <div class="karte-titel">Als JSON Patch <span class="rechts klein">{anzahl(patch.length)} {patch.length === 1 ? "Vorgang" : "Vorgänge"}{patchText.length > 1200 ? ", gekürzt" : ""}</span></div>
    <pre class="wertfeld an-code-block">{patchText.length > 1200 ? `${patchText.slice(0, 1200)}\n...` : patchText}</pre>
    <div class="knopf-reihe an-oben">
      <button class="knopf" disabled={!patch.length} onclick={() => void kopieren()}><i class="fa-solid fa-copy"></i> Kopieren</button>
      <button class="knopf" disabled={!patch.length} onclick={() => herunterladen(`${blatt.name.replace(/\.[^.]+$/, "")}.patch.json`, patchText + "\n", "application/json-patch+json")}><i class="fa-solid fa-download"></i> Herunterladen</button>
    </div>
  </div>
  <div class="karte">
    <div class="karte-titel">Abgleich</div>
    <ul class="vg-abgleich">
      {#each v.paarungen as p (p.muster)}
        <li><span class="mono">{p.muster}</span> <span class="text-3">{p.feld ? "über" : "nach Stelle"}</span>{#if p.feld} <span class="mono">{p.feld}</span>{/if}</li>
      {/each}
    </ul>
    <dl class="paare an-oben">
      <dt>Reihenfolge</dt><dd>{z.optionen.reihenfolgeEgal ? "egal" : "zählt"}</dd>
      <dt>Patch</dt><dd>macht aus Vorher Jetzt</dd>
    </dl>
  </div>
{:else}
  <div class="karte">
    <div class="karte-titel">Vergleich</div>
    <p class="wz-satz">Oben die Gegenseite wählen: ein offenes Dokument, eines aus der Ablage, einen früheren Stand oder eine Datei.</p>
  </div>
{/if}

<style>
  .vg-abgleich {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--a1);
    font-size: var(--klein);
    overflow-wrap: anywhere;
  }
</style>
