<script lang="ts">
  // SQL-Ergebnis im Hauptbereich (Entwurf entwuerfe/abfrage-sql.html): Kopf mit Zeilenzahl, Frische und Aktionen,
  // darunter die Tabelle. Die letzte Zahlenspalte bekommt Balken zum Vergleich, wenn alle Werte nicht negativ sind.
  import { abfrage, ABFRAGE_GRENZEN, type Tabellenergebnis, type Zellwert } from "../../zustand/abfrage.svelte";
  import ExportMenue from "../bausteine/ExportMenue.svelte";

  let {
    ergebnis,
    dauer,
    veraltet,
    onalsdokument,
    onmerken,
  }: {
    ergebnis: Tabellenergebnis;
    dauer: number;
    veraltet: boolean;
    onalsdokument: (alsTabelle: boolean) => void;
    onmerken: () => void;
  } = $props();

  const zahl = new Intl.NumberFormat("de-DE");
  const istZahl = (art: string) => art === "Ganzzahl" || art === "Zahl";
  const balkenSpalte = $derived.by(() => {
    for (let i = ergebnis.spalten.length - 1; i >= 0; i--) {
      if (istZahl(ergebnis.spalten[i].art) && ergebnis.zeilen.every((z) => z[i] === null || (z[i] as number) >= 0)) return i;
    }
    return -1;
  });
  const hoechst = $derived(balkenSpalte < 0 ? 0 : Math.max(0, ...ergebnis.zeilen.map((z) => (z[balkenSpalte] as number | null) ?? 0)));
  const zeige = (w: Zellwert): string => (w === null ? "" : String(w));
</script>

<div class="werkzeugzeile">
  <div class="af-zeilenkopf">
    <span class="af-titel">{ergebnis.anzahl === 1 ? "1 Zeile" : `${zahl.format(ergebnis.anzahl)} Zeilen`}</span>
    {#if veraltet}
      <span class="abzeichen warn"><i class="fa-solid fa-clock-rotate-left"></i> veraltet</span>
    {:else}
      <span class="abzeichen gut"><i class="fa-solid fa-bolt"></i> aktuell, {Math.round(dauer)} ms</span>
    {/if}
    <span class="af-ort" title="Die Abfrage läuft in diesem Browser, nichts geht an einen Server"><i class="fa-solid fa-microchip"></i><span class="af-breit">rechnet im Browser</span></span>
    <span class="rechts">
      <button class="knopf" onclick={() => onalsdokument(true)}><i class="fa-solid fa-file-circle-plus"></i><span class="af-breit">Als neues Dokument</span></button>
      <ExportMenue rechtsbuendig holen={(f) => abfrage.ganzerText(f)} dateiname={(f) => abfrage.dateiname(f)} />
      <button class="knopf" title="In den Abfragen-Verlauf" onclick={onmerken}><i class="fa-solid fa-bookmark"></i><span class="af-breit">In den Verlauf</span></button>
    </span>
  </div>
</div>

<div class="inhalt">
  {#if ergebnis.spalten.length}
    <table class="af-tabelle">
      <thead>
        <tr>
          <th class="idx"></th>
          {#each ergebnis.spalten as s, i (i)}
            <th class:zahl={istZahl(s.art)}>{s.name} <span class="af-typ">{s.art}</span></th>
          {/each}
          {#if balkenSpalte >= 0}<th class="af-anteil">{ergebnis.spalten[balkenSpalte].name} im Vergleich</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each ergebnis.zeilen as z, n (n)}
          <tr>
            <td class="idx">{n + 1}</td>
            {#each z as w, i (i)}
              <td class:zahl={typeof w === "number"}>{zeige(w)}{#if typeof w === "string" && w !== w.trimEnd()}<span class="af-leer" title="Leerzeichen am Ende">␣</span>{/if}</td>
            {/each}
            {#if balkenSpalte >= 0}
              <td class="af-anteil"><span class="af-balken"><span style="width: {hoechst > 0 ? Math.round((((z[balkenSpalte] as number | null) ?? 0) / hoechst) * 100) : 0}%"></span></span></td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
    {#if ergebnis.anzahl > ergebnis.zeilen.length}
      <p class="mehr text-3">Die ersten {zahl.format(ABFRAGE_GRENZEN.zeilen)} von {zahl.format(ergebnis.anzahl)} Zeilen; alle mit "Als neues Dokument".</p>
    {/if}
  {:else}
    <p class="mehr text-3">Die Abfrage liefert keine Spalten.</p>
  {/if}
</div>

<style>
  /* Zu viel für eine Zeile: die Knöpfe rutschen in die nächste, wie in jeder Werkzeugzeile */
  .af-zeilenkopf {
    flex-wrap: wrap;
  }
  .mehr {
    margin: 0;
    padding: var(--a3);
  }
</style>
