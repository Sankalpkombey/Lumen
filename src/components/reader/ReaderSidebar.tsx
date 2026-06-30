import { useNavigate } from 'react-router-dom'
import type { Document } from '../../lib/supabase'

interface Props {
  doc: Document
  currentPage: number
  totalPages: number
}

export default function ReaderSidebar({ doc, currentPage, totalPages }: Props) {
  const navigate = useNavigate()

  const progress = totalPages > 0
    ? Math.round((currentPage / totalPages) * 100)
    : 0

  return (
    <div className="w-[280px] h-full bg-[#1c1a18] border-r border-white/7 flex flex-col overflow-y-auto flex-shrink-0">

      {/* Back */}
      <button
        onClick={() => navigate('/library')}
        className="flex items-center gap-2 px-4 py-3 text-xs text-[#5a5855] hover:text-[#f0ede8] transition-colors border-b border-white/7"
      >
        ← Library
      </button>

      {/* Doc info */}
      <div className="p-4 border-b border-white/7">
        <p className="text-xs font-medium text-[#f0ede8] leading-snug line-clamp-3 mb-3">
          {doc.name.replace('.pdf', '')}
        </p>

        {/* Progress */}
        <div className="flex flex-col gap-1">
          <div className="h-1 bg-[#242220] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#534AB7] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-[#3a3835]">
              p.{currentPage} of {totalPages}
            </span>
            <span className="text-[10px] text-[#3a3835]">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="p-4">
        <p className="text-[10px] text-[#3a3835] uppercase tracking-widest mb-2 font-medium">
          Status
        </p>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${
          doc.status === 'finished'
            ? 'bg-[#085041] text-[#5DCAA5]'
            : doc.status === 'reading'
            ? 'bg-[#26215C] text-[#AFA9EC]'
            : 'bg-[#242220] text-[#5a5855]'
        }`}>
          {doc.status}
        </span>
      </div>
    </div>
  )
}