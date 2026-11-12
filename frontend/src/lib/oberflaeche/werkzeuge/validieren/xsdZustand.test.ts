// Schema-Paket als ZIP: nur die XSD werden übernommen (ohne Mac-Beiwerk), das Schema laut Dokument wird gewählt,
// ein ZIP ohne Schemas oder kein ZIP gibt eine verständliche Meldung.

import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { XsdZustand } from "./xsdZustand.svelte";

const blatt = { text: '<a xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="haupt.xsd"/>' } as Arbeitsblatt;
const datei = (name: string, inhalt: Uint8Array) => new File([inhalt as BlobPart], name);

describe("Schema-Paket", () => {
  it("übernimmt die XSD und wählt das Schema laut Dokument", async () => {
    const zip = zipSync({ "paket/haupt/haupt.xsd": strToU8("<xs:schema/>"), "paket/basis/basis.xsd": strToU8("<xs:schema/>"), "paket/liesmich.txt": strToU8("x"), "__MACOSX/paket/._haupt.xsd": strToU8("x") });
    const x = new XsdZustand();
    await x.paketLaden(datei("paket.zip", zip), blatt);
    expect(x.paket?.dateien.map((d) => d.pfad).sort()).toEqual(["paket/basis/basis.xsd", "paket/haupt/haupt.xsd"]);
    expect(x.wahl).toEqual({ art: "paket", pfad: "paket/haupt/haupt.xsd", name: "haupt.xsd" });
    expect(x.paketfehler).toBeNull();
  });

  it("meldet ZIP ohne Schemas und Dateien, die kein ZIP sind", async () => {
    const x = new XsdZustand();
    await x.paketLaden(datei("leer.zip", zipSync({ "a.txt": strToU8("x") })), blatt);
    expect(x.paketfehler).toBe("leer.zip: Im Paket ist kein XML Schema (.xsd)");
    await x.paketLaden(datei("kaputt.zip", strToU8("kein zip")), blatt);
    expect(x.paketfehler).toBe("kaputt.zip: kein gültiges ZIP mit Schemas");
    expect(x.paket).toBeNull();
  });
});
