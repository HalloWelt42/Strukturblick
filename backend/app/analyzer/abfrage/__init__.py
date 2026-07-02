"""Abfrage-Schicht: ein Endpunkt, vier Abfragesprachen, ein Dispatcher.

Anders als die Analyse-Module ist die Abfrage kein registrierter Analyzer,
sondern eine gewöhnliche Funktion (dispatcher.fuehre_abfrage). Der Dispatcher
wählt nach der gewünschten Sprache das passende Verfahren:

- jsonpath: RFC 9535 über jsonpath_rfc9535, arbeitet auf dem Wertebaum.
- xpath:    nur für XML, arbeitet auf dem nativen lxml-Baum.
- volltext: rekursive Substring-Suche über Schlüssel oder skalare Werte.
- regex:    wie volltext, aber mit kompiliertem regulärem Ausdruck.

Jedes Verfahren liefert eine Trefferliste; der Dispatcher kappt sie auf
max_treffer und setzt die Flags anzahl/abgeschnitten der Antwort.
"""
