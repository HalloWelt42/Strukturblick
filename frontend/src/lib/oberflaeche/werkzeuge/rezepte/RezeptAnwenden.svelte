<script lang="ts">
  // Rezept anwenden (entwuerfe/rezept-anwenden.html): 1. Spalten prüfen, 2. Vorschau je Schritt, 3. Ergebnis als neues
  // Dokument oder ins Dokument. Gerechnet wird auf dem gelesenen Stand des Dokuments; übernommen erst auf Knopfdruck.
  import { untrack } from "svelte";
  import { rezeptAusfuehren, spaltenPruefen } from "../../../analyse/rezepte/ausfuehren";
  import { SCHRITT_ART, schrittTitel, type Rezept } from "../../../analyse/rezepte/rezept";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import WertText from "../../bausteine/WertText.svelte";

  let { blatt, rezept }: { blatt: Arbeitsblatt; rezept: Rezept } = $props();

  const format = $derived(blatt.analyse?.format ?? null);
  const optionen = $derived($state.snapshot(blatt.optionen));
  const pruefung = $derived(format ? spaltenPruefen(rezept, blatt.analyseText, format, optionen) : null);
  const lauf = $derived(format && pruefung ? rezeptAusfuehren(rezept, blatt.analyseText, format, optionen) : null);
  const fehlen = $derived(pruefung?.erwartet.filter((e) => !e.da) ?? []);
  const da = $derived((pruefung?.erwartet.length ?? 0) - fehlen.length);
  const aendert = $derived(lauf !== null && lauf.text !== blatt.analyseText);

  let ziel = $state<"neu" | "dokument">("neu");
  let name = $state(untrack(() => blatt.name.replace(/(\.[^.]+)?$/, (e) => `-sauber${e}`)));

  async function uebernehmen(): Promise<void> {
    if (lauf) await rezepte.uebernehmen(blatt, rezept, lauf, ziel, name);
  }
</script>

