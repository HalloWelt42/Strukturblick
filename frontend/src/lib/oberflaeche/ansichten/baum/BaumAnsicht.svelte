<script lang="ts">
  // Baumansicht nach dem Entwurf (entwuerfe/arbeitsplatz.html): Werkzeugzeile mit Pfad, Suche und Ebenen, darunter der
  // virtualisierte Baum. Liest nur ihr Blatt; ihr Zustand (Ebene, Aufgeklapptes, Suche, Rollstand) liegt im Blatt.
  import { untrack } from "svelte";
  import { KEIN, knotenZu, teileVon, zeigerVon } from "../../../kern";
  import { naechsterTreffer, suchen, trefferAus } from "../../../analyse/baumsuche";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { abfrage } from "../../../zustand/abfrage.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { AUSGABEFORMATE, knotenWerte, werteAusgeben, type Ausgabeformat } from "../../../analyse/ausgabe";
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
  // Eigene Suche im Baum geht vor; sonst die Treffer der Abfrage, wenn sie aus genau diesem Stand stammen
  const abfrageZeiger = $derived(abfrage.trefferFuer(blatt));
  const treffer = $derived.by(() => {
    if (!index) return null;
    if (gesucht.trim() || !abfrageZeiger) return suchen(index, text, gesucht);
    return trefferAus(index, abfrageZeiger.map((z) => knotenZu(index, text, z)));
  });
  const ausAbfrage = $derived(!gesucht.trim() && abfrageZeiger !== null);

  const fehlertext = $derived(stand?.analyse.diagnosen.find((d) => d.schwere === "fehler")?.meldung ?? blatt.lesefehler);

  // ----- Export der Treffer (Suche im Baum oder Abfrage) -----
  const stamm = $derived(blatt.name.replace(/\.[^.]+$/, ""));
  const endung = (f: Ausgabeformat) => AUSGABEFORMATE.find((x) => x.kennung === f)?.endung ?? f;
  const trefferWerte = (): unknown[] => (index && treffer ? knotenWerte(index, text, treffer.knoten) : []);
  const trefferExport = $derived(
    treffer && treffer.anzahl > 0
      ? {
          holen: (f: Ausgabeformat) => werteAusgeben(trefferWerte(), f),
          dateiname: (f: Ausgabeformat) => `${stamm}-treffer.${endung(f)}`,
          neuesDokument: () => void trefferAlsDokument(),
        }
      : null,
  );

  async function trefferAlsDokument(): Promise<void> {
    const werte = trefferWerte();
    const neu = await arbeitsplatz.neu(`${stamm}-treffer.json`, werteAusgeben(werte, "json"), blatt.ordner, { art: "ansicht", kennung: "baum" });
    meldungen.zeigen({ text: `Neues Dokument ${neu.name} mit ${werte.length} Treffern`, art: "erfolg" });
  }

  function weiter(rueckwaerts: boolean): void {
    if (!index || !treffer) return;
    const k = naechsterTreffer(treffer, gewaehlterKnoten, rueckwaerts);
    if (k !== KEIN) blatt.waehlen(zeigerVon(index, text, k));
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === "F3" && treffer) { e.preventDefault(); weiter(e.shiftKey); } }} />

<BaumWerkzeuge {zustand} {teile} {treffer} {ausAbfrage} {gewaehlterKnoten} {trefferExport} liest={stand !== null && !stand.aktuell} onwaehlen={(z) => blatt.waehlen(z)} onweiter={weiter} />

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
    <div class="knopf-reihe">
      <button class="knopf primaer" title="Fehlende Kommas, Anführungszeichen und Klammern nach festen Regeln ergänzen" onclick={() => blatt.zeigen({ art: "werkzeug", kennung: "reparieren" })}><i class="fa-solid fa-screwdriver-wrench"></i> Reparieren</button>
      <button class="knopf" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "editor" })}><i class="fa-solid fa-code"></i> Zum Editor</button>
    </div>
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
