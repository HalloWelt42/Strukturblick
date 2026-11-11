<script lang="ts">
  // Raster der Tabelle, virtualisiert: nur die sichtbaren Zeilen stehen im DOM, Platzhalter darüber und darunter
  // halten die Rollhöhe. Kopf klebt oben (bündig), Zeilennummer und erste Spalte kleben links. Spaltenbreiten liegen
  // im Zustand des Blatts; der Name einer Spalte behält immer seinen Platz. Klicks und Tasten laufen über das Raster
  // (data-zeile, data-spalte, data-kopf), damit nicht jede Zelle eigene Handler braucht.
  import { onMount, tick } from "svelte";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { KnotenArt, type Strukturindex } from "../../../kern/strukturindex";
  import { ortVon, sichtStellen, spalteZu, zellenDerZeile, type Ort, type Spalte, type Tabelle } from "../../../analyse/tabelle";
  import type { Spaltenprofil } from "../../../analyse/spaltenprofil";
  import { breitenSchluessel, type TabellenZustand } from "./tabellenZustand.svelte";
  import Spaltenkopf from "./Spaltenkopf.svelte";
  import TabellenZelle from "./TabellenZelle.svelte";

  let {
    blatt,
    zustand,
    index,
    text,
    tabelle,
    listeZeiger,
    sicht,
    profile,
    ort,
    spalteGewaehlt,
    onwaehlen,
    onspalte,
    onbearbeiten,
    onuebernehmen,
    onabbrechen,
  }: {
    blatt: Arbeitsblatt;
    zustand: TabellenZustand;
    index: Strukturindex;
    text: string;
    tabelle: Tabelle;
    listeZeiger: string;
    sicht: Int32Array;
    profile: readonly Spaltenprofil[];
    ort: Ort | null;
    spalteGewaehlt: number;
    onwaehlen: (o: Ort) => void;
    onspalte: (spalte: number) => void;
    onbearbeiten: (o: Ort) => boolean;
    onuebernehmen: (wert: string, schritt: 0 | 1 | -1) => Promise<void>;
    onabbrechen: () => void;
  } = $props();

  /** Zeilen über und unter dem sichtbaren Bereich, die schon im DOM stehen (ruhiges Rollen) */
  const UEBERHANG = 8;
  /** Kleinste Breite beim Ziehen; der Name setzt ohnehin eine Untergrenze */
  const MINDESTBREITE = 40;

  let feld = $state<HTMLElement | null>(null);
  let kopfzeile = $state<HTMLElement | null>(null);
  let zeilenHoehe = $state(34);
  let kopfHoehe = $state(0);
  let feldHoehe = $state(0);

  const stellen = $derived(sichtStellen(tabelle, sicht));
  const erste = $derived(Math.min(sicht.length, Math.max(0, Math.floor(zustand.rollOben / zeilenHoehe) - UEBERHANG)));
  const letzte = $derived(Math.max(erste, Math.min(sicht.length, Math.ceil((zustand.rollOben + feldHoehe) / zeilenHoehe) + UEBERHANG)));
  const bereich = $derived(Array.from({ length: Math.max(0, letzte - erste) }, (_, n) => erste + n));
  const rechts = $derived(profile.map((p) => p.typ.art === KnotenArt.zahl || p.typ.siehtAusWie === "betrag"));
  const sortSpalte = $derived(zustand.sortierung ? spalteZu(tabelle, zustand.sortierung) : -1);
  const bearbeitungsOrt = $derived(zustand.bearbeitung ? ortVon(tabelle, zustand.bearbeitung.zeiger) : null);
  const geaendertOrt = $derived(zustand.geaendert ? ortVon(tabelle, zustand.geaendert.zeiger) : null);
  const spuren = $derived(["var(--tb-nr-breite)", ...tabelle.spalten.map(spur), "minmax(0, 1fr)"].join(" "));

  /** Breite einer Spalte: gezogene oder Vorgabe nach Typvorschlag, nie schmaler als der Name (Mono, 0,6 em je Zeichen) */
  function spur(s: Spalte, j: number): string {
    const px = zustand.breiten[breitenSchluessel(listeZeiger, s.name, s.selbst)];
    const fuerName = `calc(${Math.max(2, s.name.length)} * 0.62em + 2 * var(--a3) + 2px)`;
    const grund = px !== undefined ? `${px}px` : (profile[j]?.typ.titel.length ?? 0) > 14 ? "calc(var(--klein) * 18)" : "calc(var(--klein) * 13)";
    return `max(${grund}, ${fuerName})`;
  }

  function breiteSetzen(s: Spalte, px: number): void {
    zustand.breiten[breitenSchluessel(listeZeiger, s.name, s.selbst)] = Math.max(MINDESTBREITE, px);
  }

  function messen(): void {
    if (!feld) return;
    const h = parseFloat(getComputedStyle(feld).getPropertyValue("--zeile"));
    if (h > 0) zeilenHoehe = h;
    kopfHoehe = kopfzeile?.offsetHeight ?? 0;
    feldHoehe = feld.clientHeight;
  }

  onMount(() => {
    if (!feld) return;
    messen();
    feld.scrollTop = zustand.rollOben;
    feld.scrollLeft = zustand.rollLinks;
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(feld);
    if (kopfzeile) beobachter.observe(kopfzeile);
    if (ort) void sichtbarMachen(ort);
    return () => beobachter.disconnect();
  });

  function rollen(): void {
    if (!feld) return;
    zustand.rollOben = feld.scrollTop;
    zustand.rollLinks = feld.scrollLeft;
  }

  /** Zelle ins Bild rollen: senkrecht selbst gerechnet (der Kopf klebt darüber), waagrecht über den Browser. */
  async function sichtbarMachen(o: Ort): Promise<void> {
    if (!feld) return;
    const i = stellen[o.zeile];
    if (i === undefined || i < 0) return;
    const oben = i * zeilenHoehe;
    const sichtHoehe = feld.clientHeight - kopfHoehe;
    if (oben < feld.scrollTop) feld.scrollTop = oben;
    else if (oben + zeilenHoehe > feld.scrollTop + sichtHoehe) feld.scrollTop = oben + zeilenHoehe - sichtHoehe;
    zustand.rollOben = feld.scrollTop;
    await tick();
    feld.querySelector(`[data-zeile="${o.zeile}"][data-spalte="${o.spalte}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function ortAus(e: Event): Ort | null {
    const z = (e.target as HTMLElement).closest<HTMLElement>("[data-zeile]");
    if (!z) return null;
    return { zeile: Number(z.dataset.zeile), spalte: z.dataset.spalte === undefined ? -1 : Number(z.dataset.spalte) };
  }

  function klick(e: MouseEvent): void {
    const kopf = (e.target as HTMLElement).closest<HTMLElement>("[data-kopf]");
    if (kopf) {
      onspalte(Number(kopf.dataset.kopf));
      return;
    }
    const o = ortAus(e);
    if (o) onwaehlen(o);
  }

  function doppelklick(e: MouseEvent): void {
    const o = ortAus(e);
    if (o && o.spalte >= 0) onbearbeiten(o);
  }

  const PFEILE: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };

  function taste(e: KeyboardEvent): void {
    if (zustand.bearbeitung || e.metaKey || e.ctrlKey || e.altKey) return;
    const pfeil = PFEILE[e.key];
    if (pfeil) {
      e.preventDefault();
      if (sicht.length === 0) return;
      let ziel: Ort;
      const i = ort ? stellen[ort.zeile] : -1;
      if (!ort || i < 0) ziel = { zeile: sicht[0], spalte: 0 };
      else {
        const neueStelle = Math.max(0, Math.min(sicht.length - 1, i + pfeil[0]));
        const spalte = pfeil[1] === 0 ? ort.spalte : Math.max(0, Math.min(tabelle.spalten.length - 1, ort.spalte + pfeil[1]));
        ziel = { zeile: sicht[neueStelle], spalte };
      }
      onwaehlen(ziel);
      void sichtbarMachen(ziel);
    } else if ((e.key === "Enter" || e.key === "F2") && ort && ort.spalte >= 0) {
      e.preventDefault();
      onbearbeiten(ort);
    }
  }

  function zurueckZumRaster(): void {
    feld?.focus({ preventScroll: true });
  }

  function uebernehmen(wert: string, schritt: 0 | 1 | -1, perTaste: boolean): void {
    if (perTaste) zurueckZumRaster();
    void onuebernehmen(wert, schritt);
  }

  function abbrechen(): void {
    zurueckZumRaster();
    onabbrechen();
  }
</script>

<div
  class="inhalt tb-rollfeld"
  bind:this={feld}
  onscroll={rollen}
  onclick={klick}
  ondblclick={doppelklick}
  onkeydown={taste}
  role="grid"
  tabindex="0"
  aria-label="Tabelle"
  aria-rowcount={sicht.length + 1}
  aria-colcount={tabelle.spalten.length + 1}
  aria-readonly={!blatt.aktuell}
>
  <div class="tb-raster" style="--tb-spalten: {spuren}">
    <div class="tb-kopfzeile" role="row" bind:this={kopfzeile}>
      <div class="tb-nr" role="columnheader" title="Zeile in der Datei">Zeile</div>
      {#each tabelle.spalten as s, j (j)}
        <Spaltenkopf
          spalte={s}
          nummer={j}
          profil={profile[j]}
          fix={j === 0}
          gewaehlt={spalteGewaehlt === j}
          sortierung={sortSpalte === j && zustand.sortierung ? zustand.sortierung.richtung : null}
          onsortieren={() => zustand.sortierungWeiter(s.name, s.selbst)}
          onbreite={(px) => breiteSetzen(s, px)}
        />
      {/each}
      <div class="tb-rest"></div>
    </div>
    <div style="height: {erste * zeilenHoehe}px" aria-hidden="true"></div>
    {#each bereich as i (sicht[i])}
      {@const pos = sicht[i]}
      {@const zellen = zellenDerZeile(tabelle, index, pos)}
      {@const zeileAktiv = ort !== null && ort.zeile === pos}
      <div class="tb-zeile" class:tb-wechsel={i % 2 === 1} class:tb-zeile-aktiv={zeileAktiv} role="row" aria-rowindex={i + 2}>
        <div class="tb-nr" role="rowheader" data-zeile={pos} title="Zeile {tabelle.zeileImText[pos]} in der Datei; Klick wählt den ganzen Eintrag">{tabelle.zeileImText[pos]}</div>
        {#each tabelle.spalten as _, j (j)}
          <TabellenZelle
            {index}
            {text}
            k={zellen[j]}
            zeile={pos}
            spalte={j}
            fix={j === 0}
            rechts={rechts[j]}
            gewaehlt={spalteGewaehlt === j}
            aktiv={zeileAktiv && spalteGewaehlt < 0 && ort?.spalte === j}
            vorher={geaendertOrt && geaendertOrt.zeile === pos && geaendertOrt.spalte === j && zustand.geaendert ? zustand.geaendert.vorher : null}
            bearbeitung={bearbeitungsOrt && bearbeitungsOrt.zeile === pos && bearbeitungsOrt.spalte === j && zustand.bearbeitung ? zustand.bearbeitung.anfang : null}
            onuebernehmen={uebernehmen}
            onabbrechen={abbrechen}
          />
        {/each}
        <div class="tb-rest"></div>
      </div>
    {/each}
    <div style="height: {(sicht.length - letzte) * zeilenHoehe}px" aria-hidden="true"></div>
    {#if sicht.length === 0}
      <div class="tb-keine">Keine Zeile passt zum Filter.</div>
    {/if}
  </div>
</div>
