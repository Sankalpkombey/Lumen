import { useEffect, useRef, useState } from 'react'

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
  { value: '#534AB7', label: 'Purple' },
]

export default function SelectionPicker({ position, onHighlight, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<'highlight' | 'underline'>('highlight')
  const [visible, setVisible] = useState(false)

  // Slide-in animation
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 20)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handleClick), 100)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  // Clamp position to viewport
  const pickerWidth = 220
  const pickerHeight = 48
  const margin = 12

  const left = Math.max(
    margin,
    Math.min(position.x - pickerWidth / 2, window.innerWidth - pickerWidth - margin)
  )
  const top = Math.max(
    margin,
    position.y + 8 + pickerHeight > window.innerHeight
      ? position.y - pickerHeight - 8
      : position.y + 8
  )

  return (
    <div
      ref={ref}
      className="fixed z-50"
      style={{
        top,
        left,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-1.5 rounded-xl shadow-2xl"
        style={{
          background: '#1e1c1a',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Style toggle */}
        <button
          onClick={() => setStyle('highlight')}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            background: style === 'highlight' ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
          title="Highlight"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="9" width="12" height="4" rx="1"
              fill={style === 'highlight' ? '#FFD700' : '#666'}
              opacity={style === 'highlight' ? 0.7 : 0.5}
            />
            <text x="4" y="11" fontSize="8" fill={style === 'highlight' ? '#fff' : '#888'} fontWeight="bold">A</text>
          </svg>
        </button>

        <button
          onClick={() => setStyle('underline')}
          className="p-1.5 rounded-lg transition-colors"
          style={{
            background: style === 'underline' ? 'rgba(255,255,255,0.1)' : 'transparent',
          }}
          title="Underline"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <text x="4" y="10" fontSize="9" fill={style === 'underline' ? '#fff' : '#888'} fontWeight="bold">A</text>
            <line x1="3" y1="13" x2="13" y2="13"
              stroke={style === 'underline' ? '#534AB7' : '#666'}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-5 mx-0.5" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Color dots */}
        {COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => onHighlight(c.value, style)}
            className="w-5 h-5 rounded-full transition-all hover:scale-125 hover:shadow-lg flex-shrink-0"
            style={{
              background: c.value,
              border: '2px solid rgba(0,0,0,0.25)',
              boxShadow: `0 0 0 0.5px rgba(255,255,255,0.08)`,
            }}
            title={c.label}
          />
        ))}
      </div>
    </div>
  )
}