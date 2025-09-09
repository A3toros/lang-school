import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import TeacherPage from './pages/TeacherPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-neutral-50">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute role="teacher">
                  <TeacherPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App