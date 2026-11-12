<script lang="ts">
  // Befehlsfeld im Kopf (STB-16, Rückmeldung 12.11.2026): getippt wird direkt im Feld, die Treffer erscheinen in Gruppen
  // als Liste darunter, zuletzt benutzte oben. Kein Dialog und kein Abdunkeln: schwebend ist nur das Lexikon. Ganz ohne
  // Maus: ⌘ K springt ins Feld, Pfeile wählen, Enter führt aus, Escape schließt und gibt den Fokus zurück.
  import "./palette.css";
  import { onMount, tick, untrack } from "svelte";
  import { zuletzt } from "../../zustand/zuletzt.svelte";
  import { paletteKappen } from "../aktionen/tastatur";
  import { abschnitte } from "./suche";
  import { ordnen, type Fund, type Paletteneintrag } from "./eintraege";
  import { quellen } from "./quellen";
  import { palette } from "./palettenstand.svelte";

  let anfrage = $state("");
  let wahl = $state(0);
  let feld: HTMLInputElement | undefined = $state();
  let liste: HTMLElement | undefined = $state();
  let ort: HTMLElement | undefined = $state();
  // Je Öffnen einmal gesammelt (gleich beim Öffnen, damit schon der erste Buchstabe trifft): solange die Liste offen
  // ist, ändert sich nichts an Befehlen und Dokumenten
  const eintraege = $derived<readonly Paletteneintrag[]>(palette.offen ? untrack(quellen) : []);

  onMount(() => palette.feldSetzen(feld ?? null));

  const gruppen = $derived(palette.offen ? ordnen(eintraege, anfrage, zuletzt.liste) : []);
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
    anfrage = "";
    palette.schliessen();
    // Gleich im Tastendruck oder Klick, damit Datei-Wähler und Zwischenablage erlaubt bleiben
    f.eintrag.ausfuehren();
  }

  function schliessen(): void {
    anfrage = "";
    palette.schliessen();
  }

  function taste(e: KeyboardEvent): void {
    if (!palette.offen && e.key !== "Escape") palette.oeffnen();
    const weiter: Record<string, () => void> = {
      ArrowDown: () => void zeigen(wahl + 1),
      ArrowUp: () => void zeigen(wahl - 1),
      PageDown: () => void zeigen(Math.min(wahl + 8, funde.length - 1)),
      PageUp: () => void zeigen(Math.max(wahl - 8, 0)),
      Enter: () => ausfuehren(funde[wahl]),
      Escape: schliessen,
    };
    const tun = weiter[e.key];
    if (!tun) return;
    e.preventDefault();
    tun();
  }

  /** Klick außerhalb schließt, ohne den Fokus zurückzuholen (er gehört dann dorthin, wo geklickt wurde) */
  function aussen(e: PointerEvent): void {
    if (palette.offen && ort && !ort.contains(e.target as Node)) {
      anfrage = "";
      palette.schliessen(false);
    }
  }
</script>

<svelte:window onpointerdown={aussen} />

<div class="pl-ort" bind:this={ort}>
  <label class="befehl-feld" class:offen={palette.offen} title="Befehle, Dokumente und Ansichten finden">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input
      bind:this={feld}
      bind:value={anfrage}
      oninput={() => {
        wahl = 0;
        palette.oeffnen();
      }}
      onfocus={() => palette.oeffnen()}
      onclick={() => palette.oeffnen()}
      onkeydown={taste}
      placeholder="Befehl oder Dokument"
      aria-label="Befehl, Dokument oder Ansicht suchen"
      role="combobox"
      aria-expanded={palette.offen}
      aria-controls="pl-liste"
      aria-activedescendant={palette.offen && funde.length ? `pl-${wahl}` : undefined}
      autocomplete="off"
      spellcheck="false"
    />
    {#if !palette.offen}<span class="rechts">{#each paletteKappen() as k, i (i)}<span class="taste">{k}</span>{/each}</span>{/if}
  </label>
  {#if palette.offen}
    <div class="pl-fenster">
      <div class="pl-liste" id="pl-liste" role="listbox" aria-label="Treffer" bind:this={liste}>
        {#each gruppen as g (g.titel)}
          <div class="pl-gruppe" role="presentation">{g.titel} <span class="rechts">{g.funde.length}</span></div>
          {#each g.funde as f (f.eintrag.kennung)}
            {@const i = nummer(f)}
            <!-- svelte-ignore a11y_click_events_have_key_events (die Tasten bedient das Feld, der Eintrag bekommt nie den Fokus) -->
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
  {/if}
</div>
