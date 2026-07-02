// Datei-Ein-/Ausgabe im Browser: Öffnen über einen versteckten Datei-Dialog,
// Lesen einzelner Dateien, Größenprüfung gegen die Einstellungs-Grenzen und
// Herunterladen als Blob.

import { ablehnungAbBytes, warnungAbBytes } from '../speicher/einstellungenSpeicher'

export interface GeleseneDatei {
  name: string
  text: string
  groesse: number
}

export type GroessenUrteil = 'ok' | 'warnen' | 'ablehnen'

export async function liesDatei(datei: File): Promise<GeleseneDatei> {
  return { name: datei.name, text: await datei.text(), groesse: datei.size }
}

/** Öffnet den Datei-Dialog (Mehrfachauswahl); bei Abbruch kommt eine leere Liste. */
export function oeffneDateien(): Promise<GeleseneDatei[]> {
  return new Promise((resolve, reject) => {
    const eingabe = document.createElement('input')
    eingabe.type = 'file'
    eingabe.multiple = true
    eingabe.style.display = 'none'
    document.body.appendChild(eingabe)

    eingabe.addEventListener('change', () => {
      const dateien = Array.from(eingabe.files ?? [])
      eingabe.remove()
      Promise.all(dateien.map(liesDatei)).then(resolve, reject)
    })
    eingabe.addEventListener('cancel', () => {
      eingabe.remove()
      resolve([])
    })

    eingabe.click()
  })
}

/** Bewertet eine Dateigröße gegen die konfigurierten Grenzen. */
export async function groessenUrteil(bytes: number): Promise<GroessenUrteil> {
  const [warnungAb, ablehnungAb] = await Promise.all([warnungAbBytes(), ablehnungAbBytes()])
  if (bytes >= ablehnungAb) return 'ablehnen'
  if (bytes >= warnungAb) return 'warnen'
  return 'ok'
}

/** Bietet den Text als Datei-Download an. */
export function ladeHerunter(dateiname: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anker = document.createElement('a')
  anker.href = url
  anker.download = dateiname
  document.body.appendChild(anker)
  anker.click()
  anker.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
