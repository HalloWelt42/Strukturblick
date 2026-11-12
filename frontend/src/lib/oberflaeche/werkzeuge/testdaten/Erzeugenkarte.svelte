<script lang="ts">
  // Karte "Erzeugen" (entwuerfe/testdaten.html): Anzahl, Startwert, Zielformat, Trennzeichen bei CSV und Name; darunter
  // der Lauf in Blöcken mit Anhalten und Fortsetzen. Das Ergebnis geht als neues Dokument in die Ablage oder als Datei.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { TRENNZEICHEN, ZIELFORMATE } from "../../../analyse/testdaten/auftrag";
  import { herunterladen } from "../../schale/dateien";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { ANZAHL_HOECHSTENS, type TestdatenZustand } from "./testdatenZustand.svelte";

  let { blatt, z }: { blatt: Arbeitsblatt; z: TestdatenZustand } = $props();

  const l = $derived(z.lauf);
  const bloecke = $derived(l ? Math.ceil(l.gesamt / l.blockGroesse) : 0);
  const block = $derived(l ? Math.min(bloecke, Math.floor(l.erzeugt / l.blockGroesse) + (l.erzeugt < l.gesamt ? 1 : 0)) : 0);
  const anteil = $derived(l ? Math.round((l.erzeugt / l.gesamt) * 100) : 0);
  const fertig = $derived(l !== null && l.erzeugt >= l.gesamt);
  const rest = $derived(l && l.erzeugt > 0 && !fertig ? Math.max(1, Math.round(((l.dauer / l.erzeugt) * (l.gesamt - l.erzeugt)) / 1000)) : null);
  const trennName = $derived(TRENNZEICHEN.find((t) => t.wert === z.trennzeichen)?.titel ?? "");

  function zahlLesen(e: Event, setzen: (n: number) => void): void {
    const n = Number((e.currentTarget as HTMLInputElement).value.replace(/\./g, "").trim());
    if (Number.isFinite(n)) setzen(Math.trunc(n));
    z.verwerfen();
  }

  /** Neuer Startwert gewürfelt (nur hier Zufall ohne Startwert: er wählt den Startwert selbst) */
  function wuerfeln(): void {
    z.startwert = Math.floor(Math.random() * 99_999) + 1;
    z.verwerfen();
  }

  async function alsDokument(): Promise<void> {
    if (!l) return;
    const name = z.dateiname(blatt);
    await arbeitsplatz.neu(name, z.ergebnis(), blatt.ordner, { art: "ansicht", kennung: "tabelle" });
    meldungen.zeigen({ text: `Neues Dokument ${name} mit ${anzahl(l.erzeugt)} Datensätzen`, art: "erfolg" });
  }

  function alsDatei(): void {
    herunterladen(z.dateiname(blatt), z.ergebnis());
  }
</script>

