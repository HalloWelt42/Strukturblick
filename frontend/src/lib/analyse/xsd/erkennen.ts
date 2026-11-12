// Ist ein Text ein XML Schema? Das erste Element muss schema im XSD-Namensraum sein. Gelesen wird nur der Anfang (nach
// Deklaration, Kommentaren und DOCTYPE), damit die Frage bei jeder Änderung billig bleibt.

import { XSD_NS } from "./modell";

const KOPF = 16_000;

export function istXmlSchema(text: string): boolean {
  const kopf = text.slice(0, KOPF);
  let i = 0;
  for (;;) {
    i = kopf.indexOf("<", i);
    if (i === -1) return false;
    if (kopf.startsWith("<?", i)) i = kopf.indexOf("?>", i) + 2;
    else if (kopf.startsWith("<!--", i)) i = kopf.indexOf("-->", i) + 3;
    else if (kopf.startsWith("<!", i)) i = kopf.indexOf(">", i) + 1;
    else break;
    if (i <= 1) return false;
  }
  const ende = kopf.indexOf(">", i);
  const tag = kopf.slice(i, ende === -1 ? undefined : ende);
  const m = /^<(?:([\w.-]+):)?schema[\s/>]/.exec(tag + ">");
  if (!m) return false;
  const attr = m[1] ? `xmlns:${m[1]}` : "xmlns";
  const ns = new RegExp(`\\s${attr.replace(".", "\\.")}\\s*=\\s*["']([^"']*)["']`).exec(tag)?.[1];
  return ns === XSD_NS;
}
