<script lang="ts">
  // Zugang zur Bauart mit Server: Anmeldung mit dem Kellerwolke-Konto (Passwort oder Code vom Rechner), erste
  // Einrichtung, Laden und nicht erreichbar. Im Stil von Strukturblick; die Abläufe kommen aus dem Appkern.
  import { zugang } from "../../zustand/zugang.svelte";

  const teil = $derived(zugang.teil);
  const app = $derived(teil?.sitzung.app ?? null);

  let modus = $state<"passwort" | "code">("passwort");
  let kennung = $state("");
  let passwort = $state("");
  let code = $state("");
  let geraet = $state("");
  let adresse = $state("");
  let schluessel = $state("");
  let einrichtungscode = $state("");
  let fehler = $state("");
  let laeuft = $state(false);

  $effect(() => {
    if (!teil) return;
    const ausLink = teil.codeAusLinkNehmen();
    if (ausLink) { code = ausLink; modus = "code"; }
    geraet = teil.namensvorschlag();
  });

  async function los(e: Event, arbeit: () => Promise<void>): Promise<void> {
    e.preventDefault();
    fehler = "";
    laeuft = true;
    try {
      await arbeit();
    } catch (f) {
      fehler = (f as Error).message;
    } finally {
      laeuft = false;
    }
  }
</script>

<div class="zugang">
  <div class="karte tafel">
    <div class="kopf-zeile"><i class="fa-solid fa-sitemap"></i> Strukturblick</div>
    {#if zugang.stand === "laedt"}
      <p class="text-3"><i class="fa-solid fa-spinner fa-spin"></i> Verbinde mit der App ...</p>
    {:else if zugang.stand === "nicht-erreichbar"}
      <p>Die App antwortet gerade nicht. Sobald sie wieder da ist, geht es von selbst weiter.</p>
      <button class="knopf" onclick={() => void teil?.sitzungStarten()}><i class="fa-solid fa-rotate-right"></i> Erneut versuchen</button>
    {:else if zugang.stand === "einrichtung" && teil && app}
      <form onsubmit={(e) => los(e, () => teil.einrichtenMit(adresse.trim(), schluessel.trim(), einrichtungscode.trim()))}>
        <p>Erste Einrichtung: Adresse der Kellerwolke und App-Schlüssel für Strukturblick.</p>
        <label>Adresse der Kellerwolke<span class="feld"><input bind:value={adresse} placeholder="https://..." /></span></label>
        <label>App-Schlüssel<span class="feld"><input bind:value={schluessel} autocomplete="off" /></span></label>
        {#if app.einrichtungscode}
          <label>Einrichtungscode<span class="feld"><input bind:value={einrichtungscode} autocomplete="off" /></span></label>
          <p class="klein text-3">Der Code liegt in {app.einrichtungscode}.</p>
        {/if}
        {#if fehler}<p class="fehlerzeile">{fehler}</p>{/if}
        <button class="knopf primaer breit" type="submit" disabled={laeuft || !adresse || !schluessel}>Einrichten</button>
      </form>
    {:else if teil && app}
      {#if modus === "passwort"}
        <form onsubmit={(e) => los(e, () => teil.anmelden(kennung, passwort))}>
          <p>Anmelden mit deinem Konto der Kellerwolke unter <b>{app.kellerwolke}</b>.</p>
          <label>Name oder Kürzel<span class="feld"><input bind:value={kennung} autocomplete="username" /></span></label>
          <label>Passwort<span class="feld"><input type="password" bind:value={passwort} autocomplete="current-password" /></span></label>
          {#if fehler}<p class="fehlerzeile">{fehler}</p>{/if}
          <button class="knopf primaer breit" type="submit" disabled={laeuft || !kennung || !passwort}>{laeuft ? "Anmelden ..." : "Anmelden"}</button>
          <button class="knopf breit" type="button" onclick={() => ((modus = "code"), (fehler = ""))}><i class="fa-solid fa-link"></i> Mit Code koppeln</button>
          <p class="klein text-3">Den Code zeigt die Kellerwolke unter Einstellungen, Geräte.</p>
        </form>
      {:else}
        <form onsubmit={(e) => los(e, () => teil.koppeln(code, geraet.trim(), teil.geraeteArt()))}>
          <p>Code aus der Kellerwolke unter <b>{app.kellerwolke}</b> (Einstellungen, Geräte). Danach bleibt dieses Gerät angemeldet, bis du es trennst.</p>
          <label>Kopplungscode<span class="feld"><input class="mono" value={code} maxlength={teil.CODE_LAENGE} autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" oninput={(e) => { code = teil.codeNormal(e.currentTarget.value); e.currentTarget.value = code; }} /></span></label>
          <label>Name des Geräts<span class="feld"><input bind:value={geraet} maxlength="60" /></span></label>
          {#if fehler}<p class="fehlerzeile">{fehler}</p>{/if}
          <button class="knopf primaer breit" type="submit" disabled={laeuft || code.length !== teil.CODE_LAENGE || !geraet.trim()}><i class="fa-solid fa-link"></i> Koppeln</button>
          <button class="knopf still breit" type="button" onclick={() => ((modus = "passwort"), (fehler = ""))}><i class="fa-solid fa-chevron-left"></i> Zurück zur Anmeldung</button>
        </form>
      {/if}
    {/if}
  </div>
</div>

<style>
  .zugang {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--a4);
    background: var(--flaeche-seite);
  }
  .tafel {
    width: min(100%, 440px);
    margin: 0;
    padding: var(--a5);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }
  .kopf-zeile {
    display: flex;
    gap: var(--a2);
    align-items: center;
    font-size: var(--seitentitel);
    font-weight: 600;
  }
  .kopf-zeile i {
    color: var(--akzent);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }
  label {
    display: flex;
    flex-direction: column;
    gap: var(--a1);
    font-size: var(--klein);
    color: var(--text-2);
  }
  .feld input {
    font-size: var(--gross);
  }
  p {
    margin: 0;
  }
  .breit {
    width: 100%;
    justify-content: center;
  }
  .fehlerzeile {
    color: var(--fehler);
    background: var(--fehler-weich);
    padding: var(--a2) var(--a3);
  }
</style>
