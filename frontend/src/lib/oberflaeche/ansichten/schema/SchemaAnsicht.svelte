<script lang="ts">
  // Ansicht Schema (STB-39): Übersicht eines XML Schemas in drei Reitern. Elementbaum (was im Dokument wo stehen darf),
  // Typen (alle benannten, mit Ableitung und Verwendung) und Statistik. Importe und Includes kommen aus dem Ordner des
  // Dokuments in der Ablage; was fehlt, sagt das Hinweisband. Die Ansicht erscheint nur bei XML-Schema-Dokumenten.
  import "../ansichten.css";
  import "./schema.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../tabelle/zahlen";
  import { schemaZustand, type Reiter, type Typfilter } from "./schemaZustand.svelte";
  import SchemaBaum from "./SchemaBaum.svelte";
  import SchemaStatistik from "./SchemaStatistik.svelte";
  import SchemaTypen from "./SchemaTypen.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(schemaZustand(blatt));
  const u = $derived(z.uebersicht(blatt));

  $effect(() => {
    void z.nachbarnLaden(blatt);
  });

  const REITER: readonly { kennung: Reiter; titel: string; symbol: string }[] = [
    { kennung: "baum", titel: "Elementbaum", symbol: "fa-sitemap" },
    { kennung: "typen", titel: "Typen", symbol: "fa-shapes" },
    { kennung: "statistik", titel: "Statistik", symbol: "fa-chart-simple" },
  ];
  const FILTER: readonly { kennung: Typfilter; titel: string; erklaerung: string }[] = [
    { kennung: "alle", titel: "Alle", erklaerung: "Alle benannten Typen" },
    { kennung: "komplex", titel: "Komplex", erklaerung: "Typen mit Kind-Elementen oder Attributen" },
    { kennung: "einfach", titel: "Einfach", erklaerung: "Typen für Text und Werte" },
    { kennung: "werte", titel: "Mit Werten", erklaerung: "Typen mit einer festen Liste erlaubter Werte (Aufzählung)" },
    { kennung: "ungenutzt", titel: "Ungenutzt", erklaerung: "Typen, auf die nichts im gelesenen Schema verweist" },
  ];
  const typenzahl = $derived(u ? u.kennzahlen.komplex + u.kennzahlen.einfach : 0);
</script>

<div class="an-ansicht">
  <div class="werkzeugzeile an-umbruch">
    <nav class="segment sc-reiter" aria-label="Teil der Übersicht">
      {#each REITER as r (r.kennung)}
        <button class:aktiv={z.reiter === r.kennung} onclick={() => (z.reiter = r.kennung)}>
          <i class="fa-solid {r.symbol}"></i><span>{r.titel}</span>{#if r.kennung === "typen" && u}<span class="mono">{anzahl(typenzahl)}</span>{/if}
        </button>
      {/each}
    </nav>
    {#if u && z.reiter === "baum"}
      <div class="rechts">
        <button class="knopf" title="Alle sichtbaren Knoten eine Ebene weiter aufklappen" onclick={() => z.ebeneWeiter(u)}><i class="fa-solid fa-angles-down"></i><span class="nur-breit"> Eine Ebene weiter</span></button>
        <button class="knopf" title="Alles zuklappen" disabled={!z.offen.size} onclick={() => z.zuklappen()}><i class="fa-solid fa-angles-up"></i><span class="nur-breit"> Zuklappen</span></button>
      </div>
    {:else if u && z.reiter === "typen"}
      <label class="feld sc-suche" title="Sucht in Namen, Basistyp und Erklärung">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="search" placeholder="Typ suchen" bind:value={z.suche} />
      </label>
      <nav class="segment sc-filter" aria-label="Typen filtern">
        {#each FILTER as f (f.kennung)}
          <button class:aktiv={z.filter === f.kennung} title={f.erklaerung} onclick={() => (z.filter = f.kennung)}>{f.titel}</button>
        {/each}
      </nav>
    {:else if u}
      <div class="rechts"><span class="klein text-3">gelesen in {anzahl(Math.max(1, Math.round(u.dauer)))} ms</span></div>
    {/if}
  </div>
  {#if !blatt.analyse}
    <p class="an-tafel-fuss an-leer">Das Dokument wird gelesen ...</p>
  {:else if !u}
    <p class="an-tafel-fuss an-leer">Die Ansicht Schema zeigt XML-Schema-Dokumente (Wurzel xs:schema). Dieses Dokument ist keins oder lässt sich gerade nicht lesen.</p>
  {:else}
    {#if u.modell.fehlend.length}
      <div class="an-hinweis" role="status">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>{u.modell.fehlend.length === 1 ? "Ein eingebundenes Schema fehlt" : `${anzahl(u.modell.fehlend.length)} eingebundene Schemas fehlen`}: <span class="mono">{u.modell.fehlend.slice(0, 4).join(", ")}{u.modell.fehlend.length > 4 ? ", ..." : ""}</span>. Im selben Ordner ablegen, dann ist der Baum vollständig.</span>
      </div>
    {/if}
    {#if z.reiter === "baum"}
      <SchemaBaum {blatt} {u} {z} />
    {:else if z.reiter === "typen"}
      <SchemaTypen {u} {z} />
    {:else}
      <SchemaStatistik {u} {z} />
    {/if}
  {/if}
</div>
