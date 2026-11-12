<script lang="ts">
  // Probelauf eines Vorschlags: Abfrageergebnis (die ersten Zeilen oder Werte), Prüfung des Dokuments gegen ein Schema,
  // Zahl der Beschreibungen, fünf erzeugte Datensätze; dazu, was das Modell erfunden hat.
  import { jsonText } from "../../../kern/json";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import type { Probe } from "./probelauf";

  let { p, name }: { p: Probe; name: string } = $props();
  const ZEIGEN = 5;
  const zelle = (w: unknown): string => (w === null ? "NULL" : String(w));
</script>

{#if p.art !== "text"}
  <div class="ki-probelauf">
    {#if p.art === "abfrage"}
      {@const a = p.ausgang}
      {#if !a}
        <div class="ki-unterkopf">Probelauf</div>
        <p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>Der Probelauf ließ sich nicht starten.</span></p>
      {:else if !a.ok}
        <div class="ki-unterkopf">Probelauf <span class="rechts"><span class="abzeichen fehler">Fehler</span></span></div>
        <p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{a.fehler.meldung} Anders vorschlagen fragt neu.</span></p>
      {:else if a.ergebnis.art === "tabelle"}
        {@const t = a.ergebnis}
        <div class="ki-unterkopf">Probelauf <span class="rechts"><span class="mono">{anzahl(t.anzahl)} {t.anzahl === 1 ? "Zeile" : "Zeilen"}</span><span class="text-3">{Math.round(a.dauer)} ms</span></span></div>
        {#if t.zeilen.length}
          <div class="ki-tabelle-feld">
            <table class="ki-tabelle">
              <thead><tr>{#each t.spalten as s, i (i)}<th>{s.name}</th>{/each}</tr></thead>
              <tbody>
                {#each t.zeilen.slice(0, ZEIGEN) as z, i (i)}<tr>{#each z as w, j (j)}<td class:zahl={typeof w === "number" || typeof w === "bigint"}>{zelle(w)}</td>{/each}</tr>{/each}
              </tbody>
            </table>
          </div>
        {:else}<p class="ki-hinweis"><i class="fa-solid fa-circle-info"></i><span>Keine Zeile trifft zu.</span></p>{/if}
      {:else if a.ergebnis.art === "werte"}
        {@const w = a.ergebnis}
        <div class="ki-unterkopf">Probelauf <span class="rechts"><span class="mono">{anzahl(w.anzahl)} {w.anzahl === 1 ? "Wert" : "Werte"}</span><span class="text-3">{Math.round(a.dauer)} ms</span></span></div>
        {#if w.stuecke.length}<pre class="ki-code umbrechen">{w.stuecke.slice(0, ZEIGEN).map((s) => s.text).join("\n")}</pre>
        {:else}<p class="ki-hinweis"><i class="fa-solid fa-circle-info"></i><span>Kein Wert trifft zu.</span></p>{/if}
      {/if}
    {:else if p.art === "schema"}
      <div class="ki-unterkopf">Probelauf</div>
      {#if !p.pruefung}
        <p class="ki-hinweis"><i class="fa-solid fa-circle-info"></i><span>{name} lässt sich nicht mit JSON Schema prüfen; das Schema steht für sich.</span></p>
      {:else if !p.pruefung.ok}
        <p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{p.pruefung.fehler}</span></p>
      {:else if !p.pruefung.befunde.length}
        <p class="ki-hinweis"><i class="fa-solid fa-circle-check"></i><span>{name} passt zu diesem Schema.</span></p>
      {:else}
        <p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{anzahl(p.pruefung.befunde.length)} {p.pruefung.befunde.length === 1 ? "Befund" : "Befunde"} in {name}{p.pruefung.befunde.length > 1 ? ", etwa" : ""}:</span></p>
        <ul class="ki-erklaerung">{#each p.pruefung.befunde.slice(0, ZEIGEN) as b, i (i)}<li><code>{b.zeiger || "/"}</code> {b.meldung}</li>{/each}</ul>
      {/if}
    {:else if p.art === "beschreibung"}
      <div class="ki-unterkopf">Probelauf</div>
      <p class="ki-hinweis"><i class="fa-solid fa-tags"></i><span>{p.vergleich.vorher} Beschreibungen vorher, {p.vergleich.nachher} nachher.{p.vergleich.dazu.length || p.vergleich.weg.length ? "" : " Felder und Typen unverändert."}</span></p>
    {:else if p.art === "testdaten"}
      <div class="ki-unterkopf">Probelauf <span class="rechts"><span class="mono">{p.vorschlag.geaendert.length} {p.vorschlag.geaendert.length === 1 ? "Feld" : "Felder"} geändert</span><span class="text-3">{ZEIGEN} Datensätze, Startwert 4711</span></span></div>
      <pre class="ki-code umbrechen">{p.proben.map((d) => jsonText(d)).join("\n")}</pre>
    {:else if p.art === "fehler"}
      <div class="ki-unterkopf">Probelauf <span class="rechts"><span class="abzeichen fehler">Fehler</span></span></div>
      <p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{p.meldung} Anders vorschlagen fragt neu.</span></p>
    {/if}
    {#if "hinweise" in p}
      {#each p.hinweise as h, i (i)}<p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{h}</span></p>{/each}
    {/if}
  </div>
{/if}
