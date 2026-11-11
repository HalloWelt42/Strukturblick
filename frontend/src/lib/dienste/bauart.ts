// Bauart der App (Leitgedanke 8): steht beim Bau fest (VITE_BAUART). Ohne Server rechnet und speichert alles im
// Browser; mit Server (pi5b) kommen Anmeldung, Ablage für alle Geräte und Fassungsabgleich über den Appkern dazu. Der
// Serverteil wird nur in dieser Bauart nachgeladen.

import type { Ablage } from "./ablage";
import { BrowserAblage } from "./ablage-browser";

export type Bauart = "server" | "eigenstaendig";

export const BAUART: Bauart = import.meta.env.VITE_BAUART === "server" ? "server" : "eigenstaendig";

export const FASSUNG: string = __APP_FASSUNG__;

export type Serverteil = typeof import("./server/anbindung");

/** Teil für den Server; null in der Bauart ohne Server. */
export async function serverteil(): Promise<Serverteil | null> {
  return BAUART === "server" ? await import("./server/anbindung") : null;
}

export async function ablageFuerBauart(): Promise<Ablage> {
  const teil = await serverteil();
  return teil ? new teil.ServerAblage() : new BrowserAblage();
}
