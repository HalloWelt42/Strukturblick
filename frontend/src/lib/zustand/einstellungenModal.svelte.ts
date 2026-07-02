// Offen-Zustand des Einstellungen-Modals als kleiner geteilter Speicher, damit
// sowohl das Zahnrad in der Kopfleiste als auch Hinweise in der rechten Leiste
// dasselbe Modal öffnen können.

export const einstellungenModal = $state<{ offen: boolean }>({ offen: false })

export function oeffneEinstellungen(): void {
  einstellungenModal.offen = true
}

export function schliesseEinstellungen(): void {
  einstellungenModal.offen = false
}
