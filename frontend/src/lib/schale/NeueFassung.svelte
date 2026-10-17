<script lang="ts">
  // Band über der Ansicht für eine neue Fassung des Backends (zustand/fassung.svelte.ts):
  // sagt, wann sie von selbst lädt, und lädt auf Wunsch sofort (nach dem Sichern).
  import { ruhig } from '../zustand/arbeit.svelte'
  import { fassung, jetztNeuLaden } from '../zustand/fassung.svelte'

  const wann = $derived(
    ruhig()
      ? 'Beim nächsten Wechsel von Tab oder Ansicht lädt Strukturblick sie von selbst.'
      : 'Sie lädt von selbst, sobald die offene Bearbeitung abgeschlossen ist.',
  )
</script>

{#if fassung.neu !== null}
  <div class="neue-fassung" role="status">
    <i class="fa-solid fa-rotate"></i>
    <span><strong>Neue Fassung {fassung.neu} ist da.</strong> {wann}</span>
    <button class="knopf klein primaer" onclick={() => void jetztNeuLaden()}>
      <i class="fa-solid fa-rotate"></i> Jetzt neu laden
    </button>
  </div>
{/if}

<style>
  .neue-fassung {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    background: var(--zustand-info-weich);
    border-bottom: 1px solid var(--rand-1);
    color: var(--text-1);
    font-size: 0.88rem;
  }

  .neue-fassung > i {
    color: var(--zustand-info);
  }

  .neue-fassung > span {
    flex: 1;
    min-width: 0;
  }
</style>
