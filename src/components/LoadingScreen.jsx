export default function LoadingScreen() {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      gap: '20px'
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="var(--border)" strokeWidth="2"/>
        <circle cx="24" cy="24" r="22" stroke="var(--green)" strokeWidth="2"
          strokeDasharray="138" strokeDashoffset="100"
          style={{ animation: 'spin 1s linear infinite', transformOrigin: '24px 24px' }}/>
        <path d="M18 24l4 4 8-8" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
      <span style={{ color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '0.5px' }}>InstiAuto</span>
    </div>
  )
}
