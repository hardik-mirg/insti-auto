import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function RoleSelectPage() {
  const { createProfile, signOut, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('role') // 'role' | 'phone' | 'confirm'
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')

  function handleStudentClick() {
    setStep('phone')
    setError('')
  }

  async function handleRole(role) {
    if (role === 'driver') {
      setError('Driver accounts must be registered by the admin. Contact the InstiAuto team.')
      return
    }
  }

  function validatePhone(num) {
    const digits = num.replace(/\D/g, '')
    return digits.length === 10
  }

  async function submitStudent() {
    setStep('confirm')
  }

  async function confirmAndCreate() {
    const digits = phone.replace(/\D/g, '')
    setLoading(true)
    const { error } = await createProfile('student', `+91${digits}`)
    if (error) setError(error.message)
    setLoading(false)
  }

  if (step === 'confirm') {
    const digits = phone.replace(/\D/g, '')
    const formatted = `+91 ${digits.slice(0,5)} ${digits.slice(5)}`
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', padding: '40px 24px',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            onClick={() => setStep('phone')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', padding: 0, marginBottom: '32px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>

          <div className="label" style={{ marginBottom: '8px' }}>Confirm</div>
          <h1 className="display" style={{ marginBottom: '24px' }}>
            Is this<br/>correct?
          </h1>

          <div className="card card-green" style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div className="label" style={{ color: 'var(--green)', marginBottom: '8px' }}>Your phone number</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', letterSpacing: '2px' }}>
              {formatted}
            </div>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6' }}>
            This number will be shared with your driver during active rides so they can contact you.
          </p>
          <p style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6' }}>
            WARNING: YOU CAN'T CHANGE THIS LATER WITHOUT CONTACTING SUPPORT. Please make sure it's correct.
          </p>

          {error && (
            <div style={{
              marginBottom: '16px', padding: '12px 16px',
              background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
              borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)'
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={confirmAndCreate}
            disabled={loading}
            style={{ fontSize: '16px', padding: '16px', marginBottom: '12px' }}
          >
            {loading ? <div className="spinner" style={{ borderTopColor: '#000' }}/> : "✓ Yes, that's correct"}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setStep('phone')}
            disabled={loading}
          >
            Change number
          </button>
        </div>

        <button className="btn btn-ghost" onClick={signOut} style={{ color: 'var(--text-muted)' }}>
          Sign out
        </button>
      </div>
    )
  }

  if (step === 'phone') {
    return (
      <div style={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--bg)', padding: '40px 24px',
        paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))'
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <button
            onClick={() => setStep('role')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '13px', padding: 0, marginBottom: '32px' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Back
          </button>

          <div className="label" style={{ marginBottom: '8px' }}>One last thing</div>
          <h1 className="display" style={{ marginBottom: '8px' }}>
            Your phone<br/>number
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6' }}>
            So your driver can call you if needed. Only shared during active rides.
          </p>
          <p style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center', marginBottom: '24px', lineHeight: '1.6' }}>
            WARNING: YOU CAN'T CHANGE THIS LATER WITHOUT CONTACTING SUPPORT. Please make sure it's correct.
          </p>

          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--bg-elevated)',
              border: `1px solid ${phoneError ? 'var(--danger)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              transition: 'border-color 0.2s'
            }}>
              <div style={{
                padding: '13px 14px',
                borderRight: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: '15px',
                whiteSpace: 'nowrap',
                background: 'var(--bg-card)'
              }}>
                🇮🇳 +91
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(e.target.value); setPhoneError('') }}
                placeholder="98765 43210"
                maxLength={10}
                inputMode="numeric"
                autoFocus
                style={{
                  flex: 1, padding: '13px 14px',
                  background: 'transparent', border: 'none',
                  fontSize: '18px', color: 'var(--text-primary)',
                  outline: 'none', letterSpacing: '1px',
                  fontFamily: 'var(--font-display)', fontWeight: '600'
                }}
              />
            </div>
            {phoneError && (
              <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>
                {phoneError}
              </div>
            )}
          </div>

          {error && (
            <div style={{
              marginBottom: '16px', padding: '12px 16px',
              background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
              borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)'
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={submitStudent}
            disabled={loading || phone.replace(/\D/g, '').length !== 10}
            style={{ fontSize: '16px', padding: '16px' }}
          >
            {loading ? <div className="spinner" style={{ borderTopColor: '#000' }}/> : 'Continue →'}
          </button>
        </div>

        <button className="btn btn-ghost" onClick={signOut} style={{ color: 'var(--text-muted)' }}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', padding: '40px 24px',
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
          <button onClick={handleStudentClick} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '16px'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-green)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: '52px', height: '52px', background: 'var(--green-subtle)',
              borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Book rides across campus</div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>

          <button onClick={() => handleRole('driver')} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '16px', opacity: 0.7
          }}>
            <div style={{
              width: '52px', height: '52px', background: 'var(--bg-overlay)',
              borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
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
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Admin-registered only</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '16px', padding: '12px 16px',
            background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
            borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)'
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