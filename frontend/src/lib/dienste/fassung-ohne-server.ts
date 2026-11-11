// Neue Fassung in der Bauart ohne Server (GitHub Pages): Es gibt keinen Server, der die Fassung meldet, aber die
// Startseite trägt sie (meta app-fassung). Geprüft wird beim Start, wenn das Fenster wieder nach vorn kommt, und alle
// paar Minuten. Weicht sie ab, lädt die Seite von selbst neu: beim Start sofort, später, sobald das Fenster nach vorn
// kommt und nichts mehr abzulegen ist. Je Fassung nur ein Versuch (Merker in der Sitzung), damit ein Zwischenspeicher,
// der noch die alte Seite liefert, keine Schleife auslöst. Die Adresse bekommt die Fassung angehängt, damit der Browser
// die Startseite neu holt; nach dem Laden wird sie wieder entfernt.

const PRUEFEN_MS = 5 * 60_000;
const START_FENSTER_MS = 10_000;
const MERKER = "strukturblick_neu_geladen";
const PARAMETER = "fassung";

async function serverFassung(): Promise<string | null> {
  try {
    const antwort = await fetch(`./index.html?${PARAMETER}=${Date.now()}`, { cache: "no-store" });
    if (!antwort.ok) return null;
    return /<meta name="app-fassung" content="([^"]+)"/.exec(await antwort.text())?.[1] ?? null;
  } catch {
    return null;
  }
}

function erlaubt(neu: string): boolean {
  try {
    if (sessionStorage.getItem(MERKER) === neu) return false;
    sessionStorage.setItem(MERKER, neu);
  } catch {
    // ohne Sitzungsspeicher kein Merker: dann lieber einmal laden als nie
  }
  return true;
}

/** Startet die Prüfung; `ruhig` sagt, ob jetzt neu geladen werden darf (alles abgelegt). Gibt das Beenden zurück. */
export function fassungOhneServerVerfolgen(eingebaut: string, ruhig: () => boolean): () => void {
  // Angehängte Fassung aus einem eigenen Neuladen wieder aus der Adresse nehmen
  const adresse = new URL(location.href);
  if (adresse.searchParams.has(PARAMETER)) {
    adresse.searchParams.delete(PARAMETER);
    history.replaceState(history.state, "", adresse);
  }

  let laeuft = false;
  const pruefen = async (start: boolean) => {
    if (laeuft) return;
    laeuft = true;
    try {
      const neu = await serverFassung();
      if (!neu || neu === eingebaut) return;
      if (start && performance.now() > START_FENSTER_MS) return;
      if (!ruhig() || !erlaubt(neu)) return;
      const ziel = new URL(location.href);
      ziel.searchParams.set(PARAMETER, neu);
      location.replace(ziel);
    } finally {
      laeuft = false;
    }
  };

  const sichtbar = () => {
    if (document.visibilityState === "visible") void pruefen(false);
  };
  void pruefen(true);
  const takt = setInterval(() => document.visibilityState === "visible" && void pruefen(false), PRUEFEN_MS);
  document.addEventListener("visibilitychange", sichtbar);
  return () => {
    clearInterval(takt);
    document.removeEventListener("visibilitychange", sichtbar);
  };
}
