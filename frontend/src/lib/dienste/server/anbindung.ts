// Anbindung an den eigenen Server (Bauart "server", pi5b): Ablage, Anmeldung über das Kellerwolke-Konto und Abgleich
// der Fassung, alles über den Appkern. Dieses Modul wird nur in der Bauart mit Server nachgeladen (dienste/bauart.ts),
// damit die Bauart ohne Server nichts davon enthält.

import { hole, json } from "appkern-oberflaeche";
import type { Ablage, AbgelegtesDokument, Arbeitsstand, Dokumentkopf } from "../ablage";

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

/** Große Dokumente brauchen beim Speichern länger als die Vorgabe des Appkerns (20 s). */
const SPEICHERN_ZEITGRENZE_MS = 120_000;

const pfad = (kennung: string): string => `/dokumente/${encodeURIComponent(kennung)}`;

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

  async entfernen(kennung: string): Promise<void> {
    await hole<void>(pfad(kennung), { method: "DELETE" });
  }

  arbeitsstand(): Promise<Arbeitsstand> {
    return hole<Arbeitsstand>("/arbeitsstand");
  }

  async arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void> {
    await hole<void>("/arbeitsstand", { method: "PUT", ...json(stand) });
  }
}
