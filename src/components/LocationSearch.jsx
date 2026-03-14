import { useState, useEffect, useRef } from 'react'
import { IITB_LOCATIONS } from '../utils/fare'

export default function LocationSearch({ label, value, onSelect, placeholder, icon }) {
  const [query, setQuery] = useState(value?.address || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Sync when parent updates value (e.g. geolocation)
  useEffect(() => {
    if (value?.address && value.address !== query) {
      setQuery(value.address)
    }
    if (!value) setQuery('')
  }, [value])

  function handleChange(e) {
    const q = e.target.value
    setQuery(q)

    if (!q.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    const matches = IITB_LOCATIONS.filter(l =>
      l.name.toLowerCase().includes(q.toLowerCase()) ||
      l.category.toLowerCase().includes(q.toLowerCase())
    )

    setResults(matches.slice(0, 8))
    setShowDropdown(matches.length > 0)
  }

  function select(location) {
    setQuery(location.name)
    setShowDropdown(false)
    onSelect({ address: location.name, lat: location.lat, lng: location.lng })
  }

  function clear() {
    setQuery('')
    setResults([])
    setShowDropdown(false)
    onSelect(null)
  }

  const categoryEmoji = {
    Gate: '🚧',
    Hostel: '🏠',
    Academic: '🎓',
    Facility: '🏛️',
  }

  return (
    <div style={{ position: 'relative' }}>
      {label && <div className="label" style={{ marginBottom: '6px' }}>{label}</div>}
      <div className="input-wrap">
        <span className="icon">{icon}</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (query) {
              handleChange({ target: { value: query } })
            } else {
              // Show all locations on focus if empty
              setResults(IITB_LOCATIONS.slice(0, 8))
              setShowDropdown(true)
            }
          }}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder={placeholder}
          style={{ paddingLeft: '42px', paddingRight: query ? '36px' : '14px' }}
        />
        {query && (
          <button
            onMouseDown={clear}
            style={{
              position: 'absolute', right: '10px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px', display: 'flex'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          zIndex: 200,
          boxShadow: 'var(--shadow)',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {results.map((loc, i) => (
            <button
              key={i}
              onMouseDown={() => select(loc)}
              style={{
                width: '100%', padding: '10px 14px',
                textAlign: 'left', background: 'transparent',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '16px', flexShrink: 0 }}>
                {categoryEmoji[loc.category] || '📍'}
              </span>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                  {loc.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {loc.category} · IIT Bombay
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && query.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)',
          left: 0, right: 0,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
          zIndex: 200,
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-muted)'
        }}>
          No campus locations found for "{query}"
        </div>
      )}
    </div>
  )
}