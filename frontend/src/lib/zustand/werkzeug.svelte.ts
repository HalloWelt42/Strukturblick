// Aktives Werkzeug (linke Leiste) als reaktiver Modul-Zustand. Ein aktives
// Werkzeug hat in der Ansichtsfläche Vorrang vor der Ansicht des Tabs; ein
// Klick auf einen Ansichts-Reiter schließt es wieder (AnsichtsWahl ruft
// schliesseWerkzeug).

export const werkzeug = $state<{ aktiv: string | null }>({ aktiv: null })

export function oeffneWerkzeug(id: string): void {
  werkzeug.aktiv = id
}

export function schliesseWerkzeug(): void {
  werkzeug.aktiv = null
}
