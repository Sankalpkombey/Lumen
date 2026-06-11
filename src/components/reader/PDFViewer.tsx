import { useEffect, useRef, useState, useCallback } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  pdf: PDFDocumentProxy
  currentPage: number
  onPageChange: (page: number) => void
  onTextSelect: (text: string, pageNumber: number, rect: DOMRect) => void
}

export default function PDFViewer({
  pdf,
  currentPage,
  onPageChange,
  onTextSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1.2)
  const renderingRef = useRef(false)

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdf || !containerRef.current) return

    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale })

    // Create page wrapper
    const pageWrapper = document.createElement('div')
    pageWrapper.className = 'pdf-page-wrapper'
    pageWrapper.dataset.page = String(pageNumber)
    pageWrapper.style.cssText = `
      position: relative;
      margin: 0 auto 16px;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      background: #f5f2eb;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 8px rgba(0,0,0,0.3);
    `

    // Canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
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
      opacity: 1;
      line-height: 1;
    `

    pageWrapper.appendChild(canvas)
    pageWrapper.appendChild(textLayerDiv)
    containerRef.current.appendChild(pageWrapper)

    // Render canvas
    await page.render({ canvas, canvasContext: ctx, viewport }).promise

    // Render text layer
    const textContent = await page.getTextContent()
    const { TextLayer } = await import('pdfjs-dist')
    const textLayer = new TextLayer({
      textContentSource: textContent,
      container: textLayerDiv,
      viewport,
    })
    await textLayer.render()

  }, [pdf, scale])

  useEffect(() => {
    if (!pdf || !containerRef.current || renderingRef.current) return

    renderingRef.current = true
    containerRef.current.innerHTML = ''

    async function renderAll() {
      for (let i = 1; i <= pdf.numPages; i++) {
        await renderPage(i)
      }
      renderingRef.current = false
    }

    renderAll()
  }, [pdf, scale, renderPage])

  // Track which page is visible
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const page = Number((entry.target as HTMLElement).dataset.page)
            if (page) onPageChange(page)
          }
        })
      },
      { threshold: 0.5 }
    )

    const pages = container.querySelectorAll('.pdf-page-wrapper')
    pages.forEach(p => observer.observe(p))

    return () => observer.disconnect()
  }, [pdf, onPageChange])

  // Handle text selection
  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) return

      const text = selection.toString().trim()
      if (text.length < 2) return

      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      // Find which page this selection is on
      let node: Node | null = range.commonAncestorContainer
      let pageNumber = currentPage

      while (node) {
        const el = node as HTMLElement
        if (el.dataset?.page) {
          pageNumber = Number(el.dataset.page)
          break
        }
        node = node.parentNode
      }

      onTextSelect(text, pageNumber, rect)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [currentPage, onTextSelect])

  return (
    <div className="flex-1 overflow-y-auto bg-[#141210] px-6 py-6">
      {/* Zoom controls */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
          className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors"
        >
          −
        </button>
        <span className="text-xs text-[#5a5855] w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(3, s + 0.1))}
          className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors"
        >
          +
        </button>
      </div>

      {/* Pages */}
      <div ref={containerRef} className="flex flex-col items-center" />
    </div>
  )
}