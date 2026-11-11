<script lang="ts">
  // Feld-Profil: je Feld Typ, Vorkommen, verschiedene Werte, Textlänge, Bereich und Leer-Anteil. Kopf und Werte stehen
  // in derselben Spalte, Zahlen rechts. Ein Klick wählt das Feld.
  import { KNOTEN_NAME, KnotenArt } from "../../../kern/strukturindex";
  import { lage, leerAnteil, type Feld, type Statistik } from "../../../analyse/statistik";
  import { anzahl, prozent } from "../tabelle/zahlen";

  let { st, titel, gewaehlt, onwahl }: { st: Statistik; titel: string; gewaehlt: string | null; onwahl: (f: Feld) => void } = $props();

  /** Ab diesem Leer-Anteil fällt ein Feld auf */
  const LEER_AUFFAELLIG = 0.2;
  const ZAHL_KLASSE: Record<number, string> = { [KnotenArt.objekt]: "w-objekt", [KnotenArt.liste]: "w-liste", [KnotenArt.text]: "w-text", [KnotenArt.zahl]: "w-zahl", [KnotenArt.wahrheitswert]: "w-bool", [KnotenArt.nichts]: "w-null" };

  /** Arten nach Häufigkeit, Nichts heißt hier Null */
  function typ(f: Feld): { text: string; klasse: string } {
    const arten = f.arten.map((n, art) => ({ n, art })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
    const name = (art: number) => (art === KnotenArt.nichts ? "Null" : art === KnotenArt.zahl && f.ganz ? "Zahl, ganz" : KNOTEN_NAME[art as KnotenArt]);
    return { text: arten.slice(0, 3).map((x) => name(x.art)).join(" oder ") + (arten.length > 3 ? " ..." : ""), klasse: ZAHL_KLASSE[arten[0]?.art ?? KnotenArt.nichts] };
  }

  function bereich(f: Feld): string | null {
    const l = lage(f.zahlen);
    if (l && f.zahlen.length >= f.vorkommen - f.nichts) return `${l.min} bis ${l.max}`;
    if (f.textBereich) return f.textBereich.min === f.textBereich.max ? f.textBereich.min : `${f.textBereich.min} bis ${f.textBereich.max}`;
    if (f.wahr + f.falsch) return `true ${anzahl(f.wahr)}, false ${anzahl(f.falsch)}`;
    if (f.listenLaenge) return f.listenLaenge.min === f.listenLaenge.max ? `${anzahl(f.listenLaenge.min)} Einträge` : `${anzahl(f.listenLaenge.min)} bis ${anzahl(f.listenLaenge.max)} Einträge`;
    return null;
  }

  function leerTitel(f: Feld): string {
    const fehlt = f.moeglich === null ? 0 : Math.max(0, f.moeglich - f.vorkommen);
    return [fehlt && `fehlt in ${anzahl(fehlt)}`, f.nichts && `null in ${anzahl(f.nichts)}`, f.leerText && `leer in ${anzahl(f.leerText)}`].filter(Boolean).join(", ") || "nie leer";
  }
</script>

<section class="an-tafel">
  <div class="karte-titel">Feld-Profil <span class="rechts klein mono">{titel}</span></div>
  <div class="an-tabellenfeld">
    <table class="an-profil">
      <thead>
        <tr>
          <th>Feld</th><th>Typ</th><th class="an-zahl">Vorkommen</th><th class="an-zahl">Verschiedene</th><th>Textlänge</th><th>Bereich</th><th class="an-zahl">Leer-Anteil</th>
        </tr>
      </thead>
      <tbody>
        {#each st.felder as f (f.pfad)}
          {@const t = typ(f)}
          {@const b = bereich(f)}
          {@const leer = leerAnteil(f)}
          <tr class:an-gewaehlt={gewaehlt === f.pfad} aria-selected={gewaehlt === f.pfad} onclick={() => onwahl(f)}>
            <td class="an-feldname"><span class="an-vorsilbe">{f.vorsilbe}</span>{f.name}{#if gewaehlt === f.pfad}<i class="fa-solid fa-location-crosshairs an-ziel" title="Im Inspektor"></i>{/if}</td>
            <td class={t.klasse}>{t.text}</td>
            <td class="an-zahl">{anzahl(f.vorkommen)}</td>
            <td class="an-zahl" class:an-leer-wert={f.verschiedene === null}>{f.verschiedene === null ? "-" : `${f.verschiedeneMehr ? "über " : ""}${anzahl(f.verschiedene)}`}</td>
            <td class:an-leer-wert={!f.textLaenge}>{f.textLaenge ? (f.textLaenge.min === f.textLaenge.max ? anzahl(f.textLaenge.min) : `${anzahl(f.textLaenge.min)} bis ${anzahl(f.textLaenge.max)}`) : "-"}</td>
            <td class:mono={b !== null} class:an-leer-wert={b === null}>{b ?? "-"}</td>
            <td class="an-zahl" class:an-leer-wert={leer === 0} title={leerTitel(f)}>{#if leer >= LEER_AUFFAELLIG}<span class="abzeichen warn">{prozent(Math.round(leer * 1000), 1000)}</span>{:else}{prozent(Math.round(leer * 1000), 1000)}{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
