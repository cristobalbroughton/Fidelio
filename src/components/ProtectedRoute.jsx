import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { isCashierSession } from '../lib/cashierSession'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading && !isCashierSession()) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!user && !isCashierSession()) return <Navigate to="/login" replace />

  return children
}
