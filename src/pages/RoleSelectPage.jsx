import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function RoleSelectPage() {
  const { createProfile, signOut, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRole(role) {
    if (role === 'driver') {
      setError('Driver accounts must be registered by the admin. Contact the InstiAuto team.')
      return
    }
    setLoading(true)
    const { error } = await createProfile(role)
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      padding: '40px 24px',
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))'
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="label" style={{ marginBottom: '8px' }}>Welcome</div>
        <h1 className="display" style={{ marginBottom: '8px' }}>
          Who are<br/>you?
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>
          {user?.email}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Student card */}
          <button onClick={() => handleRole('student')} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-green)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: '52px', height: '52px',
              background: 'var(--green-subtle)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '17px', color: 'var(--text-primary)', marginBottom: '3px' }}>
                I'm a Student
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Book rides across campus
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          {/* Driver card */}
          <button onClick={() => handleRole('driver')} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            opacity: 0.7
          }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'var(--bg-overlay)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '17px', color: 'var(--text-primary)', marginBottom: '3px' }}>
                I'm a Driver
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Admin-registered only
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(255,82,82,0.1)',
            border: '1px solid rgba(255,82,82,0.3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--danger)'
          }}>
            {error}
          </div>
        )}
      </div>

      <button className="btn btn-ghost" onClick={signOut} style={{ color: 'var(--text-muted)' }}>
        Sign out
      </button>
    </div>
  )
}
