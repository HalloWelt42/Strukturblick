// Datei wählen und herunterladen (Browser), ohne native Dialoge außer dem Datei-Wähler des Systems.

import { ENDUNGEN } from "../../formate/registrierung";

export function dateiWaehlen(): Promise<File[]> {
  return new Promise((fertig) => {
    const eingabe = document.createElement("input");
    eingabe.type = "file";
    eingabe.multiple = true;
    eingabe.accept = ENDUNGEN.map((e) => "." + e).join(",");
    eingabe.onchange = () => fertig([...(eingabe.files ?? [])]);
    eingabe.oncancel = () => fertig([]);
    eingabe.click();
  });
}

export function herunterladen(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
