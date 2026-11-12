<script lang="ts">
  // Virtualisierter Baum: die sichtbare Folge rechnet baumzeilen.ts, ins DOM kommt nur das Fenster, das gerade zu sehen
  // ist. Klick wählt, Doppelklick oder Enter bearbeitet einen einfachen Wert, Pfeiltasten wählen und klappen. Wird von
  // außen etwas Verstecktes gewählt, klappen seine Eltern auf und der Baum rollt hin.
  import { onMount, tick, untrack } from "svelte";
  import { KEIN, istBehaelter, inhalt, knotenZu, zeigerVon, type Strukturindex } from "../../../kern";
  import { sichtbareZeilen, zeileVon, zuAufklappen, type Aufklappen } from "../../../analyse/baumzeilen";
  import { zeileBeschreiben } from "../../../analyse/baumbeschreibung";
  import { TREFFER, type Suchergebnis } from "../../../analyse/baumsuche";
  import { eingabeAnfang } from "../../../analyse/werteingabe";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { wertSetzen } from "../../bausteine/wertSetzen";
  import type { BaumZustand } from "./baumZustand.svelte";
  import BaumZeile from "./BaumZeile.svelte";

  let {
    blatt,
    zustand,
    index,
    text,
    aktuell,
    treffer,
    gewaehlterKnoten,
  }: {
    blatt: Arbeitsblatt;
    zustand: BaumZustand;
    index: Strukturindex;
    text: string;
    /** false, solange neu gelesen wird: dann kein Bearbeiten */
    aktuell: boolean;
    treffer: Suchergebnis | null;
    gewaehlterKnoten: number;
  } = $props();

  /** Zeilen über und unter dem sichtbaren Bereich, die mitgezeichnet werden */
  const PUFFER = 10;

  let rollfeld: HTMLDivElement;
  let flaeche: HTMLDivElement;
  let oben = $state(untrack(() => zustand.rollstand));
  let hoehe = $state(0);
  let zeilenhoehe = $state(0);
  /** Knoten, dessen Wert gerade bearbeitet wird */
  let bearbeitet = $state<number | null>(null);

  const umgeschaltet = $derived.by(() => {
    const knoten = new Set<number>();
    for (const z of zustand.umgeschaltet) {
      const k = knotenZu(index, text, z);
      if (k !== KEIN) knoten.add(k);
    }
    return knoten;
  });
  const aufklappen = $derived<Aufklappen>({ ebene: zustand.ebeneZahl, umgeschaltet, nurTreffer: zustand.nurTreffer ? treffer : null });
  const sicht = $derived(sichtbareZeilen(index, aufklappen));
  const h = $derived(zeilenhoehe || 1);
  // Anfang gerade halten, damit die Streifen (nth-child) beim Rollen nicht springen
  const anfang = $derived(Math.max(0, Math.floor(oben / h) - PUFFER) & ~1);
  const ende = $derived(Math.min(sicht.anzahl, Math.ceil((oben + hoehe) / h) + PUFFER));
  const fenster = $derived(Array.from({ length: Math.max(0, ende - anfang) }, (_, j) => zeileBeschreiben(index, text, sicht, anfang + j)));

  onMount(() => {
    rollfeld.scrollTop = zustand.rollstand;
  });

  const zeigerZu = (k: number): string => zeigerVon(index, text, k);
  const waehlen = (k: number): void => blatt.waehlen(zeigerZu(k));

  /** Das Rollereignis kann noch eintreffen, wenn die Liste schon abgebaut ist (Wechsel der Ansicht, bind:this ist dann
   *  null); darum gilt das Element des Ereignisses selbst */
  function gerollt(e: Event): void {
    oben = (e.currentTarget as HTMLElement).scrollTop;
    zustand.rollstand = oben;
  }

  /** Zeile `i` in den sichtbaren Bereich rollen, falls sie es nicht schon ist. */
  function hinrollen(i: number): void {
    const versatz = flaeche.getBoundingClientRect().top - rollfeld.getBoundingClientRect().top + rollfeld.scrollTop;
    const y = versatz + i * h;
    if (y < rollfeld.scrollTop) rollfeld.scrollTop = y;
    else if (y + h > rollfeld.scrollTop + rollfeld.clientHeight) rollfeld.scrollTop = y + h - rollfeld.clientHeight;
  }

  /** Gewählten Knoten zeigen: zugeklappte Eltern aufklappen, dann hinrollen. */
  async function zeigen(zeiger: string): Promise<void> {
    const k = knotenZu(index, text, zeiger);
    if (k === KEIN) return;
    const zu = zuAufklappen(index, aufklappen, k);
    if (zu.length) zustand.umschalten(...zu.map(zeigerZu));
    await tick();
    const i = zeileVon(sicht, k);
    if (i >= 0) hinrollen(i);
  }

  $effect(() => {
    const zeiger = blatt.gewaehlt;
    if (zeiger !== null) untrack(() => void zeigen(zeiger));
  });

  function bearbeiten(k: number): void {
    if (aktuell && !istBehaelter(index.art[k])) bearbeitet = k;
  }

  async function uebernehmen(k: number, eingabe: string): Promise<void> {
    const zeiger = zeigerZu(k);
    const art = index.art[k];
    bearbeitet = null;
    rollfeld.focus();
    await wertSetzen(blatt, zeiger, art, eingabe, "Baum");
  }

  function abbrechen(): void {
    bearbeitet = null;
    rollfeld.focus();
  }

  function alsTabelle(k: number): void {
    waehlen(k);
    blatt.zeigen({ art: "ansicht", kennung: "tabelle" });
  }

  function gehezu(i: number): void {
    if (sicht.anzahl === 0) return;
    const ziel = Math.max(0, Math.min(sicht.anzahl - 1, i));
    waehlen(sicht.knoten[ziel]);
    hinrollen(ziel);
  }

  function taste(e: KeyboardEvent): void {
    const i = gewaehlterKnoten === KEIN ? -1 : zeileVon(sicht, gewaehlterKnoten);
    const k = i >= 0 ? sicht.knoten[i] : KEIN;
    const klappbar = k !== KEIN && istBehaelter(index.art[k]) && index.erstesKind[k] !== KEIN;
    switch (e.key) {
      case "ArrowDown":
        gehezu(i + 1);
        break;
      case "ArrowUp":
        gehezu(i < 0 ? 0 : i - 1);
        break;
      case "Home":
        gehezu(0);
        break;
      case "End":
        gehezu(sicht.anzahl - 1);
        break;
      case "ArrowRight":
        if (!klappbar) return;
        if (sicht.offen[i]) gehezu(i + 1);
        else zustand.umschalten(zeigerZu(k));
        break;
      case "ArrowLeft":
        if (k === KEIN) return;
        if (klappbar && sicht.offen[i]) zustand.umschalten(zeigerZu(k));
        else if (index.eltern[k] !== KEIN) gehezu(zeileVon(sicht, index.eltern[k]));
        break;
      case "Enter":
        if (k === KEIN) return;
        hinrollen(i);
        bearbeiten(k);
        break;
      default:
        return;
    }
    e.preventDefault();
  }
