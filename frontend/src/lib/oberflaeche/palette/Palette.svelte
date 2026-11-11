<script lang="ts">
  // Befehlspalette (Entwurf entwuerfe/palette.html): ein Feld, darunter die Treffer in Gruppen, zuletzt benutzte oben.
  // Ganz ohne Maus: Pfeile wählen, Enter führt aus, Escape oder ⌘ K schließt; der Fokus geht danach zurück.
  import "./palette.css";
  import { tick } from "svelte";
  import { zuletzt } from "../../zustand/zuletzt.svelte";
  import { fokussieren } from "../bausteine/fokus";
  import { abschnitte } from "./suche";
  import { ordnen, type Fund } from "./eintraege";
  import { quellen } from "./quellen";
  import { palette } from "./palettenstand.svelte";

  let anfrage = $state("");
  let wahl = $state(0);
  let liste: HTMLElement | undefined = $state();

  // Einmal je Öffnen gesammelt: während die Palette offen ist, ändert sich nichts an Befehlen und Dokumenten
  const eintraege = quellen();
  const gruppen = $derived(ordnen(eintraege, anfrage, zuletzt.liste));
  const funde = $derived(gruppen.flatMap((g) => g.funde));
  const nummer = (f: Fund): number => funde.indexOf(f);

  async function zeigen(i: number): Promise<void> {
    wahl = (i + funde.length) % Math.max(funde.length, 1);
    await tick();
    liste?.querySelector(`#pl-${wahl}`)?.scrollIntoView({ block: "nearest" });
  }

  function ausfuehren(f: Fund | undefined): void {
    if (!f) return;
    zuletzt.merken(f.eintrag.kennung);
    palette.schliessen();
    // Gleich im Tastendruck oder Klick, damit Datei-Wähler und Zwischenablage erlaubt bleiben
    f.eintrag.ausfuehren();
  }

  function taste(e: KeyboardEvent): void {
    const weiter: Record<string, () => void> = {
      ArrowDown: () => void zeigen(wahl + 1),
      ArrowUp: () => void zeigen(wahl - 1),
      PageDown: () => void zeigen(Math.min(wahl + 8, funde.length - 1)),
      PageUp: () => void zeigen(Math.max(wahl - 8, 0)),
      Tab: () => void zeigen(e.shiftKey ? wahl - 1 : wahl + 1),
      Enter: () => ausfuehren(funde[wahl]),
      Escape: () => palette.schliessen(),
    };
    const tun = weiter[e.key];
    if (!tun) return;
    e.preventDefault();
    tun();
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="pl-abdunkeln" onclick={() => palette.schliessen()}></div>
<div class="pl-fenster" role="dialog" aria-modal="true" aria-label="Befehlspalette">
  <div class="pl-eingabe">
    <label class="feld">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input
        bind:value={anfrage}
        oninput={() => (wahl = 0)}
        use:fokussieren
        onkeydown={taste}
        placeholder="Befehl, Dokument oder Ansicht"
        aria-label="Befehl, Dokument oder Ansicht suchen"
        role="combobox"
        aria-expanded="true"
        aria-controls="pl-liste"
        aria-activedescendant={funde.length ? `pl-${wahl}` : undefined}
        autocomplete="off"
        spellcheck="false"
      />
    </label>
  </div>
  <div class="pl-liste" id="pl-liste" role="listbox" aria-label="Treffer" bind:this={liste}>
    {#each gruppen as g (g.titel)}
      <div class="pl-gruppe" role="presentation">{g.titel} <span class="rechts">{g.funde.length}</span></div>
      {#each g.funde as f (f.eintrag.kennung)}
        {@const i = nummer(f)}
        <!-- svelte-ignore a11y_click_events_have_key_events (die Tasten bedient das Suchfeld, der Eintrag bekommt nie den Fokus) -->
        <div
          class="pl-eintrag"
          class:gewaehlt={i === wahl}
          id="pl-{i}"
          role="option"
          aria-selected={i === wahl}
          tabindex="-1"
          onpointermove={() => (wahl = i)}
          onpointerdown={(e) => e.preventDefault()}
          onclick={() => ausfuehren(f)}
        >
          <i class="fa-solid {f.eintrag.symbol} pl-symbol"></i>
          <span class="pl-text">
            <span class="pl-name">{#each abschnitte(f.eintrag.titel, f.stellen) as a, k (k)}{#if a.getroffen}<b class="pl-hl">{a.text}</b>{:else}{a.text}{/if}{/each}</span>
            {#if f.eintrag.beschreibung}<span class="pl-beschreibung">{f.eintrag.beschreibung}</span>{/if}
          </span>
          <span class="pl-rechts">
            {#each f.eintrag.kappen ?? [] as kappe, k (k)}<span class="taste">{kappe}</span>{/each}
            {#if f.eintrag.abzeichen}<span class="abzeichen">{f.eintrag.abzeichen}</span>{/if}
          </span>
        </div>
      {/each}
    {:else}
      <p class="pl-leer">Nichts gefunden. Andere Schreibweise oder weniger Buchstaben versuchen.</p>
    {/each}
  </div>
  <div class="pl-fuss">
    <span><span class="taste">↑</span><span class="taste">↓</span> wählen</span>
    <span><span class="taste">Enter</span> ausführen</span>
    <span><span class="taste">Escape</span> schließen</span>
    <span class="rechts">{funde.length === 1 ? "1 Treffer" : `${funde.length} Treffer`}</span>
  </div>
</div>
