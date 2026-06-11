import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, type Document } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePDF } from '../hooks/usePDF'
import PDFViewer from '../components/reader/PDFViewer'
import ReaderSidebar from '../components/reader/ReaderSidebar'
import NotesPanel from '../components/reader/NotesPanel'
import SelectionPicker from '../components/reader/SelectionPicker'

interface Selection {
  text: string
  pageNumber: number
  position: { x: number; y: number }
}

export default function ReaderPage() {
  const { docId } = useParams<{ docId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<Document | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(true)

  const { pdf, totalPages, loading: pdfLoading, error } = usePDF(
    doc?.file_url ?? ''
  )

  // Fetch document
  useEffect(() => {
    if (!docId || !user) return

    async function fetchDoc() {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .eq('user_id', user!.id)
        .single()

      if (!data) { navigate('/library'); return }
      setDoc(data)
      setCurrentPage(data.last_page ?? 1)
      setLoadingDoc(false)
    }

    fetchDoc()
  }, [docId, user, navigate])

  // Save last page and total pages
  useEffect(() => {
    if (!docId || !currentPage) return

    const timer = setTimeout(() => {
      supabase
        .from('documents')
        .update({
          last_page: currentPage,
          ...(totalPages > 0 && { total_pages: totalPages }),
          status: totalPages > 0 && currentPage >= totalPages
            ? 'finished'
            : 'reading'
        })
        .eq('id', docId)
        .then(() => {})
    }, 1500)

    return () => clearTimeout(timer)
  }, [currentPage, totalPages, docId])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleTextSelect = useCallback((
    text: string,
    pageNumber: number,
    rect: DOMRect
  ) => {
    setSelection({
      text,
      pageNumber,
      position: { x: rect.left + rect.width / 2, y: rect.top }
    })
  }, [])

  const handleHighlight = useCallback(async (
    color: string,
    style: 'highlight' | 'underline'
  ) => {
    if (!selection || !user || !docId) return

    await supabase.from('highlights').insert({
      user_id: user.id,
      doc_id: docId,
      page_number: selection.pageNumber,
      text: selection.text,
      color,
      style,
      position: { x: 0, y: 0, width: 0, height: 0 },
    })

    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [selection, user, docId])

  // Loading state
  if (loadingDoc || pdfLoading) {
    return (
      <div className="min-h-screen bg-[#141210] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#3a3835]">
          {loadingDoc ? 'Loading document...' : 'Rendering PDF...'}
        </p>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#F0997B] mb-3">Failed to load document</p>
          <button
            onClick={() => navigate('/library')}
            className="text-xs text-[#5a5855] hover:text-[#f0ede8]"
          >
            ← Back to library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#141210] flex flex-col">

      {/* Top bar */}
      <div className="h-10 bg-[#1c1a18] border-b border-white/7 flex items-center justify-between px-4 flex-shrink-0">
        <span className="text-xs text-[#5a5855] truncate max-w-xs">
          {doc.name.replace('.pdf', '')}
        </span>
        <span className="text-xs text-[#3a3835]">
          p.{currentPage} / {totalPages}
        </span>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        <ReaderSidebar
          doc={doc}
          currentPage={currentPage}
          totalPages={totalPages}
        />

        {pdf && (
          <PDFViewer
            pdf={pdf}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            onTextSelect={handleTextSelect}
          />
        )}

        <NotesPanel />
      </div>

      {/* Selection picker */}
      {selection && (
        <SelectionPicker
          position={selection.position}
          onHighlight={handleHighlight}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  )
}