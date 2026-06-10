import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,   // starts true — stays true until Supabase responds
  })

  useEffect(() => {
    // Validate session server-side — getSession() only reads the local
    // JWT cache and won't detect users deleted from the Supabase dashboard.
    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Verify the user still exists on the server
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          // User was deleted or token is invalid — clear stale session
          await supabase.auth.signOut()
          setAuthState({ user: null, session: null, loading: false })
          return
        }

        setAuthState({ user, session, loading: false })
      } else {
        setAuthState({ user: null, session: null, loading: false })
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
        })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...authState, signOut }
}