// Markdown aus einer KI-Antwort als HTML: nur Absätze, Listen, Hervorhebung und Code, keine Links, Bilder oder Skripte.
// Der Text kommt von einem Modell, nicht aus Strukturblick; darum die enge Liste erlaubter Elemente.

import { marked } from "marked";
import DOMPurify from "dompurify";

const ERLAUBT = ["p", "ul", "ol", "li", "strong", "em", "code", "pre", "br", "h3", "h4", "blockquote"];

export function sicheresHtml(markdown: string): string {
  const roh = marked.parse(markdown, { async: false, gfm: true, breaks: false }) as string;
  return DOMPurify.sanitize(roh, { ALLOWED_TAGS: ERLAUBT, ALLOWED_ATTR: [] });
}