<section class="karte">
  <div class="td-karte-kopf"><h2>Erzeugen</h2></div>
  <div class="td-reihe">
    <label class="td-angabe schmal" title="Wie viele Datensätze entstehen (bis {anzahl(ANZAHL_HOECHSTENS)})">
      <span class="td-angabe-titel">Anzahl</span>
      <span class="feld"><input inputmode="numeric" value={z.anzahl} onchange={(e) => zahlLesen(e, (n) => (z.anzahl = Math.max(1, Math.min(ANZAHL_HOECHSTENS, n))))} /></span>
    </label>
    <label class="td-angabe schmal" title="Gleicher Startwert, gleiche Daten">
      <span class="td-angabe-titel">Startwert</span>
      <span class="feld"><button class="td-wuerfel" title="Neuen Startwert würfeln" aria-label="Neuen Startwert würfeln" onclick={wuerfeln}><i class="fa-solid fa-dice"></i></button><input inputmode="numeric" value={z.startwert} onchange={(e) => zahlLesen(e, (n) => (z.startwert = n))} /></span>
    </label>
    <div class="td-angabe">
      <span class="td-angabe-titel">Zielformat</span>
      <nav class="segment" aria-label="Zielformat">
        {#each ZIELFORMATE as f (f.kennung)}<button class:aktiv={z.ziel === f.kennung} onclick={() => (z.ziel = f.kennung)}>{f.name}</button>{/each}
      </nav>
    </div>
    {#if z.ziel === "csv"}
      <div class="td-angabe">
        <span class="td-angabe-titel">Trennzeichen</span>
        <nav class="segment" aria-label="Trennzeichen">
          {#each TRENNZEICHEN as t (t.wert)}<button class:aktiv={z.trennzeichen === t.wert} onclick={() => (z.trennzeichen = t.wert)}>{t.titel}</button>{/each}
        </nav>
      </div>
    {/if}
    <label class="td-angabe breit" title="Name des neuen Dokuments oder der Datei; leer: aus dem Dokumentnamen">
      <span class="td-angabe-titel">Name</span>
      <span class="feld"><input bind:value={z.name} placeholder={z.dateiname(blatt)} spellcheck="false" /></span>
    </label>
  </div>
  <p class="td-hinweis">
    <i class="fa-solid fa-dice"></i>
    <span>Gleicher Startwert, gleiche Daten: mit {z.startwert} entstehen jedes Mal genau diese {anzahl(z.anzahl)} Datensätze.{z.ziel === "csv" ? ` Trennzeichen ${trennName}.` : ""}</span>
  </p>
  <div class="td-lauf">
    {#if l}
      <div class="td-lauf-kopf">
        <strong>{fertig ? "Fertig" : `Block ${block} von ${bloecke}`}</strong>
        <span class="text-3 klein">{anzahl(l.erzeugt)} von {anzahl(l.gesamt)} Datensätzen, je Block {anzahl(l.blockGroesse)}</span>
        <span class="rechts">{anteil} %</span>
      </div>
      <div class="td-bloecke" role="progressbar" aria-valuenow={anteil} aria-valuemin={0} aria-valuemax={100} aria-label="Fortschritt">
        {#each Array.from({ length: bloecke }, (_, i) => i) as i (i)}
          {@const voll = Math.min(1, Math.max(0, (l.erzeugt - i * l.blockGroesse) / Math.min(l.blockGroesse, l.gesamt - i * l.blockGroesse)))}
          <span class:fertig={voll >= 1} class:laeuft={voll > 0 && voll < 1} style="--anteil: {Math.round(voll * 100)}%"></span>
        {/each}
      </div>
    {/if}
    <div class="td-aktionen">
      {#if l?.laeuft}
        <button class="knopf" onclick={() => z.halten()}><i class="fa-solid fa-pause"></i> Anhalten</button>
        {#if rest !== null}<span class="text-3 klein">Fertig in etwa {rest} s</span>{/if}
      {:else if l && !fertig}
        <button class="knopf" onclick={() => void z.weiter()}><i class="fa-solid fa-play"></i> Fortsetzen</button>
        <span class="text-3 klein">Angehalten; das Bisherige lässt sich schon nehmen</span>
      {:else}
        <button class="knopf primaer" onclick={() => void z.starten(blatt)}><i class="fa-solid fa-wand-magic-sparkles"></i> {fertig ? "Neu erzeugen" : "Erzeugen"}</button>
      {/if}
      <span class="rechts">
        <button class="knopf" class:primaer={fertig} disabled={!l || l.laeuft || l.erzeugt === 0} title={l?.laeuft ? "Bereit nach dem letzten Block oder nach Anhalten" : "Das Ergebnis als neues Dokument in der Ablage"} onclick={() => void alsDokument()}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
        <button class="knopf" disabled={!l || l.laeuft || l.erzeugt === 0} title="Das Ergebnis als Datei {z.dateiname(blatt)}" onclick={alsDatei}><i class="fa-solid fa-download"></i> Herunterladen</button>
      </span>
    </div>
  </div>
</section>
