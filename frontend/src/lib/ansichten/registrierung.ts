// Zentrale Anmeldestelle der Ansichten. Jede Ansicht (Baum, Editor, Tabelle,
// Statistik, Schema, Vergleich, Graph, Lexikon) meldet sich hier über
// registriereAnsicht() aus lib/ansichten/registry.ts an, sobald es sie gibt
// (ab Phase 0.3). Der Import in main.ts lädt diese Datei als Seiteneffekt.
// In dieser Ausbaustufe ist noch keine Ansicht angemeldet - die Ansichtswahl
// zeigt deshalb deaktivierte Platzhalter-Reiter.

export {}
