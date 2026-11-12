// Hervorhebung für erzeugten Code (PHP, TypeScript, Python): die Sprachpakete laden erst, wenn eine Sprache gebraucht
// wird, damit der Start der App nicht wächst.

import type { Extension } from "@codemirror/state";

export type Codesprache = "php" | "typescript" | "python";

const LADEN: Readonly<Record<Codesprache, () => Promise<Extension>>> = {
  php: async () => (await import("@codemirror/lang-php")).php({ plain: false }),
  typescript: async () => (await import("@codemirror/lang-javascript")).javascript({ typescript: true }),
  python: async () => (await import("@codemirror/lang-python")).python(),
};

export const codespracheLaden = (s: Codesprache): Promise<Extension> => LADEN[s]();
