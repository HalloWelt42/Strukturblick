"""KI-Anbindung: ein Adapter gegen ein lokales, OpenAI-kompatibles Sprachmodell.

Der Adapter (adapter.py) spricht /v1/models und /v1/chat/completions und
erzwingt strukturierte Antworten über response_format. Die Funktionen unter
app.ki.funktionen laden je Aufgabe einen Prompt (app.ki.prompts) und rufen den
Adapter mit dem passenden Antwortmodell auf.
"""

from __future__ import annotations

from app.ki.adapter import OpenAiKompatiblerAdapter, adapter

__all__ = ["OpenAiKompatiblerAdapter", "adapter"]
