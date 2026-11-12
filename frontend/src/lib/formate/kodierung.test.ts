// Kodierung beim Öffnen: Marke, Angabe in der XML-Deklaration, UTF-8, sonst Windows-1252.
import { describe, expect, it } from "vitest";
import { textAusBytes } from "./kodierung";

const latin1 = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

describe("Kodierung beim Öffnen", () => {
  it("folgt der XML-Angabe, der Marke und sonst UTF-8", () => {
    expect(textAusBytes(latin1('<?xml version="1.0" encoding="ISO-8859-1"?><a>Gr\u00fc\u00dfe</a>'))).toMatchObject({ text: '<?xml version="1.0" encoding="ISO-8859-1"?><a>Grüße</a>', kodierung: "ISO-8859-1", grund: "angabe" });
    expect(textAusBytes(new TextEncoder().encode("\ufeffä"))).toMatchObject({ text: "ä", grund: "marke" });
    expect(textAusBytes(new TextEncoder().encode('{"a": "ö"}'))).toMatchObject({ text: '{"a": "ö"}', kodierung: "UTF-8", grund: "standard" });
  });

  it("liest kaputtes UTF-8 als Windows-1252 und sagt es", () => {
    expect(textAusBytes(latin1("M\u00fcller"))).toMatchObject({ text: "Müller", kodierung: "WINDOWS-1252", grund: "ersatz" });
  });
});
