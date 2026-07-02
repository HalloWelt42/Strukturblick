<script lang="ts">
  // Eine Zeile des Strukturbaums, Markup exakt nach mockups/baum.html:
  // Pfeil, Schlüssel bzw. Index, Wert- oder Container-Darstellung, Anzahl
  // und Vorschau. Klick setzt immer die Selektion (Quelle "baum"); bei
  // Containern klappt er zusätzlich (Alt-Klick: rekursiv).
  import type { KnotenSpannen } from '../../api/typen'
  import type { BaumZeileDaten } from '../../dienste/baumZeilen'
  import { WERT_KLASSE } from '../../dienste/wertDarstellung'
  import { klappe, klappeRekursiv } from '../../zustand/baumZustand.svelte'
  import { setzeSelektion } from '../../zustand/selektion.svelte'

  interface Props {
    zeile: BaumZeileDaten
    tabId: string
    /** Parse-Positionen des Tabs - Grundlage für das rekursive Klappen. */
    positionen: Record<string, KnotenSpannen>
    /** Suchbegriff (getrimmt, kleingeschrieben) für die Treffer-Hervorhebung. */
    begriff: string
    selektiert: boolean
  }

  const { zeile, tabId, positionen, begriff, selektiert }: Props = $props()

  interface TrefferTeile {
    vor: string
    mitte: string
    nach: string
  }

  /** Zerlegt den Text am ersten Vorkommen des Suchbegriffs (case-insensitiv). */
  function teileAn(text: string): TrefferTeile | null {
    if (begriff === '' || !zeile.treffer) return null
    const position = text.toLowerCase().indexOf(begriff)
    if (position === -1) return null
    return {
      vor: text.slice(0, position),
      mitte: text.slice(position, position + begriff.length),
      nach: text.slice(position + begriff.length),
    }
  }

  const nameTeile = $derived(zeile.schluessel === null ? null : teileAn(zeile.schluessel))
  const wertTeile = $derived(teileAn(zeile.vorschau))
  const anzahlText = $derived(
    zeile.typ === 'objekt'
      ? `${zeile.kindAnzahl} Schlüssel`
      : zeile.kindAnzahl === 1
        ? '1 Eintrag'
        : `${zeile.kindAnzahl} Einträge`,
  )

  function beiKlick(ereignis: MouseEvent | KeyboardEvent): void {
    if (zeile.istContainer) {
      if (ereignis.altKey) {
        klappeRekursiv(tabId, zeile.pfad, positionen)
      } else {
        klappe(tabId, zeile.pfad)
      }
    }
    setzeSelektion({ tabId, pfad: zeile.pfad, quelle: 'baum' })
  }

  function beiTaste(ereignis: KeyboardEvent): void {
    if (ereignis.key === 'Enter' || ereignis.key === ' ') {
      ereignis.preventDefault()
      beiKlick(ereignis)
    }
  }
</script>

<div
  class="baum-zeile"
  class:selektiert
  style="--tiefe: {zeile.tiefe}"
  role="button"
  tabindex="0"
  onclick={beiKlick}
  onkeydown={beiTaste}
>
  <span class="pfeil" class:blatt={!zeile.istContainer}>
    <i class="fa-solid {zeile.aufgeklappt ? 'fa-caret-down' : 'fa-caret-right'}"></i>
  </span>
  {#if zeile.schluessel !== null}
    <span class="k-name"
      >{#if nameTeile !== null}{nameTeile.vor}<span class="sx-mark-treffer">{nameTeile.mitte}</span
        >{nameTeile.nach}{:else}{zeile.schluessel}{/if}</span
    >
  {:else if zeile.index !== null}
    <span class="k-index">[{zeile.index}]</span>
  {/if}
  {#if zeile.typ === 'objekt'}
    <span class="wert-objekt">{'{ }'}</span>
  {:else if zeile.typ === 'liste'}
    <span class="wert-liste">[ ]</span>
  {:else}
    <span class={WERT_KLASSE[zeile.typ]}
      >{#if wertTeile !== null}{wertTeile.vor}<span class="sx-mark-treffer">{wertTeile.mitte}</span
        >{wertTeile.nach}{:else}{zeile.vorschau}{/if}</span
    >
  {/if}
  {#if zeile.pfad === ''}
    <span class="baum-vorschau">Wurzel</span>
  {/if}
  {#if zeile.istContainer}
    <span class="baum-anzahl">{anzahlText}</span>
    {#if !zeile.aufgeklappt && zeile.pfad !== ''}
      <span class="baum-vorschau"
        >{#if wertTeile !== null}{wertTeile.vor}<span class="sx-mark-treffer">{wertTeile.mitte}</span
          >{wertTeile.nach}{:else}{zeile.vorschau}{/if}</span
      >
    {/if}
  {/if}
</div>
