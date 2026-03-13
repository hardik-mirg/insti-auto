import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Hard timeout — if nothing resolves in 5s, stop loading regardless
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth timeout hit — forcing loading=false')
        setLoading(false)
      }
    }, 5000)

    async function init() {
      try {
        console.log('Auth init started')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('getSession result:', session?.user?.email ?? 'no session', error ?? '')

        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id, mounted)
        } else {
          setLoading(false)
        }
      } catch (e) {
        console.error('Auth init error:', e)
        if (mounted) setLoading(false)
      } finally {
        clearTimeout(timeout)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email ?? 'no user')
      if (!mounted) return

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN') {
        setUser(session.user)
        await fetchProfile(session.user.id, mounted)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId, mounted = true) {
    try {
      console.log('Fetching profile for:', userId)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('Profile result:', data, error)

      if (!mounted) return
      setProfile(data ?? null)
    } catch (e) {
      console.error('fetchProfile error:', e)
      if (mounted) setProfile(null)
    } finally {
      if (mounted) setLoading(false)
    }
  }

  async function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        // queryParams: { hd: 'iitb.ac.in' } -- re-enable for production
      }
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  async function createProfile(role) {
    if (!user) return
    const otp = role === 'student'
      ? String(Math.floor(1000 + Math.random() * 9000))
      : null

    const { data, error } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email,
      avatar_url: user.user_metadata?.avatar_url,
      role,
      otp_pin: otp,
    }).select().single()

    if (!error) {
      if (role === 'driver') {
        await supabase.from('driver_details').insert({
          id: user.id,
          vehicle_number: '',
          is_available: false,
        })
      }
      setProfile(data)
    }
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithGoogle, signOut, createProfile,
      refetchProfile: () => fetchProfile(user?.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)