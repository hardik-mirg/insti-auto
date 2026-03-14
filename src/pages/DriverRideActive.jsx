import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function DriverRideActive() {
  const { rideId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [ride, setRide] = useState(null)
  const [student, setStudent] = useState(null)
  const [otpInput, setOtpInput] = useState(['', '', '', ''])
  const [otpError, setOtpError] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [completing, setCompleting] = useState(false)
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef({})
  const routeRef = useRef(null)
  const locationInterval = useRef(null)
  const otpRefs = [useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    fetchRide()
    startLocationTracking()
    const sub = supabase
      .channel(`driver-ride-${rideId}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          const updated = payload.new
          setRide(updated)
          // Update student marker when their location changes
          if (updated.student_lat && updated.student_lng) {
            updateStudentMarker(updated.student_lat, updated.student_lng)
          }
          if (updated.status === 'cancelled') {
            clearInterval(locationInterval.current)
            supabase.from('driver_details').update({ is_available: true }).eq('id', profile.id)
            navigate('/')
          }
          if (updated.status === 'completed') {
            clearInterval(locationInterval.current)
            setTimeout(() => navigate('/'), 2500)
          }
        }
      ).subscribe()
    return () => { supabase.removeChannel(sub); clearInterval(locationInterval.current) }
  }, [rideId])

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return
    const L = window.L
    leafletMap.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([19.133, 72.913], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(leafletMap.current)
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current)
  }, [])

  useEffect(() => {
    if (ride) updateMap()
  }, [ride])

  async function fetchRide() {
    const { data } = await supabase.from('rides').select('*').eq('id', rideId).single()
    if (data) {
      setRide(data)
      setOtpVerified(data.otp_verified)
      fetchStudent(data.student_id)
      if (data.status === 'cancelled') navigate('/')
    }
  }

  async function fetchStudent(studentId) {
    const { data } = await supabase.from('profiles').select('*').eq('id', studentId).single()
    setStudent(data)
  }

  function startLocationTracking() {
    updateLocation()
    locationInterval.current = setInterval(updateLocation, 8000)
  }

  function updateLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      await supabase.from('driver_details').update({
        current_lat: latitude, current_lng: longitude,
        last_location_update: new Date().toISOString()
      }).eq('id', profile.id)
      updateDriverMarker(latitude, longitude)
    }, null, { enableHighAccuracy: true })
  }

  function updateDriverMarker(lat, lng) {
    if (!leafletMap.current) return
    const L = window.L
    const pos = [lat, lng]
    if (markersRef.current.driver) {
      markersRef.current.driver.setLatLng(pos)
    } else {
      markersRef.current.driver = L.marker(pos, {
        icon: L.divIcon({
          html: '<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))">🛺</div>',
          iconSize: [32, 32], iconAnchor: [16, 16], className: ''
        })
      }).addTo(leafletMap.current)
    }
    updateRoute(lat, lng)
  }

  function updateStudentMarker(lat, lng) {
    if (!leafletMap.current) return
    const L = window.L
    const pos = [lat, lng]
    if (markersRef.current.student) {
      markersRef.current.student.setLatLng(pos)
    } else {
      markersRef.current.student = L.marker(pos, {
        icon: L.divIcon({
          html: '<div style="display:flex;flex-direction:column;align-items:center"><div style="font-size:24px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.6))">🧑‍🎓</div><div style="background:rgba(33,150,243,0.9);color:white;font-size:9px;padding:1px 5px;border-radius:4px;margin-top:1px;white-space:nowrap">Passenger</div></div>',
          iconSize: [50, 42], iconAnchor: [25, 42], className: ''
        })
      }).addTo(leafletMap.current)
    }
  }

  async function updateRoute(dLat, dLng) {
    if (!leafletMap.current || !ride) return
    const L = window.L
    const target = ['in_progress', 'otp_verified'].includes(ride.status)
      ? [ride.drop_lat, ride.drop_lng]
      : [ride.pickup_lat, ride.pickup_lng]
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${dLng},${dLat};${target[1]},${target[0]}?overview=full&geometries=geojson`
      )
      const data = await res.json()
      if (data.routes?.[0]) {
        if (routeRef.current) leafletMap.current.removeLayer(routeRef.current)
        routeRef.current = L.geoJSON(data.routes[0].geometry, {
          style: { color: '#00C853', weight: 4, opacity: 0.85 }
        }).addTo(leafletMap.current)
      }
    } catch (e) {}
  }

  function updateMap() {
    if (!leafletMap.current || !ride) return
    const L = window.L
    const map = leafletMap.current
    const makePin = (emoji, label) => L.divIcon({
      html: `<div style="display:flex;flex-direction:column;align-items:center"><div style="font-size:26px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.6))">${emoji}</div><div style="background:rgba(0,0,0,0.8);color:white;font-size:10px;padding:1px 6px;border-radius:4px;margin-top:2px;white-space:nowrap">${label}</div></div>`,
      iconSize: [50, 50], iconAnchor: [25, 40], className: ''
    })
    if (!markersRef.current.pickup) {
      markersRef.current.pickup = L.marker([ride.pickup_lat, ride.pickup_lng], { icon: makePin('📍', 'Pickup') }).addTo(map)
    }
    if (!markersRef.current.drop) {
      markersRef.current.drop = L.marker([ride.drop_lat, ride.drop_lng], { icon: makePin('🏁', 'Drop') }).addTo(map)
    }
    if (ride.student_lat && ride.student_lng) {
      updateStudentMarker(ride.student_lat, ride.student_lng)
    }
    map.fitBounds([[ride.pickup_lat, ride.pickup_lng], [ride.drop_lat, ride.drop_lng]], { padding: [80, 80], maxZoom: 16 })
  }

  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otpInput]
    newOtp[index] = value.slice(-1)
    setOtpInput(newOtp)
    setOtpError('')
    if (value && index < 3) otpRefs[index + 1].current?.focus()
    if (!value && index > 0) otpRefs[index - 1].current?.focus()
  }

  async function verifyOtp() {
    const entered = otpInput.join('')
    if (entered.length !== 4) { setOtpError('Enter all 4 digits'); return }
    if (entered !== student?.otp_pin?.trim()) {
      setOtpError('Incorrect OTP. Please try again.')
      setOtpInput(['', '', '', ''])
      otpRefs[0].current?.focus()
      return
    }
    await supabase.from('rides').update({ status: 'otp_verified', otp_verified: true, driver_entered_otp: entered }).eq('id', rideId)
    setOtpVerified(true)
  }

  async function startRide() {
    await supabase.from('rides').update({ status: 'in_progress' }).eq('id', rideId)
  }

  async function completeRide() {
    setCompleting(true)
    await supabase.from('rides').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', rideId)
    await supabase.from('driver_details').update({ is_available: true }).eq('id', profile.id)
    setCompleting(false)
  }

  const isPickupPhase = !['otp_verified', 'in_progress'].includes(ride?.status)
  const statusText = ride?.status === 'driver_assigned' ? 'Head to pickup'
    : ride?.status === 'otp_verified' ? 'OTP Verified — ready to go'
    : ride?.status === 'in_progress' ? 'Ride in progress'
    : 'Ride Completed'

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* Status bar — fixed above Leaflet */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 9999,
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(to bottom, rgba(8,11,10,0.97) 70%, transparent 100%)',
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          pointerEvents: 'auto'
        }}>
          <span style={{ fontSize: '20px' }}>
            {ride?.status === 'driver_assigned' ? '🧭'
              : ride?.status === 'otp_verified' ? '✅'
              : ride?.status === 'in_progress' ? '🚀' : '🏁'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--green)' }}>{statusText}</div>
            <div className="caption">
              {isPickupPhase
                ? ride?.pickup_address?.split(',')[0]
                : ride?.drop_address?.split(',')[0]}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', color: 'var(--green)', fontSize: '18px' }}>
            ₹{ride?.fare?.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Map — fills entire screen */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}/>
      </div>

      {/* Bottom sheet */}
      <div style={{
        background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
        borderRadius: '24px 24px 0 0', padding: '8px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '55vh', overflow: 'auto',
        position: 'relative', zIndex: 10,
        touchAction: 'pan-y'
      }}>
        <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '8px auto 16px' }}/>

        {/* Route summary */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)' }}/>
              <div style={{ width: '1px', height: '28px', background: 'var(--border)', margin: '4px 0' }}/>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--danger)' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                {ride?.pickup_address?.split(',').slice(0, 2).join(',')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                {ride?.drop_address?.split(',').slice(0, 2).join(',')}
              </div>
            </div>
          </div>
        </div>

        {/* Student info */}
        {student && (
          <div className="card" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            {student.avatar_url
              ? <img src={student.avatar_url} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border-green)' }}/>
              : <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--green-subtle)', border: '2px solid var(--border-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--green)', flexShrink: 0 }}>
                  {student.full_name?.[0]}
                </div>
            }
            <div>
              <div style={{ fontWeight: '600' }}>{student.full_name}</div>
              <div className="caption">Passenger</div>
            </div>
          </div>
        )}

        {/* OTP entry */}
        {!otpVerified && ride?.status === 'driver_assigned' && (
          <div className="card card-green" style={{ marginBottom: '12px' }}>
            <div className="label" style={{ color: 'var(--green)', marginBottom: '12px' }}>Enter Passenger OTP</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '14px' }}>
              {otpInput.map((digit, i) => (
                <input key={i} ref={otpRefs[i]} value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  maxLength={1} inputMode="numeric"
                  style={{
                    width: '56px', height: '64px', textAlign: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800',
                    background: 'var(--bg-elevated)',
                    border: `2px solid ${otpError ? 'var(--danger)' : digit ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius: '12px', color: 'var(--text-primary)', outline: 'none', padding: 0
                  }}
                />
              ))}
            </div>
            {otpError && <div style={{ color: 'var(--danger)', fontSize: '13px', textAlign: 'center', marginBottom: '10px' }}>{otpError}</div>}
            <button className="btn btn-primary" onClick={verifyOtp} disabled={otpInput.join('').length !== 4}>
              Verify OTP
            </button>
          </div>
        )}

        {/* Start ride */}
        {otpVerified && ride?.status === 'otp_verified' && (
          <button className="btn btn-primary" onClick={startRide} style={{ marginBottom: '12px', fontSize: '16px' }}>
            🚀 Start Ride
          </button>
        )}

        {/* Complete ride */}
        {ride?.status === 'in_progress' && (
          <button className="btn btn-primary" onClick={completeRide} disabled={completing} style={{ fontSize: '16px' }}>
            {completing ? <div className="spinner" style={{ borderTopColor: '#000' }}/> : '🏁 Complete Ride'}
          </button>
        )}

        {/* Completed */}
        {ride?.status === 'completed' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎉</div>
            <div className="title">Ride Complete!</div>
            <div style={{ color: 'var(--green)', fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', marginTop: '6px' }}>
              +₹{ride?.fare?.toFixed(0)}
            </div>
            <div className="caption" style={{ marginTop: '4px' }}>Returning to home...</div>
          </div>
        )}
      </div>
    </div>
  )
}