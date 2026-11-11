// Entwurfsleiste: Thema und Schriftstufe umschalten, Stand in der Adresse
// (?thema=dunkel&schrift=gross), damit jeder Zustand einen Direktlink hat.
(function () {
  const adresse = new URL(location.href);
  const wurzel = document.documentElement;
  const THEMEN = [
    ["mittelton", "Mittelton"],
    ["dunkel", "Dunkel"],
  ];
  const STUFEN = [
    ["klein", "Klein"],
    ["mittel", "Mittel"],
    ["gross", "Groß"],
  ];

  function setze(name, wert) {
    adresse.searchParams.set(name, wert);
    history.replaceState(null, "", adresse);
    anwenden();
  }

  function anwenden() {
    wurzel.dataset.theme = adresse.searchParams.get("thema") || "mittelton";
    wurzel.dataset.schrift = adresse.searchParams.get("schrift") || "mittel";
    document.querySelectorAll(".entwurf-leiste [data-wert]").forEach((k) => {
      const aktuell = k.dataset.art === "thema" ? wurzel.dataset.theme : wurzel.dataset.schrift;
      k.classList.toggle("aktiv", k.dataset.wert === aktuell);
    });
  }

  function knopf(art, wert, text) {
    const b = document.createElement("button");
    b.dataset.art = art;
    b.dataset.wert = wert;
    b.textContent = text;
    b.onclick = () => setze(art, wert);
    return b;
  }

  const leiste = document.createElement("div");
  leiste.className = "entwurf-leiste";
  THEMEN.forEach(([w, t]) => leiste.append(knopf("thema", w, t)));
  const trenn = document.createElement("span");
  trenn.className = "trenn";
  leiste.append(trenn);
  STUFEN.forEach(([w, t]) => leiste.append(knopf("schrift", w, t)));
  const trenn2 = trenn.cloneNode();
  leiste.append(trenn2);
  const galerie = document.createElement("a");
  galerie.href = "index.html" + adresse.search;
  galerie.textContent = "Galerie";
  galerie.onclick = () => (galerie.href = "index.html" + adresse.search);
  leiste.append(galerie);

  anwenden();
  document.addEventListener("DOMContentLoaded", () => {
    document.body.append(leiste);
    // Links zwischen den Entwürfen tragen Thema und Schriftstufe weiter
    document.querySelectorAll('a[href$=".html"]').forEach((a) => {
      a.addEventListener("click", () => {
        a.href = a.getAttribute("href").split("?")[0] + adresse.search;
      });
    });
  });
})();
