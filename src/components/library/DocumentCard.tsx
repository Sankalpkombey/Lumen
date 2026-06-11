import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, type Document } from '../../lib/supabase'
import { useDocumentStore } from '../../store/documentStore'

interface Props {
  doc: Document
}

const STATUS_STYLES = {
  unread: 'bg-[#242220] text-[#5a5855]',
  reading: 'bg-[#26215C] text-[#AFA9EC]',
  finished: 'bg-[#085041] text-[#5DCAA5]',
}

export default function DocumentCard({ doc }: Props) {
  const navigate = useNavigate()
  const { updateDocument, deleteDocument } = useDocumentStore()
  const [showMenu, setShowMenu] = useState(false)

  const progress = doc.total_pages > 0
    ? Math.round((doc.last_page / doc.total_pages) * 100)
    : 0

  async function handleDelete() {
    await supabase.from('documents').delete().eq('id', doc.id)
    deleteDocument(doc.id)
    setShowMenu(false)
  }

  async function handleStatusChange(status: 'unread' | 'reading' | 'finished') {
    await supabase.from('documents').update({ status }).eq('id', doc.id)
    updateDocument(doc.id, { status })
    setShowMenu(false)
  }

  return (
    <div
      className="bg-[#1c1a18] border border-white/7 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:border-white/15 transition-all group relative"
      onClick={() => navigate(`/read/${doc.id}`)}
    >
      {/* PDF icon */}
      <div className="w-full h-32 bg-[#141210] rounded-xl flex items-center justify-center border border-white/5">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
          <rect width="32" height="40" rx="4" fill="#242220"/>
          <path d="M8 12h10l6 6v14a2 2 0 01-2 2H8a2 2 0 01-2-2V14a2 2 0 012-2z" fill="#2c2a28"/>
          <path d="M18 12l6 6h-6v-6z" fill="#3a3835"/>
          <text x="16" y="30" textAnchor="middle" fill="#5a5855" fontSize="6" fontFamily="sans-serif">PDF</text>
        </svg>
      </div>

      {/* Name */}
      <p className="text-sm font-medium text-[#f0ede8] leading-tight line-clamp-2">
        {doc.name.replace('.pdf', '')}
      </p>

      {/* Progress bar */}
      {doc.total_pages > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1 bg-[#242220] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#534AB7] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-[#3a3835]">{progress}% complete</p>
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[doc.status]}`}>
          {doc.status}
        </span>

        {/* Three dot menu */}
        <button
          onClick={e => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/8 text-[#5a5855] hover:text-[#f0ede8] transition-all text-lg leading-none"
        >
          ···
        </button>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div
          className="absolute bottom-12 right-3 bg-[#242220] border border-white/10 rounded-xl overflow-hidden z-10 min-w-36"
          onClick={e => e.stopPropagation()}
        >
          {(['unread', 'reading', 'finished'] as const).map(s => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className="w-full text-left px-3 py-2 text-xs text-[#a09d98] hover:bg-white/5 hover:text-[#f0ede8] transition-colors capitalize"
            >
              Mark as {s}
            </button>
          ))}
          <div className="h-px bg-white/8" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-2 text-xs text-[#F0997B] hover:bg-white/5 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}