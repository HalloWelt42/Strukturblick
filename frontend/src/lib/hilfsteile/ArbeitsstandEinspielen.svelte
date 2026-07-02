<script lang="ts">
  // Auswahl des Einspiel-Modus für einen importierten Arbeitsstand (kein
  // Auto-Ersetzen). Wird vom Einstellungen-Modal und von der Dokumentverwaltung
  // gemeinsam genutzt. "Ersetzen" lädt danach die App neu, "Zusammenführen"
  // ergänzt nur und ruft onEingespielt (damit der Aufrufer seine Sicht auffrischt).
  import { spieleEin, type TransferPaket } from '../speicher/transfer'
  import { zeige } from '../zustand/toaster.svelte'
  import Modal from './Modal.svelte'

  interface Props {
    /** Gelesenes Paket; ist es null, bleibt das Modal geschlossen. */
    paket: TransferPaket | null
    /** Schließt/verwirft die Auswahl (Abbruch oder nach dem Einspielen). */
    onSchliessen: () => void
    /** Nach erfolgreichem Zusammenführen - der Aufrufer frischt seine Sicht auf. */
    onEingespielt?: () => void | Promise<void>
  }

  let { paket, onSchliessen, onEingespielt }: Props = $props()

  async function ersetze(): Promise<void> {
    const p = paket
    if (p === null) return
    onSchliessen()
    try {
      await spieleEin(p, 'ersetzen')
    } catch {
      zeige('Der Arbeitsstand konnte nicht eingespielt werden.', 'fehler')
      return
    }
    // Sauberer Neustart, damit Tabs und Einstellungen frisch geladen werden.
    window.location.reload()
  }

  async function fuehreZusammen(): Promise<void> {
    const p = paket
    if (p === null) return
    onSchliessen()
    try {
      await spieleEin(p, 'zusammenfuehren')
    } catch {
      zeige('Der Arbeitsstand konnte nicht eingespielt werden.', 'fehler')
      return
    }
    zeige(`${p.dokumente.length} Dokument(e) zusammengeführt.`, 'erfolg')
    await onEingespielt?.()
  }
</script>

<Modal titel="Arbeitsstand einspielen" offen={paket !== null} onSchliessen={onSchliessen}>
  <p class="einspiel-frage">Wie soll der Arbeitsstand aus der Datei eingespielt werden?</p>
  <ul class="einspiel-liste">
    <li>
      <strong>Ersetzen</strong> - der aktuelle Stand wird verworfen und durch die Datei ersetzt.
    </li>
    <li>
      <strong>Zusammenführen</strong> - nur die Dokumente aus der Datei werden mit neuen Kennungen
      ergänzt.
    </li>
  </ul>
  {#snippet fuss()}
    <button class="knopf" onclick={onSchliessen}>Abbrechen</button>
    <button class="knopf" onclick={() => void fuehreZusammen()}>Zusammenführen</button>
    <button class="knopf primaer" onclick={() => void ersetze()}>Ersetzen</button>
  {/snippet}
</Modal>

<style>
  .einspiel-frage {
    margin: 0 0 var(--a2);
  }

  .einspiel-liste {
    margin: 0;
    padding-left: var(--a4);
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    color: var(--text-2);
  }
</style>
