<script lang="ts">
  // Reiter Typen (entwuerfe/bereinigen-typen.html): Übersicht aller Spalten, darunter je Spalte mit Vorschlag eine Tafel
  // mit Vorschau. Nichts wird von selbst umgewandelt; jedes Umwandeln ist ein eigener Vorgang im Verlauf.
  import type { Spaltentyp, Vorschlagsart } from "../../../analyse/bereinigen/typen";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import TypTafel from "./TypTafel.svelte";

  let { blatt, z, s, typen }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand; typen: readonly Spaltentyp[] } = $props();

  const NAME: Record<Vorschlagsart, string> = { betrag: "Betrag", datum: "Datum JJJJ-MM-TT", "text-bleibt": "Text bleibt" };
  const mitVorschlag = $derived(typen.filter((t) => t.vorschlag !== null));
  const textOhneTypen = $derived(!s.analyse.format.faehigkeiten.typen);
</script>

<div class="inhalt">
  <div class="br-flaeche">
    <section>
      <h2 class="br-abschnitt-titel">Spalten in {blatt.name} {#if textOhneTypen}<span class="br-rechts text-3">{s.analyse.format.name} kennt nur Text, die Typen liest Strukturblick</span>{/if}</h2>
      <div class="br-uebersicht">
        <table class="br-tabelle">
          <thead>
            <tr><th class="br-text">Spalte</th><th class="br-text">Steht als</th><th class="br-text">Erkannt</th><th class="br-text">Vorschlag</th><th class="br-text">Stand</th></tr>
          </thead>
          <tbody>
            {#each typen as t (t.spalte)}
              <tr class:br-gewaehlt={z.spalteTypen === t.spalte} onclick={() => (z.spalteTypen = t.spalte)}>
                <td>{t.spalte}</td>
                <td class="br-text">{t.stehtAls}</td>
                <td class="br-text">{t.erkannt}</td>
                <td class="br-text" class:text-3={t.vorschlag === null}>{t.vorschlag ? NAME[t.vorschlag] : "keiner"}</td>
                <td class="br-text">
                  {#if t.vorschlag === null}<span class="abzeichen gut">passt</span>{:else if t.vorschlag === "text-bleibt"}<span class="abzeichen warn">Hinweis</span>{:else}<span class="abzeichen">Vorschlag</span>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
    <section>
      <h2 class="br-abschnitt-titel">Vorschläge</h2>
      {#if mitVorschlag.length}
        <p class="br-abschnitt-text">Nichts wird von selbst umgewandelt. Jede Spalte zeigt erst die Vorschau, jedes Umwandeln ist ein eigener Vorgang im Verlauf.</p>
        {#each mitVorschlag as t (t.spalte)}
          <TypTafel {blatt} {z} {s} spalte={t.spalte} />
        {/each}
      {:else}
        <p class="br-abschnitt-text">Keine Vorschläge: Jede Spalte steht schon so, wie sie gelesen wird.</p>
      {/if}
    </section>
  </div>
</div>

<style>
  tbody tr {
    cursor: pointer;
  }
</style>
