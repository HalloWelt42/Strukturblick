// Zuletzt benutzte Einträge der Befehlspalette je Gerät (localStorage), jüngster zuerst. Die Palette zeigt sie oben.

const SCHLUESSEL = "strukturblick-zuletzt";
/** So viele merkt sie sich; gezeigt werden weniger (Grenze der Palette) */
const HOECHSTENS = 20;

function gelesen(): string[] {
  try {
    const roh: unknown = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "[]");
    return Array.isArray(roh) ? roh.filter((k): k is string => typeof k === "string").slice(0, HOECHSTENS) : [];
  } catch {
    return [];
  }
}

class Zuletzt {
  liste = $state.raw<string[]>(gelesen());

  merken(kennung: string): void {
    this.liste = [kennung, ...this.liste.filter((k) => k !== kennung)].slice(0, HOECHSTENS);
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(this.liste));
    } catch {
      // Speicher gesperrt (privates Fenster): gilt dann nur bis zum Neuladen
    }
  }
}

export const zuletzt = new Zuletzt();
