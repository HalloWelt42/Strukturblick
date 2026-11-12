// Neue Fassung in der Bauart ohne Server (GitHub Pages): Es gibt keinen Server, der die Fassung meldet, aber die
// Startseite trägt sie (meta app-fassung). Geprüft wird beim Start, wenn das Fenster wieder nach vorn kommt, und alle
// paar Minuten. Beim Start lädt die Seite von selbst neu, wenn `vonSelbst` es erlaubt (STB-61: nur in den ersten
// Sekunden); sonst meldet sie die neue Fassung, und neu geladen wird erst auf Wunsch (`neuLadenOhneServer`). Von
// selbst je Fassung nur ein Versuch (Merker in der Sitzung), damit ein Zwischenspeicher, der noch die alte Seite
// liefert, keine Schleife auslöst. Die Adresse bekommt die Fassung angehängt, damit der Browser die Startseite neu holt;
// nach dem Laden wird sie wieder entfernt.

const PRUEFEN_MS = 5 * 60_000;
const MERKER = "strukturblick_neu_geladen";
const PARAMETER = "fassung";

async function serverFassung(): Promise<string | null> {
  try {
    // Startseite über die Basis der Bauart, damit es auch unter tiefen Pfaden (Deeplinks) die eigene ist
    const antwort = await fetch(`${import.meta.env.BASE_URL}index.html?${PARAMETER}=${Date.now()}`, { cache: "no-store" });
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

/** Die Seite mit der Fassung `neu` laden (die angehängte Fassung umgeht den Zwischenspeicher der Startseite) */
export function neuLadenOhneServer(neu: string): void {
  const ziel = new URL(location.href);
  ziel.searchParams.set(PARAMETER, neu);
  location.replace(ziel);
}

/** Startet die Prüfung. `vonSelbst`: darf jetzt ohne Frage neu geladen werden; `gemeldet`: es gibt eine neue Fassung,
 *  der Mensch entscheidet. Gibt das Beenden zurück. */
export function fassungOhneServerVerfolgen(eingebaut: string, vonSelbst: () => boolean, gemeldet: (neu: string) => void): () => void {
  // Angehängte Fassung aus einem eigenen Neuladen wieder aus der Adresse nehmen
  const adresse = new URL(location.href);
  if (adresse.searchParams.has(PARAMETER)) {
    adresse.searchParams.delete(PARAMETER);
    history.replaceState(history.state, "", adresse);
  }

  let laeuft = false;
  const pruefen = async () => {
    if (laeuft) return;
    laeuft = true;
    try {
      const neu = await serverFassung();
      if (!neu || neu === eingebaut) return;
      if (vonSelbst() && erlaubt(neu)) neuLadenOhneServer(neu);
      else gemeldet(neu);
    } finally {
      laeuft = false;
    }
  };

  const sichtbar = () => {
    if (document.visibilityState === "visible") void pruefen();
  };
  void pruefen();
  const takt = setInterval(() => document.visibilityState === "visible" && void pruefen(), PRUEFEN_MS);
  document.addEventListener("visibilitychange", sichtbar);
  return () => {
    clearInterval(takt);
    document.removeEventListener("visibilitychange", sichtbar);
  };
}
