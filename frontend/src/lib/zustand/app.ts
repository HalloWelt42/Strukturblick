// Angaben zur App für die Oberfläche (Fassung, Bauart); die Oberfläche greift nicht direkt auf Dienste zu (Regel A1).
export { FASSUNG, BAUART, type Bauart } from "../dienste/bauart";

/** Urheber der App: Name und öffentliches Profil mit dem Quelltext (Starthinweis, Fußleiste; eine Stelle) */
export const URHEBER = { name: "HalloWelt42", profil: "https://github.com/HalloWelt42", quelltext: "https://github.com/HalloWelt42/Strukturblick" } as const;
