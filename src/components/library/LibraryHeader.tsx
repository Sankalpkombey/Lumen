import { useAuth } from '../../hooks/useAuth'

export default function LibraryHeader() {
  const { user, signOut } = useAuth()

  return (
    <div className="h-14 border-b border-white/7 bg-[#1c1a18] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-[#f0ede8] font-medium tracking-tight text-lg">
        Lumen
      </h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#5a5855]">
          {user?.email}
        </span>
        <button
          onClick={signOut}
          className="text-xs text-[#5a5855] hover:text-[#f0ede8] transition-colors px-3 py-1.5 rounded-lg border border-white/7 hover:border-white/15"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}