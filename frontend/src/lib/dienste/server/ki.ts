// KI über den eigenen Server (Bauart "server"): Stand, Einstellungen und Vorschlag. Ein Vorschlag wartet ohne
// Zeitgrenze, solange die Leitstelle rechnet oder das Modell lädt (Leitstelle ANBINDUNG 2.1); abbrechen geht über das
// Signal (Verwerfen).

import { hole, json } from "appkern-oberflaeche";
import type { KiAuftrag, KiStand, KiVorschlag } from "../ki";

export const kiStand = (): Promise<KiStand> => hole<KiStand>("/ki/stand");

export const kiVorschlag = (auftrag: KiAuftrag, signal?: AbortSignal): Promise<KiVorschlag> =>
  hole<KiVorschlag>("/ki/vorschlag", { method: "POST", ...json(auftrag), zeitgrenzeMs: 0, signal });

/** KI an oder aus, Sprachmodell wählen: Einstellungen des Servers, gelten für alle Geräte */
export async function kiEinstellen(werte: { ki_an?: boolean; ki_modell?: string }): Promise<void> {
  await hole<unknown>("/einstellungen", { method: "PATCH", ...json({ werte }) });
}
