import { useState } from 'react'

type Tab = 'thoughts' | 'annotations' | 'canvas'

export default function NotesPanel() {
  const [tab, setTab] = useState<Tab>('thoughts')

  return (
    <div className="w-64 bg-[#1c1a18] border-l border-white/7 flex flex-col overflow-hidden flex-shrink-0">

      {/* Tabs */}
      <div className="flex gap-1 p-2 border-b border-white/7">
        {(['thoughts', 'annotations', 'canvas'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-[#242220] text-[#f0ede8]'
                : 'text-[#3a3835] hover:text-[#5a5855]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'thoughts' && (
          <div className="p-3 h-full flex flex-col">
            <textarea
              placeholder="Write your thoughts freely..."
              className="flex-1 bg-transparent text-xs text-[#a09d98] placeholder-[#3a3835] resize-none focus:outline-none leading-relaxed"
            />
          </div>
        )}

        {tab === 'annotations' && (
          <div className="p-3">
            <p className="text-xs text-[#3a3835] text-center mt-8">
              Highlights and notes will appear here
            </p>
          </div>
        )}

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