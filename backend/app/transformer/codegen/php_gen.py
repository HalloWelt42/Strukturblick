"""Emitter für modernes PHP 8.4+ aus dem neutralen Zwischenmodell.

Jeder benannte Typ wird eine finale Klasse mit Constructor Property Promotion,
readonly-Eigenschaften und einer statischen Factory 'fromArray'. Listen werden
als 'array' typisiert und über PHPDoc ('@param list<Elementtyp>') präzisiert;
verschachtelte Objekte und Objektlisten werden in fromArray rekursiv aufgebaut.
"""

from __future__ import annotations

from app.transformer.codegen.schema_modell import Feld, FeldTyp, SchemaModell

_PRIMITIVE: dict[str, str] = {
    "string": "string",
    "number": "float",
    "integer": "int",
    "boolean": "bool",
    "null": "mixed",
    "any": "mixed",
}

_EINRUECKUNG = "    "


def _basis_typ(typ: FeldTyp) -> str:
    if typ.referenz is not None:
        return typ.referenz
    return _PRIMITIVE.get(typ.primitiv or "any", "mixed")


def _php_typ(typ: FeldTyp, optional: bool) -> str:
    """PHP-Typdeklaration einer Eigenschaft (Listen sind 'array')."""
    basis = "array" if typ.ist_liste else _basis_typ(typ)
    # 'mixed' schließt null bereits ein - kein '?mixed' erlaubt.
    if optional and basis != "mixed":
        return f"?{basis}"
    return basis


def _phpdoc_element(typ: FeldTyp) -> str:
    """Elementtyp einer Liste für die PHPDoc-Annotation."""
    if typ.referenz is not None:
        return typ.referenz
    return _PRIMITIVE.get(typ.primitiv or "any", "mixed")


def _konstruktor_zeilen(felder: list[Feld]) -> tuple[list[str], list[str]]:
    """Liefert (PHPDoc-Zeilen, Parameter-Zeilen) des Konstruktors."""
    phpdoc: list[str] = []
    parameter: list[str] = []
    for feld in felder:
        if feld.typ.ist_liste:
            phpdoc.append(f"     * @param list<{_phpdoc_element(feld.typ)}> ${feld.name}")
        deklaration = _php_typ(feld.typ, feld.optional)
        zeile = f"{_EINRUECKUNG * 2}public readonly {deklaration} ${feld.name}"
        if feld.optional:
            zeile += " = null"
        parameter.append(zeile)
    return phpdoc, parameter


def _from_array_ausdruck(feld: Feld) -> str:
    """Ausdruck, der einen Feldwert aus $data in fromArray aufbaut."""
    schluessel = f"$data['{feld.name}']"
    typ = feld.typ
    if typ.ist_liste and typ.referenz is not None:
        kern = (
            f"array_map(static fn (array $eintrag): {typ.referenz} "
            f"=> {typ.referenz}::fromArray($eintrag), {schluessel})"
        )
        return f"{feld.name}: {kern}"
    if typ.referenz is not None:
        if feld.optional:
            kern = (
                f"isset({schluessel}) ? {typ.referenz}::fromArray({schluessel}) : null"
            )
        else:
            kern = f"{typ.referenz}::fromArray({schluessel})"
        return f"{feld.name}: {kern}"
    if feld.optional:
        return f"{feld.name}: {schluessel} ?? null"
    return f"{feld.name}: {schluessel}"


def _from_array_zeilen(felder: list[Feld]) -> list[str]:
    zeilen: list[str] = [
        f"{_EINRUECKUNG * 1}public static function fromArray(array $data): self",
        f"{_EINRUECKUNG * 1}{{",
        f"{_EINRUECKUNG * 2}return new self(",
    ]
    for feld in felder:
        zeilen.append(f"{_EINRUECKUNG * 3}{_from_array_ausdruck(feld)},")
    zeilen.append(f"{_EINRUECKUNG * 2});")
    zeilen.append(f"{_EINRUECKUNG * 1}}}")
    return zeilen


def _klasse(typ_name: str, felder: list[Feld]) -> list[str]:
    zeilen: list[str] = [f"final class {typ_name}", "{"]
    phpdoc, parameter = _konstruktor_zeilen(felder)
    if phpdoc:
        zeilen.append(f"{_EINRUECKUNG * 1}/**")
        zeilen.extend(phpdoc)
        # Stern des Abschlusses unter den Sternen der Zeilen ausrichten (PSR-12-nah).
        zeilen.append(f"{_EINRUECKUNG * 1} */")
    if parameter:
        zeilen.append(f"{_EINRUECKUNG * 1}public function __construct(")
        # Nachgestelltes Komma ist ab PHP 8.0 in Argumentlisten zulässig.
        for param in parameter:
            zeilen.append(param + ",")
        zeilen.append(f"{_EINRUECKUNG * 1}) {{}}")
    else:
        zeilen.append(f"{_EINRUECKUNG * 1}public function __construct() {{}}")
    zeilen.append("")
    zeilen.extend(_from_array_zeilen(felder))
    zeilen.append("}")
    return zeilen


def emittiere_php(modell: SchemaModell) -> str:
    """Erzeugt PHP-8.4-Klassen (eine finale Klasse je benanntem Typ)."""
    zeilen: list[str] = [
        "<?php",
        "",
        "declare(strict_types=1);",
        "",
        f"// Aus {modell.beispiel_anzahl} Beispiel(en) abgeleitet",
    ]
    for typ in modell.typen:
        zeilen.append("")
        zeilen.extend(_klasse(typ.name, typ.felder))
    return "\n".join(zeilen) + "\n"
