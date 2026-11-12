// Stoff für Testdaten: Vor- und Nachnamen (häufige Namen, keine echten Personen gemeint), Orte mit Postleitzahlbereich
// und Vorwahl, neutrale Wörter für Text. Die Postleitzahl entsteht im Bereich des Orts und muss nicht genau so vergeben
// sein; für Beispieldaten genügt, dass Ort, Postleitzahl und Vorwahl zusammenpassen. Straßennamen sind allgemein
// gebräuchlich; Domains nutzen die reservierte Endung .example (RFC 2606), so erreicht keine Adresse ein echtes Postfach.

export const VORNAMEN: readonly string[] = [
  "Lena", "Jonas", "Mia", "Emil", "Hannah", "Paul", "Sophie", "Ben", "Marie", "Felix", "Emma", "Leon", "Clara", "Noah",
  "Ida", "Ole", "Lea", "Finn", "Greta", "Karl", "Anna", "Lukas", "Frieda", "Max", "Petra", "Tom", "Sara", "Ali", "Mila",
  "Theo", "Lina", "Anton", "Marta", "Jan", "Nora", "David", "Ella", "Moritz", "Zeynep", "Milan",
];

export const NACHNAMEN: readonly string[] = [
  "Hartmann", "Weber", "Schulte", "Becker", "Wolf", "Hansen", "Nguyen", "Weiß", "Lorenz", "Kowalski", "Müller", "Schmidt",
  "Fischer", "Meyer", "Wagner", "Schulz", "Hoffmann", "Koch", "Richter", "Klein", "Neumann", "Schwarz", "Zimmermann",
  "Braun", "Krüger", "Hofmann", "Lange", "Werner", "Krause", "Lehmann", "Yılmaz", "Schmitt", "Engel", "Vogel", "Frank",
  "Berger", "Busch", "Peters", "Jung", "Albrecht",
];

export interface Ortangabe {
  readonly ort: string;
  readonly plzVon: number;
  readonly plzBis: number;
  readonly vorwahl: string;
}

export const ORTE: readonly Ortangabe[] = [
  { ort: "Dresden", plzVon: 1067, plzBis: 1328, vorwahl: "0351" },
  { ort: "Leipzig", plzVon: 4103, plzBis: 4357, vorwahl: "0341" },
  { ort: "Halle (Saale)", plzVon: 6108, plzBis: 6132, vorwahl: "0345" },
  { ort: "Jena", plzVon: 7743, plzBis: 7751, vorwahl: "03641" },
  { ort: "Chemnitz", plzVon: 9111, plzBis: 9247, vorwahl: "0371" },
  { ort: "Berlin", plzVon: 10115, plzBis: 14199, vorwahl: "030" },
  { ort: "Potsdam", plzVon: 14467, plzBis: 14482, vorwahl: "0331" },
  { ort: "Rostock", plzVon: 18055, plzBis: 18147, vorwahl: "0381" },
  { ort: "Hamburg", plzVon: 20095, plzBis: 22769, vorwahl: "040" },
  { ort: "Kiel", plzVon: 24103, plzBis: 24159, vorwahl: "0431" },
  { ort: "Bremen", plzVon: 28195, plzBis: 28779, vorwahl: "0421" },
  { ort: "Hannover", plzVon: 30159, plzBis: 30669, vorwahl: "0511" },
  { ort: "Göttingen", plzVon: 37073, plzBis: 37085, vorwahl: "0551" },
  { ort: "Magdeburg", plzVon: 39104, plzBis: 39130, vorwahl: "0391" },
  { ort: "Düsseldorf", plzVon: 40210, plzBis: 40629, vorwahl: "0211" },
  { ort: "Dortmund", plzVon: 44135, plzBis: 44388, vorwahl: "0231" },
  { ort: "Essen", plzVon: 45127, plzBis: 45359, vorwahl: "0201" },
  { ort: "Münster", plzVon: 48143, plzBis: 48167, vorwahl: "0251" },
  { ort: "Köln", plzVon: 50667, plzBis: 51149, vorwahl: "0221" },
  { ort: "Mainz", plzVon: 55116, plzBis: 55131, vorwahl: "06131" },
  { ort: "Frankfurt am Main", plzVon: 60306, plzBis: 60599, vorwahl: "069" },
  { ort: "Saarbrücken", plzVon: 66111, plzBis: 66133, vorwahl: "0681" },
  { ort: "Stuttgart", plzVon: 70173, plzBis: 70629, vorwahl: "0711" },
  { ort: "Freiburg im Breisgau", plzVon: 79098, plzBis: 79117, vorwahl: "0761" },
  { ort: "München", plzVon: 80331, plzBis: 81929, vorwahl: "089" },
  { ort: "Augsburg", plzVon: 86150, plzBis: 86199, vorwahl: "0821" },
  { ort: "Nürnberg", plzVon: 90402, plzBis: 90491, vorwahl: "0911" },
  { ort: "Regensburg", plzVon: 93047, plzBis: 93059, vorwahl: "0941" },
  { ort: "Würzburg", plzVon: 97070, plzBis: 97084, vorwahl: "0931" },
  { ort: "Erfurt", plzVon: 99084, plzBis: 99099, vorwahl: "0361" },
];

export const WOERTER: readonly string[] = [
  "Apfel", "Brot", "Garten", "Fenster", "Lieferung", "Paket", "Rechnung", "Termin", "Kunde", "Bestellung", "Laden", "Hof",
  "Wiese", "Korb", "Saft", "Käse", "Eier", "Honig", "frisch", "groß", "klein", "neu", "bitte", "heute", "morgen", "später",
  "abholen", "liefern", "prüfen", "zahlen", "Tür", "Nachbar", "Woche", "Montag", "Freitag", "gut", "schnell", "ruhig",
];

export const STRASSEN: readonly string[] = [
  "Hauptstraße", "Schulstraße", "Gartenstraße", "Bahnhofstraße", "Dorfstraße", "Bergstraße", "Lindenstraße", "Kirchstraße",
  "Waldstraße", "Ringstraße", "Mühlenweg", "Am Markt", "Rosenweg", "Birkenweg", "Wiesenstraße", "Feldweg", "Talstraße",
  "Parkstraße", "Friedhofstraße", "Brunnenstraße", "Amselweg", "Ahornweg", "Am Hang", "Uferstraße", "Hofweg",
];

/** Vorwahlen deutscher Mobilnetze */
export const MOBILVORWAHLEN: readonly string[] = ["0151", "0152", "0157", "0160", "0162", "0170", "0172", "0176", "0177", "0179"];

/** Domains für E-Mail-Adressen, die niemandem gehören (reservierte Endung .example) */
export const DOMAINS: readonly string[] = ["beispiel.example", "post.example", "mail.example", "firma.example"];
