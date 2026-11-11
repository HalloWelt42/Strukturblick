<script lang="ts">
  // Werkzeug Rezepte (entwuerfe/rezepte.html, rezept-anwenden.html): links die Rezepte, rechts das gewählte mit seinen
  // Schritten; "Neues Rezept aus dem Verlauf" nimmt Vorgänge aus Bereinigen, "Anwenden" läuft auf dem offenen Dokument
  // mit Spaltenprüfung und Vorschau je Schritt.
  import "./rezepte.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import RezeptListe from "./RezeptListe.svelte";
  import RezeptSeite from "./RezeptSeite.svelte";
  import RezeptNeu from "./RezeptNeu.svelte";
  import RezeptAnwenden from "./RezeptAnwenden.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  rezepte.sicherGeladen();

  const r = $derived(rezepte.aktuell);
  const verlauf = $derived(rezepte.verlaufsschritte(blatt));
  const modus = $derived(rezepte.modus === "anwenden" && !r ? "ansehen" : rezepte.modus);
</script>

<div class="rz-ansicht">
  <div class="werkzeugzeile">
    <span class="vw-zeilentext">
      {#if modus === "neu"}
        <strong>Neues Rezept</strong> aus dem Verlauf von <span class="mono">{blatt.name}</span>
      {:else if modus === "anwenden" && r}
        <strong>{r.name}</strong> auf <span class="mono">{blatt.name}</span>
      {:else}
        <strong>Rezepte</strong>{#if r}<span class="text-3">&nbsp;/&nbsp;</span>{r.name}{/if}
      {/if}
    </span>
    <div class="rechts">
      {#if modus === "ansehen"}
        <button class="knopf" disabled={!verlauf.length} title={verlauf.length ? `Vorgänge aus Bereinigen in ${blatt.name} als Rezept speichern` : `Im Verlauf von ${blatt.name} gibt es noch keine Vorgänge aus Bereinigen`} onclick={() => (rezepte.modus = "neu")}>
          <i class="fa-solid fa-clock-rotate-left"></i><span class="nur-breit">Neues Rezept aus dem Verlauf</span>
        </button>
        {#if r}
          <button class="knopf primaer" title="{r.name} auf {blatt.name} anwenden, erst mit Vorschau" onclick={() => (rezepte.modus = "anwenden")}><i class="fa-solid fa-play"></i> Anwenden</button>
        {/if}
      {:else}
        <button class="knopf still" onclick={() => (rezepte.modus = "ansehen")}><i class="fa-solid fa-scroll"></i> Rezepte ansehen</button>
      {/if}
    </div>
  </div>

  {#if !rezepte.geladen}
    <div class="rz-meldung"><i class="fa-solid fa-spinner fa-spin"></i><span>Rezepte werden geladen ...</span></div>
  {:else if modus === "neu"}
    <RezeptNeu {blatt} {verlauf} />
  {:else if modus === "anwenden" && r}
    <RezeptAnwenden {blatt} rezept={r} />
  {:else}
    <div class="inhalt">
      <div class="vw-zweiteilig">
        <RezeptListe />
        <div class="vw-hauptspalte">
          {#if r}
            <RezeptSeite rezept={r} />
          {:else}
            <div class="rz-meldung">
              <i class="fa-solid fa-scroll"></i>
              <p>Ein Rezept merkt sich Schritte zum Aufräumen, etwa "ort zusammenführen" oder "umsatz als Betrag", und wendet sie auf die nächste Datei gleicher Bauart an.</p>
              <p>So entsteht eins: im Werkzeug Bereinigen aufräumen, dann hier "Neues Rezept aus dem Verlauf".</p>
              <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "werkzeug", kennung: "bereinigen" })}><i class="fa-solid fa-broom"></i> Zum Bereinigen</button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
