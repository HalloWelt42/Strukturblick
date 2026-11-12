// Anbindung an den eigenen Server (Bauart "server", pi5b): Ablage, Anmeldung über das Kellerwolke-Konto und Abgleich
// der Fassung, alles über den Appkern. Dieses Modul wird nur in der Bauart mit Server nachgeladen (dienste/bauart.ts),
// damit die Bauart ohne Server nichts davon enthält.

import { hole, json } from "appkern-oberflaeche";
import { Ablagefehler, rezepteOrdnen, type Ablage, type AbgelegtesDokument, type Arbeitsstand, type Dokumentkopf, type Papierkorbeintrag } from "../ablage";
import type { Rezept } from "../../analyse/rezepte/rezept";

export {
  sitzung,
  sitzungStarten,
  anmelden,
  koppeln,
  einrichtenMit,
  abmelden,
  fassung,
  fassungVerfolgen,
  CODE_LAENGE,
  codeAusLinkNehmen,
  codeNormal,
  geraeteArt,
  namensvorschlag,
} from "appkern-oberflaeche";

export { kiStand, kiVorschlag, kiEinstellen } from "./ki";

/** Große Dokumente brauchen beim Speichern länger als die Vorgabe des Appkerns (20 s). */
const SPEICHERN_ZEITGRENZE_MS = 120_000;

const pfad = (kennung: string): string => `/dokumente/${encodeURIComponent(kennung)}`;
const ordnerPfad = (name: string): string => `/ordner/${encodeURIComponent(name)}`;
const rezeptPfad = (kennung: string): string => `/rezepte/${encodeURIComponent(kennung)}`;

/** Fachliche Ablehnung des Servers (409 Konflikt, 400 ungültig) als Ablagefehler mit seiner Meldung */
async function fachlich<T>(arbeit: Promise<T>): Promise<T> {
  try {
    return await arbeit;
  } catch (f) {
    const status = (f as { status?: number }).status;
    if (status === 409 || status === 400 || status === 404) throw new Ablagefehler((f as Error).message);
    throw f;
  }
}

export class ServerAblage implements Ablage {
  readonly ort = "Ablage auf pi5b";
  readonly hinweis = "Liegt auf pi5b; auf allen Geräten derselbe Stand.";

  liste(): Promise<Dokumentkopf[]> {
    return hole<Dokumentkopf[]>("/dokumente");
  }

  async laden(kennung: string): Promise<AbgelegtesDokument | null> {
    try {
      return await hole<AbgelegtesDokument>(pfad(kennung));
    } catch (f) {
      if ((f as { status?: number }).status === 404) return null;
      throw f;
    }
  }

  async speichern(dok: AbgelegtesDokument): Promise<void> {
    await hole<void>(pfad(dok.kennung), { method: "PUT", ...json(dok), zeitgrenzeMs: SPEICHERN_ZEITGRENZE_MS });
  }

  async aendern(kennung: string, teil: { name?: string; ordner?: string }): Promise<void> {
    await fachlich(hole<void>(pfad(kennung), { method: "PATCH", ...json(teil) }));
  }

  async entfernen(kennung: string): Promise<void> {
    await fachlich(hole<void>(pfad(kennung), { method: "DELETE" }));
  }

  papierkorb(): Promise<Papierkorbeintrag[]> {
    return hole<Papierkorbeintrag[]>("/papierkorb");
  }

  async wiederherstellen(kennung: string): Promise<void> {
    await fachlich(hole<void>(`/papierkorb/${encodeURIComponent(kennung)}/wiederherstellen`, { method: "POST" }));
  }

  async endgueltigEntfernen(kennung: string): Promise<void> {
    await fachlich(hole<void>(`/papierkorb/${encodeURIComponent(kennung)}`, { method: "DELETE" }));
  }

  ordner(): Promise<string[]> {
    return hole<string[]>("/ordner");
  }

  async ordnerAnlegen(name: string): Promise<void> {
    await fachlich(hole<void>("/ordner", { method: "POST", ...json({ name }) }));
  }

  async ordnerUmbenennen(alt: string, neu: string): Promise<void> {
    await fachlich(hole<void>(ordnerPfad(alt), { method: "PATCH", ...json({ name: neu }) }));
  }

  async ordnerEntfernen(name: string): Promise<void> {
    await fachlich(hole<void>(ordnerPfad(name), { method: "DELETE" }));
  }

  arbeitsstand(): Promise<Arbeitsstand> {
    return hole<Arbeitsstand>("/arbeitsstand");
  }

  async arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void> {
    await hole<void>("/arbeitsstand", { method: "PUT", ...json(stand) });
  }

  async rezepte(): Promise<Rezept[]> {
    return rezepteOrdnen(await hole<unknown[]>("/rezepte"));
  }

  async rezeptSpeichern(r: Rezept): Promise<void> {
    await fachlich(hole<void>(rezeptPfad(r.kennung), { method: "PUT", ...json(r) }));
  }

  async rezeptEntfernen(kennung: string): Promise<void> {
    await fachlich(hole<void>(rezeptPfad(kennung), { method: "DELETE" }));
  }
}
