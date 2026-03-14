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
  // ==========================================
  // Gates
  // ==========================================
  { name: 'Main Gate (Gate 1)', lat: 19.125616, lng: 72.916119, category: 'Gate' },
  { name: 'Gate 2 (Vihar Road)', lat: 19.126200, lng: 72.915400, category: 'Gate' },
  { name: 'Gate 3', lat: 19.138400, lng: 72.907400, category: 'Gate' },
  { name: 'Y-Point Gate', lat: 19.129146, lng: 72.918957, category: 'Gate' },
  { name: 'KV Gate', lat: 19.140500, lng: 72.916100, category: 'Gate' },

  // ==========================================
  // Hostels
  // ==========================================
  { name: 'Hostel 1', lat: 19.136289, lng: 72.914273, category: 'Hostel' },
  { name: 'Hostel 2', lat: 19.135971, lng: 72.912534, category: 'Hostel' },
  { name: 'Hostel 3', lat: 19.136386, lng: 72.911287, category: 'Hostel' },
  { name: 'Hostel 4', lat: 19.135500, lng: 72.910500, category: 'Hostel' },
  { name: 'Hostel 5', lat: 19.134900, lng: 72.909600, category: 'Hostel' },
  { name: 'Hostel 6', lat: 19.134300, lng: 72.909000, category: 'Hostel' },
  { name: 'Hostel 7', lat: 19.133800, lng: 72.908500, category: 'Hostel' },
  { name: 'Hostel 8', lat: 19.134800, lng: 72.907500, category: 'Hostel' },
  { name: 'Hostel 9', lat: 19.135783, lng: 72.908401, category: 'Hostel' },
  { name: 'Hostel 10', lat: 19.128894, lng: 72.915800, category: 'Hostel' },
  { name: 'Hostel 11', lat: 19.128400, lng: 72.916200, category: 'Hostel' },
  { name: 'Hostel 12', lat: 19.135534, lng: 72.905740, category: 'Hostel' },
  { name: 'Hostel 13', lat: 19.134212, lng: 72.904765, category: 'Hostel' },
  { name: 'Hostel 14', lat: 19.133500, lng: 72.904000, category: 'Hostel' },
  { name: 'Hostel 15', lat: 19.137420, lng: 72.914014, category: 'Hostel' },
  { name: 'Hostel 16', lat: 19.137546, lng: 72.912789, category: 'Hostel' },
  { name: 'Hostel 17 (Udaygiri)', lat: 19.138000, lng: 72.911000, category: 'Hostel' },
  { name: 'Hostel 18 (Ambikaniketan)', lat: 19.138500, lng: 72.912000, category: 'Hostel' },
  { name: 'Hostel 19 (Gulmohar)', lat: 19.129798, lng: 72.915160, category: 'Hostel' },
  { name: 'Hostel 20 (Alaknanda)', lat: 19.138200, lng: 72.911500, category: 'Hostel' },
  { name: 'Hostel 21 (Tapti)', lat: 19.137000, lng: 72.911000, category: 'Hostel' },
  { name: 'Tansa House (PG)', lat: 19.133400, lng: 72.917000, category: 'Hostel' },

  // ==========================================
  // Academic
  // ==========================================
  { name: 'Main Building', lat: 19.132789, lng: 72.915144, category: 'Academic' },
  { name: 'Convocation Hall', lat: 19.131944, lng: 72.914367, category: 'Academic' },
  { name: 'Central Library', lat: 19.134169, lng: 72.915159, category: 'Academic' },
  { name: 'Victor Menezes Convention Centre (VMCC)', lat: 19.131100, lng: 72.915200, category: 'Academic' },
  { name: 'Department of CSE', lat: 19.131028, lng: 72.915912, category: 'Academic' },
  { name: 'Department of EE', lat: 19.131974, lng: 72.917301, category: 'Academic' },
  { name: 'Department of Mechanical', lat: 19.133358, lng: 72.916431, category: 'Academic' },
  { name: 'Lecture Hall Complex (LHC)', lat: 19.132282, lng: 72.915830, category: 'Academic' },
  { name: 'Shailesh J. Mehta School of Management (SJMSOM)', lat: 19.131702, lng: 72.915738, category: 'Academic' },
  { name: 'Industrial Design Centre (IDC)', lat: 19.133383, lng: 72.917177, category: 'Academic' },
  { name: 'Department of Aerospace Engineering', lat: 19.131210, lng: 72.918557, category: 'Academic' },
  { name: 'Mathematics Department', lat: 19.134074, lng: 72.915818, category: 'Academic' },
  { name: 'Center of Systems and Control Engineering (SysCon)', lat: 19.134730, lng: 72.915729, category: 'Academic' },
  { name: 'C.S.R.E', lat: 19.132146, lng: 72.917733, category: 'Academic' },
  
  // ==========================================
  // Facilities
  // ==========================================
  { name: 'SAC (Student Activity Centre)', lat: 19.134764, lng: 72.913459, category: 'Facility' },
  { name: 'Gymkhana Ground', lat: 19.135271, lng: 72.911678, category: 'Facility' },
  { name: 'Swimming Pool', lat: 19.135000, lng: 72.912000, category: 'Facility' },
  { name: 'Hospital (Health Centre)', lat: 19.126500, lng: 72.916200, category: 'Facility' },
  { name: 'IIT Market', lat: 19.124000, lng: 72.918000, category: 'Facility' },
  { name: 'Himalaya Canteen', lat: 19.129800, lng: 72.916000, category: 'Facility' },
  { name: 'New SAC', lat: 19.134800, lng: 72.913000, category: 'Facility' },
  { name: 'Staff Colony', lat: 19.141000, lng: 72.911000, category: 'Facility' },
  { name: 'State Bank of India (SBI)', lat: 19.125150, lng: 72.916294, category: 'Facility' },
  { name: 'Campus School', lat: 19.127758, lng: 72.918043, category: 'Facility' },
  { name: 'VanVihar Guest House', lat: 19.129856, lng: 72.914735, category: 'Facility' }
];