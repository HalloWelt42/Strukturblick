<script lang="ts">
  // Inspektor der Ansicht Graph: das Gewählte (Pfad, Schlüssel oder Wert, Ebene) mit "Fokus hierher" und "Im Baum
  // zeigen", darunter der Ausschnitt (Fokus, Tiefe, Knoten) mit den Nachbarn des Fokus zum Weiterblättern.
  import { KEIN, KNOTEN_NAME, KnotenArt, istBehaelter, kinderVon, knotenZu, schluessel, schreiben, teileVon, tiefe, zeigerVon } from "../../../kern";
  import { beschriftung, type Ausschnitt } from "../../../analyse/graph";
  import { umfang, wertAnzeige } from "../../../analyse/baumbeschreibung";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../tabelle/zahlen";
  import { graphZustand } from "./graphZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(graphZustand(blatt));
  const a = $derived<Ausschnitt | null>(z.ausschnitt(blatt));
  const index = $derived(blatt.analyse?.index ?? null);
  const text = $derived(blatt.analyseText);
  const k = $derived(index && blatt.gewaehlt !== null ? knotenZu(index, text, blatt.gewaehlt) : KEIN);
  const pfad = (n: number): string => (index ? schreiben(teileVon(index, text, n), "jq") || "." : "");

  /** Beschriftung eines Nachbarn für den Knopf: Stelle oder Schlüssel und, bei Objekten, der erste Text */
  function nachbar(n: number): string {
    if (!index) return "";
    const b = beschriftung(index, text, n);
    for (const c of kinderVon(index, n)) if (index.art[c] === KnotenArt.text) return `${b} ${wertAnzeige(index, text, c, 20).replace(/^"|"$/g, "")}`;
    return b;
  }

  const fokusZeiger = (n: number): string => (index ? zeigerVon(index, text, n) : "");
  function fokusAuf(n: number): void {
    z.fokus = fokusZeiger(n);
    blatt.waehlen(fokusZeiger(n));
  }
</script>

{#if index && a}
  {#if k !== KEIN}
    {@const schluesselListe = index.art[k] === KnotenArt.objekt ? [...kinderVon(index, k)].map((c) => schluessel(index, text, c) ?? "") : []}
    <div class="karte">
      <div class="karte-titel">Gewählt <span class="rechts abzeichen">{KNOTEN_NAME[index.art[k] as KnotenArt]}</span></div>
      <div class="wertfeld an-wertfeld-klein mono">{pfad(k)}</div>
      <dl class="paare an-oben">
        {#if schluesselListe.length}<dt>Schlüssel</dt><dd class="mono">{schluesselListe.slice(0, 8).join(", ")}{schluesselListe.length > 8 ? ", ..." : ""}</dd>
        {:else if istBehaelter(index.art[k])}<dt>Umfang</dt><dd>{umfang(index, text, k)}</dd>
        {:else}<dt>Wert</dt><dd class="mono">{wertAnzeige(index, text, k, 120)}</dd>{/if}
        <dt>Ebene</dt><dd class="mono">{tiefe(index, k)}</dd>
      </dl>
      <div class="knopf-reihe an-oben">
        <button class="knopf primaer" disabled={k === a.fokus.k || !istBehaelter(index.art[k])} title={istBehaelter(index.art[k]) ? "Fokus auf das Gewählte" : "Ein einfacher Wert hat keinen Inhalt zum Zeigen"} onclick={() => fokusAuf(k)}><i class="fa-solid fa-crosshairs"></i> Fokus hierher</button>
        <button class="knopf" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "baum" })}><i class="fa-solid fa-folder-tree"></i> Im Baum zeigen</button>
      </div>
    </div>
  {:else}
    <div class="karte"><p class="an-tafel-fuss">Klick auf Objekt oder Liste setzt den Fokus dorthin, Klick auf einen Wert wählt ihn.</p></div>
  {/if}
  <div class="karte">
    <div class="karte-titel">Ausschnitt</div>
    <dl class="paare">
      <dt>Fokus</dt><dd class="mono">{pfad(a.fokus.k)}</dd>
      <dt>Tiefe</dt><dd>{z.tiefe} {z.tiefe === 1 ? "Ebene" : "Ebenen"}</dd>
      <dt>Knoten</dt><dd class="mono">{anzahl(a.sichtbar)} von {anzahl(a.gesamt)}</dd>
    </dl>
    {#if a.vorher !== KEIN || a.nachher !== KEIN}
      <div class="knopf-reihe an-oben">
        {#if a.vorher !== KEIN}<button class="knopf" title="Fokus auf den vorigen Nachbarn" onclick={() => fokusAuf(a.vorher)}><i class="fa-solid fa-chevron-left"></i> {nachbar(a.vorher)}</button>{/if}
        {#if a.nachher !== KEIN}<button class="knopf" title="Fokus auf den nächsten Nachbarn" onclick={() => fokusAuf(a.nachher)}>{nachbar(a.nachher)} <i class="fa-solid fa-chevron-right"></i></button>{/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="karte"><p class="an-tafel-fuss">Kein lesbares Dokument.</p></div>
{/if}
