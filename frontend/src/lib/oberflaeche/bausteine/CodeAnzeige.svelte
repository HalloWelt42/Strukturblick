<script lang="ts">
  // Erzeugter Code zum Lesen: CodeMirror nur lesend, mit Zeilennummern und Hervorhebung wie im Editor. Ändert sich der
  // Text oder die Sprache, wird nur der Inhalt getauscht, die Ansicht bleibt.
  import { onMount } from "svelte";
  import { EditorView } from "@codemirror/view";
  import { leseAufbau } from "../ansichten/editor/erweiterungen";
  import { codespracheLaden, type Codesprache } from "./codesprachen";

  let { text, sprache, beschriftung }: { text: string; sprache: Codesprache; beschriftung: string } = $props();

  let huelle: HTMLDivElement;
  let ansicht: EditorView | null = null;
  // Die Beschriftung für Vorleseprogramme trägt die Hülle (sie folgt der gezeigten Datei)
  const aufbau = leseAufbau("Erzeugter Code");

  onMount(() => {
    ansicht = new EditorView({ parent: huelle, doc: text, extensions: aufbau.erweiterungen });
    return () => ansicht?.destroy();
  });

  $effect(() => {
    const t = text;
    if (ansicht && ansicht.state.doc.toString() !== t) ansicht.dispatch({ changes: { from: 0, to: ansicht.state.doc.length, insert: t } });
  });

  $effect(() => {
    const s = sprache;
    void codespracheLaden(s).then((erweiterung) => {
      if (s === sprache) ansicht?.dispatch({ effects: aufbau.sprache.reconfigure(erweiterung) });
    });
  });
</script>

<div class="code-anzeige" role="region" aria-label={beschriftung} bind:this={huelle}></div>

<style>
  .code-anzeige {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .code-anzeige :global(.cm-editor) {
    flex: 1;
    min-height: 0;
  }
</style>
