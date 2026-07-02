// Fabrik für die zwei nebeneinander gestellten Nur-Lese-Editoren des
// Vergleichs (@codemirror/merge MergeView). Erfahrungswerte wie beim
// Haupt-Editor:
// - Kein margin am .cm-editor (bricht die Klick-Geometrie) - Abstände macht
//   der Wirt-Container per padding.
// - Nur-Lesen über EditorState.readOnly, damit die MergeView nur anzeigt.
// - Das bestehende editorTheme (Token-Farben) wird wiederverwendet; da es auf
//   var(--...)-Token verweist, folgt die MergeView dem Themenwechsel ohne
//   Rekonfiguration.

import { MergeView } from '@codemirror/merge'
import { EditorState, type Extension } from '@codemirror/state'
import { lineNumbers } from '@codemirror/view'

import type { FormatId } from '../../api/typen'
import { editorTheme } from '../editor/editorTheme'
import { sprachExtension } from '../editor/sprachen'

/** Gemeinsame Nur-Lese-Erweiterungen für eine Seite der MergeView. */
function seitenErweiterungen(format: FormatId | null): Extension[] {
  return [
    lineNumbers(),
    EditorState.readOnly.of(true),
    EditorState.tabSize.of(2),
    sprachExtension(format),
    editorTheme,
  ]
}

export interface MergeArgs {
  linksText: string
  rechtsText: string
  linksFormat: FormatId | null
  rechtsFormat: FormatId | null
}

/** Baut eine MergeView (zwei Seiten a/b) in das übergebene Elternelement. */
export function erzeugeMergeAnsicht(elternElement: HTMLElement, args: MergeArgs): MergeView {
  return new MergeView({
    a: { doc: args.linksText, extensions: seitenErweiterungen(args.linksFormat) },
    b: { doc: args.rechtsText, extensions: seitenErweiterungen(args.rechtsFormat) },
    parent: elternElement,
    // Nur die Textunterschiede hervorheben; keine Übernahme-Steuerung, da rein
    // lesend verglichen wird.
    highlightChanges: true,
    gutter: true,
    collapseUnchanged: { margin: 3, minSize: 4 },
  })
}
