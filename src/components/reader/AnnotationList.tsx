import type { Highlight, Note } from '../../lib/supabase'
import { useEffect, useRef } from 'react'

interface Props {
  highlights: Highlight[]
  notes: Note[]
  annotationFocus: string | null
  onAnnotationFocused: () => void
  onHighlightClick: (pageNumber: number) => void
  onDeleteHighlight: (id: string) => void
}

export default function AnnotationList({
  highlights, notes,
  annotationFocus, onAnnotationFocused,
  onHighlightClick,
  onDeleteHighlight,
}: Props) {
  const focusRef = useRef<HTMLDivElement>(null)

  // Scroll to focused annotation card
  useEffect(() => {
    if (annotationFocus && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onAnnotationFocused()
    }
  }, [annotationFocus, onAnnotationFocused])

  return (
    <div className="flex flex-col gap-2 p-3">
      {highlights.map(highlight => {
        const note = notes.find(n => n.highlight_id === highlight.id)
        const isFocused = annotationFocus === highlight.id

        return (
          <div
            key={highlight.id}
            ref={isFocused ? focusRef : null}
            className={`bg-[#141210] border rounded-xl p-3 group cursor-pointer transition-all ${
              isFocused
                ? 'border-[#534AB7] shadow-[0_0_0_2px_rgba(83,74,183,0.2)]'
                : 'border-white/7 hover:border-white/15'
            }`}
            onClick={() => onHighlightClick(highlight.page_number)}
          >
            {/* Color + page */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: highlight.color }}
                />
                <span className="text-[10px] text-[#3a3835]">
                  p.{highlight.page_number} · {highlight.style}
                </span>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation()
                  onDeleteHighlight(highlight.id)
                }}
                className="opacity-0 group-hover:opacity-100 text-[10px] text-[#3a3835] hover:text-[#F0997B] transition-all"
              >
                delete
              </button>
            </div>

            {/* Quoted text */}
            <p
              className="text-xs leading-relaxed line-clamp-2 mb-2"
              style={{
                borderLeft: `2px solid ${highlight.color}`,
                paddingLeft: '8px',
                color: '#a09d98',
              }}
            >
              {highlight.text}
            </p>

            {/* Note */}
            {note && (
              <div className="mt-2 pt-2 border-t border-white/7">
                {note.tags && (
                  <span
                    className="inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full mb-1.5"
                    style={{
                      color: (note.tags as any).color,
                      background: (note.tags as any).color + '22',
                    }}
                  >
                    #{(note.tags as any).name}
                  </span>
                )}
                <p className="text-[11px] text-[#5a5855] leading-relaxed">
                  {note.content}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}