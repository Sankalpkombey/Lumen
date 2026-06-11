import { useEffect, useRef } from 'react'

interface Props {
  position: { x: number; y: number }
  onHighlight: (color: string, style: 'highlight' | 'underline') => void
  onClose: () => void
}

const COLORS = [
  { value: '#FFD700', label: 'Yellow' },
  { value: '#90EE90', label: 'Green' },
  { value: '#87CEEB', label: 'Blue' },
  { value: '#FFB6C1', label: 'Pink' },
]

export default function SelectionPicker({ position, onHighlight, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-[#1c1a18] border border-white/12 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl"
      style={{ top: position.y - 100, left: position.x - 80 }}
    >
      {/* Style toggle */}
      <div className="flex gap-1.5">
        <button
          onClick={() => onHighlight('#FFD700', 'highlight')}
          className="flex-1 py-1.5 rounded-lg bg-[#242220] text-[10px] text-[#a09d98] hover:text-[#f0ede8] transition-colors"
        >
          Highlight
        </button>
        <button
          onClick={() => onHighlight('#534AB7', 'underline')}
          className="flex-1 py-1.5 rounded-lg bg-[#242220] text-[10px] text-[#a09d98] hover:text-[#f0ede8] transition-colors"
        >
          Underline
        </button>
      </div>

      {/* Color swatches */}
      <div className="flex gap-2 justify-center">
        {COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => onHighlight(c.value, 'highlight')}
            className="w-5 h-5 rounded-full hover:scale-125 transition-transform border border-black/10"
            style={{ background: c.value }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  )
}