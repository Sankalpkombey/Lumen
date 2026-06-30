import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface ZoomControlProps {
  scale: number
  zoomMode: 'auto' | 'pageWidth' | 'pageFit' | 'fixed'
  zoomIn: () => void
  zoomOut: () => void
  setFixedZoom: (scale: number) => void
  setAutoZoom: () => void
  setPageWidth: () => void
  setPageFit: () => void
}

interface ZoomOption {
  value: string
  label: string
  isDivider?: boolean
}

const presetOptions: ZoomOption[] = [
  { value: 'auto', label: 'Automatic Zoom' },
  { value: 'actual', label: 'Actual Size' },
  { value: 'pageFit', label: 'Page Fit' },
  { value: 'pageWidth', label: 'Page Width' },
  { value: 'divider', label: '', isDivider: true },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1.0', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
  { value: '2.0', label: '200%' },
  { value: '3.0', label: '300%' },
  { value: '4.0', label: '400%' },
]

function getZoomLabel(mode: 'auto' | 'pageWidth' | 'pageFit' | 'fixed', scale: number) {
  if (mode === 'auto') return 'Automatic Zoom'
  if (mode === 'pageWidth') return 'Page Width'
  if (mode === 'pageFit') return 'Page Fit'
  return `${Math.round(scale * 100)}%`
}

