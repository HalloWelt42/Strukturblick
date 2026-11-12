<script lang="ts">
  // Reiter Statistik: Kennzahlen des gelesenen Schemas als Kacheln, Ableitungen und eingebaute Typen als Balken, die
  // meistgenutzten Basistypen, die Bausteine, die gelesenen Dateien und ungenutzte Typen. Klick auf einen Typ zeigt ihn
  // im Inspektor.
  import { anzeigename, type QName } from "../../../analyse/xsd/modell";
  import { anzahl } from "../tabelle/zahlen";
  import type { SchemaZustand, Uebersicht } from "./schemaZustand.svelte";
  import { ABLEITUNG_NAME } from "./texte";

  let { u, z }: { u: Uebersicht; z: SchemaZustand } = $props();

  const m = $derived(u.modell);
  const k = $derived(u.kennzahlen);
  const ableitungen = $derived((Object.keys(ABLEITUNG_NAME) as (keyof typeof ABLEITUNG_NAME)[]).map((a) => ({ name: ABLEITUNG_NAME[a], anzahl: k.ableitungen[a] })));
  const hoechste = (l: readonly { anzahl: number }[]): number => Math.max(1, ...l.map((x) => x.anzahl));
  const ROLLE = (haupt: boolean, pfad: string): string => (pfad === m.haupt ? "dieses Dokument" : haupt ? "eingebunden" : "importiert");
  const typWaehlen = (q: QName): void => { z.wahl = { art: "typ", schluessel: q }; };
</script>

