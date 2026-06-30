import { useState, useEffect } from 'react'
import { useAnnotations } from '../../hooks/useAnnotations'
import AnnotationList from './AnnotationList'

type Tab = 'annotations' | 'canvas'

interface Props {
  docId: string
  annotationFocus: string | null
  onAnnotationFocused: () => void
  onScrollToPage: (page: number) => void
  collapsed: boolean
  onCollapse: () => void
}

export default function NotesPanel({
  docId,
  annotationFocus,
  onAnnotationFocused,
  onScrollToPage,
  collapsed,
  onCollapse,
}: Props) {
  const [tab, setTab] = useState<Tab>('annotations')
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
    <div
      className={`bg-[#1c1a18] border-l border-white/7 flex flex-col transition-all duration-200 ease-in-out flex-shrink-0 ${
        collapsed ? 'w-0 border-l-0 overflow-hidden' : 'w-[360px]'
      }`}
    >
      <div className="w-[360px] h-full flex flex-col overflow-hidden">
        {/* Header containing collapse button and tabs */}
        <div className="flex items-center gap-2 p-2 border-b border-white/7 flex-shrink-0 min-h-[40px]">
          <button
            onClick={onCollapse}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#5a5855] hover:text-[#f0ede8] hover:bg-white/5 transition-all flex-shrink-0"
            title="Collapse panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex gap-1 flex-1">
            {(['annotations', 'canvas'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${tab === t
                    ? 'bg-[#242220] text-[#f0ede8]'
                    : 'text-[#5a5855] hover:text-[#a09d98]'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
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
    </div>
  )
}