import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'

function AppRoutes() {
  const { user, loading } = useAuth()

  // Don't render anything until auth state is known
  if (loading) {
    return (
      <div className="min-h-screen bg-[#141210] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#534AB7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<div className="text-white">Landing</div>} />

      {/* Auth — redirect to library if already logged in */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/library" replace />
            : <AuthPage />
        }
      />

      {/* Protected — redirect to login if not logged in */}
      <Route
        path="/library"
        element={
          user
            ? <ProtectedRoute><div className="text-white">Library</div></ProtectedRoute>
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/read/:docId"
        element={
          user
            ? <ProtectedRoute><div className="text-white">Reader</div></ProtectedRoute>
            : <Navigate to="/login" replace />
        }
      />
      <Route
        path="/canvas/:canvasId"
        element={
          user
            ? <ProtectedRoute><div className="text-white">Canvas</div></ProtectedRoute>
            : <Navigate to="/login" replace />
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
