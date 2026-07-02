"""Unit-Tests der JSON-Pointer-Helfer: Escaping, Rundreise, Kind-Pointer."""

from __future__ import annotations

import pytest

from app.kern.pfade import (
    kind_pointer,
    pointer_aus_segmenten,
    segment_entescapen,
    segment_escapen,
    segmente_aus_pointer,
)


def test_escaping_tilde_und_schraegstrich() -> None:
    assert segment_escapen("a/b") == "a~1b"
    assert segment_escapen("m~n") == "m~0n"
    assert segment_escapen("~/") == "~0~1"
    assert segment_entescapen("a~1b") == "a/b"
    assert segment_entescapen("m~0n") == "m~n"
    assert segment_entescapen("~0~1") == "~/"


def test_escaping_rundreise_kritischer_segmente() -> None:
    for segment in ("~", "/", "~0", "~1", "a/~b", "~1~0", "normal", ""):
        assert segment_entescapen(segment_escapen(segment)) == segment


def test_rundreise_segmente_pointer() -> None:
    segmente = ["bestellungen", "0", "kunde/name", "mit~tilde"]

    pointer = pointer_aus_segmenten(list(segmente))

    assert pointer == "/bestellungen/0/kunde~1name/mit~0tilde"
    assert segmente_aus_pointer(pointer) == segmente


def test_wurzel_pointer() -> None:
    assert pointer_aus_segmenten([]) == ""
    assert segmente_aus_pointer("") == []


def test_int_segmente_werden_zu_indizes() -> None:
    assert pointer_aus_segmenten(["bestellungen", 0]) == "/bestellungen/0"


def test_ungueltiger_pointer_wirft_value_error() -> None:
    with pytest.raises(ValueError):
        segmente_aus_pointer("kein/pointer")


def test_kind_pointer() -> None:
    assert kind_pointer("", "geschaeft") == "/geschaeft"
    assert kind_pointer("/bestellungen", 0) == "/bestellungen/0"
    assert kind_pointer("/a", "b/c") == "/a/b~1c"
    assert kind_pointer("/a", "b~c") == "/a/b~0c"