<div class="inhalt an-raum">
  <div class="an-flaeche">
    <div class="an-kennzahlen">
      <div class="an-kachel" title="Dieses Dokument und alles, was es einbindet oder importiert"><div class="an-kachel-wert">{anzahl(k.dateien)}</div><div class="an-kachel-name">{k.dateien === 1 ? "Datei" : "Dateien"}{#if k.fehlend}, {anzahl(k.fehlend)} fehlt{/if}</div></div>
      <div class="an-kachel"><div class="an-kachel-wert">{anzahl(k.namensraeume)}</div><div class="an-kachel-name">Namensräume</div></div>
      <div class="an-kachel" title="Globale Elemente; {anzahl(k.wurzeln)} davon in diesem Dokument und seinen Includes"><div class="an-kachel-wert">{anzahl(k.elemente)}</div><div class="an-kachel-name">Elemente</div></div>
      <div class="an-kachel"><div class="an-kachel-wert w-objekt">{anzahl(k.komplex)}</div><div class="an-kachel-name">Komplexe Typen</div></div>
      <div class="an-kachel"><div class="an-kachel-wert w-text">{anzahl(k.einfach)}</div><div class="an-kachel-name">Einfache Typen</div></div>
      <div class="an-kachel" title={k.rekursiv ? "Mindestens ein Zweig wiederholt sich (rekursiv); gezählt ist jede Stelle einmal" : "Längster Weg von einer Wurzel zu einem Element ohne Kinder"}><div class="an-kachel-wert">{anzahl(k.tiefe)}{#if k.rekursiv}<span class="an-einheit">rekursiv</span>{/if}</div><div class="an-kachel-name">Tiefe</div></div>
    </div>

    <div class="sc-reihe">
      <section class="an-tafel">
        <div class="karte-titel">Ableitungen <span class="rechts klein">benannte und anonyme Typen</span></div>
        <div class="sc-balken">
          {#each ableitungen as a (a.name)}
            <span>{a.name}</span><span class="sc-balken-spur"><span style="--anteil: {(a.anzahl / hoechste(ableitungen)) * 100}%"></span></span><b>{anzahl(a.anzahl)}</b>
          {/each}
        </div>
      </section>
      <section class="an-tafel">
        <div class="karte-titel">Eingebaute Typen <span class="rechts klein">wie oft genutzt</span></div>
        {#if k.eingebaut.length}
          <div class="sc-balken">
            {#each k.eingebaut.slice(0, 8) as e (e.name)}
              <span class="mono">{e.name}</span><span class="sc-balken-spur"><span style="--anteil: {(e.anzahl / hoechste(k.eingebaut)) * 100}%"></span></span><b>{anzahl(e.anzahl)}</b>
            {/each}
          </div>
          {#if k.eingebaut.length > 8}<p class="an-tafel-fuss an-oben">und {anzahl(k.eingebaut.length - 8)} weitere</p>{/if}
        {:else}
          <p class="an-tafel-fuss">Keine.</p>
        {/if}
      </section>
      <section class="an-tafel">
        <div class="karte-titel">Meistgenutzte Basistypen</div>
        {#if k.basen.length}
          <div class="sc-balken">
            {#each k.basen.slice(0, 8) as b (b.schluessel)}
              <button class="sc-verweis mono" onclick={() => typWaehlen(b.schluessel)}>{anzeigename(m, b.schluessel)}</button><span class="sc-balken-spur"><span style="--anteil: {(b.anzahl / hoechste(k.basen)) * 100}%"></span></span><b>{anzahl(b.anzahl)}</b>
            {/each}
          </div>
        {:else}
          <p class="an-tafel-fuss">Kein benannter Typ dient als Basis.</p>
        {/if}
      </section>
      <section class="an-tafel">
        <div class="karte-titel">Bausteine</div>
        <dl class="paare">
          <dt>Anonyme Typen</dt><dd>{anzahl(k.anonym)}</dd>
          <dt>Gruppen</dt><dd>{anzahl(k.gruppen)} Elementgruppen, {anzahl(k.attributgruppen)} Attributgruppen</dd>
          <dt>Aufzählungen</dt><dd>{anzahl(k.aufzaehlungen)} Typen mit zusammen {anzahl(k.werte)} Werten</dd>
          <dt>Abstrakt</dt><dd>{anzahl(k.abstrakt)}</dd>
          <dt>Ersetzungsgruppen</dt><dd>{anzahl(k.ersetzungsgruppen)}</dd>
        </dl>
      </section>
    </div>

    <section class="an-tafel">
      <div class="karte-titel">Dateien <span class="rechts klein">{anzahl(m.teile.length)} gelesen{#if m.fehlend.length}, {anzahl(m.fehlend.length)} fehlt{/if}</span></div>
      <div class="an-tabellenfeld">
        <table class="an-profil sc-dateien">
          <thead><tr><th>Datei</th><th>Namensraum</th><th>Rolle</th><th class="an-zahl">Bindet ein</th></tr></thead>
          <tbody>
            {#each m.teile as t (t.pfad + t.zielnamensraum)}
              {@const fehlt = t.bezuege.filter((b) => !b.gefunden).length}
              <tr>
                <td class="mono">{t.pfad}</td>
                <td class="mono">{t.zielnamensraum || "ohne"}</td>
                <td>{ROLLE(t.haupt, t.pfad)}</td>
                <td class="an-zahl">{anzahl(t.bezuege.length)}{#if fehlt} <span class="abzeichen warn" title="Nicht gefunden: {t.bezuege.filter((b) => !b.gefunden).map((b) => b.ort ?? b.namensraum).join(', ')}">{anzahl(fehlt)} fehlt</span>{/if}</td>
              </tr>
            {/each}
            {#each m.fehler as f (f.datei)}
              <tr><td class="mono">{f.datei}</td><td colspan="3"><span class="abzeichen fehler">{f.meldung}</span></td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <section class="an-tafel">
      <div class="karte-titel">Ungenutzte Typen <span class="rechts klein">{anzahl(k.ungenutzt.length)}</span></div>
      {#if k.ungenutzt.length}
        <div class="sc-marken">
          {#each k.ungenutzt.slice(0, 24) as q (q)}<button class="abzeichen sc-verweis" onclick={() => typWaehlen(q)}>{anzeigename(m, q)}</button>{/each}
          {#if k.ungenutzt.length > 24}<button class="knopf still" onclick={() => { z.filter = "ungenutzt"; z.reiter = "typen"; }}>alle {anzahl(k.ungenutzt.length)} zeigen</button>{/if}
        </div>
        <p class="an-tafel-fuss an-oben">Auf diese Typen verweist nichts im gelesenen Schema. In Bibliotheken für andere Schemas ist das üblich.</p>
      {:else}
        <p class="an-tafel-fuss">Jeder benannte Typ wird genutzt.</p>
      {/if}
    </section>
  </div>
</div>
