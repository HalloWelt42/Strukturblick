// Neue Fassung ohne Server (STB-61): von selbst neu geladen wird nur, wenn es erlaubt ist (kurz nach dem Start); sonst
// wird die Fassung nur gemeldet und die Seite bleibt, wie sie ist.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fassungOhneServerVerfolgen } from "./fassung-ohne-server";

const STARTSEITE = '<meta name="app-fassung" content="9.9.9" />';

describe("Neue Fassung ohne Server", () => {
  const replace = vi.fn();
  let beenden: (() => void) | null = null;

  beforeEach(() => {
    replace.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(STARTSEITE)));
    vi.stubGlobal("location", { href: "https://beispiel.test/dokument/abc/baum", replace });
    vi.stubGlobal("history", { state: null, replaceState: vi.fn() });
    vi.stubGlobal("document", { visibilityState: "visible", addEventListener: vi.fn(), removeEventListener: vi.fn() });
    const speicher = new Map<string, string>();
    vi.stubGlobal("sessionStorage", { getItem: (k: string) => speicher.get(k) ?? null, setItem: (k: string, w: string) => speicher.set(k, w) });
  });

  afterEach(() => {
    beenden?.();
    vi.unstubAllGlobals();
  });

  it("meldet die neue Fassung und lädt nicht von selbst, wenn es nicht erlaubt ist", async () => {
    const gemeldet = vi.fn();
    beenden = fassungOhneServerVerfolgen("1.0.0", () => false, gemeldet);
    await vi.waitFor(() => expect(gemeldet).toHaveBeenCalledWith("9.9.9"));
    expect(replace).not.toHaveBeenCalled();
  });

  it("lädt kurz nach dem Start von selbst, einmal je Fassung", async () => {
    const gemeldet = vi.fn();
    beenden = fassungOhneServerVerfolgen("1.0.0", () => true, gemeldet);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(String(replace.mock.calls[0][0])).toContain("fassung=9.9.9");
    expect(gemeldet).not.toHaveBeenCalled();
  });

  it("meldet nichts, wenn die Fassung gleich ist", async () => {
    const gemeldet = vi.fn();
    beenden = fassungOhneServerVerfolgen("9.9.9", () => true, gemeldet);
    await new Promise((r) => setTimeout(r, 20));
    expect(gemeldet).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
