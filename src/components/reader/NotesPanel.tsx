import { useState, useEffect } from 'react'
import { useAnnotations } from '../../hooks/useAnnotations'
import AnnotationList from './AnnotationList'

type Tab = 'thoughts' | 'annotations' | 'canvas'

interface Props {
  docId: string
  annotationFocus: string | null
  onAnnotationFocused: () => void
  onScrollToPage: (page: number) => void
}

export default function NotesPanel({
  docId,
  annotationFocus,
  onAnnotationFocused,
  onScrollToPage
}: Props) {
  const [tab, setTab] = useState<Tab>('thoughts')
  const [thoughts, setThoughts] = useState('')
  const {
    highlights, notes,
    removeHighlight,
  } = useAnnotations(docId)

  // When a tag is clicked — switch to annotations tab and focus
  useEffect(() => {
    if (annotationFocus) {
      setTab('annotations')
    }
  }, [annotationFocus])

  return (
    <div className="w-64 bg-[#1c1a18] border-l border-white/7 flex flex-col overflow-hidden flex-shrink-0">

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/7 flex-shrink-0">
        {(['thoughts', 'annotations', 'canvas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${tab === t
                ? 'bg-[#242220] text-[#f0ede8]'
                : 'text-[#3a3835] hover:text-[#5a5855]'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Thoughts */}
        {tab === 'thoughts' && (
          <div className="p-3 h-full flex flex-col">
            <p className="text-[10px] text-[#3a3835] mb-2">
              Free writing — auto saved
            </p>
            <textarea
              value={thoughts}
              onChange={e => setThoughts(e.target.value)}
              placeholder="Write anything..."
              className="flex-1 bg-transparent text-xs text-[#a09d98] placeholder-[#3a3835] resize-none focus:outline-none leading-relaxed min-h-48"
            />
          </div>
        )}

        {/* Annotations */}
        {tab === 'annotations' && (
          <AnnotationList
            highlights={highlights}
            notes={notes}
            annotationFocus={annotationFocus}
            onAnnotationFocused={onAnnotationFocused}
            onHighlightClick={onScrollToPage}
            onDeleteHighlight={removeHighlight}
          />
        )}

        {/* Canvas */}
        {tab === 'canvas' && (
          <div className="p-3">
            <button className="w-full py-2 rounded-xl border border-dashed border-white/10 text-xs text-[#3a3835] hover:text-[#5a5855] hover:border-white/20 transition-all">
              + New canvas
            </button>
          </div>
        )}
      </div>
    </div>
  )
}