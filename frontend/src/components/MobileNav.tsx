import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../types'

type Item = { to: string; label: string; roles?: Role[] }

const ALL_ITEMS: Item[] = [
  { to: '/app/dashboard', label: 'Dashboard' },
  { to: '/app/analytics', label: 'Analytics', roles: ['MANAGER'] },

  // Manager
  { to: '/app/fleet', label: 'Fleet', roles: ['MANAGER'] },
  { to: '/app/drivers', label: 'Drivers', roles: ['MANAGER'] },
  { to: '/app/fleet-performance', label: 'Performance', roles: ['MANAGER'] },
  { to: '/app/iot-monitor', label: 'IoT Monitor', roles: ['MANAGER'] },
  { to: '/app/approvals', label: 'Approvals', roles: ['MANAGER'] },
  { to: '/app/documents', label: 'Documents', roles: ['MANAGER'] },
  { to: '/app/audit', label: 'Audit Logs', roles: ['MANAGER'] },

  // Driver
  { to: '/app/driver', label: 'Drive Mode', roles: ['DRIVER'] },
  { to: '/app/earnings', label: 'Earnings', roles: ['DRIVER'] },

  // Customer
  { to: '/app/create-shipment', label: 'Book Shipment', roles: ['CUSTOMER'] },

  // Common / Shared with filters
  { to: '/app/shipments', label: 'Shipments' }, // Everyone needs shipments
  { to: '/app/payments', label: 'Payments' }, // Everyone has payments/invoices
  { to: '/app/notifications', label: 'Notifications' },
  { to: '/app/settings', label: 'Settings' },
]

export function MobileNav({ open, onClose, role }: { open: boolean; onClose: () => void; role: Role }) {
  const loc = useLocation()
  const { logout } = useAuth()

  const items = useMemo(() => {
    return ALL_ITEMS.filter((i) => !i.roles || i.roles.includes(role))
  }, [role])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-[88%] max-w-sm glass p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold tracking-wide">Next-Gen Logistics</div>
            <div className="text-xs text-slate-600 dark:text-white/60">Menu</div>
          </div>
          <button onClick={onClose} className="btn-ghost px-3 py-2">
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-1">
          {items.map((i) => {
            const active = loc.pathname === i.to
            return (
              <Link
                key={i.to}
                to={i.to}
                onClick={onClose}
                className={`rounded-xl px-3 py-2 text-sm transition-colors ${active
                  ? 'bg-slate-900 text-white dark:bg-white/10'
                  : 'text-slate-700 hover:bg-slate-200 dark:text-white/70 dark:hover:bg-white/10'
                  }`}
              >
                {i.label}
              </Link>
            )
          })}

          <div className="my-2 h-px bg-slate-200 dark:bg-white/10" />

          <button
            onClick={() => {
              logout()
              onClose()
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mt-4 text-xs text-slate-500 dark:text-white/60">
          Tip: open Shipments → Shipment Detail to see live tracking and docs.
        </div>
      </div>
    </div>
  )
}
