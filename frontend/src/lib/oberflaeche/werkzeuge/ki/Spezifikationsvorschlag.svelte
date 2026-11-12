<script lang="ts">
  // Vorgeschlagene Spezifikation für Testdaten als Tafel: je Feld Erzeuger, Einstellungen in Kurzform und Leeranteil;
  // was sich gegenüber der bisherigen ändert, trägt ein Abzeichen.
  import { erzeuger, mitVorgaben } from "../../../analyse/testdaten/erzeuger";
  import type { Testdatenvorschlag } from "../../../analyse/ki/vorschlag";

  let { vorschlag }: { vorschlag: Testdatenvorschlag } = $props();
  const felder = $derived(vorschlag.spezifikation.felder.filter((f) => erzeuger(f.erzeuger).art === "wert"));
  const geaendert = $derived(new Set(vorschlag.geaendert));
</script>

<div class="ki-tabelle-feld">
  <table class="ki-tabelle">
    <thead><tr><th>Feld</th><th>Erzeuger</th><th>Einstellungen</th><th>leer</th></tr></thead>
    <tbody>
      {#each felder as f (f.pfad)}
        {@const e = erzeuger(f.erzeuger)}
        <tr>
          <td>{f.pfad}{#if geaendert.has(f.pfad)} <span class="abzeichen zweit">geändert</span>{/if}</td>
          <td>{e.titel}</td>
          <td class="ki-umbruch">{e.marken(mitVorgaben(e, f.einstellungen)).join(", ")}</td>
          <td class="zahl">{f.leer.anteil ? `${f.leer.anteil} %` : ""}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
