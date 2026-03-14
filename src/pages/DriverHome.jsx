import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getDistanceKm } from '../utils/fare'
import { usePushNotifications, sendPushToUser } from '../hooks/usePush'

export default function DriverHome() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  usePushNotifications(profile?.id)
  const [isAvailable, setIsAvailable] = useState(false)
  const [driverDetails, setDriverDetails] = useState(null)
  const [pendingRequest, setPendingRequest] = useState(null)
  const [rideData, setRideData] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [todayRides, setTodayRides] = useState(0)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const locationInterval = useRef(null)
  const [requestTimer, setRequestTimer] = useState(0)
  const timerRef = useRef(null)
  const channelRef = useRef(null)
  const pendingRequestRef = useRef(null)

  // Keep ref in sync with state so callbacks always see latest value
  useEffect(() => { pendingRequestRef.current = pendingRequest }, [pendingRequest])

  useEffect(() => {
    fetchDriverDetails()
    checkActiveRide()
    fetchTodayStats()
    // Always subscribe — even if offline, so going online shows requests
    subscribeToRequests()

    return () => {
      clearInterval(locationInterval.current)
      clearInterval(timerRef.current)
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function fetchDriverDetails() {
    const { data } = await supabase.from('driver_details').select('*').eq('id', profile.id).single()
    if (data) {
      setDriverDetails(data)
      setIsAvailable(data.is_available)
      if (data.is_available) {
        startLocationTracking()
        // Check for missed requests on every mount while online
        // Covers: after ride ends, after app refresh, after going online
        await checkMissedRequests()
      }
    }
  }

  async function checkActiveRide() {
    const { data } = await supabase.from('rides').select('*')
      .eq('driver_id', profile.id)
      .in('status', ['driver_assigned', 'otp_verified', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
    if (data?.length > 0) navigate(`/ride/${data[0].id}`)
  }

  async function fetchTodayStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { data } = await supabase.from('rides').select('fare')
      .eq('driver_id', profile.id).eq('status', 'completed')
      .gte('completed_at', today.toISOString())
    setTodayRides(data?.length || 0)
    setTodayEarnings(data?.reduce((s, r) => s + (r.fare || 0), 0) || 0)
  }

  function subscribeToRequests() {
    // Remove any existing channel first
    if (channelRef.current) supabase.removeChannel(channelRef.current)

    channelRef.current = supabase
      .channel(`driver-req-${profile.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_requests',
        filter: `driver_id=eq.${profile.id}`
      }, async (payload) => {
        console.log('New ride request received:', payload.new)
        if (pendingRequestRef.current) {
          console.log('Already have a pending request, ignoring')
          return
        }
        await loadRideRequest(payload.new)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rides'
      }, (payload) => {
        // If the ride we're showing got accepted by another driver, dismiss it
        if (
          pendingRequestRef.current &&
          payload.new.id === pendingRequestRef.current.ride_id &&
          payload.new.status !== 'searching'
        ) {
          console.log('Ride taken by another driver — dismissing')
          clearInterval(timerRef.current)
          setPendingRequest(null)
          setRideData(null)
          setRequestTimer(0)
        }
      })
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })
  }

  async function loadRideRequest(request) {
    const { data: ride, error } = await supabase
      .from('rides')
      .select('*')
      .eq('id', request.ride_id)
      .single()

    console.log('Loaded ride for request:', ride, error)
    if (!ride || ride.status !== 'searching') {
      console.log('Ride not in searching state:', ride?.status)
      return
    }

    setPendingRequest(request)
    setRideData(ride)
    setRequestTimer(20)

    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setRequestTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          rejectRequest(request, true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function startLocationTracking() {
    if (!navigator.geolocation) return
    updateLocation()
    clearInterval(locationInterval.current)
    locationInterval.current = setInterval(updateLocation, 10000)
  }

  function updateLocation() {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords
      await supabase.from('driver_details').update({
        current_lat: latitude,
        current_lng: longitude,
        last_location_update: new Date().toISOString()
      }).eq('id', profile.id)
    }, (err) => console.log('Geolocation error:', err), { enableHighAccuracy: true })
  }

  async function toggleAvailability() {
    setToggling(true)
    const newState = !isAvailable
    const { error } = await supabase.from('driver_details')
      .update({ is_available: newState })
      .eq('id', profile.id)

    if (!error) {
      setIsAvailable(newState)
      if (newState) {
        startLocationTracking()
        // Check for any pending requests that came in while driver was offline
        await checkMissedRequests()
      } else {
        clearInterval(locationInterval.current)
      }
    }
    setToggling(false)
  }

  async function checkMissedRequests() {
    console.log('checkMissedRequests called, driver id:', profile.id)
    const { data: requests, error: reqErr } = await supabase
      .from('ride_requests')
      .select('*')
      .eq('driver_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('Pending requests found:', requests, reqErr)
    if (!requests?.length) return

    for (const request of requests) {
      console.log('Request object:', JSON.stringify(request))
      const { data: ride, error: rideErr } = await supabase
        .from('rides')
        .select('id, status')
        .eq('id', request.ride_id)
        .maybeSingle()

      console.log('Ride for request', request.ride_id, '— status:', ride?.status, 'error:', rideErr)
      if (ride?.status === 'searching') {
        console.log('Loading missed request:', request)
        await loadRideRequest(request)
        return
      }
    }
    console.log('No valid missed requests found')
  }

  async function acceptRequest() {
    if (!pendingRequest || !rideData) return
    clearInterval(timerRef.current)

    // Only update if ride is STILL searching — prevents double accepts
    const { data: updated, error } = await supabase
      .from('rides')
      .update({
        status: 'driver_assigned',
        driver_id: profile.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', rideData.id)
      .eq('status', 'searching') // atomic check — only succeeds if still searching
      .select()
      .single()

    if (error || !updated) {
      // Another driver already accepted — dismiss the request
      setPendingRequest(null)
      setRideData(null)
      setRequestTimer(0)
      return
    }

    await supabase.from('ride_requests').update({ status: 'accepted' }).eq('id', pendingRequest.id)
    await supabase.from('driver_details').update({ is_available: false }).eq('id', profile.id)
    // Notify student that driver accepted
    await sendPushToUser(rideData.student_id, '🛺 Driver Accepted!', `Your driver is on the way. Share your OTP when they arrive.`)
    navigate(`/ride/${rideData.id}`)
  }

  async function rejectRequest(request = pendingRequest, expired = false) {
    clearInterval(timerRef.current)
    if (request) {
      await supabase.from('ride_requests')
        .update({ status: expired ? 'expired' : 'rejected' })
        .eq('id', request.id)
    }
    setPendingRequest(null)
    setRideData(null)
    setRequestTimer(0)
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="label" style={{ marginBottom: '2px' }}>Driver</div>
            <h2 className="headline">{profile?.full_name?.split(' ')[0]}</h2>
          </div>
          <span className={`badge ${isAvailable ? 'badge-green' : 'badge-red'}`}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}/>
            {isAvailable ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Toggle button */}
        <button
          onClick={toggleAvailability}
          disabled={toggling}
          style={{
            width: '100%',
            background: isAvailable
              ? 'rgba(255,82,82,0.1)'
              : 'linear-gradient(135deg, var(--green) 0%, var(--green-dim) 100%)',
            border: isAvailable ? '1px solid rgba(255,82,82,0.3)' : 'none',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            boxShadow: isAvailable ? 'none' : '0 8px 32px rgba(0,200,83,0.3)',
            transition: 'all 0.3s'
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800',
              color: isAvailable ? 'var(--danger)' : '#000', marginBottom: '4px'
            }}>
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </div>
            <div style={{ fontSize: '13px', color: isAvailable ? 'var(--danger)' : 'rgba(0,0,0,0.65)' }}>
              {isAvailable ? 'Stop receiving ride requests' : 'Start accepting ride requests'}
            </div>
          </div>
          <div style={{ fontSize: '40px' }}>{isAvailable ? '🔴' : '🟢'}</div>
        </button>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800', color: 'var(--green)' }}>
              ₹{todayEarnings.toFixed(0)}
            </div>
            <div className="caption">Today's earnings</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: '800' }}>
              {todayRides}
            </div>
            <div className="caption">Rides today</div>
          </div>
        </div>

        {/* Vehicle */}
        {driverDetails && (
          <div className="card">
            <div className="label" style={{ marginBottom: '12px' }}>Vehicle</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '32px' }}>🛺</div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '16px' }}>{driverDetails.vehicle_number || 'Not set'}</div>
                <div className="caption">Auto Rickshaw</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign out */}
      <div style={{
        padding: '12px 20px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--border)'
      }}>
        <button className="btn btn-ghost" onClick={signOut} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Sign out
        </button>
      </div>

      {/* Ride request overlay */}
      {pendingRequest && rideData && (
        <div className="overlay">
          <div className="bottom-sheet slide-up" style={{ width: '100%', paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="title">New Ride Request</div>
              <div style={{
                width: '40px', height: '40px',
                background: requestTimer <= 5 ? 'rgba(255,82,82,0.2)' : 'var(--green-subtle)',
                border: `2px solid ${requestTimer <= 5 ? 'var(--danger)' : 'var(--green)'}`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', fontWeight: '800',
                color: requestTimer <= 5 ? 'var(--danger)' : 'var(--green)',
                fontSize: '16px', transition: 'all 0.3s'
              }}>
                {requestTimer}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)' }}/>
                  <div style={{ width: '1px', height: '30px', background: 'var(--border)', margin: '4px 0' }}/>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--danger)' }}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', marginBottom: '14px', color: 'var(--text-secondary)' }}>
                    {rideData.pickup_address?.split(',').slice(0, 2).join(',')}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {rideData.drop_address?.split(',').slice(0, 2).join(',')}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800', color: 'var(--green)' }}>
                    ₹{rideData.fare?.toFixed(0)}
                  </div>
                  <div className="caption">Fare</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800' }}>
                    {rideData.distance_km?.toFixed(1)}
                  </div>
                  <div className="caption">km total</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: '800' }}>
                    {driverDetails?.current_lat
                      ? getDistanceKm(driverDetails.current_lat, driverDetails.current_lng, rideData.pickup_lat, rideData.pickup_lng).toFixed(1)
                      : '—'}
                  </div>
                  <div className="caption">km away</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <button className="btn btn-danger" onClick={() => rejectRequest()}>Reject</button>
              <button className="btn btn-primary" onClick={acceptRequest} style={{ fontSize: '16px' }}>
                ✓ Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}