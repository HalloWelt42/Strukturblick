"""Emitter für TypeScript-Interfaces aus dem neutralen Zwischenmodell."""

from __future__ import annotations

from app.transformer.codegen.schema_modell import Feld, FeldTyp, SchemaModell

_PRIMITIVE: dict[str, str] = {
    "string": "string",
    "number": "number",
    "integer": "number",
    "boolean": "boolean",
    "null": "null",
    "any": "unknown",
}


def _typ_ausdruck(typ: FeldTyp) -> str:
    if typ.referenz is not None:
        basis = typ.referenz
    else:
        basis = _PRIMITIVE.get(typ.primitiv or "any", "unknown")
    if typ.ist_liste:
        return f"{basis}[]"
    return basis


def _feld_zeile(feld: Feld) -> str:
    ausdruck = _typ_ausdruck(feld.typ)
    if feld.optional:
        return f"  {feld.name}?: {ausdruck} | null;"
    return f"  {feld.name}: {ausdruck};"


def emittiere_typescript(modell: SchemaModell) -> str:
    """Erzeugt TypeScript-Interfaces (ein Interface je benanntem Typ)."""
    zeilen: list[str] = [f"// Aus {modell.beispiel_anzahl} Beispiel(en) abgeleitet"]
    for typ in modell.typen:
        zeilen.append("")
        zeilen.append(f"export interface {typ.name} {{")
        for feld in typ.felder:
            zeilen.append(_feld_zeile(feld))
        zeilen.append("}")
    return "\n".join(zeilen) + "\n"
