<script lang="ts">
  // KI über die Leitstelle in der Zahnrad-Tafel (STB-60, entwuerfe/einstellungen-ki.html): an oder aus, Stand der
  // Leitstelle und das Sprachmodell aus ihrem Angebot. Gilt für alle Geräte (liegt auf dem Server); nur mit Server.
  import { ki } from "../../zustand/ki.svelte";
  import { meldungen } from "../../zustand/meldungen.svelte";

  let speichert = $state(false);

  async function setzen(werte: { ki_an?: boolean; ki_modell?: string }): Promise<void> {
    speichert = true;
    try {
      await ki.einstellen(werte);
    } catch (f) {
      meldungen.zeigen({ text: `Nicht gespeichert: ${(f as Error).message}`, art: "fehler" });
    } finally {
      speichert = false;
    }
  }

  const s = $derived(ki.stand);
  const gewaehlt = (id: string, name: string): boolean => s?.modell === id || s?.modell === name;
</script>

<div class="karte-titel abstand">KI <span class="rechts abzeichen zweit"><i class="fa-solid fa-server"></i> für alle Geräte</span></div>
<div class="ki-zeile">
  <span>KI-Funktionen anbieten</span>
  <button class="vw-schalter" class:an={s?.an} role="switch" aria-checked={s?.an ?? false} aria-label="KI-Funktionen anbieten" disabled={!s || speichert} onclick={() => void setzen({ ki_an: !s?.an })}></button>
</div>
<p class="klein text-3">Jedes Ergebnis erscheint zuerst als Vorschau; ohne KI bleibt alles andere gleich.</p>
<div class="ki-zeile">
  <span class="vw-wahl-zustand"><span class="punkt" class:warn={!s?.bereit}></span> Leitstelle {s ? (s.bereit ? `bereit, ${s.modelle.length} ${s.modelle.length === 1 ? "Angebot" : "Angebote"}` : s.meldung) : (ki.fehler ?? "fragt ...")}</span>
  <button class="knopf" disabled={ki.laedt} onclick={() => void ki.laden()}><i class="fa-solid fa-rotate" class:fa-spin={ki.laedt}></i> Neu abrufen</button>
</div>
{#if s?.an && s.modelle.length}
  <div class="vw-wahl-liste ki-modelle" role="radiogroup" aria-label="Sprachmodell">
    {#each s.modelle as m (m.id)}
      {@const an = gewaehlt(m.id, m.name)}
      <button class="vw-wahl" class:aktiv={an} role="radio" aria-checked={an} disabled={speichert} onclick={() => !an && void setzen({ ki_modell: m.id })}>
        <span class="vw-haken" class:an><i class="fa-solid fa-check"></i></span>
        <span><span class="vw-wahl-name">{m.name}</span>{#if m.zweck}<span class="vw-wahl-info">{m.zweck}</span>{/if}</span>
        <span class="vw-wahl-zustand"><span class="punkt" class:vw-ruhig={!m.geladen}></span> {m.geladen ? "geladen" : "bereit"}{m.rechner ? ` auf ${m.rechner}` : ""}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .abstand {
    margin-top: var(--a3);
  }
  .ki-zeile {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--a3);
    margin-top: var(--a2);
  }
  p {
    margin: var(--a1) 0 0;
  }
  .ki-modelle {
    margin-top: var(--a3);
    width: min(30em, 80vw);
  }
</style>
