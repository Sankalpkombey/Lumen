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
    tagAnchor: { x: number; y: number; height: number },
    rangeInfo?: any
  ) => void
  onTagClick: (highlightId: string) => void
  docName: string
  totalPages: number
  leftCollapsed: boolean
  rightCollapsed: boolean
}

export default function PDFViewer({
  pdf,
  currentPage,
  highlights,
  notes,
  onPageChange,
  onTextSelect,
  onTagClick,
  docName,
  totalPages,
  leftCollapsed,
  rightCollapsed,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1.2)
  const renderingRef = useRef(false)
  const pagesReadyRef = useRef(false)
  const pagesRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const applyHighlightsRef = useRef<() => void>(() => {})
  const [displayScale, setDisplayScale] = useState(120)

  // ─── Overlay-based highlight rendering ──────────────────────────────────
  const applyHighlightsToTextLayer = useCallback(() => {
    if (!containerRef.current || !pagesReadyRef.current) return

    // Clear previous overlay highlights and tag chips
    containerRef.current.querySelectorAll('.highlight-rect').forEach(el => el.remove())
    containerRef.current.querySelectorAll('.highlight-tag-chip').forEach(el => el.remove())

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

      let range: Range | null = null
      const pos = highlight.position as any

      if (pos && typeof pos.startSpanIndex === 'number' && typeof pos.startOffset === 'number') {
        range = restoreRange(textLayer, pos.startSpanIndex, pos.startOffset, pos.endSpanIndex, pos.endOffset)
      }

      if (!range) {
        range = findRangeFromText(textLayer, highlight.text)
      }

      if (!range) return

      const note = notes.find(n => n.highlight_id === highlight.id)
      const tag = (note?.tags as any) ?? null
      const pageRect = pageWrapper.getBoundingClientRect()
      const rects = range.getClientRects()

      let lastRect: { left: number; top: number; width: number; height: number } | null = null

      Array.from(rects).forEach(spanRect => {
        if (spanRect.width === 0 || spanRect.height === 0) return

        const relLeft = spanRect.left - pageRect.left
        const relTop = spanRect.top - pageRect.top

        if (highlight.style === 'underline') {
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
          const rect = document.createElement('div')
          rect.className = 'highlight-rect'
          rect.style.cssText = `
            left: ${relLeft}px;
            top: ${relTop}px;
            width: ${spanRect.width}px;
            height: ${spanRect.height}px;
            background: ${highlight.color};
            opacity: 0.4;
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

  // Keep ref in sync so render effect can call latest version without depending on it
  applyHighlightsRef.current = applyHighlightsToTextLayer

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

  // Highlight layer — sits above text layer for visible highlights
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
    z-index: 3;
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

  // Order: canvas → text layer → highlight layer (highlight on top with pointer-events: none)
  pageWrapper.appendChild(canvas)
  pageWrapper.appendChild(textLayerDiv)
  pageWrapper.appendChild(highlightLayer)
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
    // Call via ref so this effect doesn't depend on highlights/notes
    applyHighlightsRef.current()
  }

  renderAll()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [pdf, renderPage, getOptimalScale])

  // ─── Redraw when highlights or notes update ───────────────────────────────
  useEffect(() => {
    if (pagesReadyRef.current) {
      // Use rAF to ensure text layer spans have been laid out before
      // reading their bounding rects for overlay positioning
      const id = requestAnimationFrame(() => {
        applyHighlightsToTextLayer()
      })
      return () => cancelAnimationFrame(id)
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
    let textLayer: HTMLElement | null = null
    while (node) {
      const el = node as HTMLElement
      if (el.classList?.contains('textLayer')) {
        textLayer = el
      }
      if (el.dataset?.page && el.classList?.contains('pdf-page-wrapper')) {
        pageNumber = Number(el.dataset.page)
        break
      }
      node = node.parentNode
    }

    if (!textLayer && range.commonAncestorContainer) {
      const ancestorEl = (range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer) as HTMLElement | null
      textLayer = ancestorEl?.closest('.textLayer') as HTMLElement | null
    }

    let rangeInfo: any = null
    if (textLayer) {
      const startInfo = getContainerInfo(range.startContainer, range.startOffset, textLayer)
      const endInfo = getContainerInfo(range.endContainer, range.endOffset, textLayer)
      if (startInfo && endInfo) {
        rangeInfo = {
          startSpanIndex: startInfo.spanIndex,
          startOffset: startInfo.offset,
          endSpanIndex: endInfo.spanIndex,
          endOffset: endInfo.offset
        }
      }
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
      { x: lastClientRect.right, y: lastClientRect.bottom, height: lastClientRect.height },
      rangeInfo
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
      applyHighlightsRef.current()
    }
    renderAll()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#141210]">

      {/* Top bar */}
      <div className="h-10 bg-[#1c1a18] border-b border-white/7 flex items-center justify-between px-4 flex-shrink-0">
        <span className={`text-xs text-[#5a5855] truncate max-w-xs font-medium transition-all duration-200 ${leftCollapsed ? 'pl-10' : ''}`}>
          {docName.replace('.pdf', '')}
        </span>
        <span className={`text-xs text-[#3a3835] transition-all duration-200 ${rightCollapsed ? 'pr-10' : ''}`}>
          p.{currentPage} / {totalPages}
        </span>
      </div>

      {/* Zoom controls — sticky bar */}
      <div className="flex items-center justify-center gap-2 py-2 flex-shrink-0 border-b border-white/5">
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

      {/* Scrollable pages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div ref={containerRef} className="flex flex-col items-center" />
      </div>
    </div>
  )
}

function getContainerInfo(container: Node, offset: number, textLayerDiv: HTMLElement) {
  const spans = Array.from(textLayerDiv.querySelectorAll('span:not(.endOfContent)'));
  
  let targetSpan: HTMLElement | null = null;
  
  if (container === textLayerDiv) {
    const child = textLayerDiv.childNodes[offset];
    if (child) {
      targetSpan = (child.nodeType === Node.ELEMENT_NODE ? child : child.parentElement) as HTMLElement | null;
    }
  } else if (container.nodeType === Node.TEXT_NODE) {
    targetSpan = container.parentElement as HTMLElement | null;
  } else if (container.nodeType === Node.ELEMENT_NODE) {
    targetSpan = container as HTMLElement;
  }
  
  if (!targetSpan) return null;
  
  while (targetSpan && targetSpan.parentElement !== textLayerDiv) {
    targetSpan = targetSpan.parentElement as HTMLElement | null;
  }
  
  if (!targetSpan) return null;
  
  const spanIndex = spans.indexOf(targetSpan);
  if (spanIndex === -1) return null;
  
  let calculatedOffset = 0;
  if (container.nodeType === Node.TEXT_NODE) {
    const walk = document.createTreeWalker(targetSpan, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null;
    while ((currentNode = walk.nextNode())) {
      if (currentNode === container) {
        calculatedOffset += offset;
        break;
      }
      calculatedOffset += currentNode.textContent?.length ?? 0;
    }
  } else {
    calculatedOffset = offset;
  }
  
  return {
    spanIndex,
    offset: calculatedOffset
  };
}

function restoreRange(
  textLayerDiv: HTMLElement,
  startSpanIndex: number,
  startOffset: number,
  endSpanIndex: number,
  endOffset: number
): Range | null {
  const spans = Array.from(textLayerDiv.querySelectorAll('span:not(.endOfContent)'));
  const startSpan = spans[startSpanIndex] as HTMLElement | null;
  const endSpan = spans[endSpanIndex] as HTMLElement | null;
  
  if (!startSpan || !endSpan) return null;
  
  const range = document.createRange();
  
  function findTextNodeAndOffset(span: HTMLElement, targetOffset: number) {
    const walk = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null;
    let currentLength = 0;
    
    while ((currentNode = walk.nextNode())) {
      const nodeLength = currentNode.textContent?.length ?? 0;
      if (currentLength + nodeLength >= targetOffset) {
        return {
          node: currentNode,
          offset: targetOffset - currentLength
        };
      }
      currentLength += nodeLength;
    }
    
    return {
      node: span.lastChild || span,
      offset: span.lastChild ? Math.min(targetOffset - currentLength, span.lastChild.textContent?.length ?? 0) : 0
    };
  }
  
  const start = findTextNodeAndOffset(startSpan, startOffset);
  const end = findTextNodeAndOffset(endSpan, endOffset);
  
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch (e) {
    console.error("Error restoring range:", e);
    return null;
  }
}

function findRangeFromText(textLayerDiv: HTMLElement, textToFind: string): Range | null {
  const spans = Array.from(textLayerDiv.querySelectorAll('span:not(.endOfContent)'));
  let fullText = '';
  const charToSpan: { span: HTMLElement; indexInSpan: number }[] = [];
  
  for (const span of spans) {
    const txt = span.textContent ?? '';
    for (let i = 0; i < txt.length; i++) {
      charToSpan.push({ span: span as HTMLElement, indexInSpan: i });
    }
    fullText += txt;
  }
  
  const matchIndex = fullText.indexOf(textToFind);
  if (matchIndex === -1) {
    const normalizedFind = textToFind.replace(/\s/g, '');
    let strippedFull = '';
    const origIndex: number[] = [];
    for (let i = 0; i < fullText.length; i++) {
      if (!/\s/.test(fullText[i])) {
        origIndex.push(i);
        strippedFull += fullText[i];
      }
    }
    const strippedIdx = strippedFull.indexOf(normalizedFind);
    if (strippedIdx !== -1 && strippedIdx + normalizedFind.length - 1 < origIndex.length) {
      const startCharIdx = origIndex[strippedIdx];
      const endCharIdx = origIndex[strippedIdx + normalizedFind.length - 1] + 1;
      return createRangeFromCharIndices(startCharIdx, endCharIdx, charToSpan);
    }
    return null;
  }
  
  return createRangeFromCharIndices(matchIndex, matchIndex + textToFind.length, charToSpan);
}

function createRangeFromCharIndices(
  startIdx: number,
  endIdx: number,
  charToSpan: { span: HTMLElement; indexInSpan: number }[]
): Range | null {
  if (startIdx < 0 || endIdx > charToSpan.length) return null;
  
  const startInfo = charToSpan[startIdx];
  const endInfo = charToSpan[endIdx - 1];
  
  if (!startInfo || !endInfo) return null;
  
  const range = document.createRange();
  
  function findTextNodeAndOffset(span: HTMLElement, targetOffset: number) {
    const walk = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    let currentNode: Node | null;
    let currentLength = 0;
    while ((currentNode = walk.nextNode())) {
      const len = currentNode.textContent?.length ?? 0;
      if (currentLength + len >= targetOffset) {
        return { node: currentNode, offset: targetOffset - currentLength };
      }
      currentLength += len;
    }
    return { node: span.lastChild || span, offset: targetOffset - currentLength };
  }
  
  const start = findTextNodeAndOffset(startInfo.span, startInfo.indexInSpan);
  const end = findTextNodeAndOffset(endInfo.span, endInfo.indexInSpan + 1);
  
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    return range;
  } catch (e) {
    console.error("Error creating range from indices:", e);
    return null;
  }
}