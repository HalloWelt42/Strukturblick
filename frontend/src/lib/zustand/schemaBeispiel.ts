// Beispieldokument zu einem XML Schema erzeugen und neben das Schema legen. Es verweist auf das Schema (xsi:schemaLocation)
// und öffnet gleich im Werkzeug Validieren, das es dagegen prüft. Die Ansicht Schema ruft hier auf.

import { beispielErzeugen } from "../analyse/xsd/beispiel";
import type { QName, XsdModell } from "../analyse/xsd/modell";
import type { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { meldungen } from "./meldungen.svelte";
import { belegteNamen, freierName } from "./schemadateien";

export async function beispielAblegen(blatt: Arbeitsblatt, modell: XsdModell, wurzel: QName, umfang: "pflicht" | "alles"): Promise<void> {
  const b = beispielErzeugen(modell, { wurzel, umfang, schemaOrt: blatt.name });
  if (!b.text) {
    meldungen.zeigen({ text: b.hinweise[0] ?? "Kein Beispiel möglich", art: "fehler" });
    return;
  }
  const name = freierName(`${blatt.name.replace(/\.[^.]+$/, "")}.beispiel.xml`, belegteNamen(blatt.ordner));
  const neu = await arbeitsplatz.neu(name, b.text, blatt.ordner);
  neu.zeigen({ art: "werkzeug", kennung: "validieren" });
  const teile = [
    `${name} erzeugt: ${b.elemente.toLocaleString("de-DE")} Elemente${b.gekuerzt ? ", ab 5.000 nur noch Pflichtteile" : ""}`,
    ...(b.hinweise.length ? [`Nicht ganz gültig: ${b.hinweise.join("; ")}`] : []),
    `Validieren prüft es gegen ${blatt.name}`,
  ];
  meldungen.zeigen({ text: `${teile.join(". ")}.`, art: b.hinweise.length ? "hinweis" : "erfolg" });
}
