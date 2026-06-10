import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Tab = 'signin' | 'signup'

export default function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (tab === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Check your email to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) {
        setError(error.message)
      } else {
        navigate('/library')
      }
    }

    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/library`
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#141210] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-medium text-[#f0ede8] tracking-tight">
            Lumen
          </h1>
          <p className="text-sm text-[#5a5855] mt-1">
            Illuminate what you read
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#1c1a18] border border-white/8 rounded-2xl p-6">

          {/* Tabs */}
          <div className="flex gap-1 bg-[#141210] rounded-xl p-1 mb-6">
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setMessage(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-[#1c1a18] text-[#f0ede8]'
                    : 'text-[#5a5855] hover:text-[#a09d98]'
                }`}
              >
                {t === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">

            {tab === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[#5a5855] font-medium">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="bg-[#141210] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#5a5855] font-medium">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-[#141210] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[#5a5855] font-medium">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-[#141210] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-[#f0ede8] placeholder-[#3a3835] focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-[#F0997B] bg-[#4A1B0C] border border-[#712B13] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Success */}
            {message && (
              <p className="text-xs text-[#5DCAA5] bg-[#085041] border border-[#0F6E56] rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-[#534AB7] hover:bg-[#3C3489] disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-[#3a3835]">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2.5 bg-[#141210] hover:bg-[#242220] border border-white/8 rounded-xl py-2.5 text-sm text-[#a09d98] hover:text-[#f0ede8] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

      </div>
    </div>
  )
}