<div class="inhalt">
  <div class="vw-seite">
    {#if !format || !pruefung || !lauf}
      <p class="vw-hilfe">{blatt.analyse ? `In ${blatt.name} gibt es keine Liste gleich aufgebauter Einträge; Rezepte arbeiten auf Tabellen.` : "Das Dokument wird gelesen ..."}</p>
    {:else}
      <section class="vw-tafel">
        <h2 class="vw-abschnitt">1. Spalten prüfen <span class="rechts">{anzahl(pruefung.zeilen)} Zeilen, {pruefung.erwartet.length + pruefung.zusaetzlich.length} Spalten, {format.name}</span></h2>
        <div class="vw-urteil">
          <i class="fa-solid fa-circle-check"></i> {fehlen.length ? `Passt: ${da} von ${pruefung.erwartet.length} Spalten` : "Passt: alle erwarteten Spalten da"}
          {#each fehlen as f (f.spalte)}
            <span class="abzeichen warn"><i class="fa-solid fa-triangle-exclamation"></i> {f.spalte} fehlt{f.schritte.length ? `, Schritt ${f.schritte.join(", ")} wird übersprungen` : ""}</span>
          {/each}
        </div>
        <div class="vw-spaltenmarken">
          {#each pruefung.erwartet as e (e.spalte)}
            <span class="vw-spaltenmarke" class:fehlt={!e.da}><i class="fa-solid {e.da ? 'fa-check' : 'fa-xmark'}"></i>{e.spalte}{#if e.schritte.length}<span class="rechts">{e.da ? "" : "fehlt, "}Schritt {e.schritte.join(", ")}</span>{/if}</span>
          {/each}
          {#each pruefung.zusaetzlich as s (s)}
            <span class="vw-spaltenmarke zusatz"><i class="fa-solid fa-plus"></i>{s}<span class="rechts">neu, bleibt</span></span>
          {/each}
        </div>
      </section>
      <section>
        <h2 class="vw-abschnitt">2. Vorschau je Schritt <span class="rechts">{anzahl(lauf.zellen)} Zellen ändern sich{lauf.zeilen ? `, ${anzahl(lauf.zeilen)} Zeilen entfallen` : ""}</span></h2>
        <div class="vw-schritte">
          {#each rezept.schritte as s, i (i)}
            {@const p = lauf.plaene[i]}
            <div class="vw-vorschau-schritt" class:uebersprungen={p.status !== "ok"}>
              <div class="vw-vorschau-kopf">
                <span class="vw-schritt-nr">{i + 1}</span><span class="vw-schritt-name">{schrittTitel(s)} <span class="abzeichen zweit">{SCHRITT_ART[s.art]}</span></span>
                <span class="rechts">
                  {#if p.status === "aus"}<span class="abzeichen zweit">ausgeschaltet</span>
                  {:else if p.status === "uebersprungen"}<span class="abzeichen warn"><i class="fa-solid fa-forward"></i> übersprungen</span>
                  {:else if !p.befehl}<span class="abzeichen zweit">ändert hier nichts</span>
                  {:else}<span class="abzeichen">{p.spalten ? "Spalte entfällt" : p.zeilen ? `${anzahl(p.zeilen)} Zeilen entfallen` : `${anzahl(p.zellen)} Zellen`}</span>{/if}
                </span>
              </div>
              <table class="vw-beispiele">
                <tbody>
                  {#if p.status === "uebersprungen"}
                    <tr><td colspan="5" class="text-3">{p.grund}</td></tr>
                  {:else if p.status === "ok"}
                    {#each p.beispiele as b (b.vorher + "\u0000" + b.nachher)}
                      <tr>
                        <td><span class="vw-vorher"><WertText wert={b.vorher} /></span></td>
                        <td class="vw-pfeil-zelle"><i class="fa-solid fa-arrow-right vw-pfeil"></i></td>
                        <td>{#if b.nachher === null}<span class="abzeichen warn">nicht lesbar, {"unlesbar" in s && s.unlesbar === "leeren" ? "wird leer" : "bleibt stehen"}</span>{:else}<span class="vw-nachher">{b.nachher}</span>{/if}</td>
                        <td class="vw-luft"></td>
                        <td class="vw-anzahl-zelle">{b.anzahl > 1 ? anzahl(b.anzahl) : ""}</td>
                      </tr>
                    {/each}
                    {#if p.zeilen && s.art === "behalten"}<tr><td colspan="5" class="text-3">Es bleiben {anzahl(pruefung.zeilen - p.zeilen)} Zeilen, die zu den Filtern passen.</td></tr>{/if}
                    {#if p.spalten}<tr><td colspan="5" class="text-3">Die Spalte fällt aus {anzahl(p.zellen)} Einträgen weg.</td></tr>{/if}
                    {#if !p.spalten && p.zellen > p.beispiele.reduce((n, b) => n + b.anzahl, 0)}<tr><td colspan="5" class="text-3">und weitere Zellen wie diese</td></tr>{/if}
                  {/if}
                </tbody>
              </table>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>
{#if lauf}
  <div class="vw-entscheidung">
    <strong>3. Ergebnis</strong>
    <div class="segment">
      <button class:aktiv={ziel === "neu"} onclick={() => (ziel = "neu")}><i class="fa-solid fa-file-circle-plus"></i> Als neues Dokument</button>
      <button class:aktiv={ziel === "dokument"} onclick={() => (ziel = "dokument")}><i class="fa-solid fa-file-pen"></i> Ins Dokument</button>
    </div>
    {#if ziel === "neu"}
      <label class="feld" title="Name des neuen Dokuments; es landet im selben Ordner"><i class="fa-solid fa-file"></i><input bind:value={name} aria-label="Name des neuen Dokuments" /></label>
    {:else}
      <span class="text-3 klein">Ein Vorgang im Verlauf, rückgängig möglich.</span>
    {/if}
    <span class="rechts">
      <button class="knopf" onclick={() => (rezepte.modus = "ansehen")}>Abbrechen</button>
      <button class="knopf primaer" disabled={!aendert || !blatt.aktuell || (ziel === "neu" && !name.trim())} title={aendert ? "" : "Das Rezept ändert an diesem Dokument nichts"} onclick={() => void uebernehmen()}><i class="fa-solid fa-check"></i> Übernehmen</button>
    </span>
  </div>
{/if}
