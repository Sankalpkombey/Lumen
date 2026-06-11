import { useState } from 'react'
import { useDocumentStore } from '../../store/documentStore'
import NewCategory from './NewCategory'

export default function Sidebar() {
  const { categories, activeCategoryId, setActiveCategory } = useDocumentStore()
  const [showNewCategory, setShowNewCategory] = useState(false)

  return (
    <div className="w-52 bg-[#1c1a18] border-r border-white/7 flex flex-col overflow-hidden flex-shrink-0">
      <div className="flex-1 overflow-y-auto py-3">

        {/* All Documents */}
        <button
          onClick={() => setActiveCategory(null)}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
            activeCategoryId === null
              ? 'text-[#f0ede8] bg-white/5'
              : 'text-[#5a5855] hover:text-[#a09d98]'
          }`}
        >
          <span className="text-base">📄</span>
          All Documents
        </button>

        {/* Category folders */}
        {categories.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-medium uppercase tracking-widest text-[#3a3835] px-4 mb-1">
              Folders
            </p>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left group ${
                  activeCategoryId === cat.id
                    ? 'text-[#f0ede8] bg-white/5'
                    : 'text-[#5a5855] hover:text-[#a09d98]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-sm flex-shrink-0"
                  style={{ background: cat.color }}
                />
                <span className="truncate">{cat.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New folder button */}
      <div className="p-3 border-t border-white/7">
        <button
          onClick={() => setShowNewCategory(true)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/10 text-xs text-[#3a3835] hover:text-[#5a5855] hover:border-white/20 transition-all"
        >
          + New folder
        </button>
      </div>

      {showNewCategory && (
        <NewCategory onClose={() => setShowNewCategory(false)} />
      )}
    </div>
  )
}