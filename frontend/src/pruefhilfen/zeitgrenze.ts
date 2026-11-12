// Zeitgrenzen für Leistungstests, die gegen Rechnerlast fest sind (STB-25). Eine feste Eichlast läuft direkt bei der
// Prüfung; ist sie langsamer als in Ruhe, wächst die Grenze im selben Verhältnis. So misst ein Test den Code und nicht
// die Auslastung des Rechners (parallele Testläufe, Bauserver mit zwei Kernen). Nur für Tests.
// Leistungstests laufen außerdem nur im eigenen Lauf (npm run test:leistung): nacheinander, ohne andere Tests daneben.
// Im normalen Testlauf werden sie übersprungen.

import { it } from "vitest";

/** Gesetzt im eigenen Leistungslauf (npm run test:leistung) */
export const LEISTUNGSLAUF = process.env.STRUKTURBLICK_LEISTUNG === "1";

/** Ein Leistungstest: heißt "Leistung: ...", läuft nur im Leistungslauf */
export function leistungstest(name: string, fn: () => void | Promise<void>, zeitlimit?: number): void {
  (LEISTUNGSLAUF ? it : it.skip)(`Leistung: ${name}`, fn, zeitlimit);
}

/** Dauer der Eichlast auf dem Entwicklungsrechner bei üblicher Last (12.11.2026 gemessen: 30 bis 34 ms bei Lastmittel 6) */
export const EICH_RUHE_MS = 30;

/** Feste Arbeit, die wie Lesen beansprucht: Texte bauen, zerlegen, Objekte anlegen */
function eichlast(): number {
  let summe = 0;
  for (let n = 0; n < 40; n++) {
    const teile: string[] = [];
    for (let i = 0; i < 2000; i++) teile.push(`{"nr":${i},"name":"Eintrag ${i}","wert":${i * 1.5}}`);
    const liste = JSON.parse(`[${teile.join(",")}]`) as { nr: number }[];
    summe += liste[liste.length - 1].nr;
  }
  return summe;
}

/** Dauer der Eichlast jetzt: Mitte aus drei Läufen */
export function eichzeit(): number {
  const zeiten = [0, 1, 2].map(() => {
    const t = performance.now();
    eichlast();
    return performance.now() - t;
  });
  return zeiten.sort((a, b) => a - b)[1];
}

/** Zeitgrenze für eine Arbeit, die in Ruhe `budgetMs` braucht darf; unter Last entsprechend mehr */
export function zeitgrenze(budgetMs: number): number {
  return budgetMs * Math.max(1, eichzeit() / EICH_RUHE_MS);
}
