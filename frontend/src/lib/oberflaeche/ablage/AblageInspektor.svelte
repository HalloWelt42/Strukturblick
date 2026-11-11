<script lang="ts">
  // Rechte Spalte der Seite Ablage: das gewählte Dokument, Sichern und Einspielen aller Dokumente, Papierkorb.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung, PAPIERKORB_TAGE } from "../../zustand/ablageverwaltung.svelte";
  import { beispieleOeffnen, BEISPIEL_ORDNER } from "../../zustand/beispiele";
  import { dateiWaehlen, herunterladen } from "../schale/dateien";
  import { groesse, zeitpunkt, type Ablageauswahl } from "./auswahl.svelte";

  let { auswahl }: { auswahl: Ablageauswahl } = $props();

  const gewaehlt = $derived([...auswahl.gewaehlt]);
  const eines = $derived(gewaehlt.length === 1 ? (arbeitsplatz.dokumente.find((d) => d.kennung === gewaehlt[0]) ?? null) : null);
  const summe = $derived(arbeitsplatz.dokumente.reduce((s, d) => s + d.groesse, 0));
  let sichert = $state(false);

  async function sichern(): Promise<void> {
    sichert = true;
    try {
      const s = await ablageverwaltung.sicherung();
      herunterladen(`strukturblick-sicherung-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(s));
    } finally {
      sichert = false;
    }
  }

  async function einspielen(): Promise<void> {
    const [datei] = await dateiWaehlen();
    if (datei) await ablageverwaltung.einspielen(await datei.text());
  }
</script>

<aside class="inspektor">
  <div class="inspektor-feld">
    {#if eines}
      <div class="karte">
        <div class="karte-titel">Gewählt</div>
        <dl class="paare">
          <dt>Name</dt><dd>{eines.name}</dd>
          <dt>Ordner</dt><dd>{eines.ordner || arbeitsplatz.ablage.ort}</dd>
          <dt>Größe</dt><dd class="mono">{groesse(eines.groesse)}</dd>
          <dt>Geändert</dt><dd class="mono">{zeitpunkt(eines.geaendert)}</dd>
        </dl>
        <div class="knopf-reihe abstand">
          <button class="knopf primaer" onclick={() => eines && void arbeitsplatz.ausAblageOeffnen(eines.kennung)}><i class="fa-solid fa-arrow-up-right-from-square"></i> Öffnen</button>
        </div>
      </div>
    {:else if gewaehlt.length > 1}
      <div class="karte">
        <div class="karte-titel">{gewaehlt.length} gewählt</div>
        <p class="klein text-3">Herunterladen, Verschieben und Papierkorb wirken auf alle gewählten.</p>
      </div>
    {:else}
      <div class="karte">
        <div class="karte-titel">Ablage</div>
        <dl class="paare">
          <dt>Ort</dt><dd>{arbeitsplatz.ablage.ort}</dd>
          <dt>Dokumente</dt><dd class="mono">{arbeitsplatz.dokumente.length}</dd>
          <dt>Zusammen</dt><dd class="mono">{groesse(summe)}</dd>
        </dl>
        <p class="klein text-3 abstand">{arbeitsplatz.ablage.hinweis}</p>
      </div>
    {/if}

    <div class="karte">
      <div class="karte-titel">Sichern</div>
      <p class="klein text-3">Alle Dokumente samt Verlauf in einer Datei; Einspielen fügt sie hinzu, nichts wird überschrieben.</p>
      <div class="knopf-reihe abstand">
        <button class="knopf" disabled={sichert || !arbeitsplatz.dokumente.length} onclick={sichern}><i class="fa-solid fa-download"></i> Alles sichern</button>
        <button class="knopf" onclick={einspielen}><i class="fa-solid fa-upload"></i> Einspielen</button>
      </div>
    </div>

    <div class="karte">
      <div class="karte-titel">Beispiele zum Üben</div>
      <p class="klein text-3">Erfundene Bestellungen, Kunden und Dienste im Ordner {BEISPIEL_ORDNER}. Schon vorhandene werden nur geöffnet; frisch anfangen: die Beispiele in den Papierkorb legen.</p>
      <div class="knopf-reihe abstand">
        <button class="knopf" onclick={() => void beispieleOeffnen()}><i class="fa-solid fa-flask"></i> Beispiele öffnen</button>
      </div>
    </div>

    <div class="karte">
      <div class="karte-titel">Papierkorb <span class="rechts mono">{ablageverwaltung.papierkorb.length}</span></div>
      <p class="klein text-3">Nach {PAPIERKORB_TAGE} Tagen endgültig gelöscht.</p>
      <div class="knopf-reihe abstand">
        <button class="knopf" onclick={() => { ablageverwaltung.ordnerWahl = null; auswahl.aufheben(); }}><i class="fa-solid fa-trash-can"></i> Papierkorb öffnen</button>
      </div>
    </div>
  </div>
</aside>

<style>
  .abstand {
    margin-top: var(--a3);
  }
  p {
    margin: 0;
  }
</style>
