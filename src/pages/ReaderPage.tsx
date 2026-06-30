import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Document } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { usePDF } from '../hooks/usePDF'
import { useAnnotations } from '../hooks/useAnnotations'
import PDFViewer from '../components/reader/PDFViewer'
import ReaderSidebar from '../components/reader/ReaderSidebar'
import NotesPanel from '../components/reader/NotesPanel'
import SelectionPicker from '../components/reader/SelectionPicker'
import NoteModal from '../components/reader/NoteModal'

interface Selection {
  text: string
  pageNumber: number
  position: { x: number; y: number }
  rect: {
    rects: Array<{ x: number; y: number; width: number; height: number }>
    tagAnchor: { x: number; y: number; height: number }
  }
  rangeInfo?: any
}

interface PendingHighlight {
  id: string
  text: string
}

export default function ReaderPage() {
  const { docId } = useParams<{ docId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<Document | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const scrollRef = useRef<((page: number) => void) | null>(null)
  const [annotationFocus, setAnnotationFocus] = useState<string | null>(null)

  const { pdf, totalPages, loading: pdfLoading, error } = usePDF(
    doc?.file_url ?? ''
  )

  const {
    highlights, notes, tags,
    saveHighlight, saveNote, saveTag,
  } = useAnnotations(docId ?? '')

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

  // Save progress
  useEffect(() => {
    if (!docId || !currentPage) return
    const timer = setTimeout(() => {
      supabase.from('documents').update({
        last_page: currentPage,
        ...(totalPages > 0 && { total_pages: totalPages }),
        status: totalPages > 0 && currentPage >= totalPages
          ? 'finished' : 'reading',
      }).eq('id', docId).then(() => { })
    }, 1500)
    return () => clearTimeout(timer)
  }, [currentPage, totalPages, docId])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleTextSelect = useCallback((
    text: string,
    pageNumber: number,
    rect: DOMRect,
    _pageRect: DOMRect,
    positions: Array<{ x: number; y: number; width: number; height: number }>,
    tagAnchor: { x: number; y: number; height: number },
    rangeInfo?: any
  ) => {
    setSelection({
      text,
      pageNumber,
      position: { x: tagAnchor.x, y: tagAnchor.y },
      rect: {
        rects: positions,
        tagAnchor,
      },
      rangeInfo
    })
  }, [])

  const handleHighlight = useCallback(async (
    color: string,
    style: 'highlight' | 'underline'
  ) => {
    if (!selection) return
    setSelection(null)

    const highlight = await saveHighlight(
      selection.text,
      color,
      style,
      selection.pageNumber,
      selection.rangeInfo
    )

  if (highlight) {
    setPendingHighlight({ id: highlight.id, text: highlight.text })
    setShowNoteModal(true)
  }

  window.getSelection()?.removeAllRanges()
}, [selection, saveHighlight])

  const handleSaveNote = useCallback(async (
    content: string,
    tagId: string | null
  ) => {
    if (!pendingHighlight || !content.trim()) {
      setShowNoteModal(false)
      setPendingHighlight(null)
      return
    }
    await saveNote(pendingHighlight.id, content, tagId)
    setShowNoteModal(false)
    setPendingHighlight(null)
  }, [pendingHighlight, saveNote])

  const handleScrollToPage = useCallback((page: number) => {
    scrollRef.current?.(page)
  }, [])

  // Add this handler
  const handleTagClick = useCallback((highlightId: string) => {
    // Switch annotations tab and scroll to that card
    setAnnotationFocus(highlightId)
  }, [])



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
    <div className="h-screen w-screen bg-[#141210] grid grid-cols-[280px_1fr_360px] overflow-hidden">
      <ReaderSidebar
        doc={doc}
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {pdf && (
        <PDFViewer
          pdf={pdf}
          currentPage={currentPage}
          highlights={highlights}
          notes={notes}
          onPageChange={handlePageChange}
          onTextSelect={handleTextSelect}
          onTagClick={handleTagClick}
          docName={doc.name}
          totalPages={totalPages}
        />
      )}

      <NotesPanel
        docId={docId ?? ''}
        annotationFocus={annotationFocus}
        onAnnotationFocused={() => setAnnotationFocus(null)}
        onScrollToPage={handleScrollToPage}
      />

      {/* Selection picker */}
      {selection && (
        <SelectionPicker
          position={selection.position}
          onHighlight={handleHighlight}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Note modal */}
      {showNoteModal && pendingHighlight && (
        <NoteModal
          highlightText={pendingHighlight.text}
          tags={tags}
          onSave={handleSaveNote}
          onCreateTag={saveTag}
          onSkip={() => {
            setShowNoteModal(false)
            setPendingHighlight(null)
          }}
          onClose={() => {
            setShowNoteModal(false)
            setPendingHighlight(null)
          }}
        />
      )}
    </div>
  )
}