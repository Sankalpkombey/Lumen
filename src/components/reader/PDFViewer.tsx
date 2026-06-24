import { useState, useEffect, useRef, useCallback } from 'react'
import { TextLayer } from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Highlight, Note } from '../../lib/supabase'

interface Props {
  pdf: PDFDocumentProxy
  currentPage: number
  highlights: Highlight[]
  notes: Note[]
  onPageChange: (page: number) => void
  onTextSelect: (
    text: string,
    pageNumber: number,
    rect: DOMRect,
    pageRect: DOMRect,
    positions: Array<{ x: number; y: number; width: number; height: number }>,
    tagAnchor: { x: number; y: number; height: number }
  ) => void
  onTagClick: (highlightId: string) => void
}

export default function PDFViewer({
  pdf,
  currentPage,
  highlights,
  notes,
  onPageChange,
  onTextSelect,
  onTagClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1.2)
  const renderingRef = useRef(false)
  const pagesReadyRef = useRef(false)
  const pagesRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const [displayScale, setDisplayScale] = useState(120)

  // ─── Overlay-based highlight rendering ──────────────────────────────────
  const applyHighlightsToTextLayer = useCallback(() => {
    if (!containerRef.current || !pagesReadyRef.current) return

    // Clear previous overlay highlights and tag chips
    containerRef.current.querySelectorAll('.highlight-rect').forEach(el => el.remove())
    containerRef.current.querySelectorAll('.highlight-tag-chip').forEach(el => el.remove())

    // Also unwrap any old <mark> wrappers from previous implementation
    containerRef.current.querySelectorAll('.lumen-highlight').forEach(el => {
      const parent = el.parentNode
      if (!parent) return
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      parent.removeChild(el)
    })
    containerRef.current.querySelectorAll('.lumen-tag-chip').forEach(el => el.remove())

    highlights.forEach(highlight => {
      const pageWrapper = containerRef.current?.querySelector(
        `.pdf-page-wrapper[data-page="${highlight.page_number}"]`
      ) as HTMLDivElement | null

      const textLayer = containerRef.current?.querySelector(
        `.textLayer[data-page="${highlight.page_number}"]`
      ) as HTMLDivElement | null

      const highlightLayer = containerRef.current?.querySelector(
        `.highlight-layer[data-page="${highlight.page_number}"]`
      ) as HTMLDivElement | null

      if (!pageWrapper || !textLayer || !highlightLayer) return

      const highlightText = highlight.text.trim()
      if (!highlightText) return

      // Get all text spans in this page
      const spans = Array.from(
        textLayer.querySelectorAll('span[role="presentation"], span')
      ).filter(s => s.textContent && s.textContent.trim().length > 0)

      // Build a map of cumulative character positions
      let cumulative = 0
      const spanMap: Array<{
        span: Element
        start: number
        end: number
        text: string
      }> = []

      spans.forEach(span => {
        const text = span.textContent ?? ''
        spanMap.push({
          span,
          start: cumulative,
          end: cumulative + text.length,
          text,
        })
        cumulative += text.length
      })

      const fullText = spanMap.map(s => s.text).join('')

      // Find the highlight text — try exact match first
      let matchStart = fullText.indexOf(highlightText)

      // If not found, try normalizing whitespace
      if (matchStart === -1) {
        const normalizedFull = fullText.replace(/\s+/g, ' ')
        const normalizedHighlight = highlightText.replace(/\s+/g, ' ')
        matchStart = normalizedFull.indexOf(normalizedHighlight)
      }

      if (matchStart === -1) return

      const matchEnd = matchStart + highlightText.length

      // Find only the spans that fall within matchStart to matchEnd
      const spansToMark = spanMap.filter(s =>
        s.end > matchStart && s.start < matchEnd
      )

      if (spansToMark.length === 0) return

      const note = notes.find(n => n.highlight_id === highlight.id)
      const tag = (note?.tags as any) ?? null

      // Get the page wrapper's bounding rect for coordinate conversion
      const pageRect = pageWrapper.getBoundingClientRect()

      // Create overlay rectangles for each matching span
      let lastRect: { left: number; top: number; width: number; height: number } | null = null

      spansToMark.forEach(({ span }) => {
        const spanRect = span.getBoundingClientRect()

        // Convert to page-relative coordinates
        const relLeft = spanRect.left - pageRect.left
        const relTop = spanRect.top - pageRect.top

        if (highlight.style === 'underline') {
          // For underline: thin line at the bottom of the span
          const underline = document.createElement('div')
          underline.className = 'highlight-rect highlight-rect--underline'
          underline.style.cssText = `
            left: ${relLeft}px;
            top: ${relTop + spanRect.height - 2}px;
            width: ${spanRect.width}px;
            height: 2.5px;
            background: ${highlight.color};
            opacity: 0.8;
          `
          highlightLayer.appendChild(underline)
        } else {
          // For highlight: colored rectangle behind the text
          const rect = document.createElement('div')
          rect.className = 'highlight-rect'
          rect.style.cssText = `
            left: ${relLeft}px;
            top: ${relTop}px;
            width: ${spanRect.width}px;
            height: ${spanRect.height}px;
            background: ${highlight.color};
            opacity: 0.35;
          `
          highlightLayer.appendChild(rect)
        }

        lastRect = {
          left: relLeft,
          top: relTop,
          width: spanRect.width,
          height: spanRect.height,
        }
      })

      // Tag chip after the last span
      if (tag && lastRect) {
        const lr = lastRect as { left: number; top: number; width: number; height: number }
        const chip = document.createElement('span')
        chip.className = 'highlight-tag-chip'
        chip.textContent = `#${tag.name}`
        chip.style.cssText = `
          left: ${lr.left + lr.width + 6}px;
          top: ${lr.top + (lr.height / 2) - 8}px;
          background: ${tag.color}22;
          color: ${tag.color};
          border: 0.5px solid ${tag.color}66;
        `
        chip.addEventListener('click', (e) => {
          e.stopPropagation()
          onTagClick(highlight.id)
        })
        highlightLayer.appendChild(chip)
      }
    })
  }, [highlights, notes, onTagClick])

  // Calculate best scale for the container width
  const getOptimalScale = useCallback(() => {
  const container = containerRef.current
  if (!container) return 1.5
  const containerWidth = container.clientWidth - 80  // padding
  const standardPageWidth = 612  // standard PDF width in points
  const calculated = containerWidth / standardPageWidth
  // Clamp between 1.2 and 2.0
  return Math.min(2.0, Math.max(1.2, calculated))
}, [])

  // ─── Render a single page ─────────────────────────────────────────────────
  const renderPage = useCallback(async (pageNumber: number) => {
  if (!pdf || !containerRef.current) return

  const page = await pdf.getPage(pageNumber)
  const dpr = window.devicePixelRatio || 1
  const baseScale = scaleRef.current

  // Two viewports — one for layout, one for rendering
  const cssViewport = page.getViewport({ scale: baseScale })
  const renderViewport = page.getViewport({ scale: baseScale * dpr })

  // Page wrapper — CSS size
  const pageWrapper = document.createElement('div')
  pageWrapper.className = 'pdf-page-wrapper'
  pageWrapper.dataset.page = String(pageNumber)
  pageWrapper.style.cssText = `
    position: relative;
    margin: 0 auto 20px;
    width: ${cssViewport.width}px;
    height: ${cssViewport.height}px;
    background: #ffffff;
    border-radius: 2px;
    overflow: visible;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.18);
  `

  // Canvas — physical pixel size
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })!

  canvas.width = Math.floor(renderViewport.width)
  canvas.height = Math.floor(renderViewport.height)

  // Force canvas to display at CSS size
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: ${cssViewport.width}px;
    height: ${cssViewport.height}px;
    display: block;
  `

  // Fill white before render — prevents grey flash
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Highlight layer — sits between canvas and text layer
  const highlightLayer = document.createElement('div')
  highlightLayer.className = 'highlight-layer'
  highlightLayer.dataset.page = String(pageNumber)
  highlightLayer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${cssViewport.width}px;
    height: ${cssViewport.height}px;
    pointer-events: none;
    overflow: visible;
  `

  // Text layer — on top for selection
  const textLayerDiv = document.createElement('div')
  textLayerDiv.className = 'textLayer'
  textLayerDiv.dataset.page = String(pageNumber)
  textLayerDiv.tabIndex = 0

  // Set CSS custom properties required by PDF.js TextLayer CSS
  // --total-scale-factor = viewport.scale (mirrors the viewer's --scale-factor * --user-unit)
  textLayerDiv.style.setProperty('--total-scale-factor', String(cssViewport.scale))
  textLayerDiv.style.setProperty('--scale-round-x', '1px')
  textLayerDiv.style.setProperty('--scale-round-y', '1px')

  // Order: canvas → highlight layer → text layer
  pageWrapper.appendChild(canvas)
  pageWrapper.appendChild(highlightLayer)
  pageWrapper.appendChild(textLayerDiv)
  containerRef.current.appendChild(pageWrapper)
  pagesRef.current.set(pageNumber, pageWrapper)

  // Render at full DPI
  await page.render({
    canvas: canvas,
    canvasContext: ctx,
    viewport: renderViewport,
    intent: 'display',
    annotationMode: 0,
  }).promise

  // Text layer at CSS viewport for correct selection positions
  const textContent = await page.getTextContent({
    includeMarkedContent: true,
  })

  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport: cssViewport,
  })
  await textLayer.render()

  // ── endOfContent div — enables full-line text selection (same as PDF.js viewer) ──
  const endOfContent = document.createElement('div')
  endOfContent.className = 'endOfContent'
  textLayerDiv.appendChild(endOfContent)

  // Bind mouse: add "selecting" class on mousedown so endOfContent stretches
  textLayerDiv.addEventListener('mousedown', () => {
    textLayerDiv.classList.add('selecting')
  })

}, [pdf])

  // ─── Render all pages ─────────────────────────────────────────────────────
  useEffect(() => {
  if (!pdf || !containerRef.current || renderingRef.current) return

  // Set optimal scale on first render
  if (scaleRef.current === 1.2) {
    scaleRef.current = getOptimalScale()
  }

  renderingRef.current = true
  pagesReadyRef.current = false
  containerRef.current.innerHTML = ''
  pagesRef.current.clear()

  async function renderAll() {
    for (let i = 1; i <= pdf.numPages; i++) {
      await renderPage(i)
    }
    renderingRef.current = false
    pagesReadyRef.current = true
    applyHighlightsToTextLayer()
  }

  renderAll()
}, [pdf, renderPage, applyHighlightsToTextLayer, getOptimalScale])

  // ─── Redraw when highlights or notes update ───────────────────────────────
  useEffect(() => {
    if (pagesReadyRef.current) {
      applyHighlightsToTextLayer()
    }
  }, [highlights, notes, applyHighlightsToTextLayer])

  // ─── Intersection observer — track current page ───────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const page = Number(
              (entry.target as HTMLElement).dataset.page
            )
            if (page) onPageChange(page)
          }
        })
      },
      { threshold: 0.4 }
    )

    const pages = container.querySelectorAll('.pdf-page-wrapper')
    pages.forEach(p => observer.observe(p))
    return () => observer.disconnect()
  }, [pdf, onPageChange])

  // ─── PDF.js endOfContent selection management ────────────────────────────
  // Mirrors TextLayerBuilder.#enableGlobalSelectionListener from pdf_viewer.mjs
  useEffect(() => {
    function resetEndOfContent(textLayerDiv: HTMLElement) {
      const end = textLayerDiv.querySelector('.endOfContent') as HTMLElement
      if (!end) return
      textLayerDiv.appendChild(end) // move back to end
      end.style.width = ''
      end.style.height = ''
      textLayerDiv.classList.remove('selecting')
    }

    function handlePointerUp() {
      containerRef.current
        ?.querySelectorAll('.textLayer')
        .forEach(tl => resetEndOfContent(tl as HTMLElement))
    }

    let prevRange: Range | null = null

    function handleSelectionChange() {
      const selection = document.getSelection()
      if (!selection || selection.rangeCount === 0) {
        containerRef.current
          ?.querySelectorAll('.textLayer')
          .forEach(tl => resetEndOfContent(tl as HTMLElement))
        return
      }

      // Add selecting class to text layers that intersect the selection
      const textLayers = containerRef.current?.querySelectorAll('.textLayer')
      if (!textLayers) return

      textLayers.forEach(tl => {
        const range = selection.getRangeAt(0)
        if (range.intersectsNode(tl)) {
          tl.classList.add('selecting')
        } else {
          resetEndOfContent(tl as HTMLElement)
        }
      })

      // Position the endOfContent div to enable continuous selection
      const range = selection.getRangeAt(0)
      let modifyStart = false
      try {
        modifyStart = !!(prevRange && (
          range.compareBoundaryPoints(Range.END_TO_END, prevRange) === 0 ||
          range.compareBoundaryPoints(Range.START_TO_END, prevRange) === 0
        ))
      } catch {
        // prevRange may reference detached nodes after endOfContent was moved
        modifyStart = false
      }

      let anchor: Node | null = modifyStart
        ? range.startContainer
        : range.endContainer

      if (anchor?.nodeType === Node.TEXT_NODE) {
        anchor = anchor.parentNode
      }

      // Walk up past highlight/markedContent wrappers
      const anchorEl = anchor as HTMLElement
      if (anchorEl?.classList?.contains('highlight') || anchorEl?.classList?.contains('markedContent')) {
        anchor = anchorEl.parentNode
      }

      // If endOffset is 0 and not modifying start, go to previous sibling
      if (!modifyStart && range.endOffset === 0) {
        let current = anchor as HTMLElement
        while (current && !current.previousSibling) {
          current = current.parentNode as HTMLElement
        }
        if (current?.previousSibling) {
          current = current.previousSibling as HTMLElement
          while (current.childNodes?.length) {
            current = current.childNodes[current.childNodes.length - 1] as HTMLElement
          }
          anchor = current
        }
      }

      const parentTextLayer = (anchor as HTMLElement)?.parentElement?.closest('.textLayer') as HTMLElement
      if (!parentTextLayer) {
        prevRange = range.cloneRange()
        return
      }

      const endDiv = parentTextLayer.querySelector('.endOfContent') as HTMLElement
      if (endDiv) {
        endDiv.style.width = parentTextLayer.style.width || `${parentTextLayer.offsetWidth}px`
        endDiv.style.height = parentTextLayer.style.height || `${parentTextLayer.offsetHeight}px`
        ;(endDiv.style as any).userSelect = 'text'

        const anchorParent = (anchor as HTMLElement)?.parentElement
        if (anchorParent) {
          anchorParent.insertBefore(endDiv, modifyStart ? anchor as Node : (anchor as Node).nextSibling)
        }
      }

      prevRange = range.cloneRange()
    }

    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('selectionchange', handleSelectionChange)
    window.addEventListener('blur', handlePointerUp)

    return () => {
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('blur', handlePointerUp)
    }
  }, [])

  // ─── Text selection handler (mouseup) ─────────────────────────────────────
  useEffect(() => {
  function handleMouseUp() {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const text = selection.toString().trim()
    if (text.length < 3) return

    const range = selection.getRangeAt(0)

    // Find page
    let node: Node | null = range.commonAncestorContainer
    let pageNumber = currentPage
    while (node) {
      const el = node as HTMLElement
      if (el.dataset?.page && el.classList?.contains('pdf-page-wrapper')) {
        pageNumber = Number(el.dataset.page)
        break
      }
      if (el.classList?.contains('textLayer')) {
        const pw = el.closest('.pdf-page-wrapper') as HTMLElement
        if (pw?.dataset?.page) {
          pageNumber = Number(pw.dataset.page)
          break
        }
      }
      node = node.parentNode
    }

    // Anchor at end of selection for picker positioning
    const clientRects = range.getClientRects()
    const lastClientRect = clientRects.length > 0
      ? clientRects[clientRects.length - 1]
      : range.getBoundingClientRect()

    const boundingRect = range.getBoundingClientRect()

    onTextSelect(
      text,
      pageNumber,
      boundingRect,
      new DOMRect(),
      [],
      { x: lastClientRect.right, y: lastClientRect.bottom, height: lastClientRect.height }
    )
  }

  document.addEventListener('mouseup', handleMouseUp)
  return () => document.removeEventListener('mouseup', handleMouseUp)
}, [currentPage, onTextSelect])

  // ─── Scroll to page (called from notes panel) ─────────────────────────────
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageEl = pagesRef.current.get(pageNumber)
    pageEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).__scrollToPage = scrollToPage
    }
  }, [scrollToPage])

  function rerender() {
    if (renderingRef.current) return
    setDisplayScale(Math.round(scaleRef.current * 100))
    renderingRef.current = false
    pagesReadyRef.current = false
    if (containerRef.current) containerRef.current.innerHTML = ''
    pagesRef.current.clear()

    async function renderAll() {
      renderingRef.current = true
      for (let i = 1; i <= pdf.numPages; i++) {
        await renderPage(i)
      }
      renderingRef.current = false
      pagesReadyRef.current = true
      applyHighlightsToTextLayer()
    }
    renderAll()
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#141210] px-6 py-6">

      {/* Zoom controls — buttons go here */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => {
            scaleRef.current = Math.max(0.5, scaleRef.current - 0.15)
            rerender()
          }}
          className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors"
        >
          -
        </button>
        <span className="text-xs text-[#5a5855] w-12 text-center">
          {displayScale}%
        </span>
        <button
          onClick={() => {
            scaleRef.current = Math.min(3, scaleRef.current + 0.15)
            rerender()
          }}
          className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>

      {/* Pages render here */}
      <div ref={containerRef} className="flex flex-col items-center" />
    </div>
  )
}