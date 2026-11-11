// Die Grundbefehle am Text, dazu das Entfernen von Listeneinträgen. Weitere Befehle (Rezepte ...) melden sich später an der Sitzung an.

import { z } from "zod";
import { befehl, brauchtAnalyse, Befehlsfehler, type Befehl } from "./befehl";
import { inhalt, KEIN, KNOTEN_NAME, KnotenArt, istBehaelter } from "./strukturindex";
import { knotenZu } from "./pfade";
import { Formatfehler, type NeuerWert } from "./format";

const aenderung = z.object({ von: z.number().int().min(0), bis: z.number().int().min(0), einfuegen: z.string() });

const neuerWert = z.discriminatedUnion("art", [
  z.object({ art: z.literal("text"), wert: z.string() }),
  z.object({ art: z.literal("zahl"), roh: z.string() }),
  z.object({ art: z.literal("wahrheitswert"), wert: z.boolean() }),
  z.object({ art: z.literal("nichts") }),
]);

const kurz = (s: string): string => (s.length > 30 ? s.slice(0, 29) + "..." : s);

export const anzeige = (w: NeuerWert): string =>
  w.art === "text" ? w.wert : w.art === "zahl" ? w.roh : w.art === "wahrheitswert" ? String(w.wert) : "null";

/** Getipptes und Eingefügtes im Editor; Tippen in einem Zug ist eine Geste und damit ein Verlaufsschritt. */
export const TEXT_AENDERN = befehl({
  kennung: "text.aendern",
  titel: "Text bearbeitet",
  werte: z.object({ aenderungen: z.array(aenderung).min(1) }),
  brauchtAnalyse: false,
  aenderungen: (w) => w.aenderungen,
});

/** Ganzen Text ersetzen (Formatieren, Einfügen einer Datei); bleibt ein Schritt mit Umkehrung. */
export const TEXT_ERSETZEN = befehl({
  kennung: "text.ersetzen",
  titel: "Text ersetzt",
  werte: z.object({ text: z.string(), titel: z.string().optional() }),
  brauchtAnalyse: false,
  beschreiben: (w) => w.titel ?? "Text ersetzt",
  aenderungen: (w, u) => [{ von: 0, bis: u.text.length, einfuegen: w.text }],
});

const setzen = z.object({ zeiger: z.string(), neu: neuerWert });

function aenderungFuer(w: z.infer<typeof setzen>, u: Parameters<Befehl["aenderungen"]>[1]) {
  const a = brauchtAnalyse(u);
  const index = a.index!;
  const k = knotenZu(index, u.text, w.zeiger);
  if (k === KEIN) throw new Befehlsfehler(`Die Stelle ${w.zeiger || "/"} gibt es nicht mehr`);
  if (istBehaelter(index.art[k])) throw new Befehlsfehler(`An ${w.zeiger} steht ein ${KNOTEN_NAME[index.art[k] as 0 | 1]}; nur einzelne Werte lassen sich so ändern`);
  try {
    return a.format.wertSchreiben(u.text, index, k, w.neu, a.merkmale);
  } catch (f) {
    if (f instanceof Formatfehler) throw new Befehlsfehler(f.message);
    throw f;
  }
}

/** Einen Wert an einer Stelle setzen (Baum, Tabelle, Inspektor, Telefon). */
export const WERT_SETZEN = befehl({
  kennung: "wert.setzen",
  titel: "Wert geändert",
  werte: setzen,
  brauchtAnalyse: true,
  beschreiben: (w, u) => {
    const teil = w.zeiger.split("/").pop() || "Wert";
    const a = u.analyse?.index ? u.analyse : null;
    const k = a?.index ? knotenZu(a.index, u.text, w.zeiger) : KEIN;
    const vorher = a?.index && k !== KEIN ? inhalt(a.index, u.text, k) : "";
    return `${teil}: ${kurz(vorher)} -> ${kurz(anzeige(w.neu))}`;
  },
  aenderungen: (w, u) => [aenderungFuer(w, u)],
});

/** Viele Werte in einem Schritt (Massenänderung nach Vorschau). */
export const WERTE_SETZEN = befehl({
  kennung: "werte.setzen",
  titel: "Werte geändert",
  werte: z.object({ aenderungen: z.array(setzen).min(1), titel: z.string().optional() }),
  brauchtAnalyse: true,
  beschreiben: (w) => w.titel ?? `${w.aenderungen.length} Werte geändert`,
  aenderungen: (w, u) => w.aenderungen.map((e) => aenderungFuer(e, u)),
});

/** Einträge einer Liste entfernen (Bereinigen: "Nur diese Zeilen behalten"); das Format nimmt nur ihre Textstellen weg. */
export const EINTRAEGE_ENTFERNEN = befehl({
  kennung: "eintraege.entfernen",
  titel: "Einträge entfernt",
  werte: z.object({ liste: z.string(), stellen: z.array(z.number().int().min(0)).min(1), titel: z.string().optional() }),
  brauchtAnalyse: true,
  beschreiben: (w) => w.titel ?? (w.stellen.length === 1 ? "1 Eintrag entfernt" : `${w.stellen.length} Einträge entfernt`),
  aenderungen: (w, u) => {
    const a = brauchtAnalyse(u);
    const index = a.index!;
    const k = knotenZu(index, u.text, w.liste);
    if (k === KEIN || index.art[k] !== KnotenArt.liste) throw new Befehlsfehler(`An ${w.liste || "/"} steht keine Liste`);
    const anzahl = index.kinder[k];
    if (w.stellen.some((s) => s >= anzahl)) throw new Befehlsfehler("Einige Einträge gibt es nicht mehr; bitte neu wählen");
    if (new Set(w.stellen).size >= anzahl) throw new Befehlsfehler("Mindestens ein Eintrag muss bleiben");
    return a.format.eintraegeEntfernen(u.text, index, k, w.stellen);
  },
});

export const GRUNDBEFEHLE: readonly Befehl[] = [TEXT_AENDERN, TEXT_ERSETZEN, WERT_SETZEN, WERTE_SETZEN, EINTRAEGE_ENTFERNEN] as unknown as readonly Befehl[];
