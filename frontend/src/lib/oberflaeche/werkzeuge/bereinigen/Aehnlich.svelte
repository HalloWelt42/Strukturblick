<script lang="ts">
  // Reiter Ähnliche Werte (entwuerfe/bereinigen-aehnlich.html): Verfahren wählen, Gruppen von Schreibweisen prüfen,
  // Zielwert je Gruppe wählen oder eintippen, Gruppen ausnehmen; unten die Vorschau und Übernehmen als ein Vorgang.
  import { ersetzungen, VERFAHREN, verfahrenMoeglich, UNSCHARF_HOECHSTENS } from "../../../analyse/bereinigen/aehnlich";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { gruppenSchluessel, type BereinigenZustand, type Tabellenstand } from "./bereinigenZustand.svelte";
  import { zellenSetzen } from "./vorgaenge";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import GruppenTafel from "./GruppenTafel.svelte";

  let { blatt, z, s, spalte }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand; spalte: string } = $props();

  const j = $derived(s.tabelle.spalteNach.get(spalte) ?? 0);
  const verschiedene = $derived(z.werte(s, j).filter((w) => w.wert.trim() !== "").length);
  const gruppen = $derived(z.gruppen(s, j, z.verfahren));
  const karte = $derived(z.ersetzungsKarte(spalte, gruppen));
  const aenderungen = $derived(ersetzungen(s.tabelle, s.index, s.text, j, karte));
  const aktiv = $derived(gruppen.filter((g) => !z.ohne[gruppenSchluessel(spalte, g)]).length);

  async function uebernehmen(): Promise<void> {
    const titel = `${spalte}: ähnliche Werte zusammengeführt (${anzahl(aenderungen.length)} Zellen)`;
    // Ausgenommene Gruppen bleiben ausgenommen (ihr Schlüssel hängt an den Schreibweisen, nicht an der Revision)
    await zellenSetzen(blatt, aenderungen.map((a) => ({ zeiger: a.zeiger, neu: { art: "text", wert: a.nachher } })), titel);
  }
</script>

<div class="inhalt">
  <div class="br-flaeche">
    <section>
      <h2 class="br-abschnitt-titel">Verfahren</h2>
      <div class="br-verfahren">
        {#each VERFAHREN as v (v.kennung)}
          {@const moeglich = verfahrenMoeglich(v.kennung, verschiedene)}
          {@const n = moeglich ? z.gruppen(s, j, v.kennung).length : 0}
          <button class="br-verfahren-wahl" class:aktiv={z.verfahren === v.kennung} aria-pressed={z.verfahren === v.kennung} onclick={() => (z.verfahren = v.kennung)}>
            <span class="br-verfahren-kopf">
              <span class="br-ziel" class:an={z.verfahren === v.kennung}></span><strong>{v.name}</strong>
              <span class="abzeichen" class:zweit={z.verfahren !== v.kennung}>{moeglich ? `${n} ${n === 1 ? "Gruppe" : "Gruppen"}` : "zu viele Werte"}</span>
            </span>
            <span class="br-verfahren-text">{moeglich ? v.erklaerung : `Vergleicht jeden Wert mit jedem; geht bis ${anzahl(UNSCHARF_HOECHSTENS)} verschiedene Werte, hier sind es ${anzahl(verschiedene)}.`}</span>
          </button>
        {/each}
      </div>
    </section>
    <section>
      <h2 class="br-abschnitt-titel">Gruppen in {spalte} <span class="br-rechts text-3">{gruppen.length ? `${gruppen.length} gefunden, ${aktiv} zum Zusammenführen` : ""}</span></h2>
      {#each gruppen as g (gruppenSchluessel(spalte, g))}
        <GruppenTafel {z} {spalte} {g} />
      {:else}
        <p class="br-abschnitt-text">Keine ähnlichen Schreibweisen in {spalte}{z.verfahren === "kern" ? ". Ein großzügigeres Verfahren findet vielleicht mehr." : "."}</p>
      {/each}
    </section>
  </div>
</div>
{#if gruppen.length}
  <div class="br-anwenden">
    <span class="br-anwenden-text"><i class="fa-solid fa-eye"></i> Vorschau: ändert <strong class="mono">{anzahl(aenderungen.length)}</strong> Zellen in <strong class="mono">{aktiv}</strong> {aktiv === 1 ? "Gruppe" : "Gruppen"}</span>
    <span>Landet als ein Vorgang im Verlauf, rückgängig möglich.</span>
    <span class="br-rechts">
      <button class="knopf primaer" disabled={!aenderungen.length || !s.aktuell} onclick={() => void uebernehmen()}><i class="fa-solid fa-check"></i> Übernehmen</button>
    </span>
  </div>
{/if}
