<script lang="ts">
  // Neue Fassung (STB-61): fragt, ob jetzt neu geladen wird, statt es mitten in der Arbeit von selbst zu tun. Neu laden
  // legt vorher alles ab; "Später" blendet das Band für diese Fassung aus, der Fuß zeigt sie weiter an.
  import { fassungsstand } from "../../zustand/fassung.svelte";
  import { FASSUNG } from "../../zustand/app";
</script>

{#if fassungsstand.fragen}
  <div class="fassungsband" role="alertdialog" aria-label="Neue Fassung">
    <i class="fa-solid fa-arrows-rotate"></i>
    <div class="text">
      <b>Neue Fassung {fassungsstand.neu} ist da</b>
      <span>Du arbeitest mit {FASSUNG}. Neu laden legt vorher alles ab; laufende Vorgänge wie ein Erzeugen oder eine Frage an die KI enden dabei.</span>
    </div>
    <div class="knoepfe">
      <button class="knopf primaer" disabled={fassungsstand.laedt} onclick={() => void fassungsstand.neuLaden()}><i class="fa-solid fa-rotate-right"></i> Jetzt neu laden</button>
      <button class="knopf still" disabled={fassungsstand.laedt} onclick={() => fassungsstand.verschieben()}>Später</button>
    </div>
  </div>
{/if}

<style>
  .fassungsband {
    position: fixed;
    right: var(--a4);
    bottom: calc(var(--fuss-hoehe) + var(--a3));
    z-index: 21;
    display: flex;
    align-items: center;
    gap: var(--a3);
    width: min(36em, calc(100vw - 32px));
    padding: var(--a3) var(--a3) var(--a3) var(--a4);
    background-color: var(--flaeche-panel);
    background-image: var(--erhaben);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .fassungsband > i {
    flex: none;
    color: var(--akzent);
    font-size: var(--titel);
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .text span {
    font-size: var(--klein);
    color: var(--text-2);
  }
  .knoepfe {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: var(--a2);
  }
  @media (max-width: 560px) {
    .fassungsband {
      flex-wrap: wrap;
    }
    .knoepfe {
      flex-direction: row;
    }
  }
</style>
