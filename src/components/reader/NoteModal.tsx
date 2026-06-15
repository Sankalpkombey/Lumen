import { useState } from 'react'
import type { Tag } from '../../lib/supabase'

interface Props {
  highlightText: string
  tags: Tag[]
  onSave: (content: string, tagId: string | null) => void
  onCreateTag: (name: string, color: string) => Promise<Tag | null>
  onSkip: () => void
  onClose: () => void
}

const TAG_COLORS = [
  '#534AB7', '#0F6E56', '#854F0B',
  '#993C1D', '#1a6b8a', '#6b3fa0'
]

export default function NoteModal({
  highlightText, tags, onSave,
  onCreateTag, onSkip, onClose
}: Props) {
  const [content, setContent] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(content, selectedTagId)
    setSaving(false)
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    const tag = await onCreateTag(newTagName.trim(), newTagColor)
    if (tag) {
      setSelectedTagId(tag.id)
      setShowNewTag(false)
      setNewTagName('')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1a18] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Quoted text */}
        <div className="px-4 pt-4 pb-3 border-b border-white/7">
          <p className="text-[10px] text-[#3a3835] uppercase tracking-widest mb-1.5 font-medium">
            Selected text
          </p>
          <p className="text-xs text-[#a09d98] italic line-clamp-3 leading-relaxed">
            "{highlightText}"
          </p>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Note input */}
          <div>
            <p className="text-[10px] text-[#3a3835] uppercase tracking-widest mb-2 font-medium">
              Your reflection
              <span className="ml-1 normal-case">(optional)</span>
            </p>
            <textarea
              autoFocus
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What does this make you think?"
              rows={3}
              className="w-full bg-[#141210] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20 resize-none leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] text-[#3a3835] uppercase tracking-widest mb-2 font-medium">
              Tag
              <span className="ml-1 normal-case">(optional)</span>
            </p>

            {/* Existing tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(
                    selectedTagId === tag.id ? null : tag.id
                  )}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                    selectedTagId === tag.id
                      ? 'border-current scale-105'
                      : 'border-transparent bg-[#242220] text-[#5a5855] hover:text-[#a09d98]'
                  }`}
                  style={selectedTagId === tag.id ? {
                    color: tag.color,
                    background: tag.color + '22',
                    borderColor: tag.color + '66',
                  } : {}}
                >
                  #{tag.name}
                </button>
              ))}

              {/* Create new tag */}
              <button
                onClick={() => setShowNewTag(!showNewTag)}
                className="px-2.5 py-1 rounded-full text-[10px] border border-dashed border-white/10 text-[#3a3835] hover:text-[#5a5855] hover:border-white/20 transition-all"
              >
                + new tag
              </button>
            </div>

            {/* New tag form */}
            {showNewTag && (
              <div className="bg-[#141210] rounded-xl p-3 flex flex-col gap-2.5">
                <input
                  autoFocus
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  placeholder="Tag name"
                  className="w-full bg-transparent border-b border-white/8 pb-1.5 text-xs text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20"
                />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        className={`w-4 h-4 rounded-full transition-transform ${
                          newTagColor === c
                            ? 'scale-125 ring-1 ring-white/30'
                            : 'hover:scale-110'
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim()}
                    className="ml-auto text-[10px] px-2.5 py-1 rounded-lg bg-[#534AB7] disabled:opacity-40 text-white"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onSkip}
            className="flex-1 py-2 rounded-xl border border-white/8 text-xs text-[#5a5855] hover:text-[#a09d98] transition-colors"
          >
            Skip — just highlight
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-[#534AB7] hover:bg-[#3C3489] disabled:opacity-50 text-xs text-white font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  )
}