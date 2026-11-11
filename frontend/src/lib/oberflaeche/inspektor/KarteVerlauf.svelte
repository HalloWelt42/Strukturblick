<script lang="ts">
  // Karte "Verlauf", kompakt nach entwuerfe/verlauf.html: die letzten Vorgänge, der aktuelle Stand markiert, spätere
  // (zurückgenommene) grau. Ein Klick springt zu diesem Stand.
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { ANSICHTEN } from "../ansichten/registrierung";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  /** So viele Vorgänge zeigt die Karte */
  const ZAHL = 6;

  const v = $derived(blatt.verlauf);
  const gezeigt = $derived(
    Array.from({ length: Math.min(ZAHL, v.eintraege.length) }, (_, j) => v.eintraege.length - 1 - j).map((i) => ({ i, aufruf: v.eintraege[i].aufruf })),
  );
  /** Der Anfang passt noch in die Karte */
  const mitAnfang = $derived(v.eintraege.length > 0 && v.eintraege.length <= ZAHL);

  const uhrzeit = (iso: string): string => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const symbol = (ort: string): string => ANSICHTEN.find((a) => a.titel === ort)?.symbol ?? "fa-pen-to-square";
  const anzahl = (n: number): string => `${n} ${n === 1 ? "Vorgang" : "Vorgänge"}`;
</script>

<div class="vorgaenge">
  <div class="karte-titel">Verlauf <span class="rechts">{anzahl(v.eintraege.length)}</span></div>
  {#each gezeigt as { i, aufruf } (i)}
    {@const aktuell = i === v.zeiger - 1}
    <button class="vorgang" class:aktuell class:spaeter={i >= v.zeiger} title={aktuell ? "Ist der aktuelle Stand" : `Zu Stand ${i + 1} springen`} onclick={() => blatt.springen(i + 1)}>
      <span class="nr">{i + 1}</span>
      <span class="text">
        <span class="titel">{aufruf.titel}</span>
        <span class="meta">
          <span class="mono">{uhrzeit(aufruf.zeit)}</span>
          <span class="abzeichen zweit"><i class="fa-solid {symbol(aufruf.ort)}"></i> {aufruf.ort}</span>
          {#if aktuell}<span class="abzeichen gut">Aktueller Stand</span>{/if}
        </span>
      </span>
    </button>
  {/each}
  {#if mitAnfang}
    <button class="vorgang" class:aktuell={v.zeiger === 0} title={v.zeiger === 0 ? "Ist der aktuelle Stand" : "Zum Stand beim Öffnen springen"} onclick={() => blatt.springen(0)}>
      <span class="nr">0</span>
      <span class="text">
        <span class="titel">Geöffnet</span>
        {#if v.zeiger === 0}<span class="meta"><span class="abzeichen gut">Aktueller Stand</span></span>{/if}
      </span>
    </button>
  {/if}
  {#if v.eintraege.length === 0}
    <p class="ohne text-3">Noch keine Änderungen</p>
  {/if}
</div>

<style>
  .vorgaenge {
    margin-top: var(--a3);
    background-color: var(--flaeche-panel);
    background-image: var(--erhaben);
    box-shadow: var(--kante), var(--schatten-ruhig);
  }
  .vorgaenge > .karte-titel {
    margin: 0;
    padding: var(--a3) var(--a3) var(--a2);
  }
  .vorgang {
    display: grid;
    grid-template-columns: 2.4ch minmax(0, 1fr);
    align-items: start;
    gap: 2px var(--a2);
    width: 100%;
    padding: var(--a2) var(--a3);
    border: 0;
    background: transparent;
    box-shadow: inset 0 -1px 0 var(--rand-1);
    color: var(--text-1);
    text-align: left;
    cursor: pointer;
  }
  .vorgang:hover {
    background: var(--akzent-weich);
  }
  .nr {
    font-family: var(--schrift-mono);
    font-size: var(--marke);
    color: var(--text-3);
    text-align: right;
    line-height: 1.5;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .titel {
    font-size: var(--klein);
    font-weight: 600;
    line-height: 1.3;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--a1) var(--a2);
    font-size: var(--marke);
    color: var(--text-3);
  }
  .meta .mono {
    color: var(--text-2);
  }
  .vorgang.aktuell {
    background: var(--flaeche-hervor);
  }
  :global(:root[data-theme="dunkel"]) .vorgang.aktuell {
    background: var(--akzent-weich);
  }
  .vorgang.spaeter {
    color: var(--text-3);
  }
  .vorgang.spaeter .titel {
    font-weight: 500;
  }
  .ohne {
    margin: 0;
    padding: 0 var(--a3) var(--a3);
    font-size: var(--klein);
  }
</style>
