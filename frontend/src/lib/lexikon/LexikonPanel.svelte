<script lang="ts">
  // Schwebendes Lexikon-Panel nach mockups/lexikon.html: verschiebbar am
  // Kopf, Themenwahl nach Kategorie gruppiert, In-Panel-Suche mit
  // Treffer-Hervorhebung und -Navigation, Größe über den Griff unten rechts.
  // Alle Panel-Klassen (lex-*) kommen global aus app.css.
  import { lexikon } from './lexikon.svelte'
  import { holeThema, listeThemen, type LexikonThema } from './themen'

  lexikon.init()

  const themen = listeThemen()

  /** Themen nach Kategorie gruppiert, Kategorien in fester Reihenfolge. */
  const gruppen: { kategorie: string; eintraege: LexikonThema[] }[] = (() => {
    const reihenfolge = ['Formate', 'Abfragen', 'Schemas', 'Konzepte']
    const kategorien = [...new Set(themen.map((thema) => thema.category))].sort(
      (a, b) =>
        (reihenfolge.indexOf(a) === -1 ? 999 : reihenfolge.indexOf(a)) -
        (reihenfolge.indexOf(b) === -1 ? 999 : reihenfolge.indexOf(b)),
    )
    return kategorien.map((kategorie) => ({
      kategorie,
      eintraege: themen.filter((thema) => thema.category === kategorie),
    }))
  })()

  const thema = $derived(lexikon.themaKey !== null ? holeThema(lexikon.themaKey) : null)

  let inhaltElement = $state<HTMLElement | null>(null)

  /**
   * Treffer im gerenderten Inhalt mit <mark> hervorheben. Textknoten werden
   * per TreeWalker durchlaufen, der aktive Treffer bekommt mark.aktiv und
   * wird in den Blick gescrollt. Liefert die Trefferanzahl.
   */
  function markiereTreffer(container: HTMLElement, begriff: string, aktiverIndex: number): number {
    container.querySelectorAll('mark').forEach((markElement) => {
      markElement.replaceWith(document.createTextNode(markElement.textContent ?? ''))
    })
    container.normalize()
    if (begriff === '') return 0

    const nadel = begriff.toLowerCase()
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const textKnoten: Text[] = []
    while (walker.nextNode()) textKnoten.push(walker.currentNode as Text)

    let zaehler = 0
    for (const knoten of textKnoten) {
      const text = knoten.nodeValue ?? ''
      const klein = text.toLowerCase()
      if (!klein.includes(nadel)) continue
      const fragment = document.createDocumentFragment()
      let position = 0
      let fundstelle = klein.indexOf(nadel)
      while (fundstelle !== -1) {
        if (fundstelle > position) {
          fragment.appendChild(document.createTextNode(text.slice(position, fundstelle)))
        }
        const markElement = document.createElement('mark')
        markElement.textContent = text.slice(fundstelle, fundstelle + begriff.length)
        if (zaehler === aktiverIndex) markElement.classList.add('aktiv')
        fragment.appendChild(markElement)
        zaehler += 1
        position = fundstelle + begriff.length
        fundstelle = klein.indexOf(nadel, position)
      }
      if (position < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(position)))
      }
      knoten.replaceWith(fragment)
    }

    const aktiv = container.querySelector('mark.aktiv')
    if (aktiv !== null) aktiv.scrollIntoView({ block: 'nearest' })
    return zaehler
  }

  $effect(() => {
    void lexikon.themaKey
    const begriff = lexikon.suche.trim()
    const aktiverIndex = lexikon.trefferIndex
    if (inhaltElement === null) return
    const gesamt = markiereTreffer(inhaltElement, begriff, aktiverIndex)
    if (gesamt !== lexikon.trefferGesamt) lexikon.trefferGesamt = gesamt
    if (aktiverIndex >= gesamt && gesamt > 0) lexikon.trefferIndex = 0
  })

  function beiSuchTaste(ereignis: KeyboardEvent): void {
    if (ereignis.key === 'Enter') {
      ereignis.preventDefault()
      if (ereignis.shiftKey) lexikon.vorherigerTreffer()
      else lexikon.naechsterTreffer()
    }
    if (ereignis.key === 'Escape' && lexikon.suche !== '') {
      // Erst die Suche leeren; erneutes Escape schließt das Panel.
      ereignis.stopPropagation()
      lexikon.setzeSuche('')
    }
  }

  function beiFensterTaste(ereignis: KeyboardEvent): void {
    if (lexikon.offen && ereignis.key === 'Escape') lexikon.schliesse()
  }

  /** Verschieben: Pointer am Kopf greifen, Fensterweite Bewegung verfolgen. */
  function dragStart(ereignis: PointerEvent): void {
    const ziel = ereignis.target as HTMLElement
    if (ziel.closest('.lex-aktionen') !== null) return
    ereignis.preventDefault()
    const startX = ereignis.clientX
    const startY = ereignis.clientY
    const ursprungX = lexikon.x
    const ursprungY = lexikon.y
    const bewege = (weiter: PointerEvent): void => {
      lexikon.setzePosition(ursprungX + weiter.clientX - startX, ursprungY + weiter.clientY - startY)
    }
    const loslassen = (): void => {
      lexikon.speichere()
      window.removeEventListener('pointermove', bewege)
      window.removeEventListener('pointerup', loslassen)
    }
    window.addEventListener('pointermove', bewege)
    window.addEventListener('pointerup', loslassen)
  }

  /** Größe ändern über den Griff unten rechts; Ergebnis wird persistiert. */
  function groesseStart(ereignis: PointerEvent): void {
    ereignis.preventDefault()
    ereignis.stopPropagation()
    const startX = ereignis.clientX
    const startY = ereignis.clientY
    const ursprungBreite = lexikon.breite
    const ursprungHoehe = lexikon.hoehe
    const bewege = (weiter: PointerEvent): void => {
      lexikon.setzeGroesse(
        ursprungBreite + weiter.clientX - startX,
        ursprungHoehe + weiter.clientY - startY,
      )
    }
    const loslassen = (): void => {
      lexikon.speichere()
      window.removeEventListener('pointermove', bewege)
      window.removeEventListener('pointerup', loslassen)
    }
    window.addEventListener('pointermove', bewege)
    window.addEventListener('pointerup', loslassen)
  }

  const panelStil = $derived(
    `left: ${lexikon.x}px; top: ${lexikon.y}px; right: auto; bottom: auto; ` +
      `width: ${lexikon.breite}px; height: ${lexikon.minimiert ? 'auto' : `${lexikon.hoehe}px`};`,
  )

  const zaehlerText = $derived(
    `${lexikon.trefferGesamt > 0 ? lexikon.trefferIndex + 1 : 0}/${lexikon.trefferGesamt}`,
  )
