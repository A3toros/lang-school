import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (role && user?.role !== role) {
    // Redirect to appropriate dashboard based on user role
    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />
    } else if (user?.role === 'teacher') {
      return <Navigate to="/teacher" replace />
    }
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
