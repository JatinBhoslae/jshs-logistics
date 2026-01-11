import { useAuth } from '../../auth/AuthContext'
import { getAppType } from '../../utils/subdomainUtils'
import ManagerDashboard from '../manager/ManagerDashboard.tsx'
import DriverDashboard from '../driver/DriverDashboard.tsx'
import CustomerDashboard from '../customer/CustomerDashboard.tsx'

export default function Dashboard() {
  const { user } = useAuth()
  const appType = getAppType()

  // Portal-first routing
  if (appType === 'MANAGER') return <ManagerDashboard />
  if (appType === 'DRIVER') return <DriverDashboard />
  if (appType === 'CUSTOMER') return <CustomerDashboard />

  // Fallback to role-based if subdomain not detected (local development/testing)
  if (user?.role === 'MANAGER') return <ManagerDashboard />
  if (user?.role === 'DRIVER') return <DriverDashboard />
  if (user?.role === 'CUSTOMER') return <CustomerDashboard />

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 font-bold">
      Unauthorized Access or Unknown Role
    </div>
  )
}
