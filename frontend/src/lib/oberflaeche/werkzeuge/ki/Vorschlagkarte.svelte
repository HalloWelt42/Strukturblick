<script lang="ts">
  // Vorschlag der KI als Vorschau (entwuerfe/ki.html): Ergebnis und Erklärung nebeneinander, darunter der Probelauf und
  // die Knöpfe. Nichts ist übernommen, bevor der Mensch klickt; Anders vorschlagen fragt mit dem vorigen Vorschlag neu.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { abfrage } from "../../../zustand/abfrage.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { ki } from "../../../zustand/ki.svelte";
  import { aufgabe, SPRACH_NAME } from "../../../analyse/ki/aufgaben";
  import { testdatenZustand } from "../testdaten/testdatenZustand.svelte";
  import type { KiZustand } from "./kiZustand.svelte";
  import { sicheresHtml } from "./markdown";
  import Probelaufanzeige from "./Probelaufanzeige.svelte";
  import Spezifikationsvorschlag from "./Spezifikationsvorschlag.svelte";

  let { blatt, z }: { blatt: Arbeitsblatt; z: KiZustand } = $props();
  const v = $derived(z.vorschlag);
  const p = $derived(z.probe);
  const art = $derived(z.fuer ? aufgabe(z.fuer.aufgabe).ergebnis : "markdown");
  const stamm = $derived(blatt.name.replace(/\.schema\.json$/, "").replace(/\.[^.]+$/, ""));
  const sekunden = (ms: number): string => `${(ms / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`;
  /** Was übernommen oder kopiert wird: der gelesene Ausdruck oder das eingerückte JSON, sonst der Text */
  const ergebnisText = $derived(p?.art === "abfrage" ? p.ausdruck : p?.art === "schema" ? p.text : p?.art === "beschreibung" ? p.vergleich.text : (v?.ergebnis ?? ""));

  async function kopieren(): Promise<void> {
    try {
      await navigator.clipboard.writeText(ergebnisText);
      meldungen.zeigen({ text: "Kopiert", art: "erfolg" });
    } catch {
      meldungen.zeigen({ text: "Der Browser erlaubt das Kopieren hier nicht", art: "fehler" });
    }
  }

  async function alsDokument(name: string, text: string): Promise<void> {
    await arbeitsplatz.neu(name, text, blatt.ordner, { art: "ansicht", kennung: "baum" });
    meldungen.zeigen({ text: `${name} angelegt`, art: "erfolg" });
  }

  async function ergebnisAlsDokument(): Promise<void> {
    if (p?.art !== "abfrage") return;
    abfrage.uebernehmen(p.sprache, p.ausdruck);
    await abfrage.alsDokument(p.sprache === "sql");
  }

  function inTestdaten(): void {
    if (p?.art !== "testdaten") return;
    testdatenZustand(blatt).uebernehmen(p.vorschlag.spezifikation);
    blatt.zeigen({ art: "werkzeug", kennung: "testdaten" });
    const n = p.vorschlag.geaendert.length;
    meldungen.zeigen({ text: `Spezifikation übernommen, ${n} ${n === 1 ? "Feld" : "Felder"} geändert; Zurücksetzen holt die alte zurück`, art: "erfolg" });
  }
</script>

