"""JSON-Pointer (RFC 6901): bauen, zerlegen, escapen.

Der Pointer ist die kanonische Adresse aller Knoten - Wurzel ist "",
Segmente werden mit ~0 (~) und ~1 (/) escaped.
"""

from __future__ import annotations


def segment_escapen(segment: str) -> str:
    return segment.replace("~", "~0").replace("/", "~1")


def segment_entescapen(segment: str) -> str:
    return segment.replace("~1", "/").replace("~0", "~")


def pointer_aus_segmenten(segmente: list[str | int]) -> str:
    if not segmente:
        return ""
    teile = [segment_escapen(s) if isinstance(s, str) else str(s) for s in segmente]
    return "/" + "/".join(teile)


def segmente_aus_pointer(pointer: str) -> list[str]:
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise ValueError(f"Ungültiger JSON-Pointer: {pointer!r}")
    return [segment_entescapen(teil) for teil in pointer.split("/")[1:]]


def kind_pointer(eltern_pointer: str, segment: str | int) -> str:
    teil = segment_escapen(segment) if isinstance(segment, str) else str(segment)
    return f"{eltern_pointer}/{teil}"