</script>

<svelte:window onkeydown={beiFensterTaste} />

{#if lexikon.offen}
  <aside class="lex-panel" style={panelStil}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="lex-kopf" onpointerdown={dragStart}>
      <i class="fa-solid {thema?.icon ?? 'fa-book-open'}"></i>
      <div class="lex-titel">
        <strong>{thema?.title ?? 'Lexikon'}</strong>
        <span>{thema?.subtitle ?? 'Nachschlagewerk'}</span>
      </div>
      <div class="lex-aktionen">
        <button
          class="icon-knopf"
          aria-label={lexikon.minimiert ? 'Wiederherstellen' : 'Minimieren'}
          onclick={() => lexikon.toggleMinimiert()}
        >
          <i class="fa-solid {lexikon.minimiert ? 'fa-window-restore' : 'fa-window-minimize'}"></i>
        </button>
        <button class="icon-knopf" aria-label="Schließen" onclick={() => lexikon.schliesse()}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>

    {#if !lexikon.minimiert}
      <div class="lex-leiste">
        <select
          class="feld"
          aria-label="Thema wählen"
          value={lexikon.themaKey}
          onchange={(ereignis) => lexikon.waehle(ereignis.currentTarget.value)}
        >
          {#each gruppen as gruppe (gruppe.kategorie)}
            <optgroup label={gruppe.kategorie}>
              {#each gruppe.eintraege as eintrag (eintrag.key)}
                <option value={eintrag.key}>{eintrag.title}</option>
              {/each}
            </optgroup>
          {/each}
        </select>
        <div class="lex-suche">
          <input
            class="feld"
            type="text"
            placeholder="Im Thema suchen ..."
            value={lexikon.suche}
            oninput={(ereignis) => lexikon.setzeSuche(ereignis.currentTarget.value)}
            onkeydown={beiSuchTaste}
          />
          <span class="lex-treffer-zaehler">{zaehlerText}</span>
          <button
            class="icon-knopf"
            aria-label="Vorheriger Treffer"
            disabled={lexikon.trefferGesamt === 0}
            onclick={() => lexikon.vorherigerTreffer()}
          >
            <i class="fa-solid fa-chevron-up"></i>
          </button>
          <button
            class="icon-knopf"
            aria-label="Nächster Treffer"
            disabled={lexikon.trefferGesamt === 0}
            onclick={() => lexikon.naechsterTreffer()}
          >
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </div>

      <div class="lex-inhalt">
        {#if thema !== null}
          {#key thema.key}
            <article bind:this={inhaltElement}>{@html thema.html}</article>
          {/key}
        {:else}
          <p class="hinweis-text">Kein Thema gewählt. Bitte oben eines auswählen.</p>
        {/if}
      </div>

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="lex-groesse" onpointerdown={groesseStart} aria-hidden="true"></div>
    {/if}
  </aside>
{/if}

<style>
  /* Der Griff ist eine App-Ergänzung zum Mockup: kleines Dreieck unten
     rechts, zieht Breite und Höhe; Werte werden im Zustand persistiert. */
  .lex-groesse {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--rand-2) 50%);
  }
</style>
