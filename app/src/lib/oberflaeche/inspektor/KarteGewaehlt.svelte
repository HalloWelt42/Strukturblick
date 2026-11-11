<script lang="ts">
  // Karte "Gewählt": Art, Wert im Wertfeld, bei einfachen Werten "Ändern" (gleiche Bearbeitung wie im Baum), darunter
  // Zeile und Spalte im Text.
  import { KNOTEN_NAME, inhalt, istBehaelter, zeigerVon, type KnotenArt, type Strukturindex } from "../../kern";
  import { umfang, wertAnzeige } from "../../analyse/baumbeschreibung";
  import { eingabeAnfang } from "../../analyse/werteingabe";
  import { textstelle } from "../../analyse/textstelle";
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import WertEingabe from "../bausteine/WertEingabe.svelte";
  import { wertSetzen } from "../bausteine/wertSetzen";

  let { blatt, index, text, k, aktuell }: { blatt: Arbeitsblatt; index: Strukturindex; text: string; k: number; aktuell: boolean } = $props();

  /** Längere Werte zeigt das Wertfeld gekürzt */
  const WERT_HOECHSTENS = 2000;

  const art = $derived(index.art[k] as KnotenArt);
  const einfach = $derived(!istBehaelter(art));
  const anzeige = $derived(einfach ? wertAnzeige(index, text, k, WERT_HOECHSTENS) : umfang(index, text, k));
  const stelle = $derived(textstelle(text, index.von[k]));
  let bearbeiten = $state(false);

  async function uebernehmen(eingabe: string): Promise<void> {
    const zeiger = zeigerVon(index, text, k);
    const alteArt = art;
    bearbeiten = false;
    await wertSetzen(blatt, zeiger, alteArt, eingabe, "Inspektor");
  }
</script>

<div class="karte">
  <div class="karte-titel">Gewählt <span class="rechts abzeichen">{KNOTEN_NAME[art]}</span></div>
  {#if bearbeiten}
    <WertEingabe anfang={eingabeAnfang(art, inhalt(index, text, k))} variante="feld" onuebernehmen={(e) => void uebernehmen(e)} onabbrechen={() => (bearbeiten = false)} />
  {:else}
    <div class="wertfeld">{anzeige}</div>
  {/if}
  {#if einfach && !bearbeiten}
    <div class="knopf-reihe abstand">
      <button class="knopf" disabled={!aktuell} title={aktuell ? "Wert direkt ändern (Enter übernimmt, Escape bricht ab)" : "Das Dokument wird gerade gelesen"} onclick={() => (bearbeiten = true)}>
        <i class="fa-solid fa-pen"></i> Ändern
      </button>
    </div>
  {/if}
  <dl class="paare abstand">
    <dt>Zeile</dt><dd class="mono">{stelle.zeile}, Spalte {stelle.spalte}</dd>
  </dl>
</div>

<style>
  .abstand {
    margin: 10px 0 0;
  }
</style>
