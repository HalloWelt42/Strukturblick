<script lang="ts">
  // Eine Zelle: einfacher Wert als Text, verschachtelter als kurze Vorschau, fehlender Schlüssel und leerer Text
  // gedämpft. Wählen und Doppelklick erledigt das Raster über data-zeile/data-spalte; hier steht nur die Anzeige.
  import { KEIN, KnotenArt, type Strukturindex } from "../../../kern/strukturindex";
  import { vorschau } from "../../../analyse/tabelle";
  import ZellenEingabe from "./ZellenEingabe.svelte";

  let {
    index,
    text,
    k,
    zeile,
    spalte,
    fix,
    rechts,
    gewaehlt,
    aktiv,
    vorher,
    bearbeitung,
    onuebernehmen,
    onabbrechen,
  }: {
    index: Strukturindex;
    text: string;
    k: number;
    zeile: number;
    spalte: number;
    fix: boolean;
    rechts: boolean;
    gewaehlt: boolean;
    aktiv: boolean;
    /** Wert vor der eben gemachten Änderung, null wenn die Zelle nicht eben geändert wurde */
    vorher: string | null;
    /** Anfangswert, wenn die Zelle gerade bearbeitet wird */
    bearbeitung: string | null;
    onuebernehmen: (wert: string, schritt: 0 | 1 | -1, perTaste: boolean) => void;
    onabbrechen: () => void;
  } = $props();

  /** Mehr zeigt eine Zelle nicht an; der ganze Wert steht im Inspektor */
  const ANZEIGE_HOECHSTENS = 300;

  const v = $derived(k === KEIN ? null : vorschau(index, text, k));
  const klasse = $derived(
    v === null ? "" : v.art === KnotenArt.objekt ? "w-objekt tb-verschachtelt" : v.art === KnotenArt.liste ? "w-liste tb-verschachtelt" : v.art === KnotenArt.wahrheitswert ? "w-bool" : v.art === KnotenArt.nichts ? "w-null" : "",
  );
  const randLeer = $derived(v !== null && v.art === KnotenArt.text && v.text !== "" && /\s$/.test(v.text));
</script>

<div
  class="tb-zelle"
  class:tb-fix={fix}
  class:tb-rechts={rechts}
  class:tb-gewaehlt={gewaehlt}
  class:tb-aktiv={aktiv}
  class:tb-geaendert={vorher !== null}
  class:tb-bearbeiten={bearbeitung !== null}
  role="gridcell"
  aria-selected={aktiv}
  data-zeile={zeile}
  data-spalte={spalte}
>
  {#if bearbeitung !== null}
    <ZellenEingabe anfang={bearbeitung} {onuebernehmen} {onabbrechen} />
  {:else if v === null}
    <span class="tb-leer" title="Diese Zeile hat den Schlüssel nicht">fehlt</span>
  {:else if v.text === "" && v.art === KnotenArt.text}
    <span class="tb-leer">leer</span>
  {:else}
    <span class="tb-wert {klasse}" title={v.text.length > 40 ? v.text.slice(0, 1000) : undefined}>{v.text.length > ANZEIGE_HOECHSTENS ? v.text.slice(0, ANZEIGE_HOECHSTENS) + " ..." : v.text}</span>
    {#if randLeer}<span class="tb-leerzeichen" title="Leerzeichen am Ende"></span>{/if}
  {/if}
  {#if vorher !== null && bearbeitung === null}
    <i class="fa-solid fa-pen tb-geaendert-zeichen" title="Eben geändert, vorher {vorher}"></i>
  {/if}
</div>
