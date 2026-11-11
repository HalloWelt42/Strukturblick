// Unscharfe Suche der Befehlspalette: Jedes Wort der Anfrage muss im Text vorkommen, zusammenhängend oder als Folge
// einzelner Buchstaben ("tabb" findet "Tastenkürzel bearbeiten"). Zusammenhängende Treffer und Treffer am Wortanfang
// zählen mehr. Groß und klein sind gleich. Liefert die Stellen für die Hervorhebung.

export interface Treffer {
  readonly punkte: number;
  /** Stellen (Zeichenindex) der getroffenen Buchstaben, aufsteigend */
  readonly stellen: readonly number[];
}

export interface Abschnitt {
  readonly text: string;
  readonly getroffen: boolean;
}

const klein = (s: string): string => s.toLocaleLowerCase("de");
const wortanfang = (text: string, i: number): boolean => i === 0 || /[\s\-_./:,(]/.test(text[i - 1]);

/** Ein Wort im Text: zuerst als zusammenhängendes Stück (bevorzugt am Wortanfang), sonst als Buchstabenfolge */
function wortTreffer(text: string, unten: string, wort: string, folge: boolean): Treffer | null {
  let beste: Treffer | null = null;
  for (let i = unten.indexOf(wort); i >= 0; i = unten.indexOf(wort, i + 1)) {
    const punkte = 100 + wort.length * 4 + (i === 0 ? 30 : wortanfang(text, i) ? 20 : 0);
    if (!beste || punkte > beste.punkte) beste = { punkte, stellen: Array.from({ length: wort.length }, (_, k) => i + k) };
  }
  if (beste || !folge) return beste;

  // Buchstabenfolge: jeden Buchstaben möglichst an einem Wortanfang, sonst an der nächsten Stelle
  const stellen: number[] = [];
  let ab = 0;
  let punkte = 0;
  for (const z of wort) {
    let gefunden = -1;
    for (let i = ab; i < unten.length; i++) {
      if (unten[i] !== z) continue;
      if (gefunden < 0) gefunden = i;
      if (wortanfang(text, i)) {
        gefunden = i;
        break;
      }
      if (stellen.length && i === stellen[stellen.length - 1] + 1) break;
    }
    if (gefunden < 0) return null;
    const folgt = stellen.length > 0 && gefunden === stellen[stellen.length - 1] + 1;
    punkte += 1 + (folgt ? 5 : 0) + (wortanfang(text, gefunden) ? 8 : 0);
    stellen.push(gefunden);
    ab = gefunden + 1;
  }
  return { punkte, stellen };
}

/** Trifft die Anfrage den Text? Leere Anfrage trifft alles mit 0 Punkten. Ohne `folge` zählen nur zusammenhängende
 *  Stücke (für Beschreibungen: verstreute Buchstaben in langem Text treffen sonst fast alles). */
export function unscharf(anfrage: string, text: string, folge = true): Treffer | null {
  const woerter = klein(anfrage).split(/\s+/).filter(Boolean);
  if (!woerter.length) return { punkte: 0, stellen: [] };
  const unten = klein(text);
  const stellen = new Set<number>();
  let punkte = 0;
  for (const w of woerter) {
    const t = wortTreffer(text, unten, w, folge);
    if (!t) return null;
    punkte += t.punkte;
    for (const s of t.stellen) stellen.add(s);
  }
  // Kurze Texte vor langen, wenn sonst gleich
  return { punkte: punkte - text.length / 100, stellen: [...stellen].sort((a, b) => a - b) };
}

/** Text in getroffene und übrige Abschnitte zerlegt, für die Hervorhebung */
export function abschnitte(text: string, stellen: readonly number[]): Abschnitt[] {
  const getroffen = new Set(stellen);
  const teile: Abschnitt[] = [];
  for (let i = 0; i < text.length; i++) {
    const an = getroffen.has(i);
    const letzter = teile[teile.length - 1];
    if (letzter && letzter.getroffen === an) teile[teile.length - 1] = { text: letzter.text + text[i], getroffen: an };
    else teile.push({ text: text[i], getroffen: an });
  }
  return teile;
}
