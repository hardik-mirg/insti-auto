import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle()
    setLoading(false)
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '-80px', left: '50%',
        transform: 'translateX(-50%)',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(0,200,83,0.12) 0%, transparent 70%)',
        pointerEvents: 'none'
      }}/>

      {/* Top illustration area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px 20px'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '12px' }}>
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect width="72" height="72" rx="20" fill="var(--green-subtle)"/>
            <rect width="72" height="72" rx="20" fill="none" stroke="var(--border-green)" strokeWidth="1"/>
            {/* Auto rickshaw icon */}
            <path d="M16 44h40M16 44v-8l6-10h24l6 10v8" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="22" y="26" width="28" height="14" rx="2" stroke="var(--green)" strokeWidth="2" fill="var(--green-subtle)"/>
            <circle cx="23" cy="46" r="4" stroke="var(--green)" strokeWidth="2" fill="var(--bg)"/>
            <circle cx="49" cy="46" r="4" stroke="var(--green)" strokeWidth="2" fill="var(--bg)"/>
            <path d="M30 30h12" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
            <path d="M30 34h8" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>

        <h1 className="display" style={{ textAlign: 'center', marginBottom: '8px' }}>
          Insti<span style={{ color: 'var(--green)' }}>Auto</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '15px', maxWidth: '260px', lineHeight: '1.6' }}>
          Campus auto rickshaws, on demand. Built for IIT Bombay.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '32px' }}>
          {['Instant booking', 'Fixed fares', 'Live tracking'].map(f => (
            <span key={f} style={{
              padding: '6px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '100px',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>✦ {f}</span>
          ))}
        </div>
      </div>

      {/* Bottom card */}
      <div style={{
        padding: '24px',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))'
      }}>
        <div className="card" style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>
            Sign in with your IITB Google account
          </p>
          <button className="btn btn-secondary" onClick={handleGoogle} disabled={loading} style={{ gap: '12px' }}>
            {loading ? <div className="spinner"/> : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          By continuing, you agree to InstiAuto's terms of service.
          <br/>Only for IIT Bombay campus community.
        </p>
      </div>
    </div>
  )
}
