<script lang="ts">
  // Ansicht Statistik (entwuerfe/statistik.html): Kennzahlen, Typverteilung, Feld-Profil der Liste, die auch die Tabelle
  // zeigt, Histogramm des gewählten Zahlenfelds und erkannte Muster. Ein Klick auf ein Feld wählt sein erstes Vorkommen;
  // der Inspektor zeigt dann Pfad und alle Werte dieses Pfads. Gerechnet wird in analyse/statistik.ts.
  import "../ansichten.css";
  import "./statistik.css";
  import { KEIN, KNOTEN_NAME, KnotenArt } from "../../../kern/strukturindex";
  import { knotenZu, musterJq, teileVon, zeigerVon } from "../../../kern/pfade";
  import { listeFinden } from "../../../analyse/tabelle";
  import { musterFinden, statistik, type Feld } from "../../../analyse/statistik";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { lesestand } from "../../bausteine/lesestand.svelte";
  import { anzahl, prozent } from "../tabelle/zahlen";
  import StatistikProfil from "./StatistikProfil.svelte";
  import StatistikHisto from "./StatistikHisto.svelte";
  import { StatistikZustand } from "./statistikZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  const z = $derived(blatt.zustandFuer("statistik", () => new StatistikZustand()));
  const quelle = lesestand(() => blatt);
  const stand = $derived(quelle.stand);
  const index = $derived(stand?.analyse.index ?? null);
  const text = $derived(stand?.text ?? "");

  const knoten = (zeiger: string | null): number => (index && zeiger !== null && (zeiger === "" || zeiger.startsWith("/")) ? knotenZu(index, text, zeiger) : KEIN);
  /** Liegt Knoten k in b (oder ist b)? */
  function liegtIn(k: number, b: number): boolean {
    if (!index) return false;
    for (let x = k; x !== KEIN; x = index.eltern[x]) if (x === b) return true;
    return false;
  }
  // Die profilierte Liste bleibt, solange die Wahl in ihr liegt (auch tief, etwa positionen[].preis); erst eine Wahl
  // außerhalb sucht wie die Tabelle die passende Liste
  const basis = $derived.by(() => {
    if (!index) return KEIN;
    const bisher = knoten(z.basis);
    const wahl = knoten(blatt.gewaehlt);
    if (bisher !== KEIN && (wahl === KEIN || liegtIn(wahl, bisher))) return bisher;
    const l = listeFinden(index, wahl, KEIN);
    return l === KEIN ? 0 : l;
  });
  const gerechnet = $derived.by(() => {
    if (!index || !index.anzahl) return null;
    const beginn = performance.now();
    const st = statistik(index, text, basis);
    return { st, dauer: performance.now() - beginn };
  });
  const st = $derived(gerechnet?.st ?? null);
  const muster = $derived(st ? musterFinden(st) : []);
  const basisPfad = $derived(index ? musterJq(teileVon(index, text, basis)) + (index.art[basis] === KnotenArt.liste ? "[]" : "") : "");
  const zahlenfelder = $derived(st ? st.felder.filter((f) => f.zahlen.length > 0) : []);
  const gewaehlt = $derived(st?.felder.find((f) => f.pfad === z.feld) ?? null);
  const histoFeld = $derived(gewaehlt && gewaehlt.zahlen.length ? gewaehlt : (zahlenfelder[0] ?? null));

  const KACHELN = [
    { art: KnotenArt.objekt, klasse: "w-objekt", name: "Objekte" },
    { art: KnotenArt.liste, klasse: "w-liste", name: "Listen" },
    { art: KnotenArt.text, klasse: "w-text", name: "Texte" },
  ] as const;
  const TYPBAND = [
    { art: KnotenArt.objekt, klasse: "an-f-objekt" },
    { art: KnotenArt.liste, klasse: "an-f-liste" },
    { art: KnotenArt.text, klasse: "an-f-text" },
    { art: KnotenArt.zahl, klasse: "an-f-zahl" },
    { art: KnotenArt.wahrheitswert, klasse: "an-f-bool" },
    { art: KnotenArt.nichts, klasse: "an-f-null" },
  ] as const;

  function groesse(byte: number): { wert: string; einheit: string } {
    if (byte < 1024) return { wert: anzahl(byte), einheit: "Byte" };
    if (byte < 1024 * 1024) return { wert: anzahl(Math.round(byte / 1024)), einheit: "KB" };
    return { wert: (byte / 1048576).toLocaleString("de-DE", { maximumFractionDigits: 1 }), einheit: "MB" };
  }

  function waehlen(f: Feld): void {
    if (!index) return;
    z.basis = zeigerVon(index, text, basis);
    z.feld = f.pfad;
    blatt.waehlen(zeigerVon(index, text, f.erster));
  }

  const MUSTER_SYMBOL = { eindeutig: "fa-fingerprint", datum: "fa-calendar", "zahl-als-text": "fa-hashtag" } as const;
  const MUSTER_NAME = { eindeutig: "eindeutig", datum: "Datum", "zahl-als-text": "sieht aus wie Zahl" } as const;
  function musterText(art: keyof typeof MUSTER_NAME, f: Feld): string {
    if (art === "eindeutig") return `${anzahl(f.verschiedene ?? 0)} von ${anzahl(f.vorkommen)} Werten verschieden, taugt als Schlüssel`;
    if (art === "datum") return `${anzahl(f.wieDatum)} Werte sehen aus wie ein Datum`;
    return `nur Ziffern, ${anzahl(f.fuehrendeNullen)} mit führender Null. Bleibt Text.`;
  }
