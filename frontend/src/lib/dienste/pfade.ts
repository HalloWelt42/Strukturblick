// JSON-Pointer (RFC 6901): bauen, zerlegen, escapen - TS-Spiegel von
// backend/app/kern/pfade.py. Der Pointer ist die kanonische Adresse aller
// Knoten: Wurzel ist "", Segmente werden mit ~0 (~) und ~1 (/) escaped.
// Änderungen an der Konvention zuerst im Backend, dann hier nachziehen.
// Reine Funktionen ohne DOM-Bezug, direkt testbar.

export function segmentEscapen(segment: string): string {
  return segment.replaceAll('~', '~0').replaceAll('/', '~1')
}

export function segmentEntescapen(segment: string): string {
  return segment.replaceAll('~1', '/').replaceAll('~0', '~')
}

/** Zerlegt einen Pointer in entescapte Segmente; die Wurzel "" ergibt []. */
export function segmenteAusPointer(pointer: string): string[] {
  if (pointer === '') return []
  if (!pointer.startsWith('/')) {
    throw new Error(`Ungültiger JSON-Pointer: ${JSON.stringify(pointer)}`)
  }
  return pointer.split('/').slice(1).map(segmentEntescapen)
}

/** Hängt ein Segment (Schlüssel oder Listen-Index) an einen Eltern-Pointer an. */
export function kindPointer(eltern: string, segment: string | number): string {
  const teil = typeof segment === 'string' ? segmentEscapen(segment) : String(segment)
  return `${eltern}/${teil}`
}

/** Pointer des Elternknotens; die Wurzel "" hat keinen und ergibt null. */
export function elternPointer(pointer: string): string | null {
  if (pointer === '') return null
  const trenner = pointer.lastIndexOf('/')
  return pointer.slice(0, trenner)
}

/** Ein Segment gilt als Listen-Index, wenn es eine kanonische Zahl ist. */
function istIndexSegment(segment: string): boolean {
  return /^(0|[1-9][0-9]*)$/.test(segment)
}

/** Segment taugt als nackter Bezeichner (daten.name statt daten["na me"]). */
function istBezeichner(segment: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)
}

/** Segment als String-Literal in doppelten Anführungszeichen (mit Escaping). */
function alsStringLiteral(segment: string): string {
  return JSON.stringify(segment)
}

/** Pointer als JSONPath: $ + Segmente (Index -> [n], Name -> .name bzw. ["na me"]). */
export function alsJsonPath(pointer: string): string {
  let ergebnis = '$'
  for (const segment of segmenteAusPointer(pointer)) {
    if (istIndexSegment(segment)) {
      ergebnis += `[${segment}]`
    } else if (istBezeichner(segment)) {
      ergebnis += `.${segment}`
    } else {
      ergebnis += `[${alsStringLiteral(segment)}]`
    }
  }
  return ergebnis
}

/** Pointer als Python-Zugriff: daten["a"][0]["b"]. */
export function alsPythonZugriff(pointer: string, wurzelname = 'daten'): string {
  let ergebnis = wurzelname
  for (const segment of segmenteAusPointer(pointer)) {
    ergebnis += istIndexSegment(segment) ? `[${segment}]` : `[${alsStringLiteral(segment)}]`
  }
  return ergebnis
}

/** Pointer als TypeScript-Zugriff: daten.a[0].b bzw. daten["a b"] bei Sonderzeichen. */
export function alsTypescriptZugriff(pointer: string, wurzelname = 'daten'): string {
  let ergebnis = wurzelname
  for (const segment of segmenteAusPointer(pointer)) {
    if (istIndexSegment(segment)) {
      ergebnis += `[${segment}]`
    } else if (istBezeichner(segment)) {
      ergebnis += `.${segment}`
    } else {
      ergebnis += `[${alsStringLiteral(segment)}]`
    }
  }
  return ergebnis
}

/** Pointer als JSON-Pointer-Schreibweise - der Pointer selbst. */
export function alsZeiger(pointer: string): string {
  return pointer
}
