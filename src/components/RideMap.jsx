import { useEffect, useRef } from 'react'

// Leaflet loaded via CDN in index.html
const L = window.L

export default function RideMap({ 
  center, 
  zoom = 15,
  driverPos, 
  pickupPos, 
  dropPos,
  style = {}
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef({})
  const routeRef = useRef(null)

  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return

    mapInstance.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center || [19.133, 72.913], zoom)

    // Use free OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(mapInstance.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current)

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return
    if (center) mapInstance.current.setView(center, zoom)
  }, [center, zoom])

  useEffect(() => {
    if (!mapInstance.current) return
    updateMarkers()
    drawRoute()
  }, [driverPos, pickupPos, dropPos])

  function makeIcon(color, emoji, size = 36) {
    return L.divIcon({
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:2px solid white;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        font-size:${size * 0.45}px;
      "><span style="transform:rotate(45deg)">${emoji}</span></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      className: ''
    })
  }

  function updateMarkers() {
    const map = mapInstance.current

    if (driverPos) {
      if (markersRef.current.driver) {
        markersRef.current.driver.setLatLng(driverPos)
      } else {
        markersRef.current.driver = L.marker(driverPos, { icon: makeIcon('#00C853', '🛺') })
          .addTo(map)
          .bindPopup('Driver')
      }
    }

    if (pickupPos) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng(pickupPos)
      } else {
        markersRef.current.pickup = L.marker(pickupPos, { icon: makeIcon('#2196F3', '📍') })
          .addTo(map)
          .bindPopup('Pickup')
      }
    }

    if (dropPos) {
      if (markersRef.current.drop) {
        markersRef.current.drop.setLatLng(dropPos)
      } else {
        markersRef.current.drop = L.marker(dropPos, { icon: makeIcon('#FF5252', '🏁') })
          .addTo(map)
          .bindPopup('Destination')
      }
    }

    // Fit bounds if multiple points
    const points = [driverPos, pickupPos, dropPos].filter(Boolean)
    if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
    }
  }

  async function drawRoute() {
    if (!mapInstance.current) return

    // Use OSRM free routing API
    const points = [driverPos, pickupPos, dropPos].filter(Boolean)
    if (points.length < 2) return

    try {
      const coords = points.map(p => `${p[1]},${p[0]}`).join(';')
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      )
      const data = await res.json()
      
      if (data.routes?.[0]) {
        if (routeRef.current) mapInstance.current.removeLayer(routeRef.current)
        routeRef.current = L.geoJSON(data.routes[0].geometry, {
          style: { color: '#00C853', weight: 4, opacity: 0.8 }
        }).addTo(mapInstance.current)
      }
    } catch (e) {
      // Fallback: draw straight line
      if (routeRef.current) mapInstance.current.removeLayer(routeRef.current)
      routeRef.current = L.polyline(points, {
        color: '#00C853', weight: 3, dashArray: '8,6', opacity: 0.7
      }).addTo(mapInstance.current)
    }
  }

  return <div ref={mapRef} style={{ width: '100%', height: '100%', ...style }} />
}
