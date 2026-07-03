<script lang="ts">
  // Zieh-Griff zum Verstellen der Seitenleisten-Breite. Liegt absolut auf der
  // Grenze zwischen Leiste und Hauptbereich (die .app ist dafür position:
  // relative). Beim Ziehen wird die Breite in kleinen Schritten aktualisiert
  // und nach dem Loslassen einmal gesichert.
  import { layout, setzeBreite, speichereLayout, type LeistenSeite } from '../zustand/layout.svelte'

  interface Props {
    seite: LeistenSeite
  }

  let { seite }: Props = $props()

  // Position auf der Grenze: die linke Leiste endet bei breiteLinks, die rechte
  // beginnt bei (Fensterrand - breiteRechts). Der Griff ist 6px breit, daher -3.
  const stil = $derived(
    seite === 'links'
      ? `left: ${layout.breiteLinks - 3}px`
      : `right: ${layout.breiteRechts - 3}px`,
  )

  function beiZiehStart(ereignis: PointerEvent): void {
    ereignis.preventDefault()
    const start = ereignis.clientX
    const startBreite = seite === 'links' ? layout.breiteLinks : layout.breiteRechts

    // Bewegung und Ende am Fenster verfolgen, damit das Ziehen auch weitergeht,
    // wenn der Zeiger den schmalen Griff verlässt.
    function beiBewegung(ev: PointerEvent): void {
      const delta = ev.clientX - start
      // Links wächst nach rechts, rechts wächst nach links.
      setzeBreite(seite, seite === 'links' ? startBreite + delta : startBreite - delta)
    }

    function beiEnde(): void {
      window.removeEventListener('pointermove', beiBewegung)
      window.removeEventListener('pointerup', beiEnde)
      window.removeEventListener('pointercancel', beiEnde)
      speichereLayout()
    }

    window.addEventListener('pointermove', beiBewegung)
    window.addEventListener('pointerup', beiEnde)
    window.addEventListener('pointercancel', beiEnde)
  }
</script>

<div
  class="leisten-griff leisten-griff-{seite}"
  style={stil}
  role="separator"
  aria-orientation="vertical"
  aria-label={seite === 'links' ? 'Linke Seitenleiste verbreitern' : 'Rechte Seitenleiste verbreitern'}
  onpointerdown={beiZiehStart}
></div>

<style>
  .leisten-griff {
    position: absolute;
    top: 44px;
    bottom: 28px;
    width: 6px;
    z-index: 20;
    cursor: col-resize;
    /* Der sichtbare Strich erscheint erst beim Zeigen/Ziehen. */
    background: transparent;
    transition: background 0.1s;
  }

  .leisten-griff:hover,
  .leisten-griff:active {
    background: var(--akzent-weich);
  }
</style>
