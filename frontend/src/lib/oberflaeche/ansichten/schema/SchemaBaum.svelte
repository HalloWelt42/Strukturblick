<script lang="ts">
  // Elementbaum eines XML Schemas, virtualisiert wie der Baum der Daten: ins DOM kommt nur das sichtbare Fenster. Klick
  // wählt (Inspektor), der Pfeil klappt; Pfeiltasten wählen und klappen. Rechts die Vielfalt (1, 0..1, 0..n) und *
  // für Pflicht, dazu Marken für rekursive und abstrakte Stellen.
  import { onMount, untrack } from "svelte";
  import type { Baumknoten, Knotenart } from "../../../analyse/xsd/elementbaum";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { SchemaZustand, Uebersicht } from "./schemaZustand.svelte";

  let { blatt, u, z }: { blatt: Arbeitsblatt; u: Uebersicht; z: SchemaZustand } = $props();

  const PUFFER = 10;
  const SYMBOL: Record<Knotenart, string> = { element: "fa-code", attribut: "fa-at", auswahl: "fa-code-branch", folge: "fa-list-ol", ersetzung: "fa-shuffle", beliebig: "fa-asterisk" };
  const ARTNAME: Record<Knotenart, string> = { element: "Element", attribut: "Attribut", auswahl: "Auswahl: genau eine der Möglichkeiten", folge: "Folge: die Teile in dieser Reihenfolge", ersetzung: "Ersetzungsgruppe: an dieser Stelle steht eins der Elemente darunter", beliebig: "Beliebiges Element" };

  let rollfeld: HTMLDivElement;
  let oben = $state(untrack(() => z.rollstand));
  let hoehe = $state(0);
  let zeilenhoehe = $state(0);

  const zeilen = $derived(z.zeilen(u));
  const h = $derived(zeilenhoehe || 1);
  const anfang = $derived(Math.max(0, Math.floor(oben / h) - PUFFER) & ~1);
  const ende = $derived(Math.min(zeilen.length, Math.ceil((oben + hoehe) / h) + PUFFER));
  const gewaehlt = $derived(z.wahl?.art === "knoten" ? z.wahl.kennung : null);

  onMount(() => {
    rollfeld.scrollTop = z.rollstand;
  });

  function gerollt(): void {
    oben = rollfeld.scrollTop;
    z.rollstand = oben;
  }

  const waehlen = (k: Baumknoten): void => { z.wahl = { art: "knoten", kennung: k.kennung }; };
  const klappbar = (k: Baumknoten): boolean => z.kinder(u, k).length > 0;

  function hinrollen(i: number): void {
    const y = i * h;
    if (y < rollfeld.scrollTop) rollfeld.scrollTop = y;
    else if (y + h > rollfeld.scrollTop + rollfeld.clientHeight) rollfeld.scrollTop = y + h - rollfeld.clientHeight;
  }

  function gehezu(i: number): void {
    if (!zeilen.length) return;
    const ziel = Math.max(0, Math.min(zeilen.length - 1, i));
    waehlen(zeilen[ziel]);
    hinrollen(ziel);
  }

  function taste(e: KeyboardEvent): void {
    const i = gewaehlt === null ? -1 : zeilen.findIndex((k) => k.kennung === gewaehlt);
    const k = i >= 0 ? zeilen[i] : null;
    switch (e.key) {
      case "ArrowDown": gehezu(i + 1); break;
      case "ArrowUp": gehezu(i < 0 ? 0 : i - 1); break;
      case "Home": gehezu(0); break;
      case "End": gehezu(zeilen.length - 1); break;
      case "ArrowRight":
        if (!k || !klappbar(k)) return;
        if (z.offen.has(k.kennung)) gehezu(i + 1);
        else z.umschalten(k.kennung);
        break;
      case "ArrowLeft": {
        if (!k) return;
        if (z.offen.has(k.kennung)) z.umschalten(k.kennung);
        else if (k.kennung.includes("/")) {
          const eltern = k.kennung.slice(0, k.kennung.lastIndexOf("/"));
          gehezu(zeilen.findIndex((x) => x.kennung === eltern));
        }
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  }
</script>

<div class="inhalt sc-rollfeld" bind:this={rollfeld} bind:clientHeight={hoehe} onscroll={gerollt} tabindex="0" role="tree" aria-label="Elementbaum des Schemas" onkeydown={taste}>
  {#if !zeilen.length}
    <p class="an-tafel-fuss an-leer">Dieses Schema erklärt keine Elemente, nur Typen und Gruppen für andere Schemas. Sie stehen im Reiter Typen.</p>
  {:else}
    <div class="baum sc-baum">
      <div class="sc-probe knoten" aria-hidden="true" bind:clientHeight={zeilenhoehe}>x</div>
      <div style:height="{zeilen.length * h}px">
        <div style:transform="translateY({anfang * h}px)">
          {#each zeilen.slice(anfang, ende) as k (k.kennung)}
            {@const kann = klappbar(k)}
            {@const offen = z.offen.has(k.kennung)}
            <div
              class="knoten sc-zeile"
              class:gewaehlt={gewaehlt === k.kennung}
              style:--tiefe={k.tiefe}
              role="treeitem"
              aria-level={k.tiefe + 1}
              aria-selected={gewaehlt === k.kennung}
              aria-expanded={kann ? offen : undefined}
              tabindex="-1"
              onclick={() => { waehlen(k); rollfeld.focus({ preventScroll: true }); }}
              ondblclick={() => kann && z.umschalten(k.kennung)}
              onkeydown={(e) => { if (e.key === " ") { e.preventDefault(); waehlen(k); } }}
            >
              <span class="klapp">
                {#if kann}
                  <button class="sc-klappknopf" tabindex="-1" title={offen ? "Zuklappen" : "Aufklappen"} onclick={(e) => { e.stopPropagation(); z.umschalten(k.kennung); }}>
                    <i class="fa-solid {offen ? 'fa-caret-down' : 'fa-caret-right'}"></i>
                  </button>
                {/if}
              </span>
              <i class="fa-solid {SYMBOL[k.art]} sc-symbol sc-{k.art}" title={ARTNAME[k.art]}></i>
              <span class="sc-name sc-{k.art}">{k.name}</span>
              {#if k.typ}<span class="info">{k.typ}</span>{/if}
              <span class="rechts">
                {#if k.rekursiv}<span class="abzeichen zweit" title="Der Typ steht weiter oben schon; ab hier wiederholt sich der Zweig">rekursiv</span>{/if}
                {#if k.abstrakt}<span class="abzeichen" title="Steht nie selbst im Dokument, nur über Ableitung oder Ersetzung">abstrakt</span>{/if}
                <span class="an-kante-zahl" title="Wie oft an dieser Stelle">{k.vielfalt}</span>
                <span class="an-pflicht sc-pflicht" title={k.pflicht ? "Pflicht" : undefined}>{k.pflicht ? "*" : ""}</span>
              </span>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
<p class="an-tafel-fuss sc-fuss">{zeilen.length.toLocaleString("de-DE")} {zeilen.length === 1 ? "Zeile" : "Zeilen"} sichtbar, {u.wurzeln.length.toLocaleString("de-DE")} {u.wurzeln.length === 1 ? "Wurzel" : "mögliche Wurzeln"}. <span class="an-pflicht">*</span> Pflicht. Doppelklick oder Pfeil rechts klappt auf.</p>
