import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function StudentHome() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeRide, setActiveRide] = useState(null)
  const [rideHistory, setRideHistory] = useState([])
  const [checkingRide, setCheckingRide] = useState(true)

  useEffect(() => {
    checkActiveRide()
    fetchHistory()
  }, [])

  async function checkActiveRide() {
    const { data } = await supabase
      .from('rides')
      .select('*')
      .eq('student_id', profile.id)
      .in('status', ['searching', 'driver_assigned', 'otp_verified', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data) {
      setActiveRide(data)
      navigate(`/ride/${data.id}`)
    }
    setCheckingRide(false)
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('rides')
      .select('*, profiles!rides_driver_id_fkey(full_name)')
      .eq('student_id', profile.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5)
    setRideHistory(data || [])
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ height: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0', paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <div className="label" style={{ marginBottom: '2px' }}>{greeting()}</div>
            <h2 className="headline">{profile?.full_name?.split(' ')[0] || 'there'} 👋</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{
                width: '38px', height: '38px',
                borderRadius: '50%',
                border: '2px solid var(--border-green)'
              }}/>
            ) : (
              <div style={{
                width: '38px', height: '38px',
                borderRadius: '50%',
                background: 'var(--green-subtle)',
                border: '2px solid var(--border-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--green)', fontWeight: '700', fontSize: '16px'
              }}>
                {profile?.full_name?.[0] || '?'}
              </div>
            )}
          </div>
        </div>

        {/* OTP Card */}
        <div className="card card-green" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="label" style={{ color: 'var(--green)', marginBottom: '4px' }}>Your Ride OTP</div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Share with driver to verify your identity</p>
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '32px',
              fontWeight: '800',
              letterSpacing: '8px',
              color: 'var(--green)',
              textShadow: '0 0 20px rgba(0,200,83,0.4)'
            }}>
              {profile?.otp_pin || '----'}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px', paddingBottom: '20px' }}>
        {/* Book ride CTA */}
        <button
          onClick={() => navigate('/book')}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, var(--green) 0%, var(--green-dim) 100%)',
            border: 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            cursor: 'pointer',
            textAlign: 'left',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: '0 8px 32px rgba(0,200,83,0.3)'
          }}
        >
          <div style={{
            position: 'absolute', right: '-20px', top: '-20px',
            width: '120px', height: '120px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%'
          }}/>
          <div style={{
            position: 'absolute', right: '20px', bottom: '-30px',
            width: '80px', height: '80px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '50%'
          }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🛺</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', color: '#000', marginBottom: '4px' }}>
              Book a Ride
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.65)' }}>
              Get an auto anywhere on campus
            </div>
          </div>
        </button>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', color: 'var(--green)' }}>
              {rideHistory.length}
            </div>
            <div className="caption">Rides taken</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              ₹{rideHistory.reduce((s, r) => s + (r.fare || 0), 0).toFixed(0)}
            </div>
            <div className="caption">Total spent</div>
          </div>
        </div>

        {/* Recent rides */}
        {rideHistory.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: '12px' }}>Recent Rides</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rideHistory.map(ride => (
                <div key={ride.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>
                      {ride.drop_address?.split(',')[0]}
                    </div>
                    <div className="caption">
                      {new Date(ride.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {ride.profiles?.full_name ? ` · ${ride.profiles.full_name}` : ''}
                    </div>
                  </div>
                  <div style={{ color: 'var(--green)', fontWeight: '700', fontFamily: 'var(--font-display)', fontSize: '17px' }}>
                    ₹{ride.fare?.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom nav hint */}
      <div style={{
        padding: '12px 20px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button className="btn-ghost btn" onClick={signOut} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Sign out
        </button>
      </div>
    </div>
  )
}
