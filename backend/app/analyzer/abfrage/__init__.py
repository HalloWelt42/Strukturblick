"""Abfrage-Schicht: ein Endpunkt, vier Abfragesprachen, ein Dispatcher.

Anders als die Analyse-Module ist die Abfrage kein registrierter Analyzer,
sondern eine gewoehnliche Funktion (dispatcher.fuehre_abfrage). Der Dispatcher
waehlt nach der gewuenschten Sprache das passende Verfahren:

- jsonpath: RFC 9535 ueber jsonpath_rfc9535, arbeitet auf dem Wertebaum.
- xpath:    nur fuer XML, arbeitet auf dem nativen lxml-Baum.
- volltext: rekursive Substring-Suche ueber Schluessel oder skalare Werte.
- regex:    wie volltext, aber mit kompiliertem regulaerem Ausdruck.

Jedes Verfahren liefert eine Trefferliste; der Dispatcher kappt sie auf
max_treffer und setzt die Flags anzahl/abgeschnitten der Antwort.
"""
