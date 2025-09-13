import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import TeacherPage from './pages/TeacherPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import DebugPanel from './components/common/DebugPanel'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
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
          
          {/* Debug Panel - Only in development */}
          {import.meta.env.DEV && <DebugPanel />}
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App