</script>

<div class="inhalt" bind:this={rollfeld} bind:clientHeight={hoehe} onscroll={gerollt} tabindex="0" role="tree" aria-label="Baum" onkeydown={taste}>
  <div class="baum">
    <div class="probe" aria-hidden="true" bind:clientHeight={zeilenhoehe}></div>
    <div class="flaeche" bind:this={flaeche} style:height="{sicht.anzahl * h}px">
      <div class="fenster" style:transform="translateY({anfang * h}px)">
        {#each fenster as zeile (zeile.k)}
          <BaumZeile
            {zeile}
            gewaehlt={zeile.k === gewaehlterKnoten}
            treffer={treffer !== null && (treffer.merkmale[zeile.k] & TREFFER) !== 0}
            suche={treffer?.suche ?? ""}
            eingabe={bearbeitet === zeile.k ? eingabeAnfang(zeile.art, inhalt(index, text, zeile.k)) : null}
            onwaehlen={() => { waehlen(zeile.k); rollfeld.focus({ preventScroll: true }); }}
            onklappen={() => zustand.umschalten(zeigerZu(zeile.k))}
            onbearbeiten={() => bearbeiten(zeile.k)}
            onuebernehmen={(eingabe) => void uebernehmen(zeile.k, eingabe)}
            onabbrechen={abbrechen}
            onalsTabelle={() => alsTabelle(zeile.k)}
          />
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .inhalt {
    outline: 0;
  }
  .baum {
    position: relative;
  }
  .probe {
    position: absolute;
    visibility: hidden;
    height: var(--zeile);
    width: 1px;
  }
  .fenster {
    will-change: transform;
  }
</style>
