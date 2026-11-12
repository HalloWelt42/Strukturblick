// Die Zielsprachen von "Code erzeugen", in der Reihenfolge der Auswahl. Eine neue Sprache ist ein Codeziel hier.

import { PHP } from "./php";
import { DATACLASSES, PYDANTIC } from "./python";
import { TYPESCRIPT } from "./typescript";
import type { Codeziel } from "./ziele";

export const CODEZIELE: readonly Codeziel[] = [PHP, TYPESCRIPT, PYDANTIC, DATACLASSES];

export const codeziel = (kennung: string): Codeziel => CODEZIELE.find((z) => z.kennung === kennung) ?? CODEZIELE[0];
