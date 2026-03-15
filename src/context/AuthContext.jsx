import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event, session?.user?.email ?? 'no session')

      // Handle all events that provide a session
      if (session?.user) {
        setUser(session.user)
        // setTimeout avoids Supabase internal lock deadlock
        setTimeout(() => fetchProfile(session.user.id), 0)
      } else {
        // SIGNED_OUT or no session
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    console.log('Fetching profile for:', userId)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // maybeSingle returns null instead of 406 when no row found

      console.log('Profile result:', data, error?.message)
      setProfile(data ?? null)
    } catch (e) {
      console.error('fetchProfile threw:', e)
      setProfile(null)
    } finally {
      setLoading(false)
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

  async function createProfile(role, phone = null) {
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
      phone,
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