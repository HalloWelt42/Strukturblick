<script lang="ts">
  // Ein Zweig des Strukturbaums: die Karte eines Typs mit seinen Feldern, rechts daneben die Typen, auf die seine Felder
  // zeigen (Objekt oder Liste von Objekten), mit der Vielfalt auf der Kante.
  import { beschreiben, vielfalt, type Schema, type Schemafeld, type Typ, type Wertart } from "../../../analyse/schema";
  import TypZweig from "./TypZweig.svelte";

  let { schema, typ, gewaehlt, kante = null, onwahl, onfeld }: {
    schema: Schema;
    typ: Typ;
    gewaehlt: string;
    kante?: { feld: string; zahl: string } | null;
    onwahl: (t: Typ) => void;
    onfeld: (f: Schemafeld) => void;
  } = $props();

  /** Typ, auf den ein Feld zeigt (direkt oder als Listeneintrag) */
  function zielTyp(arten: readonly Wertart[]): string | null {
    for (const a of arten) {
      if (a.art === "objekt") return a.typ;
      if (a.art === "liste") {
        const t = zielTyp(a.von);
        if (t) return t;
      }
    }
    return null;
  }
  const kinder = $derived(
    typ.felder.flatMap((f) => {
      const ziel = zielTyp(f.arten);
      const t = ziel ? schema.typen.find((x) => x.name === ziel) : undefined;
      return t ? [{ feld: f, typ: t }] : [];
    }),
  );
  const KLASSE: Record<Wertart["art"], string> = { objekt: "w-objekt", liste: "w-liste", text: "w-text", zahl: "w-zahl", wahrheitswert: "w-bool", null: "w-null" };
</script>

<div class="an-zweig">
  {#if kante}<span class="an-kante" title="Feld {kante.feld}"><span class="an-kante-zahl">{kante.zahl}</span></span>{/if}
  <div class="an-tk" class:an-gewaehlt={gewaehlt === typ.name} aria-pressed={gewaehlt === typ.name} role="button" tabindex="0" onclick={() => onwahl(typ)} onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onwahl(typ))}>
    <div class="an-tk-kopf"><i class="fa-solid fa-cube w-objekt"></i><span class="an-tk-name">{typ.name}</span><span class="an-tk-zahl" title="Vorkommen"><i class="fa-solid fa-layer-group"></i>{typ.vorkommen.toLocaleString("de-DE")}</span></div>
    <div class="an-tk-felder">
      {#each typ.felder as f (f.pfad)}
        <button class="an-tk-feld" title={f.schluessel ? "Schlüssel, eindeutig. Klick wählt das erste Vorkommen" : "Klick wählt das erste Vorkommen"} onclick={(e) => { e.stopPropagation(); onfeld(f); }}>{f.name}{#if f.schluessel} <i class="fa-solid fa-key"></i>{/if}</button>
        <span><span class={KLASSE[f.arten[0]?.art ?? "null"]}>{beschreiben(f.arten)}</span>{#if !f.pflicht}<span class="an-tk-anmerkung">{f.vorkommen.toLocaleString("de-DE")} von {typ.vorkommen.toLocaleString("de-DE")}</span>{/if}</span>
        <span class="an-pflicht" title={f.pflicht ? "in jedem Eintrag" : undefined}>{f.pflicht ? "*" : ""}</span>
      {/each}
    </div>
  </div>
  {#if kinder.length}
    <div class="an-kinder">
      {#each kinder as k (k.feld.pfad)}
        <TypZweig {schema} typ={k.typ} {gewaehlt} kante={{ feld: k.feld.name, zahl: vielfalt(k.feld) }} {onwahl} {onfeld} />
      {/each}
    </div>
  {/if}
</div>
