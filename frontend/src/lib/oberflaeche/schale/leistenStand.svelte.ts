// Was in der Leiste gerade bearbeitet wird: Umbenennen eines Dokuments oder Ordners an Ort und Stelle (aus dem
// Kontextmenü gestartet). Ein Feld zur Zeit.

export type Umbenennung = { readonly art: "dokument"; readonly kennung: string } | { readonly art: "ordner"; readonly name: string };

class Leistenstand {
  umbenennen = $state<Umbenennung | null>(null);
}

export const leistenStand = new Leistenstand();
