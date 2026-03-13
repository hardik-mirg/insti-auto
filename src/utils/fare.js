/**
 * Mumbai Auto Rickshaw Fare Calculator
 * Based on official Maharashtra government meter rates (2024-2026)
 * Source: Maharashtra Motor Vehicles Department
 * 
 * Current official rates:
 * - Minimum fare (up to 1.5 km): ₹26
 * - Per km after 1.5 km: ₹17.33/km
 * - Waiting charges: ₹1.50 per minute
 * - Night charges (midnight to 5 AM): 25% extra on metered fare
 */

const MINIMUM_FARE = 26        // ₹ minimum
const MIN_FARE_KM = 1.5        // km covered in minimum fare
const RATE_PER_KM = 17.33      // ₹ per km after minimum
const NIGHT_SURCHARGE = 0.25   // 25% extra

export function calculateFare(distanceKm, isNight = false) {
  let fare = MINIMUM_FARE

  if (distanceKm > MIN_FARE_KM) {
    const extraKm = distanceKm - MIN_FARE_KM
    fare += extraKm * RATE_PER_KM
  }

  if (isNight) {
    fare *= (1 + NIGHT_SURCHARGE)
  }

  // Round to nearest ₹0.50 (as meters do)
  fare = Math.ceil(fare * 2) / 2

  return Math.round(fare * 100) / 100
}

export function isNightTime() {
  const hour = new Date().getHours()
  return hour >= 0 && hour < 5
}

export function getFareBreakdown(distanceKm) {
  const night = isNightTime()
  const fare = calculateFare(distanceKm, night)
  
  return {
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    baseFare: MINIMUM_FARE,
    extraCharge: distanceKm > MIN_FARE_KM 
      ? Math.round((distanceKm - MIN_FARE_KM) * RATE_PER_KM * 100) / 100 
      : 0,
    nightSurcharge: night,
    total: fare,
    ratePerKm: RATE_PER_KM,
    minFareKm: MIN_FARE_KM
  }
}

/**
 * Calculate straight-line distance between two coordinates (Haversine formula)
 * Returns distance in km
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

// IITB campus key locations for quick selection
export const IITB_LOCATIONS = [
  { name: 'Main Gate', lat: 19.1334, lng: 72.9133 },
  { name: 'Gate 2 (Vihar)', lat: 19.1450, lng: 72.9143 },
  { name: 'Hostel 1', lat: 19.1317, lng: 72.9143 },
  { name: 'Hostel 5', lat: 19.1295, lng: 72.9162 },
  { name: 'Hostel 10', lat: 19.1350, lng: 72.9177 },
  { name: 'Hostel 12', lat: 19.1370, lng: 72.9169 },
  { name: 'Hostel 16', lat: 19.1307, lng: 72.9104 },
  { name: 'Convocation Hall', lat: 19.1330, lng: 72.9155 },
  { name: 'SAC', lat: 19.1313, lng: 72.9131 },
  { name: 'Library', lat: 19.1340, lng: 72.9157 },
  { name: 'Powai Market', lat: 19.1199, lng: 72.9080 },
  { name: 'Powai Lake', lat: 19.1286, lng: 72.9060 },
  { name: 'Hiranandani Hospital', lat: 19.1142, lng: 72.9098 },
  { name: 'Kanjurmarg Station', lat: 19.0922, lng: 72.9389 },
  { name: 'Vikhroli Station', lat: 19.1033, lng: 72.9268 },
]
