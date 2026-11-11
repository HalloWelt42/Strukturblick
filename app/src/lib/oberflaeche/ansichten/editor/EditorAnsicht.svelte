<script lang="ts">
  // Ansicht Editor (entwuerfe/editor.html): Werkzeugzeile, CodeMirror auf dem Text der Sitzung, Diagnosen darunter.
  // Die Abstimmung mit der Sitzung macht die Steuerung; hier wird nur verdrahtet, was das Blatt meldet.
  import { onMount, untrack } from "svelte";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { einstellungen } from "../../../zustand/einstellungen.svelte";
  import { EditorZustand } from "./editorZustand.svelte";
  import { Editorsteuerung } from "./steuerung";
  import EditorWerkzeuge from "./EditorWerkzeuge.svelte";
  import Diagnoseliste from "./Diagnoseliste.svelte";
  import "./editor.css";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = untrack(() => blatt.zustandFuer("editor", () => new EditorZustand()));

  let wirt: HTMLDivElement;
  let suchfeld: HTMLInputElement | undefined = $state();
  let steuerung = $state.raw<Editorsteuerung | null>(null);

  function insSuchfeld(vorschlag: string): void {
    if (vorschlag) z.suche = vorschlag;
    suchfeld?.focus();
    suchfeld?.select();
  }

  onMount(() => {
    const s = new Editorsteuerung(wirt, blatt, z, { suchen: insSuchfeld });
    steuerung = s;
    return () => s.zerstoeren();
  });

  // Hervorhebung nach der Sprache des gelesenen Formats
  $effect(() => {
    const sprache = blatt.analyse?.format.sprache ?? "";
    const s = steuerung;
    untrack(() => s?.sprachwahl(sprache));
  });

  // Diagnosen nur aus der Analyse dieser Revision; sonst bleiben die alten, über die Änderungen abgebildet
  $effect(() => {
    const a = blatt.analyse;
    const s = steuerung;
    if (s && a && blatt.aktuell) untrack(() => s.analyseNeu(a));
  });

  // Gewähltes von außen (Baum, Tabelle, Inspektor): Cursor springt an den Wert
  $effect(() => {
    const zeiger = blatt.gewaehlt;
    const s = steuerung;
    untrack(() => s?.gewaehltVonAussen(zeiger));
  });

  $effect(() => {
    const text = z.suche;
    const s = steuerung;
    untrack(() => s?.suchen(text));
  });

  $effect(() => {
    void einstellungen.schrift;
    const s = steuerung;
    untrack(() => s?.neuMessen());
  });
</script>

<EditorWerkzeuge {blatt} {z} bind:suchfeld weiter={(r) => steuerung?.weitersuchen(r)} zumEditor={() => steuerung?.view.focus()} />
<div class="inhalt ed-inhalt" bind:this={wirt}></div>
<Diagnoseliste {blatt} {z} springen={(n) => steuerung?.zuBefund(n)} />
