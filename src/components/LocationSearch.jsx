import { useState, useRef, useEffect } from 'react'
import { IITB_LOCATIONS } from '../utils/fare'

export default function LocationSearch({ label, value, onSelect, placeholder, icon }) {
  const [query, setQuery] = useState(value?.address || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (value?.address && query !== value.address) setQuery(value.address)
  }, [value])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)
    
    if (!q.trim()) { setResults([]); setShowDropdown(false); return }
    
    // Filter IITB locations first
    const iitbMatches = IITB_LOCATIONS.filter(l =>
      l.name.toLowerCase().includes(q.toLowerCase())
    ).map(l => ({ display_name: l.name, lat: l.lat, lon: l.lng, isPreset: true }))

    if (iitbMatches.length > 0) {
      setResults(iitbMatches.slice(0, 4))
      setShowDropdown(true)
    }

    // Also search Nominatim with debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchNominatim(q, iitbMatches), 400)
  }

  async function searchNominatim(q, existing = []) {
    if (!q.trim() || q.length < 3) return
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Mumbai')}&format=json&limit=4&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      const combined = [...existing, ...data.map(r => ({
        display_name: r.display_name.split(',').slice(0, 2).join(', '),
        full_name: r.display_name,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        isPreset: false
      }))].slice(0, 6)
      setResults(combined)
      setShowDropdown(true)
    } catch (e) {}
    setLoading(false)
  }

  function select(result) {
    const addr = result.display_name
    setQuery(addr)
    setShowDropdown(false)
    onSelect({ address: addr, lat: parseFloat(result.lat), lng: parseFloat(result.lon) })
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && <div className="label" style={{ marginBottom: '6px' }}>{label}</div>}
      <div className="input-wrap">
        <span className="icon">{icon}</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder={placeholder}
          style={{ paddingLeft: '42px' }}
        />
        {loading && (
          <div style={{ position: 'absolute', right: '14px' }}>
            <div className="spinner" style={{ width: '14px', height: '14px' }}/>
          </div>
        )}
      </div>
      
      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0, right: 0,
          marginTop: '4px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: 'var(--shadow)'
        }}>
          {results.map((r, i) => (
            <button
              key={i}
              onMouseDown={() => select(r)}
              style={{
                width: '100%',
                padding: '11px 14px',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>
                {r.isPreset ? '⭐' : '📍'}
              </span>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: r.isPreset ? '600' : '400' }}>
                  {r.display_name}
                </div>
                {r.full_name && r.full_name !== r.display_name && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {r.full_name.split(',').slice(2, 4).join(',')}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
