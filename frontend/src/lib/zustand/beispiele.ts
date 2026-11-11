// Beispiele öffnen (STB-19): legt die Beispieldaten im Ordner "Beispiele" der eigenen Ablage an und öffnet sie. Sind sie
// schon da, öffnet es die vorhandenen (mit allen Änderungen), statt Doppel anzulegen. Wer neu anfangen will, legt die
// Beispiele in der Ablage in den Papierkorb; das nächste Öffnen legt sie frisch an.

import { Ablagefehler } from "../dienste/ablage";
import { BEISPIELE, BEISPIEL_ORDNER } from "../dienste/beispiele";
import { ablageverwaltung } from "./ablageverwaltung.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { meldungen } from "./meldungen.svelte";

export { BEISPIELE, BEISPIEL_ORDNER } from "../dienste/beispiele";

let laeuft = false;

export async function beispieleOeffnen(): Promise<void> {
  if (laeuft) return;
  laeuft = true;
  try {
    try {
      await arbeitsplatz.ablage.ordnerAnlegen(BEISPIEL_ORDNER);
    } catch (f) {
      if (!(f instanceof Ablagefehler)) throw f;            // gibt es schon: gut so
    }
    await arbeitsplatz.listeNeu();
    let erstes: string | null = null;
    for (const b of BEISPIELE) {
      const da = arbeitsplatz.dokumente.find((d) => d.ordner === BEISPIEL_ORDNER && d.name === b.name);
      if (da) await arbeitsplatz.ausAblageOeffnen(da.kennung);
      else await arbeitsplatz.neu(b.name, await b.laden(), BEISPIEL_ORDNER);
      erstes ??= arbeitsplatz.aktivesBlatt?.kennung ?? null;
    }
    const blatt = arbeitsplatz.blaetter.find((b) => b.kennung === erstes);
    if (blatt) {
      arbeitsplatz.waehlen(blatt);
      blatt.zeigen({ art: "ansicht", kennung: "baum" });
    }
    await ablageverwaltung.neuLaden();
    meldungen.zeigen({ text: `Beispiele geöffnet (Ordner ${BEISPIEL_ORDNER}): zum Üben frei veränderbar; frisch anfangen: in der Ablage die Beispiele in den Papierkorb legen`, art: "erfolg" });
  } catch (f) {
    meldungen.zeigen({ text: `Die Beispiele ließen sich nicht öffnen: ${(f as Error).message}`, art: "fehler" });
  } finally {
    laeuft = false;
  }
}
