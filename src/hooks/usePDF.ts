import { useState, useEffect } from 'react'
import { pdfjsLib } from '../lib/pdfSetup'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { supabase } from '../lib/supabase'

interface UsePDFReturn {
  pdf: PDFDocumentProxy | null
  totalPages: number
  loading: boolean
  error: string | null
}

export function usePDF(url: string, storagePath?: string): UsePDFReturn {
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

        let pdfInput: string | Uint8Array = url

        if (storagePath) {
          const { data: blob, error: downloadError } = await supabase.storage
            .from('documents')
            .download(storagePath)

          if (downloadError) {
            throw downloadError
          }

          if (blob) {
            const arrayBuffer = await blob.arrayBuffer()
            pdfInput = new Uint8Array(arrayBuffer)
          }
        }

        const loadingTask = pdfjsLib.getDocument({
          url: typeof pdfInput === 'string' ? pdfInput : undefined,
          data: pdfInput instanceof Uint8Array ? pdfInput : undefined,
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
        console.error('Failed to load PDF:', err)
        if (!cancelled) setError('Failed to load PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPDF()
    return () => { cancelled = true }
  }, [url, storagePath])

  return { pdf, totalPages, loading, error }
}