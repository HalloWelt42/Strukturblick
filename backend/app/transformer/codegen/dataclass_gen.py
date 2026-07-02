"""Emitter für Python-dataclasses aus dem neutralen Zwischenmodell."""

from __future__ import annotations

from app.transformer.codegen.schema_modell import Feld, FeldTyp, SchemaModell

_PRIMITIVE: dict[str, str] = {
    "string": "str",
    "number": "float",
    "integer": "int",
    "boolean": "bool",
    "null": "None",
    "any": "object",
}


def _typ_ausdruck(typ: FeldTyp) -> str:
    if typ.referenz is not None:
        basis = typ.referenz
    else:
        basis = _PRIMITIVE.get(typ.primitiv or "any", "object")
    if typ.ist_liste:
        return f"list[{basis}]"
    return basis


def _feld_zeile(feld: Feld) -> str:
    ausdruck = _typ_ausdruck(feld.typ)
    if feld.optional:
        return f"    {feld.name}: {ausdruck} | None = None"
    return f"    {feld.name}: {ausdruck}"


def emittiere_dataclasses(modell: SchemaModell) -> str:
    """Erzeugt @dataclass-Klassen (eine Klasse je benanntem Typ)."""
    zeilen: list[str] = [
        f"# Aus {modell.beispiel_anzahl} Beispiel(en) abgeleitet",
        "from __future__ import annotations",
        "",
        "from dataclasses import dataclass",
    ]
    for typ in modell.typen:
        zeilen.append("")
        zeilen.append("")
        zeilen.append("@dataclass")
        zeilen.append(f"class {typ.name}:")
        if not typ.felder:
            zeilen.append("    pass")
            continue
        for feld in typ.felder:
            zeilen.append(_feld_zeile(feld))
    return "\n".join(zeilen) + "\n"
