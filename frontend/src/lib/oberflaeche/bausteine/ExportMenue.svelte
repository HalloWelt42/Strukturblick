<script lang="ts">
  // Menü zum Mitnehmen eines Ergebnisses (Abfrage, gefilterte Tabelle, Treffer im Baum): als Datei in einem der
  // Ausgabeformate oder, wenn angeboten, als neues Dokument in der Ablage. Die Formate kommen aus der einen Liste.
  import { AUSGABEFORMATE, type Ausgabeformat } from "../../analyse/ausgabe";
  import { herunterladen } from "../schale/dateien";

  let {
    titel = "Herunterladen",
    erklaerung = "Ganzes Ergebnis als Datei",
    gesperrt = false,
    nachOben = false,
    rechtsbuendig = false,
    holen,
    dateiname,
    neuesDokument,
  }: {
    titel?: string;
    erklaerung?: string;
    gesperrt?: boolean;
    nachOben?: boolean;
    rechtsbuendig?: boolean;
    /** Der Text im gewählten Format; null, wenn es nichts gibt (Fehler meldet der Aufrufer) */
    holen: (f: Ausgabeformat) => Promise<string | null> | string | null;
    dateiname: (f: Ausgabeformat) => string;
    /** Ergebnis als neues Dokument (neuer Datensatz in der Ablage); ohne: nur Dateien */
    neuesDokument?: () => void;
  } = $props();

  let offen = $state(false);
  let huelle: HTMLElement | undefined = $state();

  async function laden(f: Ausgabeformat): Promise<void> {
    offen = false;
    const text = await holen(f);
    if (text !== null) herunterladen(dateiname(f), text);
  }
</script>

<svelte:window onpointerdown={(e) => offen && huelle && !e.composedPath().includes(huelle) && (offen = false)} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<span class="huelle" bind:this={huelle}>
  <button class="knopf" disabled={gesperrt} aria-expanded={offen} title={erklaerung} onclick={() => (offen = !offen)}>
    <i class="fa-solid fa-download"></i><span class="af-breit">{titel}</span> <i class="fa-solid fa-caret-down"></i>
  </button>
  {#if offen}
    <div class="menue karte" class:oben={nachOben} class:rechtsbuendig role="menu">
      {#if neuesDokument}
        <button class="eintrag" role="menuitem" onclick={() => ((offen = false), neuesDokument?.())}>
          <i class="fa-solid fa-file-circle-plus"></i><span class="name">Als neues Dokument in der Ablage</span>
        </button>
      {/if}
      {#each AUSGABEFORMATE as f (f.kennung)}
        <button class="eintrag" role="menuitem" onclick={() => void laden(f.kennung)}>
          <span class="abzeichen">{f.name}</span><span class="name">{f.erklaerung}</span>
        </button>
      {/each}
    </div>
  {/if}
</span>

<style>
  .huelle {
    position: relative;
  }
  .menue {
    position: absolute;
    left: 0;
    top: calc(100% + 4px);
    z-index: 10;
    margin: 0;
    min-width: 320px;
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .menue.rechtsbuendig {
    left: auto;
    right: 0;
  }
  .menue.oben {
    top: auto;
    bottom: calc(100% + 4px);
  }
  .eintrag {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .eintrag:hover {
    background: var(--akzent-weich);
  }
  .eintrag > i {
    width: 2.6em;
    text-align: center;
    color: var(--akzent);
  }
</style>
