import { describe, expect, it } from "vitest";
import { istNeuer } from "./fassung";

describe("Fassungen vergleichen", () => {
  it("erkennt neuere Fassungen Teil für Teil als Zahl", () => {
    expect(istNeuer("2.35.0", "2.34.1")).toBe(true);
    expect(istNeuer("2.34.10", "2.34.9")).toBe(true);
    expect(istNeuer("3.0.0", "2.99.99")).toBe(true);
  });

  it("bietet Gleiches und Älteres nicht an (Entwicklung: Oberfläche neuer als der Server)", () => {
    expect(istNeuer("2.34.1", "2.34.1")).toBe(false);
    expect(istNeuer("2.21.2", "2.33.1")).toBe(false);
    expect(istNeuer("2.34", "2.34.0")).toBe(false);
  });
});
