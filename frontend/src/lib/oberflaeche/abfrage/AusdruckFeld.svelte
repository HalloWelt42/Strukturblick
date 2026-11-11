<script lang="ts">
  // Ausdrucksfeld der Abfrage (CodeMirror). Der Text gehört dem Zustand der Abfrage: Tippen meldet ihn, ein Wechsel der
  // Sprache oder ein Ausdruck aus dem Verlauf setzt ihn neu. Sprache, Ergänzung und Fehlerstelle folgen den Eigenschaften.
  import { onMount } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { feldErweiterungen, feldZustand, fehlerSetzen, sprachFach, sprachTeile, type Feldaufbau, type Fehlerstelle } from "./ausdruck";

  let {
    text,
    aufbau,
    fehler,
    beschriftung,
    onaenderung,
    onuebernehmen,
    onzuklappen,
  }: {
    text: string;
    aufbau: Feldaufbau;
    fehler: Fehlerstelle | null;
    beschriftung: string;
    onaenderung: (text: string) => void;
    onuebernehmen: () => void;
    onzuklappen: () => void;
  } = $props();

  let huelle: HTMLDivElement;
  let ansicht: EditorView | null = null;

  onMount(() => {
    const v = new EditorView({
      parent: huelle,
      state: feldZustand(text, feldErweiterungen(aufbau, { aenderung: (t) => onaenderung(t), uebernehmen: () => onuebernehmen(), zuklappen: () => onzuklappen() })),
    });
    v.contentDOM.setAttribute("aria-label", beschriftung);
    ansicht = v;
    v.focus();
    return () => {
      v.destroy();
      ansicht = null;
    };
  });

  // Text von außen (Sprache gewechselt, aus dem Verlauf): nur ersetzen, wenn er wirklich anders ist
  $effect(() => {
    const t = text;
    if (ansicht && ansicht.state.doc.toString() !== t) ansicht.dispatch({ changes: { from: 0, to: ansicht.state.doc.length, insert: t } });
  });

  $effect(() => {
    const teile = sprachTeile(aufbau);
    ansicht?.dispatch({ effects: sprachFach.reconfigure(teile) });
  });

  $effect(() => {
    const f = fehler;
    ansicht?.dispatch({ effects: fehlerSetzen.of(f) });
  });

  $effect(() => {
    ansicht?.contentDOM.setAttribute("aria-label", beschriftung);
  });
</script>

<div class="af-editor af-cm" bind:this={huelle}></div>

<style>
  .af-cm {
    padding: 0;
  }
</style>
