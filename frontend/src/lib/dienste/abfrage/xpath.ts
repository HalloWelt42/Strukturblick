// XPath-Maschine im Abfrage-Worker (STB-51): rechnet mit libxml2 über den Text des XML-Dokuments; getroffene Knoten
// werden Werte der Lesart von Strukturblick mit ihrem Ort (Sprungziel), Zahlen, Text und Wahrheitswerte ein Wert.

import { XpathFehler, xpathAuswerten } from "../../analyse/abfrage/xpath";
import { wertAus } from "../../analyse/wert";
import { KEIN, knotenZu } from "../../kern";
import { format } from "../../formate/registrierung";
import { werteErgebnis } from "./stuecke";
import { wurf, zielVon, type Maschine } from "./maschine";

export const xpathMaschine: Maschine = async (a, q) => {
  const s = q.stand(zielVon(a));
  if (!format(s.format).faehigkeiten.xpath) throw wurf("XPath fragt XML-Dokumente ab; dieses Dokument ist keins. Für JSON, YAML und die übrigen gibt es jq und JSONPath.");
  let r;
  try {
    r = await xpathAuswerten(s.text, a.ausdruck.trim() || "/");
  } catch (f) {
    if (f instanceof XpathFehler) throw wurf(f.message);
    throw f;
  }
  if (r.art === "wert") return werteErgebnis([r.wert], null, null, a.ausgabe);
  const werte = r.zeiger.map((z, i) => {
    const k = z === null ? KEIN : knotenZu(s.index, s.text, z);
    return k === KEIN ? r.texte[i] : wertAus(s.index, s.text, k);
  });
  const orte = r.zeiger.map((z) => (z !== null && knotenZu(s.index, s.text, z) !== KEIN ? z : null));
  return werteErgebnis(werte, orte, orte.filter((o): o is string => o !== null), a.ausgabe);
};
