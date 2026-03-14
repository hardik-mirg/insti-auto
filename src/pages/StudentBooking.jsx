import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import LocationSearch from '../components/LocationSearch'
import { calculateFare, getDistanceKm, getFareBreakdown, isNightTime, isWithinCampus, IITB_LOCATIONS } from '../utils/fare'

function findNearestLocation(lat, lng) {
  let nearest = IITB_LOCATIONS[0]
  let minDist = Infinity
  for (const loc of IITB_LOCATIONS) {
    const d = getDistanceKm(lat, lng, loc.lat, loc.lng)
    if (d < minDist) { minDist = d; nearest = loc }
  }
  return nearest.name
}

export default function StudentBooking() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [pickup, setPickup] = useState(null)
  const [drop, setDrop] = useState(null)
  const [locating, setLocating] = useState(false)
  const [fareInfo, setFareInfo] = useState(null)
  const [booking, setBooking] = useState(false)
  const [step, setStep] = useState('select') // select | confirm

  useEffect(() => {
    if (pickup && drop) {
      const dist = getDistanceKm(pickup.lat, pickup.lng, drop.lat, drop.lng)
      setFareInfo(getFareBreakdown(dist))
    } else {
      setFareInfo(null)
    }
  }, [pickup, drop])

  function geolocate() {
    setLocating(true)

    // Step 1 — get coarse location fast (WiFi/cell), show it immediately
    navigator.geolocation.getCurrentPosition(
      async (coarsePos) => {
        const { latitude: lat, longitude: lng } = coarsePos.coords
        const addr = await reverseGeocode(lat, lng)
        setPickup({ lat, lng, address: addr })
        setLocating(false)

        // Step 2 — silently refine with GPS in background, update if meaningfully better
        navigator.geolocation.getCurrentPosition(
          async (finePos) => {
            const { latitude: fLat, longitude: fLng, accuracy } = finePos.coords
            // Only update if GPS gave significantly better accuracy (<20m)
            if (accuracy < 20) {
              const fineAddr = await reverseGeocode(fLat, fLng)
              setPickup({ lat: fLat, lng: fLng, address: fineAddr })
            }
          },
          () => {}, // silently ignore if GPS fails
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        )
      },
      (err) => {
        setLocating(false)
        if (err.code === 1) {
          alert('Location permission denied. Please allow location access and try again.')
        } else {
          alert('Could not get your location. Please enter it manually.')
        }
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
    )
  }

  async function bookRide() {
    if (!pickup || !drop || !fareInfo) return
    setBooking(true)
    
    const { data, error } = await supabase.from('rides').insert({
      student_id: profile.id,
      status: 'searching',
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickup.address,
      drop_lat: drop.lat,
      drop_lng: drop.lng,
      drop_address: drop.address,
      distance_km: fareInfo.distanceKm,
      fare: fareInfo.total,
    }).select().single()

    if (error) {
      alert('Failed to book ride. Please try again.')
      setBooking(false)
      return
    }

    // Trigger driver search via Supabase function (or handle client-side)
    await notifyNearbyDrivers(data.id, pickup)

    navigate(`/ride/${data.id}`)
  }

  async function notifyNearbyDrivers(rideId, pickupLocation) {
    // First try drivers with known location
    const { data: driversWithLocation } = await supabase
      .from('driver_details')
      .select('*, profiles!inner(id, full_name)')
      .eq('is_available', true)
      .not('current_lat', 'is', null)

    let driversToNotify = []

    if (driversWithLocation?.length) {
      // Sort by distance and take 5 nearest
      driversToNotify = driversWithLocation
        .map(d => ({
          ...d,
          dist: getDistanceKm(pickupLocation.lat, pickupLocation.lng, d.current_lat, d.current_lng)
        }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5)
    } else {
      // Fallback — notify ALL available drivers regardless of location
      const { data: allDrivers } = await supabase
        .from('driver_details')
        .select('*, profiles!inner(id, full_name)')
        .eq('is_available', true)
      driversToNotify = allDrivers || []
    }

    if (!driversToNotify.length) return

    await supabase.from('ride_requests').insert(
      driversToNotify.map(d => ({
        ride_id: rideId,
        driver_id: d.profiles.id,
        status: 'pending'
      }))
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border)'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <h2 className="headline">Book a Ride</h2>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        {/* Route line visual */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          {/* Pickup */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '14px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', flexShrink: 0 }}/>
              <div style={{ width: '2px', flex: 1, minHeight: '40px', background: 'linear-gradient(var(--green), var(--danger))', opacity: 0.4, marginTop: '4px' }}/>
            </div>
            <div style={{ flex: 1 }}>
              <LocationSearch
                label="PICKUP"
                value={pickup}
                onSelect={setPickup}
                placeholder="Where are you?"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
              />
              <button
                onClick={geolocate}
                disabled={locating}
                style={{
                  marginTop: '8px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'transparent', border: 'none',
                  color: 'var(--green)', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', padding: '0'
                }}
              >
                {locating ? <div className="spinner" style={{ width: '12px', height: '12px' }}/> :
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>
                }
                {locating ? 'Locating...' : 'Use my location'}
              </button>
            </div>
          </div>

          {/* Drop */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ paddingTop: '14px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--danger)', boxShadow: '0 0 8px var(--danger)', flexShrink: 0 }}/>
            </div>
            <div style={{ flex: 1 }}>
              <LocationSearch
                label="DROP"
                value={drop}
                onSelect={setDrop}
                placeholder="Where to?"
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>}
              />
            </div>
          </div>
        </div>

        {/* Fare card */}
        {fareInfo && (
          <div className="card card-green slide-up" style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div className="label" style={{ color: 'var(--green)', marginBottom: '4px' }}>Estimated Fare</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '40px',
                  fontWeight: '800',
                  color: 'var(--green)',
                  lineHeight: 1
                }}>
                  ₹{fareInfo.total.toFixed(0)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '2px' }}>{fareInfo.distanceKm} km</div>
                <div className="caption">road distance</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-green)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Min fare (≤1.5 km)</span>
                <span style={{ fontSize: '13px' }}>₹{fareInfo.baseFare}</span>
              </div>
              {fareInfo.extraCharge > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Extra @ ₹17.33/km</span>
                  <span style={{ fontSize: '13px' }}>₹{fareInfo.extraCharge.toFixed(2)}</span>
                </div>
              )}
              {fareInfo.nightSurcharge && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--warning)' }}>Night surcharge (25%)</span>
                  <span style={{ fontSize: '13px', color: 'var(--warning)' }}>included</span>
                </div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                🏛️ As per Maharashtra Govt. auto meter rates (2024-26)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Book button */}
      <div style={{
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--border)'
      }}>
        <button
          className="btn btn-primary"
          onClick={bookRide}
          disabled={!pickup || !drop || booking}
          style={{ fontSize: '16px', padding: '16px' }}
        >
          {booking ? <div className="spinner" style={{ borderTopColor: '#000' }}/> :
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          }
          {booking ? 'Finding drivers...' : fareInfo ? `Book for ₹${fareInfo.total.toFixed(0)}` : 'Select locations'}
        </button>
      </div>
    </div>
  )
}