<script lang="ts">
  // Ein Schritt im Rezept: Nummer, Schalter an/aus, Name mit Art, was er tut (bei Ersetzungen die Zuordnungen, bei
  // Betrag und Datum die Wahl für nicht lesbare Werte), verschieben und entfernen.
  import { SCHRITT_ART, schrittErklaerung, schrittTitel, type Rezept, type Rezeptschritt } from "../../../analyse/rezepte/rezept";
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import WertText from "../../bausteine/WertText.svelte";
  import { BEHALTEN } from "../../../analyse/duplikate";

  let { rezept, schritt, nr }: { rezept: Rezept; schritt: Rezeptschritt; nr: number } = $props();

  /** So viele Zielwerte zeigt ein Ersetzen-Schritt, bevor er zusammenfasst */
  const ZIELE = 4;
  const zuordnungen = $derived.by(() => {
    if (schritt.art !== "ersetzen") return [];
    const je = new Map<string, string[]>();
    for (const p of schritt.karte) je.set(p.nachher, [...(je.get(p.nachher) ?? []), p.vorher]);
    return [...je].map(([nachher, vorher]) => ({ nachher, vorher }));
  });
  const titel = $derived(schrittTitel(schritt));
</script>

<div class="vw-schritt" class:rz-aus={!schritt.an}>
  <span class="vw-schritt-nr">{nr + 1}</span>
  <button class="vw-schalter" class:an={schritt.an} role="switch" aria-checked={schritt.an} aria-label="Schritt {titel}" title={schritt.an ? "Schritt ausschalten" : "Schritt einschalten"} onclick={() => void rezepte.schrittAendern(rezept, nr, { an: !schritt.an })}></button>
  <div class="vw-schritt-text">
    <div class="vw-schritt-name">{titel} <span class="abzeichen zweit">{SCHRITT_ART[schritt.art]}</span></div>
    <div class="vw-schritt-was">{schrittErklaerung(schritt)}</div>
    {#each zuordnungen.slice(0, ZIELE) as z (z.nachher)}
      <div class="vw-zuordnung">{#each z.vorher as v (v)}<span class="vw-wert"><WertText wert={v} /></span>{/each}<i class="fa-solid fa-arrow-right vw-pfeil"></i><span class="vw-wert"><WertText wert={z.nachher} /></span></div>
    {/each}
    {#if zuordnungen.length > ZIELE}<div class="vw-schritt-was">und {zuordnungen.length - ZIELE} weitere Zielwerte</div>{/if}
    {#if schritt.art === "behalten"}
      {#each schritt.filter as f (f.spalte)}
        <div class="vw-zuordnung"><span class="vw-wert">{f.spalte}</span><i class="fa-solid fa-filter vw-pfeil"></i>
          {#if f.auswahl.art === "werte"}{#each f.auswahl.werte as w (w)}<span class="vw-wert"><WertText wert={w} /></span>{/each}
          {:else}<span class="vw-wert">{f.auswahl.von ?? "Anfang"} bis {f.auswahl.bis ?? "Ende"}</span>{/if}
        </div>
      {/each}
    {/if}
    {#if schritt.art === "duplikate"}
      <div class="vw-feldzeile">
        <span class="vw-feldname">Es bleibt</span>
        <div class="segment">
          {#each BEHALTEN as b (b.kennung)}
            <button class:aktiv={schritt.behalten === b.kennung} onclick={() => void rezepte.schrittAendern(rezept, nr, { behalten: b.kennung })}>{b.name}</button>
          {/each}
        </div>
      </div>
    {/if}
    {#if schritt.art === "betrag" || schritt.art === "datum"}
      <div class="vw-feldzeile">
        <span class="vw-feldname">Nicht lesbar</span>
        <div class="segment">
          <button class:aktiv={schritt.unlesbar === "lassen"} onclick={() => void rezepte.schrittAendern(rezept, nr, { unlesbar: "lassen" })}>Stehen lassen</button>
          <button class:aktiv={schritt.unlesbar === "leeren"} onclick={() => void rezepte.schrittAendern(rezept, nr, { unlesbar: "leeren" })}>Leer setzen</button>
        </div>
      </div>
    {/if}
  </div>
  <div class="vw-schritt-knoepfe">
    <button class="knopf still nur-symbol" title="Nach oben" disabled={nr === 0} onclick={() => void rezepte.schrittVerschieben(rezept, nr, -1)}><i class="fa-solid fa-arrow-up"></i></button>
    <button class="knopf still nur-symbol" title="Nach unten" disabled={nr === rezept.schritte.length - 1} onclick={() => void rezepte.schrittVerschieben(rezept, nr, 1)}><i class="fa-solid fa-arrow-down"></i></button>
    <button class="knopf still nur-symbol" title="Schritt entfernen" onclick={() => void rezepte.schrittEntfernen(rezept, nr)}><i class="fa-solid fa-xmark"></i></button>
  </div>
</div>
