import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (user) {
    const hasOnboarded = !!user?.user_metadata?.business_name
    return <Navigate to={hasOnboarded ? '/dashboard' : '/onboarding'} replace />
  }

  return children
}
