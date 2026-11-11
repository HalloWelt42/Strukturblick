// Bauart der App (Leitgedanke 8): steht beim Bau fest. Ohne Server fehlen Ablage auf pi5b und KI ganz.

import type { Ablage } from "./ablage";
import { BrowserAblage } from "./ablage-browser";

export type Bauart = "server" | "eigenstaendig";

export const BAUART: Bauart = import.meta.env.VITE_BAUART === "server" ? "server" : "eigenstaendig";

/** Bis die Ablage auf pi5b gebaut ist (STB-4), legen beide Bauarten im Browser ab. */
export function ablageFuerBauart(): Ablage {
  return new BrowserAblage();
}

export const FASSUNG: string = __APP_FASSUNG__;
