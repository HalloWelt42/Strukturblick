<script lang="ts">
  // Generische virtualisierte Liste mit fester Zeilenhöhe: gerendert wird nur
  // der sichtbare Ausschnitt (plus Überhang), ein Platzhalter mit der
  // Gesamthöhe hält den Scrollbalken korrekt. Jede Zeile wird absolut über
  // top = index * zeilenHoehe positioniert.
  import type { Snippet } from 'svelte'

  interface Props {
    /** Feste Höhe jeder Zeile in Pixeln. */
    zeilenHoehe: number
    /** Gesamtanzahl der Zeilen. */
    anzahl: number
    /** Snippet für eine Zeile; erhält den Zeilen-Index. */
    kinder: Snippet<[number]>
  }

  const { zeilenHoehe, anzahl, kinder }: Props = $props()

  /** Zusätzlich gerenderte Zeilen ober- und unterhalb des Sichtfensters. */
  const UEBERHANG = 10

  let wrapper = $state<HTMLDivElement>()
  let scrollTop = $state(0)
  let sichtHoehe = $state(0)

  const vonIndex = $derived(
    Math.max(0, Math.floor(scrollTop / zeilenHoehe) - UEBERHANG),
  )
  const bisIndex = $derived(
    Math.min(anzahl, Math.ceil((scrollTop + sichtHoehe) / zeilenHoehe) + UEBERHANG),
  )
  const sichtbareIndizes = $derived.by((): number[] => {
    const indizes: number[] = []
    for (let index = vonIndex; index < bisIndex; index += 1) {
      indizes.push(index)
    }
    return indizes
  })

  function anScroll(): void {
    if (wrapper !== undefined) {
      scrollTop = wrapper.scrollTop
    }
  }

  /** Rollt die Zeile ins Bild; liegt sie außerhalb, wird sie mittig zentriert. */
  export function scrollZuIndex(index: number): void {
    if (wrapper === undefined || anzahl === 0) return
    const begrenzt = Math.max(0, Math.min(index, anzahl - 1))
    const zeilenOben = begrenzt * zeilenHoehe
    const sichtOben = wrapper.scrollTop
    const sichtUnten = sichtOben + wrapper.clientHeight
    if (zeilenOben >= sichtOben && zeilenOben + zeilenHoehe <= sichtUnten) return
    wrapper.scrollTop = Math.max(
      0,
      zeilenOben - (wrapper.clientHeight - zeilenHoehe) / 2,
    )
  }
</script>

<div
  class="virtuelle-liste"
  bind:this={wrapper}
  bind:clientHeight={sichtHoehe}
  onscroll={anScroll}
>
  <div class="platzhalter" style:height="{anzahl * zeilenHoehe}px">
    {#each sichtbareIndizes as index (index)}
      <div
        class="zeile"
        style:top="{index * zeilenHoehe}px"
        style:height="{zeilenHoehe}px"
      >
        {@render kinder(index)}
      </div>
    {/each}
  </div>
</div>

<style>
  .virtuelle-liste {
    position: relative;
    height: 100%;
    min-height: 0;
    overflow-y: auto;
  }

  .platzhalter {
    position: relative;
    width: 100%;
  }

  .zeile {
    position: absolute;
    left: 0;
    right: 0;
  }
</style>
