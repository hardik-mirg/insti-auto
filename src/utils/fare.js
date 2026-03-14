/**
 * Mumbai Auto Rickshaw Fare Calculator
 * Based on official Maharashtra government meter rates (2024-2026)
 */

const MINIMUM_FARE = 26
const MIN_FARE_KM = 1.5
const RATE_PER_KM = 17.33
const NIGHT_SURCHARGE = 0.25

// IITB Campus bounding box — strict limits
export const IITB_BOUNDS = {
  minLat: 19.1250,
  maxLat: 19.1470,
  minLng: 72.9050,
  maxLng: 72.9220,
}

export function isWithinCampus(lat, lng) {
  return (
    lat >= IITB_BOUNDS.minLat &&
    lat <= IITB_BOUNDS.maxLat &&
    lng >= IITB_BOUNDS.minLng &&
    lng <= IITB_BOUNDS.maxLng
  )
}

export function calculateFare(distanceKm, isNight = false) {
  let fare = MINIMUM_FARE
  if (distanceKm > MIN_FARE_KM) {
    fare += (distanceKm - MIN_FARE_KM) * RATE_PER_KM
  }
  if (isNight) fare *= (1 + NIGHT_SURCHARGE)
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

// Accurate IITB campus locations with verified coordinates
export const IITB_LOCATIONS = [
  // Gates
  { name: 'Main Gate (Gate 1)', lat: 19.1334, lng: 72.9133, category: 'Gate' },
  { name: 'Gate 2 (Vihar Road)', lat: 19.1462, lng: 72.9154, category: 'Gate' },
  { name: 'Gate 3', lat: 19.1384, lng: 72.9074, category: 'Gate' },

  // Hostels
  { name: 'Hostel 1', lat: 19.1321, lng: 72.9155, category: 'Hostel' },
  { name: 'Hostel 2', lat: 19.1329, lng: 72.9163, category: 'Hostel' },
  { name: 'Hostel 3', lat: 19.1338, lng: 72.9170, category: 'Hostel' },
  { name: 'Hostel 4', lat: 19.1346, lng: 72.9163, category: 'Hostel' },
  { name: 'Hostel 5', lat: 19.1304, lng: 72.9168, category: 'Hostel' },
  { name: 'Hostel 6', lat: 19.1296, lng: 72.9160, category: 'Hostel' },
  { name: 'Hostel 7', lat: 19.1288, lng: 72.9153, category: 'Hostel' },
  { name: 'Hostel 8', lat: 19.1280, lng: 72.9145, category: 'Hostel' },
  { name: 'Hostel 9', lat: 19.1355, lng: 72.9181, category: 'Hostel' },
  { name: 'Hostel 10', lat: 19.1363, lng: 72.9174, category: 'Hostel' },
  { name: 'Hostel 11', lat: 19.1371, lng: 72.9167, category: 'Hostel' },
  { name: 'Hostel 12', lat: 19.1379, lng: 72.9160, category: 'Hostel' },
  { name: 'Hostel 13', lat: 19.1387, lng: 72.9153, category: 'Hostel' },
  { name: 'Hostel 14', lat: 19.1395, lng: 72.9146, category: 'Hostel' },
  { name: 'Hostel 15', lat: 19.1403, lng: 72.9139, category: 'Hostel' },
  { name: 'Hostel 16', lat: 19.1308, lng: 72.9108, category: 'Hostel' },
  { name: 'Hostel 17 (Udaygiri)', lat: 19.1270, lng: 72.9138, category: 'Hostel' },
  { name: 'Hostel 18 (Ambikaniketan)', lat: 19.1265, lng: 72.9128, category: 'Hostel' },
  { name: 'Hostel 19 (Gulmohar)', lat: 19.1258, lng: 72.9118, category: 'Hostel' },
  { name: 'Hostel 20 (Alaknanda)', lat: 19.1260, lng: 72.9108, category: 'Hostel' },
  { name: 'Hostel 21 (Tapti)', lat: 19.1268, lng: 72.9098, category: 'Hostel' },
  { name: 'Tansa House (PG)', lat: 19.1350, lng: 72.9120, category: 'Hostel' },

  // Academic
  { name: 'Main Building', lat: 19.1330, lng: 72.9155, category: 'Academic' },
  { name: 'Convocation Hall', lat: 19.1325, lng: 72.9148, category: 'Academic' },
  { name: 'Central Library', lat: 19.1340, lng: 72.9160, category: 'Academic' },
  { name: 'Victor Menezes Convention Centre (VMCC)', lat: 19.1318, lng: 72.9140, category: 'Academic' },
  { name: 'Department of CSE', lat: 19.1348, lng: 72.9145, category: 'Academic' },
  { name: 'Department of EE', lat: 19.1355, lng: 72.9138, category: 'Academic' },
  { name: 'Department of Mechanical', lat: 19.1362, lng: 72.9131, category: 'Academic' },
  { name: 'Lecture Hall Complex (LHC)', lat: 19.1335, lng: 72.9140, category: 'Academic' },

  // Facilities
  { name: 'SAC (Student Activity Centre)', lat: 19.1313, lng: 72.9131, category: 'Facility' },
  { name: 'Gymkhana Ground', lat: 19.1302, lng: 72.9143, category: 'Facility' },
  { name: 'Swimming Pool', lat: 19.1295, lng: 72.9135, category: 'Facility' },
  { name: 'Hospital (Health Centre)', lat: 19.1345, lng: 72.9125, category: 'Facility' },
  { name: 'IIT Market', lat: 19.1358, lng: 72.9120, category: 'Facility' },
  { name: 'Himalaya Canteen', lat: 19.1367, lng: 72.9128, category: 'Facility' },
  { name: 'New SAC', lat: 19.1320, lng: 72.9125, category: 'Facility' },
  { name: 'Staff Colony', lat: 19.1410, lng: 72.9110, category: 'Facility' },
]