<script lang="ts">
  // Abfrage-Konsole am Fuß des Hauptbereichs (Entwürfe abfrage.html, abfrage-sql.html, abfrage-fehler.html): Sprache,
  // Ausdruck, Ergebnis beim Tippen; bei einem Fehler bleibt das letzte gültige Ergebnis gedimmt stehen. SQL zeigt die
  // Tabellen neben dem Ausdruck, sein Ergebnis belegt die Ansicht (Haupt). Eingeklappt bleibt eine Leiste.
  import "./abfrage.css";
  import { sprache as spracheVon } from "../../kern";
  import { pfadVorSchreibmarke, schluesselAm } from "../../analyse/abfrage/ergaenzung";
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { abfrage, SPRACHEN, type Gemerkt } from "../../zustand/abfrage.svelte";
  import { meldungen } from "../../zustand/meldungen.svelte";
  import { MAC } from "../aktionen/tastatur";
  import AusdruckFeld from "./AusdruckFeld.svelte";
  import KonsolenLeiste from "./KonsolenLeiste.svelte";
  import SqlTabellen from "./SqlTabellen.svelte";
  import VerlaufMenue from "./VerlaufMenue.svelte";
  import ExportMenue from "../bausteine/ExportMenue.svelte";
  import WerteErgebnis from "./WerteErgebnis.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  const s = $derived(spracheVon(abfrage.sprache));
  // Neu rechnen bei Ausdruck, Sprache, Suchwahl und jedem neu gelesenen Stand der betroffenen Dokumente
  const lage = $derived(s.ueberAlle ? arbeitsplatz.blaetter.map((b) => `${b.kennung}:${b.analyse?.revision}`).join(",") : `${blatt.kennung}:${blatt.analyse?.revision}`);
  $effect(() => {
    void [abfrage.sprache, abfrage.ausdruck, abfrage.suche.regex, abfrage.suche.grossKlein, lage];
    if (abfrage.offen) abfrage.planen();
  });

  const letztes = $derived(abfrage.letztes?.sprache === abfrage.sprache ? abfrage.letztes : null);
  const gueltig = $derived(abfrage.gueltig?.sprache === abfrage.sprache ? abfrage.gueltig : null);
  const fehler = $derived(letztes && !letztes.ausgang.ok ? letztes.ausgang.fehler : null);
  const gezeigt = $derived(fehler ? gueltig : letztes);
  const ergebnis = $derived(gezeigt?.ausgang.ok ? gezeigt.ausgang.ergebnis : null);
  const dauer = $derived(gezeigt?.ausgang.ok ? gezeigt.ausgang.dauer : 0);
  const treffer = $derived(abfrage.trefferFuer(blatt)?.length ?? null);
  // Gibt es ein letztes gültiges Ergebnis, das auch zu sehen ist? (SQL ohne Ausdruck liefert nur die Tabellen)
  const gueltigesZeigbar = $derived(!!gueltig?.ausgang.ok && gueltig.ausgang.ergebnis.art !== "dokument" && (gueltig.ausgang.ergebnis.art === "werte" || gueltig.ausgang.ergebnis.spalten.length > 0));

  const schema = $derived(ergebnis?.art === "tabelle" ? Object.fromEntries(ergebnis.tabellen.map((t) => [t.name, t.spalten.map((x) => x.name)])) : {});
  const aufbau = $derived({ hervorhebung: s.hervorhebung, ergaenzung: s.ergaenzung, beispiel: s.beispiel, schema, felderAn });
  const fehlerstelle = $derived(fehler && fehler.zeile !== null ? { meldung: fehler.meldung, zeile: fehler.zeile, spalte: fehler.spalte ?? 1 } : null);

  /** Felder des Dokuments an der Stelle, auf die der Text vor der Schreibmarke zeigt (jq, JSONPath) */
  function felderAn(vor: string): readonly string[] {
    const index = blatt.analyse?.index;
    return index ? schluesselAm(index, blatt.analyseText, pfadVorSchreibmarke(s.kennung, vor)) : [];
  }

  function springen(zeiger: string): void {
    abfrage.ergebnisZeigen = false;
    blatt.waehlen(zeiger);
  }

  function ausVerlauf(g: Gemerkt): void {
    abfrage.sprache = g.sprache;
    abfrage.ausdruck = g.ausdruck;
  }

  function einfuegen(name: string): void {
    const a = abfrage.ausdruck;
    abfrage.ausdruck = a && !/\s$/.test(a) ? `${a} ${name}` : `${a}${name}`;
  }

  async function kopieren(): Promise<void> {
    const text = await abfrage.ganzerText();
    if (text === null) return;
    try {
      await navigator.clipboard.writeText(text);
      meldungen.zeigen({ text: "Ergebnis kopiert", art: "erfolg" });
    } catch {
      meldungen.zeigen({ text: 'Kopieren ging nicht: Der Browser erlaubt hier keinen Zugriff auf die Zwischenablage. "Als neues Dokument" geht immer.', art: "fehler" });
    }
  }

  function ziehen(e: PointerEvent): void {
    const griff = e.currentTarget as HTMLElement;
    const haupt = griff.closest(".haupt") as HTMLElement;
    const konsole = griff.nextElementSibling as HTMLElement;
    const anfang = { y: e.clientY, hoehe: abfrage.hoehe ?? konsole.offsetHeight };
    griff.setPointerCapture(e.pointerId);
    const bewegen = (m: PointerEvent) => (abfrage.hoehe = Math.round(Math.min(Math.max(anfang.hoehe + anfang.y - m.clientY, 160), haupt.clientHeight - 140)));
    const loslassen = () => {
      griff.removeEventListener("pointermove", bewegen);
      griff.removeEventListener("pointerup", loslassen);
    };
    griff.addEventListener("pointermove", bewegen);
    griff.addEventListener("pointerup", loslassen);
  }

  const befehl = MAC ? "⌘" : "Strg";
