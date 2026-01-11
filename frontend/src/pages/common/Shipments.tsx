import { useAuth } from '../../auth/AuthContext'
import { getAppType } from '../../utils/subdomainUtils'
import ManagerShipments from '../manager/ManagerShipments'
import DriverShipments from '../driver/DriverShipments'
import CustomerShipments from '../customer/CustomerShipments'

export default function Shipments() {
  const { user } = useAuth()
  const appType = getAppType()

  // Portal-first routing
  if (appType === 'MANAGER') return <ManagerShipments />
  if (appType === 'DRIVER') return <DriverShipments />
  if (appType === 'CUSTOMER') return <CustomerShipments />

  // Fallback to role-based if subdomain not detected
  if (user?.role === 'MANAGER') return <ManagerShipments />
  if (user?.role === 'DRIVER') return <DriverShipments />
  if (user?.role === 'CUSTOMER') return <CustomerShipments />

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 font-bold">
      Loading dispatch protocols...
    </div>
  )
}
