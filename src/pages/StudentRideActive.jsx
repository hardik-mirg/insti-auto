import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getDistanceKm } from '../utils/fare'
import { usePushNotifications, sendPushToUser } from '../hooks/usePush'

const STATUS_LABELS = {
  searching: { text: 'Finding your driver', color: 'var(--warning)', icon: '🔍' },
  driver_assigned: { text: 'Driver on the way', color: 'var(--green)', icon: '🛺' },
  otp_verified: { text: 'OTP Verified — Boarding', color: 'var(--green)', icon: '✅' },
  in_progress: { text: 'On the way', color: 'var(--green)', icon: '🚀' },
  completed: { text: 'Ride completed', color: 'var(--text-secondary)', icon: '🏁' },
  cancelled: { text: 'Cancelled', color: 'var(--danger)', icon: '❌' },
}

export default function StudentRideActive() {
  const { rideId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  usePushNotifications(profile?.id)
  const [ride, setRide] = useState(null)
  const [driver, setDriver] = useState(null)
  const [driverDetails, setDriverDetails] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef({})
  const routeRef = useRef(null)
  const routeDebounce = useRef(null)
  const searchTimer = useRef(null)
  const [searchPhase, setSearchPhase] = useState(1)
  const [eta, setEta] = useState(null)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const paymentRequestedRef = useRef(false)
  const studentLocInterval = useRef(null)
  const mapFitted = useRef(false)

  useEffect(() => {
    fetchRide()
    const sub = supabase
      .channel(`ride-${rideId}-${Date.now()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
        (payload) => {
          const updated = payload.new
          const old = payload.old
          // Ignore updates that only changed student location — avoid spamming handleRideUpdate
          const onlyLocationChanged =
            updated.student_lat !== old?.student_lat ||
            updated.student_lng !== old?.student_lng
          const anythingElseChanged =
            updated.status !== old?.status ||
            updated.driver_id !== old?.driver_id ||
            updated.payment_requested !== old?.payment_requested
          if (anythingElseChanged || updated.payment_requested) {
            handleRideUpdate(updated)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(sub); clearTimeout(searchTimer.current); if (studentLocInterval.current) navigator.geolocation.clearWatch(studentLocInterval.current) }
  }, [rideId])

  useEffect(() => {
    if (driver) {
      // Subscribe to driver location updates
      const sub = supabase
        .channel(`driver-loc-${driver.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'driver_details', filter: `id=eq.${driver.id}` },
          (payload) => {
            updateDriverMarker(payload.new.current_lat, payload.new.current_lng, ride)
          }
        )
        .subscribe()
      return () => supabase.removeChannel(sub)
    }
  }, [driver])

  useEffect(() => {
    // Load Leaflet map
    if (!mapRef.current || leafletMap.current) return
    const L = window.L
    leafletMap.current = L.map(mapRef.current, { zoomControl: false, attributionControl: false })
      .setView([19.133, 72.913], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(leafletMap.current)
    L.control.zoom({ position: 'bottomright' }).addTo(leafletMap.current)
    setMapLoaded(true)
  }, [])

  useEffect(() => {
    if (mapLoaded && ride) updateMap()
  }, [mapLoaded, ride, driver, driverDetails])

  async function fetchRide() {
    const { data } = await supabase.from('rides').select('*').eq('id', rideId).single()
    if (data) {
      setRide(data)
      if (data.driver_id) fetchDriver(data.driver_id)
      if (data.status === 'searching') startSearchExpansion()
      if (['driver_assigned', 'otp_verified', 'in_progress'].includes(data.status)) {
        startStudentLocationBroadcast(data.id)
      }
      if (data.payment_requested) {
        paymentRequestedRef.current = true
        setShowPaymentPopup(true)
      }
      if (data.status === 'completed' || data.status === 'cancelled') {
        if (studentLocInterval.current) navigator.geolocation.clearWatch(studentLocInterval.current)
        setTimeout(() => navigate('/'), 3000)
      }
    }
  }

  function startStudentLocationBroadcast(rideId) {
    if (!navigator.geolocation) return
    // Use watchPosition instead of setInterval to avoid geolocation violation
    if (studentLocInterval.current) navigator.geolocation.clearWatch(studentLocInterval.current)
    studentLocInterval.current = navigator.geolocation.watchPosition(
      async (pos) => {
        await supabase.from('rides').update({
          student_lat: pos.coords.latitude,
          student_lng: pos.coords.longitude
        }).eq('id', rideId)
      },
      null,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }

  async function handleRideUpdate(newRide) {
    setRide(newRide)
    if (newRide.driver_id && !driver) fetchDriver(newRide.driver_id)
    if (['driver_assigned', 'otp_verified', 'in_progress'].includes(newRide.status)) {
      startStudentLocationBroadcast(newRide.id)
    }
    // Show payment popup when driver requests payment
    console.log('Ride update received, payment_requested:', newRide.payment_requested, 'ref:', paymentRequestedRef.current)
    if (newRide.payment_requested && !paymentRequestedRef.current) {
      console.log('Showing payment popup!')
      paymentRequestedRef.current = true
      setShowPaymentPopup(true)
    }
    // Redraw route when OTP verified — now route to drop instead of pickup
    if (['otp_verified', 'in_progress'].includes(newRide.status) && driverDetails?.current_lat) {
      mapFitted.current = false // allow one refit to show new drop route
      drawStudentRoute(driverDetails.current_lat, driverDetails.current_lng, newRide)
    }
    if (newRide.status === 'completed' || newRide.status === 'cancelled') {
      if (studentLocInterval.current) navigator.geolocation.clearWatch(studentLocInterval.current)
      setTimeout(() => navigate('/'), 3000)
    }
  }

  async function fetchDriver(driverId) {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', driverId).single()
    const { data: d } = await supabase.from('driver_details').select('*').eq('id', driverId).single()
    setDriver(p)
    setDriverDetails(d)
    if (d?.current_lat && d?.current_lng) {
      const dist = getDistanceKm(d.current_lat, d.current_lng, ride?.pickup_lat, ride?.pickup_lng)
      setEta(Math.max(1, Math.round(dist / 0.25))) // ~15 km/h
    }
  }

  function startSearchExpansion() {
    // Every 30s expand search radius
    searchTimer.current = setTimeout(async () => {
      const { data: currentRide } = await supabase.from('rides').select('status, search_radius_km').eq('id', rideId).single()
      if (currentRide?.status !== 'searching') return
      
      const newRadius = (currentRide.search_radius_km || 1) + 1
      setSearchPhase(p => p + 1)
      
      if (newRadius <= 5) {
        await supabase.from('rides').update({ search_radius_km: newRadius }).eq('id', rideId)
        await expandDriverSearch(newRadius)
        startSearchExpansion()
      }
    }, 30000)
  }

  async function expandDriverSearch(radius) {
    const rideData = ride
    if (!rideData) return
    const { data: drivers } = await supabase
      .from('driver_details')
      .select('*, profiles!inner(id)')
      .eq('is_available', true)
      .not('current_lat', 'is', null)

    const nearbyDrivers = drivers?.filter(d => {
      const dist = getDistanceKm(rideData.pickup_lat, rideData.pickup_lng, d.current_lat, d.current_lng)
      return dist <= radius && dist > radius - 1
    })

    if (nearbyDrivers?.length) {
      const existingRequests = await supabase.from('ride_requests').select('driver_id').eq('ride_id', rideId)
      const existingIds = existingRequests.data?.map(r => r.driver_id) || []
      const newDrivers = nearbyDrivers.filter(d => !existingIds.includes(d.profiles.id))
      
      if (newDrivers.length) {
        await supabase.from('ride_requests').insert(newDrivers.map(d => ({
          ride_id: rideId, driver_id: d.profiles.id, status: 'pending'
        })))
      }
    }
  }

  function updateDriverMarker(lat, lng, currentRide) {
    if (!leafletMap.current) return
    const L = window.L
    const r = currentRide || ride
    const pos = [lat, lng]

    if (markersRef.current.driver) {
      markersRef.current.driver.setLatLng(pos)
    } else {
      markersRef.current.driver = L.marker(pos, {
        icon: L.divIcon({
          html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🛺</div>`,
          iconSize: [30, 30], iconAnchor: [15, 15], className: ''
        })
      }).addTo(leafletMap.current)
    }

    if (r) {
      const dist = getDistanceKm(lat, lng, r.pickup_lat, r.pickup_lng)
      setEta(Math.max(1, Math.round(dist / 0.25)))
      // Draw route: before OTP — driver to pickup. After OTP — driver to drop.
      drawStudentRoute(lat, lng, r)
    }
  }

  function drawStudentRoute(dLat, dLng, currentRide) {
    fetchStudentRoute(dLat, dLng, currentRide)
  }

  function fetchStudentRoute(dLat, dLng, currentRide) {
    const r = currentRide || ride
    if (!leafletMap.current || !r) return
    const L = window.L
    const otpDone = ['otp_verified', 'in_progress'].includes(r.status)
    const target = otpDone ? [r.drop_lat, r.drop_lng] : [r.pickup_lat, r.pickup_lng]

    const firstRoute = !routeRef.current
    if (routeRef.current) leafletMap.current.removeLayer(routeRef.current)

    routeRef.current = L.polyline([[dLat, dLng], target], {
      color: '#00C853', weight: 4, opacity: 0.85, dashArray: '8, 6'
    }).addTo(leafletMap.current)

    if (firstRoute) {
      leafletMap.current.fitBounds([[dLat, dLng], target], { padding: [80, 80], maxZoom: 17 })
      mapFitted.current = true
    }
  }

  function updateMap() {
    if (!leafletMap.current) return
    const L = window.L
    const map = leafletMap.current
    const otpDone = ride && ['otp_verified', 'in_progress'].includes(ride.status)

    const makeIcon = (emoji, size = 30) => L.divIcon({
      html: `<div style="font-size:${size}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))">${emoji}</div>`,
      iconSize: [size, size], iconAnchor: [size/2, size], className: ''
    })

    // Always show pickup
    if (ride?.pickup_lat && !markersRef.current.pickup) {
      markersRef.current.pickup = L.marker([ride.pickup_lat, ride.pickup_lng], { icon: makeIcon('📍') })
        .addTo(map)
    }
    // Show drop only after OTP verified
    if (otpDone && ride?.drop_lat && !markersRef.current.drop) {
      markersRef.current.drop = L.marker([ride.drop_lat, ride.drop_lng], { icon: makeIcon('🏁') })
        .addTo(map)
    }

    if (driverDetails?.current_lat) {
      updateDriverMarker(driverDetails.current_lat, driverDetails.current_lng, ride)
    }

    // Only fit bounds once on first load — don't re-center when student location updates
    if (!mapFitted.current) {
      const points = [
        driverDetails?.current_lat ? [driverDetails.current_lat, driverDetails.current_lng] : null,
        ride?.pickup_lat ? [ride.pickup_lat, ride.pickup_lng] : null,
        ['in_progress', 'otp_verified'].includes(ride?.status) ? [ride.drop_lat, ride.drop_lng] : null
      ].filter(Boolean)

      if (points.length > 0) {
        map.fitBounds(
          points.length === 1 ? L.latLngBounds([points[0], points[0]]).pad(0.01) : points,
          { padding: [50, 50], maxZoom: 16 }
        )
        mapFitted.current = true
      }
    }
  }

  async function cancelRide() {
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', rideId)
    // Notify driver
    if (ride?.driver_id) await sendPushToUser(ride.driver_id, '❌ Ride Cancelled', 'The student has cancelled the ride.')
    navigate('/')
  }

  const status = STATUS_LABELS[ride?.status] || STATUS_LABELS.searching

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* Status bar — fixed above everything including Leaflet */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 9999,
        padding: '12px 16px',
        paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
        background: 'linear-gradient(to bottom, rgba(8,11,10,0.97) 60%, transparent 100%)',
        display: 'flex', alignItems: 'center', gap: '12px',
        pointerEvents: 'none'
      }}>
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: '10px',
          flex: 1, pointerEvents: 'auto'
        }}>
          <span style={{ fontSize: '20px' }}>{status.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: status.color }}>{status.text}</div>
            {ride?.status === 'searching' && <div className="caption">Phase {searchPhase} · expanding search...</div>}
            {eta && ride?.status === 'driver_assigned' && <div className="caption">ETA: ~{eta} min</div>}
          </div>
          {ride?.status === 'searching' && <div className="spinner"/>}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }}/>
      </div>

      {/* Bottom panel */}
      <div style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        borderRadius: '24px 24px 0 0',
        padding: '8px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
        maxHeight: '55vh',
        overflow: 'auto'
      }}>
        <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '8px auto 16px' }}/>

        {/* OTP — always show */}
        <div className="card card-green" style={{ marginBottom: '16px', textAlign: 'center' }}>
          <div className="label" style={{ color: 'var(--green)', marginBottom: '4px' }}>Your OTP</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '44px', fontWeight: '800',
            letterSpacing: '14px', color: 'var(--green)',
            textShadow: '0 0 24px rgba(0,200,83,0.5)'
          }}>{profile?.otp_pin}</div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Driver will enter this to verify your identity
          </p>
        </div>

        {/* Ride details */}
        <div className="card" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '3px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)' }}/>
              <div style={{ width: '1px', height: '28px', background: 'var(--border)' }}/>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--danger)' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', marginBottom: '10px' }}>{ride?.pickup_address?.split(',').slice(0, 2).join(',')}</div>
              <div style={{ fontSize: '14px' }}>{ride?.drop_address?.split(',').slice(0, 2).join(',')}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', color: 'var(--green)' }}>
                ₹{ride?.fare?.toFixed(0)}
              </div>
              <div className="caption">{ride?.distance_km?.toFixed(1)} km</div>
            </div>
          </div>
        </div>

        {/* Driver info */}
        {driver && (
          <div className="card" style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--green-subtle)', border: '2px solid var(--border-green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', flexShrink: 0
            }}>🛺</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>{driver.full_name}</div>
              <div className="caption">{driverDetails?.vehicle_number}</div>
            </div>
            {eta && <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '700', color: 'var(--green)', fontSize: '18px' }}>{eta}</div>
              <div className="caption">min away</div>
            </div>}
          </div>
        )}

        {ride?.status === 'completed' && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--green)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div className="title">Ride Complete!</div>
            <div className="caption" style={{ marginTop: '4px' }}>Redirecting you home...</div>
          </div>
        )}

        {/* Cancel */}
        {['searching', 'driver_assigned'].includes(ride?.status) && (
          <button className="btn btn-danger" onClick={cancelRide} style={{ marginTop: '4px' }}>
            Cancel Ride
          </button>
        )}
      </div>
      {/* Payment popup */}
      {showPaymentPopup && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end'
        }}>
          <div className="bottom-sheet slide-up" style={{ width: '100%', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🙏</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', marginBottom: '6px' }}>
                Please Pay Your Driver
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Your ride is complete. Please pay the fare in cash.
              </p>
            </div>

            <div style={{
              background: 'var(--green-subtle)',
              border: '1px solid var(--border-green)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div className="label" style={{ color: 'var(--green)', marginBottom: '6px' }}>Amount to pay</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '52px',
                fontWeight: '800',
                color: 'var(--green)',
                textShadow: '0 0 30px rgba(0,200,83,0.4)',
                lineHeight: 1
              }}>
                ₹{ride?.fare?.toFixed(0)}
              </div>
              <div className="caption" style={{ marginTop: '6px' }}>{ride?.distance_km?.toFixed(1)} km · Cash payment</div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowPaymentPopup(false)}
              style={{ fontSize: '16px', padding: '16px' }}
            >
              ✓ Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}