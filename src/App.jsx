import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RoleSelectPage from './pages/RoleSelectPage'
import StudentHome from './pages/StudentHome'
import StudentBooking from './pages/StudentBooking'
import StudentRideActive from './pages/StudentRideActive'
import DriverHome from './pages/DriverHome'
import DriverRideActive from './pages/DriverRideActive'
import LoadingScreen from './components/LoadingScreen'
import './styles/global.css'

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <LoginPage />
  if (!profile) return <RoleSelectPage />

  if (profile.role === 'student') {
    return (
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/book" element={<StudentBooking />} />
        <Route path="/ride/:rideId" element={<StudentRideActive />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    )
  }

  if (profile.role === 'driver') {
    return (
      <Routes>
        <Route path="/" element={<DriverHome />} />
        <Route path="/ride/:rideId" element={<DriverRideActive />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    )
  }

  return <Navigate to="/" />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
