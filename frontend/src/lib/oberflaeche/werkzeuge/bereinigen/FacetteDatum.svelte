<script lang="ts">
  // Facette für Datumswerte: Anzahl je Monat ohne Lücken. Ein Klick wählt einen Monat, weitere Klicks erweitern den
  // Zeitraum, ein Klick auf den einzigen gewählten hebt auf. Stehen Datumsangaben in zwei Formen, führt ein Hinweis zu
  // den Typen; nicht lesbare Werte ebenso.
  import { monatsVerteilung } from "../../../analyse/bereinigen/facetten";
  import { vorschlagFuer } from "../../../analyse/bereinigen/typen";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { z, s, name, spalte }: { z: BereinigenZustand; s: Tabellenstand; name: string; spalte: number } = $props();

  const v = $derived(monatsVerteilung(s.tabelle, s.index, s.text, spalte));
  const hoechste = $derived(Math.max(1, ...v.monate.map((m) => m.anzahl)));
  const auswahl = $derived.by(() => {
    const a = z.auswahl(name);
    return a?.art === "monate" ? a : null;
  });
  const imBereich = (m: string): boolean => auswahl !== null && (auswahl.von === null || m >= auswahl.von) && (auswahl.bis === null || m <= auswahl.bis);

  /** Jahre unter den Balken, jedes so breit wie seine Monate */
  const jahre = $derived.by(() => {
    const j: { jahr: string; monate: number }[] = [];
    for (const m of v.monate) {
      const jahr = m.monat.slice(0, 4);
      if (j.at(-1)?.jahr === jahr) j.at(-1)!.monate++;
      else j.push({ jahr, monate: 1 });
    }
    return j;
  });

  const formen = $derived.by(() => {
    const t = vorschlagFuer(s.tabelle, s.index, s.text, spalte);
    return t?.art === "datum" && t.aenderungen.length ? { iso: t.bleiben, anders: t.aenderungen.length } : null;
  });

  function klicken(m: string): void {
    if (!auswahl) z.auswahlSetzen(name, { art: "monate", von: m, bis: m });
    else if (auswahl.von === m && auswahl.bis === m) z.auswahlSetzen(name, null);
    else z.auswahlSetzen(name, { art: "monate", von: auswahl.von === null || m < auswahl.von ? m : auswahl.von, bis: auswahl.bis === null || m > auswahl.bis ? m : auswahl.bis });
  }
</script>

{#if auswahl}
  <div class="br-facette-unter">Gewählt <span class="mono">{auswahl.von ?? "Anfang"}</span> bis <span class="mono">{auswahl.bis ?? "Ende"}</span></div>
{/if}
{#if v.monate.length}
  <div class="br-monate" role="group" aria-label="Anzahl je Monat, {v.monate[0].monat} bis {v.monate.at(-1)?.monat}">
    {#each v.monate as m (m.monat)}
      <button class:br-in={imBereich(m.monat)} style="height: {m.anzahl ? Math.max(4, (m.anzahl / hoechste) * 100) : 0}%" title="{m.monat}: {anzahl(m.anzahl)}" aria-label={m.monat} onclick={() => klicken(m.monat)}></button>
    {/each}
  </div>
  {#if v.monate.length === 1}
    <div class="br-facette-unter">Alle {anzahl(v.monate[0].anzahl)} Werte im Monat <span class="mono">{v.monate[0].monat}</span></div>
  {/if}
  <div class="br-achse" style="grid-template-columns: {jahre.map((j) => `minmax(0, ${j.monate}fr)`).join(' ')}">
    {#each jahre as j (j.jahr)}<span>{j.monate >= 3 ? j.jahr : ""}</span>{/each}
  </div>
{:else}
  <p class="br-facette-unter">Keine lesbaren Datumsangaben.</p>
{/if}
{#if formen}
  <button class="br-hinweis" onclick={() => z.typenZeigen(name)}><i class="fa-solid fa-calendar-days"></i><span>Zwei Formen gelesen: {anzahl(formen.iso)} als JJJJ-MM-TT, {anzahl(formen.anders)} als TT.MM.JJJJ. Vereinheitlichen</span></button>
{/if}
{#if v.unlesbar}
  <button class="br-hinweis" onclick={() => z.typenZeigen(name)}><i class="fa-solid fa-triangle-exclamation"></i><span>{v.unlesbar === 1 ? "1 Wert kein Datum, er fehlt" : `${anzahl(v.unlesbar)} Werte kein Datum, sie fehlen`} hier. Ansehen</span></button>
{/if}
