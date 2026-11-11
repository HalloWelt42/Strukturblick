<script lang="ts">
  // Baumansicht nach dem Entwurf (entwuerfe/arbeitsplatz.html): Werkzeugzeile mit Pfad, Suche und Ebenen, darunter der
  // virtualisierte Baum. Liest nur ihr Blatt; ihr Zustand (Ebene, Aufgeklapptes, Suche, Rollstand) liegt im Blatt.
  import { untrack } from "svelte";
  import { KEIN, knotenZu, teileVon, zeigerVon } from "../../../kern";
  import { naechsterTreffer, suchen } from "../../../analyse/baumsuche";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { lesestand } from "../../bausteine/lesestand.svelte";
  import { BaumZustand } from "./baumZustand.svelte";
  import BaumWerkzeuge from "./BaumWerkzeuge.svelte";
  import BaumListe from "./BaumListe.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  /** Wartezeit nach dem Tippen, bevor gesucht wird */
  const SUCHEN_NACH_MS = 150;

  const zustand = $derived(blatt.zustandFuer("baum", () => new BaumZustand()));
  const quelle = lesestand(() => blatt);
  const stand = $derived(quelle.stand);
  const index = $derived(stand?.analyse.index ?? null);
  const text = $derived(stand?.text ?? "");

  const gewaehlterKnoten = $derived(index && blatt.gewaehlt !== null ? knotenZu(index, text, blatt.gewaehlt) : KEIN);
  const teile = $derived(index && gewaehlterKnoten !== KEIN ? teileVon(index, text, gewaehlterKnoten) : null);

  let gesucht = $state(untrack(() => zustand.suche));
  $effect(() => {
    const s = zustand.suche;
    const zeit = setTimeout(() => (gesucht = s), s.trim() ? SUCHEN_NACH_MS : 0);
    return () => clearTimeout(zeit);
  });
  const treffer = $derived(index ? suchen(index, text, gesucht) : null);

  const fehlertext = $derived(stand?.analyse.diagnosen.find((d) => d.schwere === "fehler")?.meldung ?? blatt.lesefehler);

  function weiter(rueckwaerts: boolean): void {
    if (!index || !treffer) return;
    const k = naechsterTreffer(treffer, gewaehlterKnoten, rueckwaerts);
    if (k !== KEIN) blatt.waehlen(zeigerVon(index, text, k));
  }
</script>

<BaumWerkzeuge {zustand} {teile} {treffer} liest={stand !== null && !stand.aktuell} onwaehlen={(z) => blatt.waehlen(z)} onweiter={weiter} />

{#if index && stand}
  <BaumListe {blatt} {zustand} {index} {text} aktuell={stand.aktuell} {treffer} {gewaehlterKnoten} />
{:else if stand === null && blatt.lesefehler === null}
  <div class="inhalt hinweisfeld" role="status">
    <i class="fa-solid fa-spinner fa-spin-pulse"></i>
    <p>Das Dokument wird gelesen ...</p>
  </div>
{:else}
  <div class="inhalt hinweisfeld" role="alert">
    <i class="fa-solid fa-triangle-exclamation"></i>
    <p><strong>Nicht lesbar.</strong> Der Text lässt sich nicht als Baum lesen.</p>
    {#if fehlertext}<p class="mono klein text-3">{fehlertext}</p>{/if}
    <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "editor" })}><i class="fa-solid fa-code"></i> Zum Editor</button>
  </div>
{/if}

<style>
  .hinweisfeld {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--a3);
    padding: var(--a6) var(--a4);
    text-align: center;
    color: var(--text-2);
  }
  .hinweisfeld > i {
    font-size: var(--kennzahl);
    color: var(--text-3);
  }
  .hinweisfeld p {
    margin: 0;
    max-width: 60ch;
  }
</style>