<section class="karte" aria-live="polite">
  <div class="ki-karte-kopf">
    <h2>Vorschlag</h2>
    <span class="abzeichen zweit">Vorschau, noch nichts übernommen</span>
    {#if v}
      <div class="rechts">
        <span class="ki-modell"><i class="fa-solid fa-microchip"></i> {ki.modellname(v.modell)} über die Leitstelle</span>
        <span class="ki-modell"><i class="fa-solid fa-stopwatch"></i> <span class="mono">{sekunden(v.dauer_ms)}</span></span>
      </div>
    {/if}
  </div>

  {#if z.laeuft}
    <div class="ki-wartet"><i class="fa-solid fa-spinner fa-spin-pulse"></i><span>{z.vorschlag ? "Fragt nach einem anderen Vorschlag ..." : "Die Leitstelle rechnet; lädt das Modell erst, kann es etwas dauern."}</span></div>
  {/if}
  {#if z.fehler}
    <div class="wz-band"><i class="fa-solid fa-triangle-exclamation"></i><span>{z.fehler}</span></div>
  {/if}

  {#if v && !z.laeuft}
    <div class="ki-vorschlag" class:eins={!v.erklaerung.length || p?.art === "testdaten"}>
      <div>
        {#if art === "markdown"}
          <div class="ki-unterkopf">Antwort</div>
          <!-- Nur Absätze, Listen und Code; Links und Skripte entfernt (markdown.ts) -->
          <div class="ki-artikel">{@html sicheresHtml(v.ergebnis)}</div>
        {:else}
          <div class="ki-unterkopf">
            {p?.art === "abfrage" ? SPRACH_NAME[p.sprache] : p?.art === "testdaten" ? "Spezifikation" : "JSON Schema"}
            {#if p?.art === "abfrage"}
              <span class="rechts">
                {#if p.liestNur}<span class="abzeichen gut"><i class="fa-solid fa-circle-check"></i> liest nur</span>
                {:else}<span class="abzeichen warn" title="Die Probe rechnet auf einer Kopie; das Dokument bleibt">würde schreiben</span>{/if}
              </span>
            {/if}
          </div>
          {#if p?.art === "testdaten"}<Spezifikationsvorschlag vorschlag={p.vorschlag} />{:else}<pre class="ki-code">{ergebnisText}</pre>{/if}
        {/if}
      </div>
      {#if v.erklaerung.length}
        <div>
          <div class="ki-unterkopf">Erklärung</div>
          <ol class="ki-erklaerung">{#each v.erklaerung as satz, i (i)}<li>{satz}</li>{/each}</ol>
        </div>
      {/if}
    </div>

    {#if p}<Probelaufanzeige {p} name={blatt.name} />{/if}

    <div class="ki-aktionen">
      {#if p?.art === "abfrage"}
        <button class="knopf primaer" disabled={!p.ausgang?.ok} onclick={() => z.inAbfrage()}><i class="fa-solid fa-terminal"></i> In Abfrage übernehmen</button>
        <button class="knopf" disabled={!p.ausgang?.ok} onclick={() => void ergebnisAlsDokument()}><i class="fa-solid fa-file-circle-plus"></i> Ergebnis als neues Dokument</button>
      {:else if p?.art === "schema"}
        <button class="knopf primaer" onclick={() => void alsDokument(`${stamm}.schema.json`, p.text)}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
      {:else if p?.art === "beschreibung"}
        <button class="knopf primaer" onclick={() => void alsDokument(`${stamm}.beschrieben.schema.json`, p.vergleich.text)}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
      {:else if p?.art === "testdaten"}
        <button class="knopf primaer" onclick={inTestdaten}><i class="fa-solid fa-dice"></i> In Testdaten übernehmen</button>
      {:else if p?.art === "text"}
        <button class="knopf" onclick={() => void alsDokument(`${stamm}-erklaerung.md`, v.ergebnis)}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
      {/if}
      {#if p?.art !== "testdaten"}
        <button class="knopf" onclick={() => void kopieren()}><i class="fa-solid fa-copy"></i> {p?.art === "abfrage" ? `${SPRACH_NAME[p.sprache]} kopieren` : "Kopieren"}</button>
      {/if}
      <span class="rechts">
        <button class="knopf" onclick={() => void z.fragen(blatt, true)}><i class="fa-solid fa-rotate"></i> Anders vorschlagen</button>
        <button class="knopf still" onclick={() => z.verwerfen()}><i class="fa-solid fa-xmark"></i> Verwerfen</button>
      </span>
    </div>
    <p class="ki-hinweis"><i class="fa-solid fa-hand-pointer"></i><span>Nichts wird übernommen, bevor du klickst.{p && p.art !== "text" ? " Der Probelauf liest nur," : ""} {blatt.name} bleibt unverändert.</span></p>
  {/if}
</section>
