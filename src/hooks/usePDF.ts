import { useState, useEffect } from 'react'
import { pdfjsLib } from '../lib/pdfSetup'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface UsePDFReturn {
  pdf: PDFDocumentProxy | null
  totalPages: number
  loading: boolean
  error: string | null
}

export function usePDF(url: string): UsePDFReturn {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    let cancelled = false

    async function loadPDF() {
      try {
        setLoading(true)
        setError(null)

        const loadingTask = pdfjsLib.getDocument({
          url,
          cMapUrl: '/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/standard_fonts/',
          disableFontFace: false,
        })

        const pdfDoc = await loadingTask.promise

        if (!cancelled) {
          setPdf(pdfDoc)
          setTotalPages(pdfDoc.numPages)
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPDF()
    return () => { cancelled = true }
  }, [url])

  return { pdf, totalPages, loading, error }
}