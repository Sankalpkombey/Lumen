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
    positions: Array<{ x: number; y: number; width: number; height: number }>
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

  // ─── Draw highlights and tag chips ───────────────────────────────────────
  const drawHighlights = useCallback(() => {
    if (!containerRef.current || !pagesReadyRef.current) return

    // Clear all layers first
    containerRef.current
      .querySelectorAll('.highlight-layer')
      .forEach(layer => {
        (layer as HTMLDivElement).innerHTML = ''
      })

    highlights.forEach(highlight => {
      const layer = containerRef.current?.querySelector(
        `.highlight-layer[data-page="${highlight.page_number}"]`
      ) as HTMLDivElement | null

      if (!layer) return

      const pos = highlight.position as any
      if (!pos || !pos.rects || !Array.isArray(pos.rects)) return

      const note = notes.find(n => n.highlight_id === highlight.id) 

      const tag = (note?.tags as any) ?? null

      // Draw one rect per line of selected text
      pos.rects.forEach((rect: {
        x: number
        y: number
        width: number
        height: number
      }) => {
        const el = document.createElement('div')

        if (highlight.style === 'highlight') {
          el.style.cssText = `
            position: absolute;
            left: ${rect.x}px;
            top: ${rect.y}px;
            width: ${rect.width}px;
            height: ${rect.height + 1}px;
            background: ${highlight.color};
            opacity: 0.38;
            border-radius: 2px;
            pointer-events: none;
          `
        } else {
          el.style.cssText = `
            position: absolute;
            left: ${rect.x}px;
            top: ${rect.y + rect.height - 1}px;
            width: ${rect.width}px;
            height: 2px;
            background: ${highlight.color};
            border-radius: 1px;
            pointer-events: none;
          `
        }

        layer.appendChild(el)
      })

      // Tag chip — anchored to end of last line
      if (tag && pos.tagAnchor) {
        const anchor = pos.tagAnchor
        const chip = document.createElement('span')
        chip.textContent = `#${tag.name}`
        chip.style.cssText = `
          position: absolute;
          left: ${anchor.x + 6}px;
          top: ${anchor.y + (anchor.height / 2) - 8}px;
          font-size: 9px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 20px;
          background: ${tag.color}22;
          color: ${tag.color};
          border: 0.5px solid ${tag.color}88;
          pointer-events: all;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1.6;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 10;
        `
        chip.addEventListener('click', (e) => {
          e.stopPropagation()
          onTagClick(highlight.id)
        })
        layer.appendChild(chip)
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

  // Get device pixel ratio — 2 on retina, 1 on standard
  const dpr = window.devicePixelRatio || 1

  // Render at higher scale then display at normal size
  const baseScale = scaleRef.current
  const renderScale = baseScale * dpr

  const viewport = page.getViewport({ scale: baseScale })
  const renderViewport = page.getViewport({ scale: renderScale })

  // Page wrapper — sized at CSS pixels (normal size)
  const pageWrapper = document.createElement('div')
  pageWrapper.className = 'pdf-page-wrapper'
  pageWrapper.dataset.page = String(pageNumber)
  pageWrapper.style.cssText = `
    position: relative;
    margin: 0 auto 16px;
    width: ${viewport.width}px;
    height: ${viewport.height}px;
    background: #faf9f7;
    border-radius: 4px;
    overflow: visible;
    box-shadow: 0 2px 16px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.15);
  `

  // Canvas — physically larger for sharpness
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Physical pixels — larger for high DPI
  canvas.width = renderViewport.width
  canvas.height = renderViewport.height

  // CSS size — displayed at normal size
  canvas.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: ${viewport.width}px;
    height: ${viewport.height}px;
  `

  // Highlight layer
  const highlightLayer = document.createElement('div')
  highlightLayer.className = 'highlight-layer'
  highlightLayer.dataset.page = String(pageNumber)
  highlightLayer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${viewport.width}px;
    height: ${viewport.height}px;
    pointer-events: none;
    overflow: visible;
  `

  // Text layer
  const textLayerDiv = document.createElement('div')
  textLayerDiv.className = 'textLayer'
  textLayerDiv.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${viewport.width}px;
    height: ${viewport.height}px;
    overflow: hidden;
    line-height: 1;
  `

  pageWrapper.appendChild(canvas)
  pageWrapper.appendChild(highlightLayer)
  pageWrapper.appendChild(textLayerDiv)
  containerRef.current.appendChild(pageWrapper)
  pagesRef.current.set(pageNumber, pageWrapper)

  // Render at high resolution
  await page.render({
    canvas,
    canvasContext: ctx,
    viewport: renderViewport,   // high res viewport
    intent: 'display',
  }).promise

  // Text layer uses normal viewport for correct positioning
  const textContent = await page.getTextContent()
  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerDiv,
    viewport,                   // normal viewport
  })
  await textLayer.render()

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
    drawHighlights()
  }

  renderAll()
}, [pdf, renderPage, drawHighlights, getOptimalScale])

  // ─── Redraw when highlights or notes update ───────────────────────────────
  useEffect(() => {
    if (pagesReadyRef.current) {
      drawHighlights()
    }
  }, [highlights, notes, drawHighlights])

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

  // ─── Text selection handler ───────────────────────────────────────────────
  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (text.length < 3) return

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Find which page this belongs to
      let node: Node | null = range.commonAncestorContainer
      let pageNumber = currentPage
      let pageEl: HTMLElement | null = null

      while (node) {
        const el = node as HTMLElement
        if (el.dataset?.page) {
          pageNumber = Number(el.dataset.page)
          pageEl = el
          break
        }
        node = node.parentNode
      }

      if (!pageEl) return

      const pageRect = pageEl.getBoundingClientRect()

      // Get per-line rects
      const clientRects = Array.from(range.getClientRects()).filter(
        r => r.width > 1 && r.height > 1
      )

      if (clientRects.length === 0) return

      const positions = clientRects.map(r => ({
        x: r.left - pageRect.left,
        y: r.top - pageRect.top,
        width: r.width,
        height: r.height,
      }))

      onTextSelect(text, pageNumber, rect, pageRect, positions)
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
      drawHighlights()
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