</script>

<div class="an-ansicht">
  <div class="werkzeugzeile">
    <nav class="pfad" aria-label="Pfad"><span class="letzter mono">{basisPfad || "$"}</span></nav>
    <div class="rechts">
      {#if gerechnet}<span class="klein text-3">{basis === 0 ? "Ganzes Dokument" : "Liste"}, berechnet in {anzahl(Math.max(1, Math.round(gerechnet.dauer)))} ms</span>{/if}
    </div>
  </div>
  <div class="inhalt an-raum">
    {#if !stand}
      <p class="an-tafel-fuss an-leer">Das Dokument wird gelesen ...</p>
    {:else if !index || !st}
      <p class="an-tafel-fuss an-leer">Das Dokument lässt sich so nicht lesen; Statistik braucht ein lesbares Dokument.</p>
    {:else}
      {@const k = st.kennzahlen}
      {@const g = groesse(k.groesse)}
      <div class="an-flaeche">
        <div class="an-kennzahlen">
          <div class="an-kachel"><div class="an-kachel-wert">{anzahl(k.knoten)}</div><div class="an-kachel-name">Knoten</div></div>
          <div class="an-kachel" title={k.tiefsterKnoten !== KEIN ? `Tiefste Stelle: ${musterJq(teileVon(index, text, k.tiefsterKnoten))}` : undefined}><div class="an-kachel-wert">{anzahl(k.tiefe)}</div><div class="an-kachel-name">Tiefe</div></div>
          <div class="an-kachel"><div class="an-kachel-wert">{g.wert}<span class="an-einheit">{g.einheit}</span></div><div class="an-kachel-name">Größe</div></div>
          {#each KACHELN as kachel (kachel.art)}
            <div class="an-kachel"><div class="an-kachel-wert {kachel.klasse}">{anzahl(k.arten[kachel.art])}</div><div class="an-kachel-name">{kachel.name}</div></div>
          {/each}
        </div>

        <section class="an-tafel">
          <div class="karte-titel">Typverteilung <span class="rechts klein">{anzahl(k.knoten)} Werte</span></div>
          <div class="an-typband" role="img" aria-label="Anteile der Typen an allen Werten">
            {#each TYPBAND as t (t.art)}
              {#if k.arten[t.art]}<span class={t.klasse} style="--anteil: {(k.arten[t.art] / k.knoten) * 100}%" title="{KNOTEN_NAME[t.art]}: {anzahl(k.arten[t.art])}"></span>{/if}
            {/each}
          </div>
          <div class="an-legende">
            {#each TYPBAND as t (t.art)}
              <span><i class="an-farbe {t.klasse}"></i>{t.art === KnotenArt.nichts ? "Null" : KNOTEN_NAME[t.art]} <b>{anzahl(k.arten[t.art])}</b> <span class="text-3">{prozent(k.arten[t.art], k.knoten)}</span></span>
            {/each}
          </div>
        </section>

        <StatistikProfil {st} titel="{basisPfad}, {anzahl(st.eintraege)} {st.eintraege === 1 ? 'Eintrag' : 'Einträge'}" gewaehlt={z.feld} onwahl={waehlen} />

        <div class="an-reihe">
          <section class="an-tafel">
            {#if histoFeld}
              <StatistikHisto feld={histoFeld} />
            {:else}
              <div class="karte-titel">Histogramm</div>
              <p class="an-tafel-fuss">Kein Feld mit Zahlen in dieser Liste.</p>
            {/if}
          </section>
          <section class="an-tafel">
            <div class="karte-titel">Muster</div>
            <div class="an-muster">
              {#each muster as m (m.art + m.feld.pfad)}
                <button class="an-muster-eintrag" onclick={() => waehlen(m.feld)}>
                  <i class="fa-solid {MUSTER_SYMBOL[m.art]}"></i>
                  <div><div class="an-muster-name">{MUSTER_NAME[m.art]}</div><div class="an-muster-text"><span class="mono">{m.feld.pfad}</span>: {musterText(m.art, m.feld)}</div></div>
                  <span class="abzeichen" class:gut={m.art !== "zahl-als-text"} class:warn={m.art === "zahl-als-text"}>{m.art === "zahl-als-text" ? "Text" : prozent(Math.round(m.anteil * 1000), 1000)}</span>
                </button>
              {:else}
                <p class="an-tafel-fuss">Nichts Auffälliges gefunden.</p>
              {/each}
            </div>
          </section>
        </div>
        <p class="an-tafel-fuss">Klick auf ein Feld zeigt es im Inspektor und im Histogramm.</p>
      </div>
    {/if}
  </div>
</div>
