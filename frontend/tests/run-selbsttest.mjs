// Baut die Tabellen-Logik samt Selbsttest mit dem Projekt-tsc nach JS und führt
// den Selbsttest aus. Ein eigener Auflösungs-Hook ergänzt bei endungslosen
// relativen Importen ".js" (wie es Vite zur Laufzeit ohnehin auflöst). Der
// Umweg über den echten Compiler ist nötig, weil der Import-Baum TypeScript-
// Syntax enthält, die der reine Typ-Streifer von Node nicht unterstützt.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { register } from 'node:module'

const frontend = fileURLToPath(new URL('..', import.meta.url))
const bau = mkdtempSync(join(tmpdir(), 'strukturblick-selbsttest-'))

// tsc kann wegen fehlender @types/node reine Typ-Diagnosen (z. B. zu
// "node:assert") melden und dann mit Code 2 enden, obwohl das JS korrekt
// emittiert wird. Deshalb wird der Exit-Code hier nicht als Abbruch gewertet;
// entscheidend ist unten, ob die kompilierte Testdatei entstanden ist.
try {
  execFileSync(
    join(frontend, 'node_modules/.bin/tsc'),
    [
      '--outDir', bau,
      '--module', 'ESNext',
      '--moduleResolution', 'bundler',
      '--target', 'ESNext',
      '--strict', 'false',
      '--skipLibCheck', 'true',
      '--rootDir', frontend,
      join(frontend, 'tests/tabellen.selbsttest.ts'),
    ],
    { cwd: frontend, stdio: 'ignore' },
  )
} catch {
  // Nur Typ-Diagnosen ohne @types/node - Emit ist trotzdem erfolgt.
}

// Hook, der endungslose relative Importe im gebauten JS auf ".js" ergänzt.
const hookPfad = join(bau, 'js-endung-hook.mjs')
writeFileSync(
  hookPfad,
  [
    "import { existsSync } from 'node:fs'",
    "import { fileURLToPath } from 'node:url'",
    'export async function resolve(specifier, context, nextResolve) {',
    "  if (specifier.startsWith('.') && !/\\.[a-zA-Z0-9]+$/.test(specifier)) {",
    '    try {',
    "      const kandidat = new URL(specifier + '.js', context.parentURL)",
    '      if (existsSync(fileURLToPath(kandidat))) {',
    "        return nextResolve(specifier + '.js', context)",
    '      }',
    '    } catch {}',
    '  }',
    '  return nextResolve(specifier, context)',
    '}',
  ].join('\n'),
)

register(pathToFileURL(hookPfad))

const testJs = join(bau, 'tests/tabellen.selbsttest.js')
if (!existsSync(testJs)) {
  throw new Error('Erwartete Testdatei nicht gefunden: ' + testJs)
}
await import(pathToFileURL(testJs))
