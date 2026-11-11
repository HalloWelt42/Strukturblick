// Ablage im Arbeitsspeicher: hält Dokumente nur, solange das Fenster offen ist. Ausweg, wenn der Browser kein Speichern
// erlaubt (privates Fenster, gesperrter Speicher), damit die App trotzdem startet; dazu dient sie Tests als Ablage.

import { Ablagefehler, ordnerNameGueltig, type Ablage, type AbgelegtesDokument, type Arbeitsstand, type Dokumentkopf, type Papierkorbeintrag } from "./ablage";

type Gespeichert = AbgelegtesDokument & { readonly geloescht?: string };

export class SpeicherAblage implements Ablage {
  readonly ort: string;
  readonly hinweis: string;
  private readonly dokumente = new Map<string, Gespeichert>();
  private readonly ordnerNamen = new Set<string>();
  private stand: Arbeitsstand = { offen: [], aktiv: null };

  constructor(ort = "Nur in diesem Fenster", hinweis = "Der Browser erlaubt hier kein Speichern: Beim Schließen gehen die Dokumente verloren. Sichern per Herunterladen oder in der Ablage mit Alles sichern.") {
    this.ort = ort;
    this.hinweis = hinweis;
  }

  private kopf(d: Gespeichert): Dokumentkopf {
    return { kennung: d.kennung, name: d.name, ordner: d.ordner ?? "", groesse: d.text.length, geaendert: d.geaendert };
  }

  async liste(): Promise<Dokumentkopf[]> {
    return [...this.dokumente.values()].filter((d) => !d.geloescht).map((d) => this.kopf(d));
  }
  async laden(k: string): Promise<AbgelegtesDokument | null> {
    const d = this.dokumente.get(k);
    return d && !d.geloescht ? d : null;
  }
  async speichern(d: AbgelegtesDokument): Promise<void> {
    this.dokumente.set(d.kennung, { ...d, geloescht: "" });
  }
  async aendern(k: string, teil: { name?: string; ordner?: string }): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, ...teil });
  }
  async entfernen(k: string): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, geloescht: new Date().toISOString() });
  }
  async papierkorb(): Promise<Papierkorbeintrag[]> {
    return [...this.dokumente.values()].filter((d) => d.geloescht).map((d) => ({ ...this.kopf(d), geloescht: d.geloescht! }));
  }
  async wiederherstellen(k: string): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, geloescht: "" });
  }
  async endgueltigEntfernen(k: string): Promise<void> {
    this.dokumente.delete(k);
  }
  async ordner(): Promise<string[]> {
    const n = new Set(this.ordnerNamen);
    for (const d of this.dokumente.values()) if (d.ordner && !d.geloescht) n.add(d.ordner);
    return [...n].sort((a, b) => a.localeCompare(b, "de"));
  }
  async ordnerAnlegen(name: string): Promise<void> {
    if (!ordnerNameGueltig(name)) throw new Ablagefehler("Ordnernamen haben 1 bis 80 Zeichen, ohne / und \\");
    if ((await this.ordner()).includes(name.trim())) throw new Ablagefehler(`Den Ordner ${name.trim()} gibt es schon`);
    this.ordnerNamen.add(name.trim());
  }
  async ordnerUmbenennen(alt: string, neu: string): Promise<void> {
    if (!ordnerNameGueltig(neu)) throw new Ablagefehler("Ordnernamen haben 1 bis 80 Zeichen, ohne / und \\");
    if ((await this.ordner()).includes(neu)) throw new Ablagefehler(`Den Ordner ${neu} gibt es schon`);
    this.ordnerNamen.delete(alt);
    this.ordnerNamen.add(neu);
    for (const [k, d] of this.dokumente) if (d.ordner === alt) this.dokumente.set(k, { ...d, ordner: neu });
  }
  async ordnerEntfernen(name: string): Promise<void> {
    if ([...this.dokumente.values()].some((d) => d.ordner === name && !d.geloescht)) throw new Ablagefehler(`Der Ordner ${name} ist nicht leer`);
    this.ordnerNamen.delete(name);
  }
  async arbeitsstand(): Promise<Arbeitsstand> {
    return this.stand;
  }
  async arbeitsstandSpeichern(s: Arbeitsstand): Promise<void> {
    this.stand = s;
  }
}
