<script lang="ts">
  // Das Lexikon (Hilfe) als schwebendes Fenster über dem Arbeitsplatz (entwuerfe/lexikon.html, Muster der Hilfe aus
  // früheren Projekten): am Kopf verschieben, an der Ecke in der Größe ziehen, minimieren, maximieren. Links die Themen
  // nach Bereichen, rechts das Thema; die Volltextsuche markiert Treffer und blättert von Thema zu Thema. Im Text
  // laufen Beispiele auf dem offenen Dokument (Ausprobieren), und Verweise führen in andere Themen oder in die App.
  import "./lexikon.css";
  import { mount, unmount, untrack } from "svelte";
  import { abfrage, SPRACHEN, sprachenFuer, type SprachKennung } from "../../zustand/abfrage.svelte";
  import { meldungen } from "../../zustand/meldungen.svelte";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ANSICHTEN } from "../ansichten/registrierung";
  import { WERKZEUGE } from "../werkzeuge/registrierung";
  import { alleThemen, BEREICHE, thema as themaVon } from "./themen";
  import { KOPF_HOEHE, lexikon } from "./lexikonZustand.svelte";
  import Gewaehlt from "./Gewaehlt.svelte";

  const themen = alleThemen();
  const bereiche = [...BEREICHE, ...new Set(themen.map((t) => t.bereich).filter((b) => !(BEREICHE as readonly string[]).includes(b)))];
  const t = $derived(lexikon.thema ? themaVon(lexikon.thema) : null);
  const suchtAlle = $derived(lexikon.bereich === "alle" && lexikon.suche.trim() !== "");
  const SPRACHE_VON: Record<string, SprachKennung> = Object.fromEntries(SPRACHEN.map((s) => [`language-${s.kennung}`, s.kennung]));

  let artikel = $state<HTMLElement | null>(null);
  let textfeld = $state<HTMLDivElement | null>(null);
  let suchfeld = $state<HTMLInputElement | null>(null);

  const sichtbar = (anker: string): boolean => !suchtAlle || lexikon.trefferJeThema(anker) > 0;

  /** Beispiele ausprobieren: Ausdruck in die Abfrage unten, Sprache wählen, rechnen lassen */
  function ausprobieren(sprache: SprachKennung, ausdruck: string): void {
    const f = arbeitsplatz.aktivesBlatt?.analyse?.format.faehigkeiten;
    if (!sprachenFuer(f).some((s) => s.kennung === sprache)) {
      const name = SPRACHEN.find((s) => s.kennung === sprache)?.name ?? sprache;
      meldungen.zeigen({ text: f ? `${name} passt nicht zum offenen Dokument; das Beispiel braucht eins, das ${name} versteht (XPath: ein XML-Dokument wie lieferungen.xml).` : "Erst ein Dokument öffnen, dann ausprobieren.", art: "hinweis" });
      return;
    }
    abfrage.oeffnen(sprache);
    abfrage.ausdruck = ausdruck;
    abfrage.planen();
  }

  /** Verweise: #thema oder #thema/abschnitt im Lexikon, #ansicht:x und #werkzeug:x im offenen Dokument */
  function verweis(e: MouseEvent): void {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href^='#']");
    if (!a) return;
    e.preventDefault();
    const ziel = decodeURIComponent(a.getAttribute("href")!.slice(1));
    const [art, kennung] = ziel.split(":");
    const blatt = arbeitsplatz.aktivesBlatt;
    if (kennung && art === "ansicht" && ANSICHTEN.some((x) => x.kennung === kennung)) return void blatt?.zeigen({ art: "ansicht", kennung });
    if (kennung && art === "werkzeug" && WERKZEUGE.some((x) => x.kennung === kennung)) return void blatt?.zeigen({ art: "werkzeug", kennung });
    const [anker, abschnitt] = ziel.split("/");
    lexikon.zeige(anker || lexikon.thema, abschnitt ?? null);
  }

  /** Lebendige Teile ins gerade gezeigte Thema setzen; gibt das Aufräumen zurück */
  function beleben(el: HTMLElement): () => void {
    const montiert: ReturnType<typeof mount>[] = [];
    for (const ort of el.querySelectorAll<HTMLElement>("[data-live='gewaehlt']")) montiert.push(mount(Gewaehlt, { target: ort }));
    for (const code of el.querySelectorAll<HTMLElement>("pre > code")) {
      const sprache = SPRACHE_VON[[...code.classList].find((c) => c in SPRACHE_VON) ?? ""];
      if (!sprache) continue;
      const knopf = document.createElement("button");
      knopf.className = "knopf lx-ausprobieren";
      knopf.type = "button";
      knopf.title = "Im Abfragefeld unten auf dem offenen Dokument ausführen";
      knopf.innerHTML = '<i class="fa-solid fa-play"></i> Ausprobieren';
      const ausdruck = (code.textContent ?? "").trim();
      knopf.addEventListener("click", () => ausprobieren(sprache, ausdruck));
      code.parentElement!.classList.add("lx-beispiel");
      code.parentElement!.appendChild(knopf);
    }
    return () => montiert.forEach((m) => void unmount(m));
  }

  /** Treffer im Artikel markieren (auf den Textknoten) und den aktiven in den Blick holen */
  function markieren(behaelter: HTMLElement, begriff: string, aktiv: number): void {
    behaelter.querySelectorAll("mark.lx-treffer").forEach((m) => m.replaceWith(document.createTextNode(m.textContent ?? "")));
    behaelter.normalize();
    if (!begriff) return;
    const nadel = begriff.toLowerCase();
    const laeufer = document.createTreeWalker(behaelter, NodeFilter.SHOW_TEXT);
    const knoten: Text[] = [];
    while (laeufer.nextNode()) knoten.push(laeufer.currentNode as Text);
    let zaehler = 0;
    for (const k of knoten) {
      if (k.parentElement?.closest(".lx-live, button")) continue;
      const text = k.nodeValue ?? "";
      const klein = text.toLowerCase();
      if (!klein.includes(nadel)) continue;
      const stueck = document.createDocumentFragment();
      let pos = 0;
      for (let i = klein.indexOf(nadel); i !== -1; i = klein.indexOf(nadel, pos)) {
        if (i > pos) stueck.appendChild(document.createTextNode(text.slice(pos, i)));
        const mark = document.createElement("mark");
        mark.className = `lx-treffer${zaehler === aktiv ? " aktiv" : ""}`;
        mark.textContent = text.slice(i, i + begriff.length);
        stueck.appendChild(mark);
        zaehler++;
        pos = i + begriff.length;
      }
      if (pos < text.length) stueck.appendChild(document.createTextNode(text.slice(pos)));
      k.parentNode?.replaceChild(stueck, k);
    }
    behaelter.querySelector("mark.lx-treffer.aktiv")?.scrollIntoView({ block: "center" });
  }

  $effect(() => {
    if (!artikel) return;
    return untrack(() => beleben(artikel!));
  });

  $effect(() => {
    void lexikon.thema;
    void lexikon.trefferIndex;
    void lexikon.treffer;
    const begriff = lexikon.suche.trim();
    if (artikel) markieren(artikel, begriff, lexikon.aktivLokal());
  });

  // Abschnitt eines Tiefenlinks ansteuern, sonst oben beginnen
  $effect(() => {
    const ziel = lexikon.abschnitt;
    void lexikon.thema;
    if (!artikel || !textfeld) return;
    const el = ziel ? artikel.querySelector<HTMLElement>(`#lx-${CSS.escape(ziel)}`) : null;
    if (el) el.scrollIntoView({ block: "start" });
    else if (!lexikon.suche.trim()) textfeld.scrollTop = 0;
  });

  // Sichtschutz beim Öffnen und bei jeder Größenänderung des Browserfensters
  $effect(() => {
    if (!lexikon.offen) return;
    const beiGroesse = () => lexikon.sichern();
    window.addEventListener("resize", beiGroesse);
    untrack(() => {
      lexikon.sichern();
      suchfeld?.focus({ preventScroll: true });
    });
    return () => window.removeEventListener("resize", beiGroesse);
  });

  function tasteSuche(e: KeyboardEvent): void {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.shiftKey) lexikon.voriger();
    else lexikon.naechster();
  }

  function tasteFenster(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    e.stopPropagation();
    if (lexikon.suche) lexikon.setzeSuche("");
    else lexikon.schliessen();
  }

  /** Ziehen am Kopf (Zeiger: auch mit Stift und Finger); der Kopf bleibt immer im Browserfenster */
  function ziehen(e: PointerEvent): void {
    if (lexikon.maximiert || (e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = lexikon.x, oy = lexikon.y;
    const bewegen = (ev: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth - lexikon.breite);
      const maxY = Math.max(0, window.innerHeight - KOPF_HOEHE);
      lexikon.setzeLage(Math.min(maxX, Math.max(0, ox + ev.clientX - sx)), Math.min(maxY, Math.max(0, oy + ev.clientY - sy)));
    };
    const ende = () => {
      lexikon.speichern();
      window.removeEventListener("pointermove", bewegen);
      window.removeEventListener("pointerup", ende);
    };
    window.addEventListener("pointermove", bewegen);
    window.addEventListener("pointerup", ende);
  }

  function groesse(e: PointerEvent): void {
    if (lexikon.maximiert) return;
    e.preventDefault();
    e.stopPropagation();
    const sx = e.clientX, sy = e.clientY, ob = lexikon.breite, oh = lexikon.hoehe;
    const bewegen = (ev: PointerEvent) => lexikon.setzeGroesse(Math.min(ob + ev.clientX - sx, window.innerWidth - lexikon.x), Math.min(oh + ev.clientY - sy, window.innerHeight - lexikon.y));
    const ende = () => {
      lexikon.speichern();
      window.removeEventListener("pointermove", bewegen);
      window.removeEventListener("pointerup", ende);
    };
    window.addEventListener("pointermove", bewegen);
    window.addEventListener("pointerup", ende);
  }

  const stil = $derived(lexikon.maximiert ? "" : `left: ${lexikon.x}px; top: ${lexikon.y}px; width: ${lexikon.breite}px; height: ${lexikon.minimiert ? "auto" : `${lexikon.hoehe}px`};`);
</script>

{#if lexikon.offen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="lx-fenster" class:minimiert={lexikon.minimiert} class:maximiert={lexikon.maximiert} style={stil} role="dialog" aria-label="Lexikon" tabindex="-1" onkeydown={tasteFenster}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <header class="lx-kopf" onpointerdown={ziehen}>
      <i class="fa-solid fa-book-open lx-marke"></i>
      <div class="lx-titel">
        <b>Lexikon</b>
        {#if t}<span>{t.titel}</span>{/if}
      </div>
      <div class="lx-kopf-knoepfe">
        <button class="knopf nur-symbol" title={lexikon.minimiert ? "Wiederherstellen" : "Minimieren"} aria-label={lexikon.minimiert ? "Wiederherstellen" : "Minimieren"} onclick={() => lexikon.minimierenUmschalten()}><i class="fa-solid {lexikon.minimiert ? 'fa-window-restore' : 'fa-window-minimize'}"></i></button>
        <button class="knopf nur-symbol" title={lexikon.maximiert ? "Vollbild verlassen" : "Maximieren"} aria-label={lexikon.maximiert ? "Vollbild verlassen" : "Maximieren"} onclick={() => lexikon.maximierenUmschalten()}><i class="fa-solid {lexikon.maximiert ? 'fa-compress' : 'fa-expand'}"></i></button>
        <button class="knopf nur-symbol" title="Schließen (Escape)" aria-label="Lexikon schließen" onclick={() => lexikon.schliessen()}><i class="fa-solid fa-xmark"></i></button>
      </div>
    </header>

    {#if !lexikon.minimiert}
      <div class="lx-suche">
        <nav class="segment" aria-label="Suchbereich">
          <button class:aktiv={lexikon.bereich === "alle"} title="In allen Themen suchen" onclick={() => lexikon.setzeBereich("alle")}>Alle Themen</button>
          <button class:aktiv={lexikon.bereich === "thema"} title="Nur in diesem Thema suchen" onclick={() => lexikon.setzeBereich("thema")}>Dieses Thema</button>
        </nav>
        <label class="feld lx-suchfeld">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input bind:this={suchfeld} placeholder={lexikon.bereich === "alle" ? "Im Lexikon suchen ..." : "In diesem Thema suchen ..."} value={lexikon.suche} oninput={(e) => lexikon.setzeSuche(e.currentTarget.value)} onkeydown={tasteSuche} aria-label="Lexikon durchsuchen" title="Volltextsuche; Enter springt zum nächsten Treffer, Umschalt und Enter zurück, Escape leert" spellcheck="false" />
          {#if lexikon.suche.trim()}
            <span class="lx-zaehler">{lexikon.treffer.length ? lexikon.trefferIndex + 1 : 0}/{lexikon.treffer.length}</span>
            <button class="lx-feldknopf" title="Vorheriger Treffer (Umschalt und Enter)" aria-label="Vorheriger Treffer" onclick={() => lexikon.voriger()}><i class="fa-solid fa-chevron-up"></i></button>
            <button class="lx-feldknopf" title="Nächster Treffer (Enter)" aria-label="Nächster Treffer" onclick={() => lexikon.naechster()}><i class="fa-solid fa-chevron-down"></i></button>
            <button class="lx-feldknopf" title="Suche leeren (Escape)" aria-label="Suche leeren" onclick={() => lexikon.setzeSuche("")}><i class="fa-solid fa-xmark"></i></button>
          {/if}
        </label>
      </div>
      {#if suchtAlle && t}
        <div class="lx-hinweis">{lexikon.treffer.length ? `Treffer in ${t.titel}; Enter geht durch alle Themen.` : "Kein Thema enthält diesen Begriff."}</div>
      {/if}

      <div class="lx-koerper">
        <nav class="lx-themen" aria-label="Themen">
          {#each bereiche as b (b)}
            {#if themen.some((x) => x.bereich === b && sichtbar(x.anker))}
              <div class="lx-bereich">{b}</div>
              {#each themen.filter((x) => x.bereich === b && sichtbar(x.anker)) as x (x.anker)}
                <a href="#{x.anker}" class:aktiv={x.anker === lexikon.thema} onclick={(e) => { e.preventDefault(); lexikon.waehle(x.anker); }}>
                  <span>{x.titel}</span>
                  {#if suchtAlle}<span class="abzeichen zweit">{lexikon.trefferJeThema(x.anker)}</span>{/if}
                </a>
              {/each}
            {/if}
          {/each}
        </nav>
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="lx-text" bind:this={textfeld} onclick={verweis}>
          {#if t}
            {#key lexikon.thema}
              <article class="lx-artikel" bind:this={artikel}>
                <h1><i class="fa-solid {t.symbol}"></i> {t.titel}</h1>
                {#if t.unterzeile}<p class="lx-unterzeile">{t.unterzeile}</p>{/if}
                {#if t.abschnitte.length > 2}
                  <nav class="lx-inhalt" aria-label="Abschnitte">{#each t.abschnitte as s (s.anker)}<a href="#{t.anker}/{s.anker}">{s.titel}</a>{/each}</nav>
                {/if}
                <!-- Eigene, mitgelieferte Markdown-Themen (kein Nutzertext), durch DOMPurify geführt -->
                {@html t.html}
                {#if t.quellen}<p class="lx-quellen"><i class="fa-solid fa-book"></i> Grundlage: {@html t.quellen}</p>{/if}
              </article>
            {/key}
          {:else}
            <p class="text-3">Kein Thema gewählt.</p>
          {/if}
        </div>
      </div>
      {#if !lexikon.maximiert}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="lx-griff" title="Größe ändern" onpointerdown={groesse}></div>
      {/if}
    {/if}
  </div>
{/if}
