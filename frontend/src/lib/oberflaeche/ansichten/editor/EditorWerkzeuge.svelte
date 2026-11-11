<script lang="ts">
  // Werkzeugzeile des Editors: Format, Formatieren, Kompakt, Schlüssel sortieren, Suchen. Jeder Umbau ersetzt den Text
  // über die Sitzung (ein Verlaufsschritt mit Rückgängig); welche Formate das können, sagt FORMATIERBAR.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { FORMATIERBAR, umbauen, type Umbau, type Umbauart } from "../../../analyse/formatieren";
  import { schluesselSortieren } from "../../../analyse/sortieren";
  import type { EditorZustand } from "./editorZustand.svelte";
  import Formatwahl from "./Formatwahl.svelte";

  let {
    blatt,
    z,
    suchfeld = $bindable(),
    weiter,
    zumEditor,
  }: { blatt: Arbeitsblatt; z: EditorZustand; suchfeld?: HTMLInputElement; weiter: (rueckwaerts: boolean) => void; zumEditor: () => void } = $props();

  const kennung = $derived(blatt.analyse?.format.kennung ?? null);
  const kann = $derived(kennung !== null && FORMATIERBAR.includes(kennung));
  const lesbar = $derived(!!blatt.analyse?.index);
  const nichtLesbar = "Das Dokument ist nicht lesbar; bitte zuerst die Fehler beheben";
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  let laeuft = $state(false);

  const TITEL: Record<Umbauart, string> = { formatieren: "Formatiert", kompakt: "Kompakt geschrieben" };

  async function ersetzen(rechnen: () => Promise<Umbau | null>, titel: string): Promise<void> {
    if (laeuft) return;
    laeuft = true;
    try {
      const r = await rechnen();
      if (!r) return;
      if (!r.ok) return meldungen.zeigen({ text: r.fehler, art: "fehler" });
      const e = await blatt.ausfuehrenMitMeldung("text.ersetzen", { text: r.text, titel }, { ort: "Editor" });
      if (e.ok && !e.geaendert) meldungen.zeigen({ text: "Nichts zu ändern", art: "hinweis" });
    } finally {
      laeuft = false;
    }
  }

  function umbau(art: Umbauart): void {
    const k = kennung;
    if (k === null) return;
    void ersetzen(async () => umbauen(k, art, blatt.sitzung.text), TITEL[art]);
  }

  function sortieren(): void {
    void ersetzen(async () => {
      const a = await blatt.analyseAbwarten();
      if (!a?.index || a.revision !== blatt.sitzung.revision) return { ok: false, fehler: nichtLesbar };
      return schluesselSortieren(blatt.sitzung.text, a.index);
    }, "Schlüssel sortiert");
  }

  function suchtaste(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      weiter(e.shiftKey);
    } else if (e.key === "Escape") {
      e.preventDefault();
      zumEditor();
    }
  }
</script>

<div class="werkzeugzeile ed-werkzeugzeile">
  <Formatwahl {blatt} />
  {#if kann}
    <button class="knopf" disabled={!lesbar || laeuft} title={lesbar ? "Einrücken und Abstände vereinheitlichen; lässt sich rückgängig machen" : nichtLesbar} onclick={() => umbau("formatieren")}>
      <i class="fa-solid fa-indent"></i><span class="ed-lang">Formatieren</span>
    </button>
    <button class="knopf" disabled={!lesbar || laeuft} title={lesbar ? "Ohne Einrückung und Leerzeilen schreiben; lässt sich rückgängig machen" : nichtLesbar} onclick={() => umbau("kompakt")}>
      <i class="fa-solid fa-compress"></i><span class="ed-lang">Kompakt</span>
    </button>
    <button class="knopf" disabled={!lesbar || laeuft} title={lesbar ? "Schlüssel jeder Ebene alphabetisch ordnen; lässt sich rückgängig machen" : nichtLesbar} onclick={sortieren}>
      <i class="fa-solid fa-arrow-down-a-z"></i><span class="ed-lang">Schlüssel sortieren</span>
    </button>
  {/if}
  <div class="rechts">
    <label class="feld ed-suche" title="Enter: nächster Treffer, Umschalt+Enter: voriger, {mac ? '⌘ ⌥ F' : 'Strg+Alt+F'}: Suchen und Ersetzen">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input placeholder="Suchen" aria-label="Im Text suchen" bind:this={suchfeld} bind:value={z.suche} onkeydown={suchtaste} />
      <span class="taste">{mac ? "⌘" : "Strg"}</span><span class="taste">F</span>
    </label>
  </div>
</div>
