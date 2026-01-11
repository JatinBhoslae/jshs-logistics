import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, type Role } from './AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { token, user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500 animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 dark:text-white/40 animate-pulse">
          Securing session...
        </p>
      </div>
    )
  }

  if (!token || !user) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <>{children}</>
}
