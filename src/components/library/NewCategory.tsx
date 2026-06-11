import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentStore } from '../../store/documentStore'

const COLORS = [
  '#534AB7', '#0F6E56', '#854F0B',
  '#993C1D', '#1a6b8a', '#6b3fa0'
]

interface Props {
  onClose: () => void
}

export default function NewCategory({ onClose }: Props) {
  const { user } = useAuth()
  const { addCategory } = useDocumentStore()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim() || !user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: name.trim(), color })
      .select()
      .single()

    if (!error && data) {
      addCategory(data)
      onClose()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-[#1c1a18] border border-white/10 rounded-2xl p-5 w-full max-w-xs">
        <h3 className="text-sm font-medium text-[#f0ede8] mb-4">
          New folder
        </h3>

        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="Folder name"
          className="w-full bg-[#141210] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20 mb-4"
        />

        {/* Color picker */}
        <p className="text-xs text-[#5a5855] mb-2">Color</p>
        <div className="flex gap-2 mb-5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${
                color === c ? 'scale-125 ring-2 ring-white/30' : 'hover:scale-110'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/8 text-xs text-[#5a5855] hover:text-[#a09d98] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="flex-1 py-2 rounded-xl bg-[#534AB7] hover:bg-[#3C3489] disabled:opacity-40 text-xs text-white font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}