</script>

{#if !abfrage.offen}
  <KonsolenLeiste {treffer} />
{:else}
  <button class="af-griff" aria-label="Höhe der Abfrage: ziehen oder Pfeiltasten" title="Ziehen verstellt die Höhe der Abfrage"
    onpointerdown={ziehen}
    onkeydown={(e) => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); abfrage.hoehe = Math.max(160, (abfrage.hoehe ?? (e.currentTarget as HTMLElement).nextElementSibling!.clientHeight) + (e.key === "ArrowUp" ? 24 : -24)); } }}>
    <i class="fa-solid fa-grip-lines"></i>
  </button>
  <section class="af-konsole" aria-label="Abfrage" style:flex-basis={abfrage.hoehe === null ? null : `${abfrage.hoehe}px`}>
    <div class="af-kopf">
      <i class="fa-solid fa-terminal"></i>
      <nav class="segment" aria-label="Sprache">
        {#each SPRACHEN as x (x.kennung)}
          <button class:aktiv={abfrage.sprache === x.kennung} aria-pressed={abfrage.sprache === x.kennung} onclick={() => (abfrage.sprache = x.kennung)}>{x.name}</button>
        {/each}
      </nav>
      <span class="af-quelle">{#if s.ueberAlle}über alle geöffneten Dokumente{:else}auf <span class="mono">{blatt.name}</span>{/if}</span>
      <span class="rechts">
        <VerlaufMenue onwaehlen={ausVerlauf} />
        <button class="knopf still nur-symbol" title="Abfrage einklappen (Escape im Ausdruck)" onclick={() => abfrage.schliessen()}><i class="fa-solid fa-chevron-down"></i></button>
      </span>
    </div>

    <div class="af-rumpf" class:af-mit-tabellen={s.kennung === "sql"}>
      {#if s.kennung === "sql"}
        <SqlTabellen tabellen={ergebnis?.art === "tabelle" ? ergebnis.tabellen : []} oneinfuegen={einfuegen} />
      {/if}
      <div class="af-fach">
        <div class="af-fach-kopf">
          <span class="af-etikett">{s.kennung === "sql" ? "SQL" : s.kennung === "suche" ? "Suche" : "Ausdruck"}</span>
          {#if s.kennung === "suche"}
            <div class="segment klein-segment">
              <button class:aktiv={abfrage.suche.regex} aria-pressed={abfrage.suche.regex} title="Als regulären Ausdruck lesen" onclick={() => (abfrage.suche = { ...abfrage.suche, regex: !abfrage.suche.regex })}>.*</button>
              <button class:aktiv={abfrage.suche.grossKlein} aria-pressed={abfrage.suche.grossKlein} title="Groß- und Kleinschreibung unterscheiden" onclick={() => (abfrage.suche = { ...abfrage.suche, grossKlein: !abfrage.suche.grossKlein })}>Aa</button>
            </div>
          {/if}
          <span class="rechts">
            {#if abfrage.rechnet}
              <span class="abzeichen"><i class="fa-solid fa-spinner fa-spin-pulse"></i> rechnet</span>
            {:else if fehler}
              <span class="abzeichen fehler"><i class="fa-solid fa-circle-exclamation"></i> 1 Fehler</span>
            {:else if letztes}
              <span class="abzeichen gut"><i class="fa-solid fa-check"></i> gültig</span>
            {/if}
          </span>
        </div>
        <AusdruckFeld
          text={abfrage.ausdruck}
          {aufbau}
          fehler={fehlerstelle}
          beschriftung="{s.name}-Ausdruck"
          onaenderung={(t) => (abfrage.ausdruck = t)}
          onuebernehmen={() => void abfrage.alsDokument(s.kennung === "sql")}
          onzuklappen={() => abfrage.schliessen()}
        />
        <div class="af-hinweis">
          Ergebnis beim Tippen.
          {#if s.ergaenzung}<span class="taste">Tab</span> übernimmt Vorschläge,{/if}
          <span class="taste">{befehl}</span><span class="taste">Enter</span> neues Dokument.
        </div>
      </div>

      {#if s.kennung !== "sql"}
        <div class="af-fach" class:af-veraltet={fehler !== null && ergebnis !== null}>
          <div class="af-fach-kopf">
            <span class="af-etikett">Ergebnis</span>
            {#if ergebnis?.art === "werte"}
              {#if fehler}
                <span class="abzeichen warn"><i class="fa-solid fa-clock-rotate-left"></i> veraltet</span><span class="text-3 klein af-breit">letztes gültiges, {ergebnis.anzahl} Ergebnisse</span>
              {:else}
                <span class="abzeichen gut"><i class="fa-solid fa-bolt"></i> aktuell, {Math.round(dauer)} ms</span><span class="text-3 klein af-breit">{ergebnis.anzahl === 1 ? "1 Ergebnis" : `${ergebnis.anzahl} Ergebnisse`}</span>
              {/if}
              <span class="rechts"><button class="knopf still nur-symbol" title="Ganzes Ergebnis kopieren" onclick={() => void kopieren()}><i class="fa-solid fa-copy"></i></button></span>
            {/if}
          </div>
          {#if ergebnis?.art === "werte"}
            <WerteErgebnis {ergebnis} onspringen={springen} />
          {:else}
            <div class="af-json"><div class="af-ende">{abfrage.rechnet ? "Rechnet ..." : "Noch kein Ergebnis."}</div></div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="af-fuss">
      {#if fehler}
        <div class="af-fehlerzeile" role="alert">
          <i class="fa-solid fa-circle-exclamation"></i>
          <span>{fehler.meldung.replace(/\.?$/, ".")}{#if gueltigesZeigbar}{" "}{s.kennung === "sql" ? "Oben" : "Rechts"} steht das letzte gültige Ergebnis.{/if}</span>
        </div>
      {:else if s.kennung === "sql"}
        <span>Jedes geöffnete Dokument ist eine Tabelle; Listen in JSON werden zu eigenen Tabellen entfaltet.</span>
      {:else}
        <button class="knopf" disabled={!ergebnis} onclick={() => void abfrage.alsDokument(false)}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
        <button class="knopf" disabled={!ergebnis} onclick={() => void abfrage.alsDokument(true)}><i class="fa-solid fa-table"></i> Als Tabelle</button>
        <ExportMenue gesperrt={!ergebnis} nachOben holen={(f) => abfrage.ganzerText(f)} dateiname={(f) => abfrage.dateiname(f)} />
        <button class="knopf" disabled={!abfrage.ausdruck.trim()} onclick={() => abfrage.merken()}><i class="fa-solid fa-bookmark"></i> In den Verlauf</button>
      {/if}
    </div>
  </section>
{/if}

<style>
  button.af-griff {
    width: 100%;
    border: 0;
    padding: 0;
  }
  .klein-segment button {
    min-height: calc(var(--knopf-hoehe) - 10px);
    padding: 0 var(--a2);
    font-family: var(--schrift-mono);
  }
</style>
