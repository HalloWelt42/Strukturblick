<script lang="ts">
  // Inspektor des Werkzeugs Testdaten (entwuerfe/testdaten.html): das gewählte Feld mit Name, Erzeuger und allen
  // Einstellungen zum Ändern, wie oft es leer bleibt, wie es in der Vorlage aussieht und Beispiele mit dem Startwert.
  import "./testdaten.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { KnotenArt } from "../../../kern/strukturindex";
  import { ERZEUGER, erzeuger, mitVorgaben } from "../../../analyse/testdaten/erzeuger";
  import { beispiele, LEERARTEN, schluesselVon } from "../../../analyse/testdaten/spezifikation";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { zeigen } from "./zeigen";
  import { testdatenZustand } from "./testdatenZustand.svelte";
  import Einstellungsfeld from "./Einstellungsfeld.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(testdatenZustand(blatt));
  const spez = $derived(z.spezifikation(blatt));
  const f = $derived(spez?.felder.find((x) => x.pfad === z.gewaehlt) ?? null);
  const erz = $derived(f ? erzeuger(f.erzeuger) : null);
  const werte = $derived(f && erz ? mitVorgaben(erz, f.einstellungen) : {});
  const profil = $derived(f ? z.profil(blatt, f.pfad) : null);
  const proben = $derived(f && spez && erz?.art === "wert" ? beispiele(spez, z.startwert, f.pfad, 5) : []);
  const umbenennbar = $derived(f !== null && f.pfad !== "" && !f.pfad.endsWith("[]"));

  const typText = (p: NonNullable<typeof profil>): string => {
    const namen: [number, string][] = [[KnotenArt.text, "Text"], [KnotenArt.zahl, "Zahl"], [KnotenArt.wahrheitswert, "ja/nein"], [KnotenArt.objekt, "Objekt"], [KnotenArt.liste, "Liste"]];
    const da = namen.filter(([k]) => p.arten[k] > 0).map(([, n]) => n);
    return da.length === 1 ? `immer ${da[0]}` : da.join(", ");
  };
</script>

{#if f && erz}
  <div class="karte">
    <div class="karte-titel">Gewählt <span class="rechts abzeichen">Feld</span></div>
    {#if umbenennbar}
      <span class="feld td-name"><input class="mono" value={schluesselVon(f.pfad)} aria-label="Name des Felds" spellcheck="false" onchange={(e) => z.feldUmbenennen(blatt, f.pfad, (e.currentTarget as HTMLInputElement).value)} /></span>
    {:else}
      <div class="wertfeld mono">{f.pfad === "" ? "(Datensatz)" : "(je Eintrag)"}</div>
    {/if}
    <p class="an-tafel-fuss">{erz.beschreibung}</p>
    {#if erz.art === "wert"}
      <div class="td-einstellung">
        <span class="td-einstellung-titel">Erzeuger</span>
        <div class="td-erzeugerwahl">
          {#each ERZEUGER.filter((e) => e.art === "wert") as e (e.kennung)}<button class="td-chip" class:aktiv={e.kennung === f.erzeuger} title={e.beschreibung} onclick={() => z.erzeugerWechseln(blatt, f.pfad, e.kennung)}>{e.titel}</button>{/each}
        </div>
      </div>
    {/if}
    {#each erz.einstellungen as e (`${f.pfad}|${f.erzeuger}|${e.schluessel}`)}
      <Einstellungsfeld {e} wert={werte[e.schluessel]} onsetzen={(w) => z.einstellungSetzen(blatt, f.pfad, e.schluessel, w)} />
    {/each}
    {#if f.pfad !== "" && !f.pfad.endsWith("[]")}
      <div class="td-einstellung" title="Wie oft das Feld leer bleibt und wie">
        <span class="td-einstellung-titel">Leer in % der Datensätze</span>
        <span class="feld"><input class="mono" inputmode="numeric" value={f.leer.anteil} aria-label="Anteil leer in Prozent" onchange={(e) => z.feldAendern(blatt, f.pfad, { leer: { ...f.leer, anteil: Math.max(0, Math.min(100, Math.round(Number((e.currentTarget as HTMLInputElement).value) || 0))) } })} /></span>
        <nav class="segment td-segment" aria-label="Leer als">
          {#each LEERARTEN as l (l.wert)}<button class:aktiv={f.leer.als === l.wert} onclick={() => z.feldAendern(blatt, f.pfad, { leer: { ...f.leer, als: l.wert } })}>{l.titel}</button>{/each}
        </nav>
      </div>
      <button class="knopf still td-entfernen" onclick={() => z.feldEntfernen(blatt, f.pfad)}><i class="fa-solid fa-trash"></i> Feld entfernen</button>
    {/if}
  </div>
  {#if profil}
    <div class="karte">
      <div class="karte-titel">In der Vorlage <span class="rechts">{anzahl(profil.vorkommen)}</span></div>
      <dl class="paare">
        <dt>Typ</dt><dd>{typText(profil)}{profil.textLaenge && profil.textLaenge.min === profil.textLaenge.max ? `, ${profil.textLaenge.min} Zeichen` : ""}</dd>
        <dt>Fehlt</dt><dd>{anzahl(profil.moeglich === null ? 0 : Math.max(0, profil.moeglich - profil.vorkommen) + profil.nichts)}</dd>
        {#if profil.verschiedene !== null}<dt>Verschieden</dt><dd>{profil.verschiedeneMehr ? "mehr als " : ""}{anzahl(profil.verschiedene)}</dd>{/if}
        {#if profil.textBereich}<dt>Spanne</dt><dd class="mono">{profil.textBereich.min} bis {profil.textBereich.max}</dd>{/if}
      </dl>
      {#if profil.fuehrendeNullen > 0}<p class="an-tafel-fuss">Als Zahl gelesen ginge die führende Null verloren, darum Text.</p>{/if}
    </div>
  {/if}
  {#if proben.length}
    <div class="karte">
      <div class="karte-titel">Beispiele mit Startwert {z.startwert}</div>
      <ul class="td-proben">{#each proben as p, i (i)}<li class="mono">{zeigen(p)}</li>{/each}</ul>
    </div>
  {/if}
{:else}
  <div class="karte">
    <div class="karte-titel">Testdaten</div>
    <p class="an-tafel-fuss">Ein Feld in der Spezifikation wählen: hier lassen sich Erzeuger, Einstellungen und der Anteil leerer Werte ändern, mit Beispielen aus dem Startwert.</p>
  </div>
{/if}
<div class="karte">
  <div class="karte-titel">Im Browser</div>
  <p class="an-tafel-fuss">Die Testdaten entstehen ganz in diesem Browser. Namen, Adressen und Nummern sind erfunden; E-Mail-Adressen enden auf .example und erreichen niemanden.</p>
</div>
