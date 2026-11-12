<script lang="ts">
  // Reiter Typen: alle benannten Typen des gelesenen Schemas (auch aus Importen) mit Art, Ableitung, Zahl der Werte und
  // Verwendungen. Suche und Filter stehen in der Werkzeugzeile. Lange Listen laden beim Rollen nach; der Fuß nennt die Zahl.
  import { anzeigename, type Typdefinition } from "../../../analyse/xsd/modell";
  import { anzahl } from "../tabelle/zahlen";
  import type { SchemaZustand, Uebersicht } from "./schemaZustand.svelte";
  import { ableitungText } from "./texte";

  let { u, z }: { u: Uebersicht; z: SchemaZustand } = $props();

  /** So viele Zeilen kommen je Nachladen dazu */
  const SCHRITT = 150;
  let sichtbar = $state(SCHRITT);
  let marke: HTMLElement | undefined = $state();

  const m = $derived(u.modell);
  const alle = $derived([...m.typen.values()].sort((a, b) => a.name.localeCompare(b.name, "de") || anzeigename(m, a.schluessel!).localeCompare(anzeigename(m, b.schluessel!))));
  const gezeigt = $derived.by(() => {
    const s = z.suche.trim().toLowerCase();
    return alle.filter((t) => {
      if (z.filter === "komplex" && t.art !== "komplex") return false;
      if (z.filter === "einfach" && t.art !== "einfach") return false;
      if (z.filter === "werte" && !t.werte.length) return false;
      if (z.filter === "ungenutzt" && u.verwendungen.has(t.schluessel!)) return false;
      return !s || anzeigename(m, t.schluessel!).toLowerCase().includes(s) || (t.basis !== null && anzeigename(m, t.basis).toLowerCase().includes(s)) || (t.doku?.toLowerCase().includes(s) ?? false);
    });
  });
  const gewaehlt = $derived(z.wahl?.art === "typ" ? z.wahl.schluessel : null);

  // Neue Suche oder neuer Filter: wieder oben anfangen
  $effect(() => {
    void z.suche;
    void z.filter;
    sichtbar = SCHRITT;
  });

  $effect(() => {
    if (!marke) return;
    const beobachter = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) sichtbar += SCHRITT; }, { rootMargin: "200px" });
    beobachter.observe(marke);
    return () => beobachter.disconnect();
  });

  const verwendet = (t: Typdefinition): number => u.verwendungen.get(t.schluessel!)?.length ?? 0;
</script>

<div class="inhalt an-raum">
  {#if !alle.length}
    <p class="an-tafel-fuss an-leer">Dieses Schema hat keine benannten Typen; seine Elemente bringen ihren Typ direkt mit (anonym).</p>
  {:else}
    <div class="an-flaeche">
      <section class="an-tafel">
        <div class="an-tabellenfeld">
          <table class="an-profil sc-typen">
            <thead><tr><th>Typ</th><th class="sc-breit">Art</th><th>Ableitung</th><th class="an-zahl">Werte</th><th class="an-zahl">Verwendet</th><th class="sc-breit">Datei</th></tr></thead>
            <tbody>
              {#each gezeigt.slice(0, sichtbar) as t (t.schluessel)}
                {@const n = verwendet(t)}
                <tr class:an-gewaehlt={gewaehlt === t.schluessel} aria-selected={gewaehlt === t.schluessel} onclick={() => (z.wahl = { art: "typ", schluessel: t.schluessel! })}>
                  <td class="sc-typname" title={t.doku ?? undefined}><i class="fa-solid {t.art === 'komplex' ? 'fa-cube' : 'fa-font'}"></i>{anzeigename(m, t.schluessel!)}{#if t.abstrakt} <span class="abzeichen">abstrakt</span>{/if}</td>
                  <td class="sc-breit">{t.art === "komplex" ? "komplex" : "einfach"}</td>
                  <td class="mono">{ableitungText(m, t)}</td>
                  <td class="an-zahl" class:text-3={!t.werte.length}>{t.werte.length ? anzahl(t.werte.length) : "-"}</td>
                  <td class="an-zahl">{#if n}{anzahl(n)}{:else}<span class="abzeichen warn" title="Nichts im gelesenen Schema verweist auf diesen Typ">0</span>{/if}</td>
                  <td class="text-3 sc-breit">{t.quelle.datei === m.haupt ? "dieses Dokument" : t.quelle.datei}</td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if sichtbar < gezeigt.length}<div class="sc-nachlade" bind:this={marke} aria-hidden="true"></div>{/if}
        </div>
      </section>
      <p class="an-tafel-fuss">{anzahl(Math.min(sichtbar, gezeigt.length))} von {anzahl(gezeigt.length)} Typen{gezeigt.length !== alle.length ? ` (gefiltert, ${anzahl(alle.length)} insgesamt)` : ""}. Klick zeigt den Typ im Inspektor.</p>
    </div>
  {/if}
</div>
