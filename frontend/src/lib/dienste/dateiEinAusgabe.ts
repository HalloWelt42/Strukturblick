// Datei-Ein-/Ausgabe im Browser: Öffnen über einen versteckten Datei-Dialog,
// Lesen einzelner Dateien, Größenprüfung gegen die Einstellungs-Grenzen und
// Herunterladen als Blob.

import { ablehnungAbBytes, warnungAbBytes } from '../speicher/einstellungenSpeicher'

export interface GeleseneDatei {
  name: string
  text: string
  groesse: number
  /** Bei binären Formaten (z. B. XLSX) der Inhalt als Base64; sonst nicht gesetzt. */
  base64?: string
}

export type GroessenUrteil = 'ok' | 'warnen' | 'ablehnen'

/** Endungen, die als binär gelten und deshalb Base64-kodiert eingelesen werden. */
const BINAER_ENDUNGEN = new Set(['xlsx'])

function endungVon(name: string): string {
  const punkt = name.lastIndexOf('.')
  return punkt === -1 ? '' : name.slice(punkt + 1).toLowerCase()
}

function istBinaereDatei(name: string): boolean {
  return BINAER_ENDUNGEN.has(endungVon(name))
}

/** Wandelt Bytes chunkweise in Base64, ohne den Aufruf-Stack zu sprengen. */
function bytesZuBase64(bytes: Uint8Array): string {
  let binaer = ''
  const schrittweite = 0x8000
  for (let i = 0; i < bytes.length; i += schrittweite) {
    const teil = bytes.subarray(i, i + schrittweite)
    binaer += String.fromCharCode(...teil)
  }
  return btoa(binaer)
}

export async function liesDatei(datei: File): Promise<GeleseneDatei> {
  if (istBinaereDatei(datei.name)) {
    const puffer = await datei.arrayBuffer()
    const base64 = bytesZuBase64(new Uint8Array(puffer))
    return { name: datei.name, text: '', groesse: datei.size, base64 }
  }
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
