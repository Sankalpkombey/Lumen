import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { useParams } from 'react-router-dom'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface ZoomControlProps {
  scale: number
  zoomMode: 'auto-fit' | 'page-width' | 'fixed'
  zoomIn: () => void
  zoomOut: () => void
  setFixedZoom: (scale: number) => void
  setAutoFit: () => void
  setPageWidth: () => void
}

interface ZoomOption {
  value: string
  label: string
  isDivider?: boolean
}

const presetOptions: ZoomOption[] = [
  { value: 'auto-fit', label: 'Automatic Zoom' },
  { value: 'actual', label: 'Actual Size' },
  { value: 'page-width', label: 'Page Width' },
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

function getZoomLabel(mode: 'auto-fit' | 'page-width' | 'fixed', scale: number) {
  if (mode === 'auto-fit') return 'Automatic Zoom'
  if (mode === 'page-width') return 'Page Width'
  return `${Math.round(scale * 100)}%`
}

export function ZoomControl({
  scale,
  zoomMode,
  zoomIn,
  zoomOut,
  setFixedZoom,
  setAutoFit,
  setPageWidth,
}: ZoomControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Compute activeValue for selection matching
  let activeValue = ''
  if (zoomMode === 'auto-fit') {
    activeValue = 'auto-fit'
  } else if (zoomMode === 'page-width') {
    activeValue = 'page-width'
  } else {
    const rounded = Math.round(scale * 100) / 100
    activeValue = String(rounded)
  }

  const presetsValues = ['auto-fit', 'actual', 'page-width', '0.5', '0.75', '1.0', '1.25', '1.5', '2.0', '3.0', '4.0']
  // Match active value or 1.0/actual
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
    dropdownOptions.splice(4, 0, {
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
                (opt.value === 'auto-fit' && zoomMode === 'auto-fit') ||
                (opt.value === 'page-width' && zoomMode === 'page-width') ||
                (opt.value === 'actual' && zoomMode === 'fixed' && Math.abs(scale - 1.0) < 0.01) ||
                (zoomMode === 'fixed' && parseFloat(opt.value) === scale)

              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    if (opt.value === 'auto-fit') {
                      setAutoFit()
                    } else if (opt.value === 'page-width') {
                      setPageWidth()
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
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer select-none`}
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
  const [zoomMode, setZoomMode] = useState<'auto-fit' | 'page-width' | 'fixed'>(() => {
    const saved = localStorage.getItem(`lumen-zoom-mode-${docId}`)
    return (saved as any) || 'auto-fit'
  })

  const [fixedScale, setFixedScale] = useState<number>(() => {
    const saved = localStorage.getItem(`lumen-zoom-scale-${docId}`)
    return saved ? parseFloat(saved) : 1.0
  })

  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null)
  const [renderedScale, setRenderedScale] = useState<number>(1.0)

  // Zoom anchors for restoring scroll position
  const zoomAnchorRef = useRef<{
    pageNumber: number
    documentY: number
    viewY: number
    // diagnostics
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

  // Reset to auto-fit when PDF changes
  useEffect(() => {
    setZoomMode('auto-fit')
  }, [pdf])

  // Derived target scale
  let scale = fixedScale
  if (nativePageSize && containerSize) {
    if (zoomMode === 'page-width') {
      const availableWidth = containerSize.width - 96 // horizontal padding/margins
      scale = Math.max(0.5, availableWidth / nativePageSize.width)
    } else if (zoomMode === 'auto-fit') {
      const availableHeight = containerSize.height - 48 // vertical padding/margins
      scale = Math.max(0.5, availableHeight / nativePageSize.height)
    }
  }

  // Helper to capture active screen anchor centered on viewport
  const captureViewportCenterAnchor = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const viewY = containerRect.height / 2
    const anchorY = scrollContainer.scrollTop + viewY
    const captureTimestamp = performance.now()

    console.group('[ZOOM DIAG] ══════ Zoom Action Initiated ══════')
    console.log('  scale (before)         :', renderedScale)
    console.log('  scrollTop (before)     :', scrollContainer.scrollTop)
    console.log('  clientHeight (before)  :', scrollContainer.clientHeight)
    console.log('  viewportCenterAnchorY  :', anchorY, '(scrollTop + clientHeight/2)')

    const pageElements = scrollContainer.querySelectorAll('.pdf-page-wrapper')
    let foundAnchorPageNum = -1

    if (pageElements.length > 0) {
      let closestPageNum = 1
      let closestPageEl: HTMLElement | null = null
      let minDistance = Infinity
      let found = false

      // Compute cumulative document-space height up to each page for diagnostics
      const pageTops: Array<{ pageNum: number; documentTop: number; renderedTop: number; renderedHeight: number }> = []

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i] as HTMLElement
        const pageNum = Number(el.dataset.page)
        const pageRect = el.getBoundingClientRect()
        const renderedTop = pageRect.top - containerRect.top + scrollContainer.scrollTop
        const renderedHeight = pageRect.height
        pageTops.push({ pageNum, documentTop: renderedTop / renderedScale, renderedTop, renderedHeight })
      }

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i] as HTMLElement
        const pageNum = Number(el.dataset.page)
        const pageRect = el.getBoundingClientRect()
        const top = pageRect.top - containerRect.top + scrollContainer.scrollTop
        const bottom = top + pageRect.height

        if (anchorY >= top && anchorY <= bottom) {
          const documentY = (anchorY - top) / renderedScale
          // Cumulative rendered height of all pages ABOVE this page
          const cumulativeHeightAbove = top // top already equals sum of all content above in scroll space
          foundAnchorPageNum = pageNum

          zoomAnchorRef.current = {
            pageNumber: pageNum,
            documentY,
            viewY,
            scrollTopBefore: scrollContainer.scrollTop,
            clientHeightBefore: scrollContainer.clientHeight,
            anchorPageHeightBefore: pageRect.height,
            cumulativeHeightAboveBefore: cumulativeHeightAbove,
            scaleAtCapture: renderedScale,
            captureTimestamp,
          }

          console.log(`  anchor page            : ${pageNum}`)
          console.log(`  anchor page height     : ${pageRect.height.toFixed(1)}px (actual DOM)`)
          if (nativePageSize) {
            const expectedH = renderedScale * nativePageSize.height
            const diff = pageRect.height - expectedH
            console.log(`  expected height        : ${expectedH.toFixed(1)}px (renderedScale × nativeH)`)
            console.log(`  height discrepancy     : ${diff.toFixed(2)}px ${Math.abs(diff) > 1 ? '⚠️ MISMATCH' : '✓ ok'}`)
          }
          console.log(`  cumulative height above: ${cumulativeHeightAbove.toFixed(1)}px`)
          console.log(`  documentY in page      : ${documentY.toFixed(2)} native-px`)
          console.log('  all page tops (before):', pageTops)
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
        const documentY = Math.max(0, Math.min(pageRect.height, anchorY - top)) / renderedScale
        const cumulativeHeightAbove = top
        foundAnchorPageNum = closestPageNum

        zoomAnchorRef.current = {
          pageNumber: closestPageNum,
          documentY,
          viewY,
          scrollTopBefore: scrollContainer.scrollTop,
          clientHeightBefore: scrollContainer.clientHeight,
          anchorPageHeightBefore: pageRect.height,
          cumulativeHeightAboveBefore: cumulativeHeightAbove,
          scaleAtCapture: renderedScale,
          captureTimestamp,
        }

        console.log(`  anchor page (closest)  : ${closestPageNum}`)
        console.log(`  anchor page height     : ${pageRect.height.toFixed(1)}px`)
        if (nativePageSize) {
          const expectedH = renderedScale * nativePageSize.height
          console.log(`  expected height        : ${expectedH.toFixed(1)}px`)
        }
        console.log(`  cumulative above       : ${cumulativeHeightAbove.toFixed(1)}px`)
        console.log('  all page tops (before):', pageTops)
      }
    }

    console.groupEnd()
  }, [renderedScale, scale, nativePageSize])

  // Exposed API triggers
  const setFixedZoom = useCallback((newScale: number) => {
    captureViewportCenterAnchor()
    setZoomMode('fixed')
    setFixedScale(newScale)
  }, [captureViewportCenterAnchor])

  const setAutoFit = useCallback(() => {
    captureViewportCenterAnchor()
    setZoomMode('auto-fit')
  }, [captureViewportCenterAnchor])

  const setPageWidth = useCallback(() => {
    captureViewportCenterAnchor()
    setZoomMode('page-width')
  }, [captureViewportCenterAnchor])

  const presets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0]

  const zoomOut = useCallback(() => {
    const current = scale
    const next = [...presets].reverse().find(p => p < current - 0.01)
    if (next !== undefined) {
      setFixedZoom(next)
    }
  }, [scale, setFixedZoom])

  const zoomIn = useCallback(() => {
    const current = scale
    const next = presets.find(p => p > current + 0.01)
    if (next !== undefined) {
      setFixedZoom(next)
    }
  }, [scale, setFixedZoom])

  // ResizeObserver watching stable outer parent container (Step 2)
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

  // Immediate CSS transform (Step A) & debounced actual rerender (Step B)
  const debounceTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (Math.abs(scale - renderedScale) < 0.001) {
      if (containerRef.current) {
        containerRef.current.style.transform = ''
        containerRef.current.style.transformOrigin = ''
      }
      return
    }

    // Step A: apply CSS transform immediately
    if (containerRef.current && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current
      const ratio = scale / renderedScale
      containerRef.current.style.transform = `scale(${ratio})`
      
      // If we don't have a custom origin set (e.g. from wheel zoom), default to viewport center vertical origin
      if (!containerRef.current.style.transformOrigin) {
        const viewY = scrollContainer.clientHeight / 2
        const anchorY = scrollContainer.scrollTop + viewY
        containerRef.current.style.transformOrigin = `50% ${anchorY}px`
      }
    }

    // Step B: debounce high-res canvas rendering
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = window.setTimeout(() => {
      console.log('[ZOOM DIAG] ── Debounce fired: calling setRenderedScale +', scale, 'then rerender()')
      setRenderedScale(scale)
      // NOTE: rerenderRef.current() fires async — its promise resolves AFTER this line
      // The post-render diagnostic is invoked via renderCompleteCallbackRef when rerender() finishes
      rerenderRef.current()
    }, 120)

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
      }
    }
  }, [scale, renderedScale])

  // Step C: restore scroll position before browser paints using useLayoutEffect
  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (containerRef.current) {
      containerRef.current.style.transform = ''
      containerRef.current.style.transformOrigin = ''
    }

    if (zoomAnchorRef.current) {
      const anchor = zoomAnchorRef.current
      const layoutEffectTimestamp = performance.now()
      const msSinceCaptured = layoutEffectTimestamp - anchor.captureTimestamp
      const pageWrapper = pagesRef.current.get(anchor.pageNumber)

      console.group('[ZOOM DIAG] ══════ Scroll Restore (useLayoutEffect) ══════')
      console.log('  new renderedScale              :', renderedScale)
      console.log('  ms since zoom was captured     :', msSinceCaptured.toFixed(1))
      console.log('  scrollTop NOW (before restore) :', scrollContainer.scrollTop)
      console.log('  scrollTop at capture (before)  :', anchor.scrollTopBefore)
      console.log('  clientHeight NOW               :', scrollContainer.clientHeight)
      console.log('  clientHeight at capture        :', anchor.clientHeightBefore)

      if (pageWrapper) {
        const pageRect = pageWrapper.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()

        // ── The critical diagnostic: is the page already at its new size? ──
        // IMPORTANT: page wrappers have inline style width/height set directly from
        // renderedScale × nativePageSize (in memoizedPages). getBoundingClientRect()
        // reflects the CSS layout box. If the CSS already updated synchronously
        // (because React re-rendered memoizedPages before this useLayoutEffect ran),
        // actual height will match the NEW expected height even before the canvas
        // async paint completes. If a CSS transform is still applied to the container,
        // getBoundingClientRect() will be scaled by the transform — that's a separate case.
        const actualHeightNow = pageRect.height
        const inlineStyleHeight = parseFloat(pageWrapper.style.height || '0')
        const expectedHeightNew = nativePageSize ? renderedScale * nativePageSize.height : null
        const expectedHeightOld = nativePageSize ? anchor.scaleAtCapture * nativePageSize.height : null
        const isAtNewHeight = expectedHeightNew !== null && Math.abs(actualHeightNow - expectedHeightNew) < 1
        const isAtOldHeight = expectedHeightOld !== null && Math.abs(actualHeightNow - expectedHeightOld) < 1
        const inlineMatchesNew = expectedHeightNew !== null && Math.abs(inlineStyleHeight - expectedHeightNew) < 1
        const inlineMatchesOld = expectedHeightOld !== null && Math.abs(inlineStyleHeight - expectedHeightOld) < 1

        console.log(`  anchor page                    : ${anchor.pageNumber}`)
        console.log(`  page height NOW (getBCR)       : ${actualHeightNow.toFixed(1)}px`)
        console.log(`  page height (inline style)     : ${inlineStyleHeight.toFixed(1)}px  ← set by React from renderedScale×nativeH`)
        console.log(`    inline style → ${
          inlineMatchesNew ? '✅ already at NEW scale' :
          inlineMatchesOld ? '🔴 still at OLD scale (React memoizedPages not re-rendered yet)' :
          '⚠️ neither'
        }`)
        console.log(`  expected at OLD scale          : ${expectedHeightOld?.toFixed(1)}px`)
        console.log(`  expected at NEW scale          : ${expectedHeightNew?.toFixed(1)}px`)
        console.log(
          `  getBCR height status           :`,
          isAtNewHeight
            ? '✅ ALREADY AT NEW HEIGHT — CSS layout updated, timing correct for CSS-based heights'
            : isAtOldHeight
            ? '🔴 STILL AT OLD HEIGHT — CSS layout NOT flushed yet (unexpected for useLayoutEffect)'
            : `⚠️ AT NEITHER (actual=${actualHeightNow.toFixed(1)}, oldExp=${expectedHeightOld?.toFixed(1)}, newExp=${expectedHeightNew?.toFixed(1)}) — likely CSS transform still applied to container`
        )
        console.log('  NOTE: Canvas content is async — getBCR=new height does NOT mean canvas has painted yet')
        console.log('        The post-render log below shows state AFTER the async canvas+textLayer render')

        // ── Cumulative heights above anchor page (measured via getBoundingClientRect)
        // WARNING: If a CSS scale() transform is still active on the container,
        // these heights will be SCALED values, not true layout values.
        const allPageEls = scrollContainer.querySelectorAll('.pdf-page-wrapper')
        let cumulativeAboveNow_BCR = 0
        let cumulativeAboveNow_Style = 0
        const GAP = 20 // margin-bottom on each page wrapper (px) — matches 'margin: 0 auto 20px' in memoizedPages
        // scrollContainer has py-6 = 24px top padding before the first page;
        // we must add this to the style-based sum so it matches the BCR-based measurement
        const SCROLL_PADDING_TOP = 24
        const pageDiagnostics: Array<{
          page: number
          heightBCR: number
          heightStyle: number
          expectedNew: number | null
        }> = []
        for (let i = 0; i < allPageEls.length; i++) {
          const el = allPageEls[i] as HTMLElement
          const pNum = Number(el.dataset.page)
          const pRect = el.getBoundingClientRect()
          const pH_BCR = pRect.height
          const pH_Style = parseFloat(el.style.height || '0')
          const expH = nativePageSize ? renderedScale * nativePageSize.height : null
          pageDiagnostics.push({ page: pNum, heightBCR: pH_BCR, heightStyle: pH_Style, expectedNew: expH })
          if (pNum < anchor.pageNumber) {
            cumulativeAboveNow_BCR += pH_BCR + GAP
            cumulativeAboveNow_Style += pH_Style + GAP
          }
        }
        // Add top padding to style sum so page 1 starts at 24px, matching BCR
        cumulativeAboveNow_Style += SCROLL_PADDING_TOP
        console.log('  page heights NOW               :', pageDiagnostics)
        console.log(`  cumulative above anchor (BCR)  : ${cumulativeAboveNow_BCR.toFixed(1)}px  ← from getBoundingClientRect`)
        console.log(`  cumulative above anchor (style): ${cumulativeAboveNow_Style.toFixed(1)}px  ← from inline style + ${SCROLL_PADDING_TOP}px top-padding`)
        console.log(`  cumulative above (BEFORE zoom) : ${anchor.cumulativeHeightAboveBefore.toFixed(1)}px`)
        console.log(`  Δ cumulative (BCR new - old)   : ${(cumulativeAboveNow_BCR - anchor.cumulativeHeightAboveBefore).toFixed(1)}px`)
        console.log(`  Δ cumulative (style new - old) : ${(cumulativeAboveNow_Style - anchor.cumulativeHeightAboveBefore).toFixed(1)}px`)

        // ── Scroll restore math ──
        // pageTop from getBoundingClientRect: may be affected by CSS transform on container
        const pageTop_BCR = pageRect.top - containerRect.top + scrollContainer.scrollTop
        // pageTop from inline style accumulation: true layout position regardless of transform
        // (cumulativeAboveNow_Style already includes SCROLL_PADDING_TOP)
        const pageTop_Style = cumulativeAboveNow_Style
        const newScrollTop_BCR = (pageTop_BCR + anchor.documentY * renderedScale) - anchor.viewY
        const newScrollTop_Style = (pageTop_Style + anchor.documentY * renderedScale) - anchor.viewY
        const oldScrollTop = scrollContainer.scrollTop

        console.log(`  pageTop via BCR                : ${pageTop_BCR.toFixed(1)}px`)
        console.log(`  pageTop via inline style sum   : ${pageTop_Style.toFixed(1)}px`)
        console.log(`  anchor.documentY × newScale    : ${(anchor.documentY * renderedScale).toFixed(1)}px`)
        console.log(`  newScrollTop (BCR method)      : ${newScrollTop_BCR.toFixed(1)}px`)
        console.log(`  newScrollTop (style method)    : ${newScrollTop_Style.toFixed(1)}px`)
        console.log(`  oldScrollTop                   : ${oldScrollTop.toFixed(1)}px`)
        console.log(`  Δ scrollTop (BCR method)       : ${(newScrollTop_BCR - oldScrollTop).toFixed(1)}px`)
        console.log(`  Δ scrollTop (style method)     : ${(newScrollTop_Style - oldScrollTop).toFixed(1)}px`)

        // ── Register a post-render callback to compare final state ──
        // This will be invoked by PDFViewer's rerender() after the full async
        // canvas + text layer render chain resolves for ALL pages.
        renderCompleteCallbackRef.current = () => {
          const afterRenderTimestamp = performance.now()
          const scrollContainer2 = scrollContainerRef.current
          const pageWrapper2 = pagesRef.current.get(anchor.pageNumber)
          console.group('[ZOOM DIAG] ══════ Post-Render (async render DONE) ══════')
          console.log('  ms after zoom capture          :', (afterRenderTimestamp - anchor.captureTimestamp).toFixed(1))
          console.log('  ms after useLayoutEffect fired :', (afterRenderTimestamp - layoutEffectTimestamp).toFixed(1))
          if (pageWrapper2) {
            const finalRect = pageWrapper2.getBoundingClientRect()
            const finalStyleH = parseFloat(pageWrapper2.style.height || '0')
            console.log(`  page height FINAL (BCR)        : ${finalRect.height.toFixed(1)}px`)
            console.log(`  page height FINAL (style)      : ${finalStyleH.toFixed(1)}px`)
            console.log(`  expected at new scale          : ${expectedHeightNew?.toFixed(1)}px`)
            const isFinalCorrect = expectedHeightNew !== null && Math.abs(finalRect.height - expectedHeightNew) < 1
            console.log('  final height correct?          :', isFinalCorrect ? '✅ yes' : '❌ no')
          }
          if (scrollContainer2) {
            console.log('  scrollTop after render done    :', scrollContainer2.scrollTop)
            console.log('  (This is what the user actually sees after async paint)')
          }
          console.groupEnd()
          renderCompleteCallbackRef.current = null
        }

        // Apply scroll restore using inline-style-based cumulative heights,
        // which reflect the NEW layout regardless of any lingering CSS transform
        scrollContainer.scrollTop = newScrollTop_Style
        console.log(`  ✔ scrollTop SET TO             : ${newScrollTop_Style.toFixed(1)}px  (using style-based pageTop)`)
      }
      zoomAnchorRef.current = null
      console.groupEnd()
    }
  }, [renderedScale, pagesRef, scale, nativePageSize])

  // Smooth mouse scroll wheel zoom (Ctrl/Cmd + scroll)
  const handleWheelZoom = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()

      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      const oldScale = scale
      const delta = e.deltaY > 0 ? -0.04 : 0.04
      const newScale = Math.min(4.0, Math.max(0.5, oldScale + delta))

      if (Math.abs(oldScale - newScale) < 0.001) return

      const viewY = scrollContainer.clientHeight / 2
      const anchorY = scrollContainer.scrollTop + viewY

      // Set transform origin centered horizontally and at the viewport center vertically
      if (containerRef.current) {
        containerRef.current.style.transformOrigin = `50% ${anchorY}px`
      }

      // Capture the viewport center anchor
      captureViewportCenterAnchor()

      setZoomMode('fixed')
      setFixedScale(newScale)
    }
  }, [scale, captureViewportCenterAnchor])

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
    setAutoFit,
    setPageWidth,
    zoomIn,
    zoomOut,
    renderCompleteCallbackRef,
  }
}