export function ZoomControl({
  scale,
  zoomMode,
  zoomIn,
  zoomOut,
  setFixedZoom,
  setAutoZoom,
  setPageWidth,
  setPageFit,
}: ZoomControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Compute activeValue for selection matching
  let activeValue = ''
  if (zoomMode === 'auto') {
    activeValue = 'auto'
  } else if (zoomMode === 'pageWidth') {
    activeValue = 'pageWidth'
  } else if (zoomMode === 'pageFit') {
    activeValue = 'pageFit'
  } else {
    const rounded = Math.round(scale * 100) / 100
    activeValue = String(rounded)
  }

  const presetsValues = ['auto', 'actual', 'pageFit', 'pageWidth', '0.5', '0.75', '1.0', '1.25', '1.5', '2.0', '3.0', '4.0']
  const isPreset = presetsValues.includes(activeValue) || (activeValue === '1' && presetsValues.includes('1.0'))

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const dropdownOptions = [...presetOptions]
  if (!isPreset && zoomMode === 'fixed') {
    dropdownOptions.splice(5, 0, {
      value: activeValue,
      label: `${Math.round(scale * 100)}%`
    })
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0 z-[100] relative">
      <button
        onClick={zoomOut}
        title="Zoom Out"
        className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors cursor-pointer select-none"
      >
        -
      </button>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#1c1a18] border border-white/8 text-[#f0ede8] rounded-lg px-3 h-7 outline-none text-xs cursor-pointer hover:bg-white/5 transition-all text-center min-w-32 flex items-center justify-between gap-1 select-none"
        >
          <span className="flex-1 text-center">{getZoomLabel(zoomMode, scale)}</span>
          <svg
            className={`w-3 h-3 text-[#a09d98] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 mt-1 min-w-40 max-h-60 overflow-y-auto rounded-lg bg-[#1c1a18] py-1 shadow-lg z-[100] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent flex flex-col"
            style={{
              border: '0.5px solid rgba(255,255,255,0.08)'
            }}
          >
            {dropdownOptions.map((opt, idx) => {
              if (opt.isDivider) {
                return (
                  <div
                    key={`divider-${idx}`}
                    className="h-[1px] bg-white/5 my-1"
                  />
                )
              }

              const isSelected =
                (opt.value === 'auto' && zoomMode === 'auto') ||
                (opt.value === 'pageWidth' && zoomMode === 'pageWidth') ||
                (opt.value === 'pageFit' && zoomMode === 'pageFit') ||
                (opt.value === 'actual' && zoomMode === 'fixed' && Math.abs(scale - 1.0) < 0.01) ||
                (zoomMode === 'fixed' && parseFloat(opt.value) === scale)

              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'auto') {
                      setAutoZoom()
                    } else if (opt.value === 'pageWidth') {
                      setPageWidth()
                    } else if (opt.value === 'pageFit') {
                      setPageFit()
                    } else if (opt.value === 'actual') {
                      setFixedZoom(1.0)
                    } else {
                      const val = parseFloat(opt.value)
                      if (!isNaN(val)) {
                        setFixedZoom(val)
                      }
                    }
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer select-none"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(83,74,183,0.15)'
                      : 'transparent',
                    color: isSelected
                      ? '#AFA9EC'
                      : '#a09d98',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = '#f0ede8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#a09d98'
                    }
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-[#AFA9EC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button
        onClick={zoomIn}
        title="Zoom In"
        className="w-7 h-7 rounded-lg bg-[#1c1a18] border border-white/8 text-[#a09d98] hover:text-[#f0ede8] text-lg flex items-center justify-center transition-colors cursor-pointer select-none"
      >
        +
      </button>
    </div>
  )
}

export function useZoom({
  pdf,
  nativePageSize,
  pagesRef,
  rerender,
}: {
  pdf: PDFDocumentProxy | null
  nativePageSize: { width: number; height: number } | null
  pagesRef: React.RefObject<Map<number, HTMLDivElement>>
  rerender: () => void
}) {
  const { docId } = useParams<{ docId: string }>()

  // Element references for container size and transform
  const outerContainerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Core Zoom States
  const [zoomMode, setZoomMode] = useState<'auto' | 'pageWidth' | 'pageFit' | 'fixed'>(() => {
    const saved = localStorage.getItem(`lumen-zoom-mode-${docId}`)
    return (saved as any) || 'auto'
  })

  const [fixedScale, setFixedScale] = useState<number>(() => {
    const saved = localStorage.getItem(`lumen-zoom-scale-${docId}`)
    return saved ? parseFloat(saved) : 1.0
  })

  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const [renderedScale, setRenderedScale] = useState<number>(0)

  // Zoom anchors for restoring scroll position
  const zoomAnchorRef = useRef<{
    pageNumber: number
    documentY: number
    viewY: number
    scrollTopBefore: number
    clientHeightBefore: number
    anchorPageHeightBefore: number
    cumulativeHeightAboveBefore: number
    scaleAtCapture: number
    captureTimestamp: number
  } | null>(null)

  // Ref to notify the scroll-restore step when async rendering completes
  const renderCompleteCallbackRef = useRef<(() => void) | null>(null)

  const rerenderRef = useRef(rerender)
  useEffect(() => {
    rerenderRef.current = rerender
  }, [rerender])

  // Save states to local storage
  useEffect(() => {
    if (docId) {
      localStorage.setItem(`lumen-zoom-mode-${docId}`, zoomMode)
      localStorage.setItem(`lumen-zoom-scale-${docId}`, String(fixedScale))
    }
  }, [zoomMode, fixedScale, docId])

  // Restore saved scale/mode per document when pdf changes
  useEffect(() => {
    if (docId) {
      const savedMode = localStorage.getItem(`lumen-zoom-mode-${docId}`)
      const savedScale = localStorage.getItem(`lumen-zoom-scale-${docId}`)
      if (savedMode) {
        setZoomMode(savedMode as any)
      } else {
        setZoomMode('auto')
      }
      if (savedScale) {
        setFixedScale(parseFloat(savedScale))
      }
    }
  }, [pdf, docId])

  // Derived target scale
  let scale = fixedScale
  if (nativePageSize && containerSize) {
    if (zoomMode === 'pageWidth') {
      const availableWidth = containerSize.width - 96 // horizontal padding/margins
      scale = Math.max(0.5, availableWidth / nativePageSize.width)
    } else if (zoomMode === 'pageFit') {
      const availableWidth = containerSize.width - 96
      const availableHeight = containerSize.height - 48
      const scaleW = availableWidth / nativePageSize.width
      const scaleH = availableHeight / nativePageSize.height
      scale = Math.max(0.5, Math.min(scaleW, scaleH))
    } else if (zoomMode === 'auto') {
      // Automatic Zoom: fit to width but clamp max scale to 1.5
      const availableWidth = containerSize.width - 96
      const calculated = availableWidth / nativePageSize.width
      scale = Math.min(1.5, Math.max(0.5, calculated))
    }
  }

  // Helper to capture active screen anchor at a specific viewport offset (e.g. mouse position)
  const captureAnchorAtViewportPoint = useCallback((_viewX: number, viewY: number) => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const anchorY = scrollContainer.scrollTop + viewY
    const captureTimestamp = performance.now()

    const pageElements = scrollContainer.querySelectorAll('.pdf-page-wrapper')
    if (pageElements.length > 0) {
      let closestPageNum = 1
      let closestPageEl: HTMLElement | null = null
      let minDistance = Infinity
      let found = false

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i] as HTMLElement
        const pageNum = Number(el.dataset.page)
        const pageRect = el.getBoundingClientRect()
        const top = pageRect.top - containerRect.top + scrollContainer.scrollTop
        const bottom = top + pageRect.height

        if (anchorY >= top && anchorY <= bottom) {
          const documentY = (anchorY - top) / (renderedScale || 1.0)
          const cumulativeHeightAbove = top

          zoomAnchorRef.current = {
            pageNumber: pageNum,
            documentY,
            viewY,
            scrollTopBefore: scrollContainer.scrollTop,
            clientHeightBefore: scrollContainer.clientHeight,
            anchorPageHeightBefore: pageRect.height,
            cumulativeHeightAboveBefore: cumulativeHeightAbove,
            scaleAtCapture: renderedScale || 1.0,
            captureTimestamp,
          }
          found = true
          break
        }

        const center = top + pageRect.height / 2
        const dist = Math.abs(anchorY - center)
        if (dist < minDistance) {
          minDistance = dist
          closestPageNum = pageNum
          closestPageEl = el
        }
      }

      if (!found && closestPageEl) {
        const pageRect = closestPageEl.getBoundingClientRect()
        const top = pageRect.top - containerRect.top + scrollContainer.scrollTop
        const documentY = Math.max(0, Math.min(pageRect.height, anchorY - top)) / (renderedScale || 1.0)
        const cumulativeHeightAbove = top

        zoomAnchorRef.current = {
          pageNumber: closestPageNum,
          documentY,
          viewY,
          scrollTopBefore: scrollContainer.scrollTop,
          clientHeightBefore: scrollContainer.clientHeight,
          anchorPageHeightBefore: pageRect.height,
          cumulativeHeightAboveBefore: cumulativeHeightAbove,
          scaleAtCapture: renderedScale || 1.0,
          captureTimestamp,
        }
      }
    }
  }, [renderedScale])

  // Exposed API triggers
  const setFixedZoom = useCallback((newScale: number) => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      captureAnchorAtViewportPoint(scrollContainer.clientWidth / 2, scrollContainer.clientHeight / 2)
    }
    setZoomMode('fixed')
    setFixedScale(newScale)
  }, [captureAnchorAtViewportPoint])

  const setAutoZoom = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      captureAnchorAtViewportPoint(scrollContainer.clientWidth / 2, scrollContainer.clientHeight / 2)
    }
    setZoomMode('auto')
  }, [captureAnchorAtViewportPoint])

  const setPageWidth = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      captureAnchorAtViewportPoint(scrollContainer.clientWidth / 2, scrollContainer.clientHeight / 2)
    }
    setZoomMode('pageWidth')
  }, [captureAnchorAtViewportPoint])

  const setPageFit = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      captureAnchorAtViewportPoint(scrollContainer.clientWidth / 2, scrollContainer.clientHeight / 2)
    }
    setZoomMode('pageFit')
  }, [captureAnchorAtViewportPoint])

  const presets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]

  const zoomOut = useCallback(() => {
    const current = scale
    const next = [...presets].reverse().find(p => p < current - 0.01)
    if (next !== undefined) {
      setFixedZoom(next)
    } else {
      setFixedZoom(Math.max(0.5, current - 0.1))
    }
  }, [scale, setFixedZoom])

  const zoomIn = useCallback(() => {
    const current = scale
    const next = presets.find(p => p > current + 0.01)
    if (next !== undefined) {
      setFixedZoom(next)
    } else {
      setFixedZoom(Math.min(4.0, current + 0.1))
    }
  }, [scale, setFixedZoom])

  // ResizeObserver watching stable outer parent container
  useEffect(() => {
    const outerEl = outerContainerRef.current
    if (!outerEl) return

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return
      const { width, height } = entries[0].contentRect
      setContainerSize({
        width,
        height: Math.max(0, height - 84) // Deduct static layout offsets (header + zoom bar)
      })
    })

    observer.observe(outerEl)
    return () => observer.disconnect()
  }, [])

  const recalculateScale = useCallback((containerWidth: number) => {
    if (!nativePageSize) return
    const availableWidth = containerWidth - 96
    const calculated = availableWidth / nativePageSize.width
    const clamped = Math.min(3.0, Math.max(0.5, calculated))
    setFixedScale(clamped)
  }, [nativePageSize])

  // Set up ResizeObserver to auto-fit container size changes
  const resizeTimeoutRef = useRef<number | null>(null)
  useEffect(() => {
    const scrollable = scrollContainerRef.current
    if (!scrollable || !nativePageSize) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const width = entry.contentRect.width

      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current)
      }

      resizeTimeoutRef.current = window.setTimeout(() => {
        if (zoomMode === 'auto' || zoomMode === 'pageWidth' || zoomMode === 'pageFit') {
          // Capture current anchor in center of viewport before recalculating scale
          captureAnchorAtViewportPoint(scrollable.clientWidth / 2, scrollable.clientHeight / 2)
          recalculateScale(width)
        }
      }, 150)
    })

    resizeObserver.observe(scrollable)
    return () => {
      if (resizeTimeoutRef.current) {
        window.clearTimeout(resizeTimeoutRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [nativePageSize, zoomMode, recalculateScale, captureAnchorAtViewportPoint])

  // Immediate CSS transform & debounced actual rerender
  const debounceTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (renderedScale === 0) {
      if (scale > 0) {
        setRenderedScale(scale)
      }
      return
    }

    if (Math.abs(scale - renderedScale) < 0.001) {
      if (containerRef.current) {
        containerRef.current.style.transform = ''
        containerRef.current.style.transformOrigin = ''
      }
      return
    }

    // Step A: apply CSS transform immediately for snappy visual feel
    if (containerRef.current && scrollContainerRef.current) {
      const ratio = scale / renderedScale
      containerRef.current.style.transform = `scale(${ratio})`
    }

    // Step B: debounce high-res canvas rendering
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      setRenderedScale(scale)
      rerenderRef.current()
    }, 120)

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [scale, renderedScale])

  // Define the callback on every render to ensure it has closure over the latest states
  renderCompleteCallbackRef.current = () => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    // Reset CSS transform on the container
    if (containerRef.current) {
      containerRef.current.style.transform = ''
      containerRef.current.style.transformOrigin = ''
    }

    if (zoomAnchorRef.current) {
      const anchor = zoomAnchorRef.current
      const pageWrapper = pagesRef.current.get(anchor.pageNumber)

      if (pageWrapper) {
        // Measure cumulative heights above using styling padding
        const allPageEls = scrollContainer.querySelectorAll('.pdf-page-wrapper')
        let cumulativeAboveNow_Style = 24 // matching standard scroll padding top (24px)
        const GAP = 20 // margin-bottom on each page wrapper
        
        for (let i = 0; i < allPageEls.length; i++) {
          const el = allPageEls[i] as HTMLElement
          const pNum = Number(el.dataset.page)
          const pH_Style = parseFloat(el.style.height || '0')
          if (pNum < anchor.pageNumber) {
            cumulativeAboveNow_Style += pH_Style + GAP
          }
        }

        const pageTop_Style = cumulativeAboveNow_Style
        const newScrollTop_Style = (pageTop_Style + anchor.documentY * renderedScale) - anchor.viewY

        scrollContainer.scrollTop = newScrollTop_Style
      }
      zoomAnchorRef.current = null
    }
  }

  // Smooth mouse scroll wheel zoom (Ctrl/Cmd + scroll)
  const handleWheelZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()

      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      const containerRect = scrollContainer.getBoundingClientRect()
      const mouseX = e.clientX - containerRect.left
      const mouseY = e.clientY - containerRect.top

      const oldScale = scale
      const zoomSpeedFactor = 0.03
      const delta = (e.deltaY > 0 ? -1 : 1) * oldScale * zoomSpeedFactor
      const newScale = Math.min(4.0, Math.max(0.5, oldScale + delta))

      if (Math.abs(oldScale - newScale) < 0.001) return

      // Point in content space before scaling:
      const contentX = scrollContainer.scrollLeft + mouseX
      const contentY = scrollContainer.scrollTop + mouseY

      if (containerRef.current) {
        containerRef.current.style.transformOrigin = `${contentX}px ${contentY}px`
      }

      // Capture anchor at the exact mouse position
      captureAnchorAtViewportPoint(mouseX, mouseY)

      setZoomMode('fixed')
      setFixedScale(newScale)
    }
  }, [scale, captureAnchorAtViewportPoint])

  // Attach wheel event listener to scroll container
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const listener = (e: WheelEvent) => handleWheelZoom(e)
    scrollContainer.addEventListener('wheel', listener, { passive: false })
    return () => scrollContainer.removeEventListener('wheel', listener)
  }, [handleWheelZoom])

  return {
    scale,
    zoomMode,
    renderedScale,
    outerContainerRef,
    scrollContainerRef,
    containerRef,
    setFixedZoom,
    setAutoZoom,
    setPageWidth,
    setPageFit,
    zoomIn,
    zoomOut,
    renderCompleteCallbackRef,
  }
}
