<script lang="ts">
  // Eine Einstellung eines Erzeugers bearbeiten, je nach Art: Zahl, Text, Datum (eigenes Feld JJJJ-MM-TT, kein
  // Datumswähler des Browsers), Wahl als Segment und Werte mit Gewicht als Zeilen "Wert=Gewicht".
  import type { Einstellung, Einstellwert, Gewichtet } from "../../../analyse/testdaten/erzeuger";

  let { e, wert, onsetzen }: { e: Einstellung; wert: Einstellwert; onsetzen: (w: Einstellwert) => void } = $props();

  const alsZeilen = (w: Einstellwert): string => (Array.isArray(w) ? (w as readonly Gewichtet[]).map((g) => `${g.wert}=${g.gewicht}`).join("\n") : "");
  let datumFehler = $state(false);

  function zahl(ev: Event): void {
    // Mit Komma deutsch (1.087,15), sonst wie geschrieben (0.5)
    const eingabe = (ev.currentTarget as HTMLInputElement).value.trim();
    const roh = eingabe.includes(",") ? eingabe.replace(/\./g, "").replace(",", ".") : eingabe;
    const n = Number(roh);
    if (roh === "" || !Number.isFinite(n) || e.art.art !== "zahl") return;
    const a = e.art;
    onsetzen(Math.min(a.max ?? Infinity, Math.max(a.min ?? -Infinity, a.ganz ? Math.round(n) : n)));
  }

  function datum(ev: Event): void {
    const roh = (ev.currentTarget as HTMLInputElement).value.trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(roh) ?? /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(roh);
    if (!m) return void (datumFehler = true);
    const iso = roh.includes("-") ? roh : `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    datumFehler = Number.isNaN(Date.parse(iso));
    if (!datumFehler) onsetzen(iso);
  }

  function werte(ev: Event): void {
    const zeilen = (ev.currentTarget as HTMLTextAreaElement).value.split("\n").map((z) => z.trim()).filter(Boolean);
    onsetzen(zeilen.map((z) => {
      const i = z.lastIndexOf("=");
      const g = i > 0 ? Number(z.slice(i + 1).trim()) : Number.NaN;
      return Number.isFinite(g) && g >= 0 ? { wert: z.slice(0, i).trim(), gewicht: g } : { wert: z, gewicht: 1 };
    }));
  }
</script>

<div class="td-einstellung" title={e.erklaerung}>
  <span class="td-einstellung-titel">{e.titel}</span>
  {#if e.art.art === "wahl"}
    <nav class="segment td-segment" aria-label={e.titel}>
      {#each e.art.werte as w (w.wert)}<button class:aktiv={wert === w.wert} onclick={() => onsetzen(w.wert)}>{w.titel}</button>{/each}
    </nav>
  {:else if e.art.art === "werte"}
    <textarea class="td-werte mono" rows="5" spellcheck="false" aria-label={e.titel} onchange={werte}>{alsZeilen(wert)}</textarea>
  {:else if e.art.art === "datum"}
    <span class="feld" class:fehler={datumFehler}><input class="mono" value={String(wert)} placeholder="JJJJ-MM-TT" spellcheck="false" aria-label={e.titel} onchange={datum} /></span>
  {:else if e.art.art === "zahl"}
    <span class="feld"><input class="mono" inputmode="decimal" value={String(wert)} aria-label={e.titel} onchange={zahl} /></span>
  {:else}
    <span class="feld"><input class="mono" value={String(wert)} spellcheck="false" aria-label={e.titel} onchange={(ev) => onsetzen((ev.currentTarget as HTMLInputElement).value)} /></span>
  {/if}
  <span class="td-einstellung-hilfe">{e.erklaerung}</span>
</div>
