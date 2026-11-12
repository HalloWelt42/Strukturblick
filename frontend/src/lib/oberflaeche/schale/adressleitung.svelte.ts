// Adressleitung (STB-48): hält die Adresszeile und den Arbeitsplatz gleich. Beim Start und bei Zurück/Vor führt die
// Adresse (Dokument, Ansicht oder Werkzeug, Einstellungen, Stelle); danach folgt die Adresse jeder Änderung. Ein
// Ortswechsel (anderes Dokument, andere Ansicht, Ablage) legt einen Eintrag im Verlauf an, Feinheiten (Stelle,
// Einstellungen) ersetzen den aktuellen. Was in die Adresse gehört, sagen Ansichten und Werkzeuge selbst (adresse).

import { ANSICHTEN } from "../ansichten/registrierung";
import { WERKZEUGE } from "../werkzeuge/registrierung";
import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
import { meldungen } from "../../zustand/meldungen.svelte";
import type { Arbeitsblatt, Platz } from "../../zustand/arbeitsblatt.svelte";
import { adresseBauen, kennungFinden, kurzeKennung, ortLesen, ortsWechsel, type Adressierbar, type Adresskontext, type Ort } from "../../zustand/adresse";

const BASIS = import.meta.env.BASE_URL;

const kontext = (): Adresskontext => {
  const alle = arbeitsplatz.dokumente.map((d) => d.kennung);
  return {
    kurz: (kennung) => kurzeKennung(kennung, alle),
    dokument: (kurz) => {
      const k = kennungFinden(kurz, alle);
      return k ? (arbeitsplatz.dokumente.find((d) => d.kennung === k) ?? null) : null;
    },
  };
};

/** Platz zu einer Kennung aus der Adresse; Ansichten und Werkzeuge haben verschiedene Kennungen */
function platzVon(kennung: string): Platz | null {
  if (ANSICHTEN.some((a) => a.kennung === kennung)) return { art: "ansicht", kennung };
  if (WERKZEUGE.some((w) => w.kennung === kennung)) return { art: "werkzeug", kennung };
  return null;
}

function adressierbar(blatt: Arbeitsblatt): Adressierbar | null {
  const p = blatt.platz;
  const eintrag = p.art === "ansicht" ? ANSICHTEN.find((a) => a.kennung === p.kennung) : WERKZEUGE.find((w) => w.kennung === p.kennung);
  return eintrag?.adresse?.(blatt) ?? null;
}

/** Wo der Arbeitsplatz gerade ist */
function ortJetzt(): Ort {
  if (arbeitsplatz.seite === "ablage") return { seite: "ablage" };
  const b = arbeitsplatz.aktivesBlatt;
  if (!b) return { seite: "arbeitsplatz" };
  const k = kontext();
  return { seite: "dokument", kennung: k.kurz(b.kennung), name: b.name, platz: b.platz.kennung, stelle: b.gewaehlt, werte: adressierbar(b)?.adresseWerte(k) ?? {} };
}

/** Den Arbeitsplatz an einen Ort bringen; was es nicht (mehr) gibt, wird gemeldet und bleibt, wie es ist */
async function anwenden(ort: Ort): Promise<void> {
  if (ort.seite === "ablage") return ablageverwaltung.oeffnen();
  if (ort.seite === "arbeitsplatz") return;
  const k = kontext();
  const kopf = k.dokument(ort.kennung);
  if (!kopf) {
    meldungen.zeigen({ text: "Das Dokument aus der Adresse gibt es in dieser Ablage nicht; es bleibt beim zuletzt offenen", art: "hinweis" });
    return;
  }
  await arbeitsplatz.ausAblageOeffnen(kopf.kennung);
  const b = arbeitsplatz.aktivesBlatt;
  if (!b || b.kennung !== kopf.kennung) return;
  const platz = ort.platz ? platzVon(ort.platz) : null;
  if (platz) b.zeigen(platz);
  await adressierbar(b)?.adresseUebernehmen(ort.werte, k);
  b.waehlen(ort.stelle);
}

const jetzigeAdresse = (): string => `${location.pathname}${location.search}`;

/** Startet die Leitung, sobald der Arbeitsplatz bereit ist; gibt das Beenden zurück */
export function adresseVerfolgen(): () => void {
  // Solange die Adresse führt, schreibt die Leitung nicht zurück; danach ersetzt der erreichte Ort den Eintrag
  // (aus "/" wird so das zuletzt offene Dokument, ohne dass Zurück wieder auf "/" springt)
  let fuehrt = $state(true);
  let zuletzt: Ort = ortLesen(location.pathname, location.search, BASIS);

  const fuehren = async (ort: Ort) => {
    fuehrt = true;
    try {
      await anwenden(ort);
    } finally {
      zuletzt = ortJetzt();
      history.replaceState(history.state, "", adresseBauen(zuletzt, BASIS));
      fuehrt = false;
    }
  };

  const zurueck = () => {
    zuletzt = ortLesen(location.pathname, location.search, BASIS);
    void fuehren(zuletzt);
  };
  window.addEventListener("popstate", zurueck);

  const beenden = $effect.root(() => {
    $effect(() => {
      const ort = ortJetzt();
      const ziel = adresseBauen(ort, BASIS);
      if (fuehrt || ziel === jetzigeAdresse()) return;
      if (ortsWechsel(zuletzt, ort)) history.pushState(null, "", ziel);
      else history.replaceState(history.state, "", ziel);
      zuletzt = ort;
    });
  });

  void fuehren(zuletzt);

  return () => {
    window.removeEventListener("popstate", zurueck);
    beenden();
  };
}
