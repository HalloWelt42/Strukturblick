<script lang="ts">
  // Karte eines Typs im Inspektor der Ansicht Schema: Art, Ableitung mit Kette bis zum eingebauten Typ, Einschränkungen,
  // erlaubte Werte, Attribute und Erklärung. Basistypen sind anklickbar.
  import { attributeVon, typText } from "../../../analyse/xsd/elementbaum";
  import { anzeigename, istEingebaut, type QName, type Typdefinition, type XsdModell } from "../../../analyse/xsd/modell";
  import { anzahl } from "../tabelle/zahlen";
  import { ableitungText, FACETTE_NAME } from "./texte";

  let { m, typ, titel = "Typ", onwahl }: { m: XsdModell; typ: Typdefinition; titel?: string; onwahl: (q: QName) => void } = $props();

  /** So viele Werte einer Aufzählung stehen in der Karte */
  const WERTE = 30;

  /** Kette der Basistypen bis zum eingebauten oder unbekannten ("PLZ", "xs:string") */
  const kette = $derived.by(() => {
    const aus: { name: string; schluessel: QName | null }[] = [];
    const gesehen = new Set<Typdefinition>([typ]);
    let t: Typdefinition | null | undefined = typ;
    while (t && aus.length < 12) {
      const q: QName | null = t.basis;
      if (!q) break;
      aus.push({ name: anzeigename(m, q), schluessel: istEingebaut(q) ? null : q });
      t = m.typen.get(q);
      if (t && gesehen.has(t)) break;
      if (t) gesehen.add(t);
    }
    return aus;
  });
  const attribute = $derived(typ.art === "komplex" ? attributeVon(m, typ) : []);
</script>

<div class="karte">
  <div class="karte-titel">{titel} <span class="rechts abzeichen">{typ.art === "komplex" ? "komplex" : "einfach"}</span></div>
  <div class="wertfeld mono">{typ.schluessel ? anzeigename(m, typ.schluessel) : "anonym, direkt an der Stelle"}</div>
  <dl class="paare an-oben">
    <dt>Ableitung</dt><dd>{ableitungText(m, typ) || "keine"}</dd>
    {#if kette.length}
      <dt>Kette</dt>
      <dd class="sc-kette">
        {#each kette as k, i (i)}
          {#if i}<i class="fa-solid fa-arrow-right-long"></i>{/if}
          {#if k.schluessel}<button class="sc-verweis mono" onclick={() => onwahl(k.schluessel!)}>{k.name}</button>{:else}<span class="mono">{k.name}</span>{/if}
        {/each}
      </dd>
    {/if}
    {#if typ.ableitung === "vereinigung"}
      <dt>Mitglieder</dt><dd class="mono">{[...typ.mitglieder.map((q) => anzeigename(m, q)), ...typ.lokaleMitglieder.map(() => "anonym")].join(", ")}</dd>
    {/if}
    {#if typ.art === "komplex"}
      <dt>Inhalt</dt><dd>{typ.einfacherInhalt ? "Text mit Attributen" : typ.gemischt ? "Text und Elemente gemischt" : typ.inhalt ? "Elemente" : "leer"}</dd>
    {/if}
    {#each typ.facetten as f, i (i)}
      <dt>{FACETTE_NAME[f.art] ?? f.art}</dt><dd class="mono">{f.wert}</dd>
    {/each}
    {#if typ.abstrakt}<dt>Abstrakt</dt><dd>steht nie selbst, nur abgeleitet</dd>{/if}
  </dl>
  {#if typ.werte.length}
    <div class="karte-titel an-oben">Erlaubte Werte <span class="rechts mono">{anzahl(typ.werte.length)}</span></div>
    <div class="sc-marken">
      {#each typ.werte.slice(0, WERTE) as w, i (i)}<span class="abzeichen mono" title={w.doku ?? undefined}>{w.wert}</span>{/each}
      {#if typ.werte.length > WERTE}<span class="klein text-3">und {anzahl(typ.werte.length - WERTE)} weitere</span>{/if}
    </div>
  {/if}
  {#if attribute.length}
    <div class="karte-titel an-oben">Attribute <span class="rechts mono">{anzahl(attribute.length)}</span></div>
    <dl class="paare">
      {#each attribute as a, i (i)}
        <dt class="mono">@{a.ref ? anzeigename(m, a.ref) : a.name}{#if a.pflicht} <span class="an-pflicht">*</span>{/if}</dt>
        <dd class="mono">{typText(m, a.typ, a.lokalerTyp) ?? "xs:anySimpleType"}{#if a.fest !== null} = {a.fest}{:else if a.vorgabe !== null}, Vorgabe {a.vorgabe}{/if}</dd>
      {/each}
    </dl>
  {/if}
  {#if typ.doku}<p class="sc-doku an-oben">{typ.doku}</p>{/if}
</div>
