import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck,
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Bell,
  CreditCard,
  Settings,
  Navigation,
  Shield,
  Activity,
  FileText,
  Wallet,
  PlusCircle,
  ScrollText,
  Zap,
  UserPlus
} from 'lucide-react'

import { useAuth } from '../auth/AuthContext'
import { MobileNav } from './MobileNav'
import { TopNav } from './TopNav'
import NotificationStrip from './NotificationStrip'

export function Layout() {
  const { user } = useAuth()
  const loc = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSidebarPinned, setIsSidebarPinned] = useState(false)
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)

  const isSidebarOpen = isSidebarPinned || isSidebarHovered

  const sections = useMemo(() => {
    const role = user?.role

    // 1. Overview
    const overview = [
      { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
    if (role === 'MANAGER') {
      overview.push({ to: '/app/analytics', label: 'Analytics', icon: BarChart3 })
    }

    const sections = [
      { title: 'Overview', items: overview }
    ]

    // 2. Role Specific
    if (role === 'MANAGER') {
      sections.push(
        {
          title: 'Fleet Management',
          items: [
            { to: '/app/onboarding', label: 'Asset Onboarding', icon: UserPlus },
            { to: '/app/fleet', label: 'Vehicles', icon: Truck },
            { to: '/app/drivers', label: 'Drivers', icon: Users },
            { to: '/app/fleet-performance', label: 'Performance', icon: Activity },
          ]
        },
        {
          title: 'Operations',
          items: [
            { to: '/app/shipments', label: 'All Shipments', icon: Package },
            { to: '/app/approvals', label: 'Approvals', icon: Shield },
            { to: '/app/iot-monitor', label: 'IoT Monitor', icon: Zap },
          ]
        },
        {
          title: 'Finance & Compliance',
          items: [
            { to: '/app/payments', label: 'Payments', icon: CreditCard },
            { to: '/app/documents', label: 'Documents', icon: FileText },
            { to: '/app/audit', label: 'Audit Logs', icon: ScrollText },
          ]
        }
      )
    } else if (role === 'DRIVER') {
      sections.push(
        {
          title: 'Work',
          items: [
            { to: '/app/driver', label: 'Drive Mode', icon: Navigation },
            { to: '/app/shipments', label: 'My History', icon: Package },
            { to: '/app/documents', label: 'Documents', icon: FileText },
          ]
        },
        {
          title: 'Finance',
          items: [
            { to: '/app/earnings', label: 'Earnings', icon: Wallet },
          ]
        }
      )
    } else if (role === 'CUSTOMER') {
      sections.push(
        {
          title: 'Shipments',
          items: [
            { to: '/app/create-shipment', label: 'Book New', icon: PlusCircle },
            { to: '/app/shipments', label: 'My Shipments', icon: Package },
            { to: '/app/documents', label: 'Documents', icon: FileText },
          ]
        },
        {
          title: 'Billing',
          items: [
            { to: '/app/payments', label: 'Invoices', icon: CreditCard },
          ]
        }
      )
    }

    // 3. System
    sections.push({
      title: 'System',
      items: [
        { to: '/app/notifications', label: 'Notifications', icon: Bell },
        { to: '/app/settings', label: 'Settings', icon: Settings },
      ]
    })

    return sections
  }, [user?.role])

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <TopNav
        onOpenMenu={() => setMobileOpen(true)}
        onToggleSidebar={() => setIsSidebarPinned(!isSidebarPinned)}
        onMouseEnterSidebar={() => setIsSidebarHovered(true)}
        onMouseLeaveSidebar={() => setIsSidebarHovered(false)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Background Orbs (Refined) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[800px] w-[800px] rounded-full bg-blue-500/[0.03] blur-3xl" />
        <div className="absolute -right-64 -bottom-64 h-[800px] w-[800px] rounded-full bg-indigo-500/[0.03] blur-3xl" />
      </div>

      <div className="relative flex flex-1">
        {user ? <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} role={user.role} /> : null}

        {/* Desktop Sidebar (Fully Collapsible 0-260px) */}
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarOpen ? 260 : 0,
            opacity: isSidebarOpen ? 1 : 0
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
          className="hidden lg:flex flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 relative z-50 shadow-sm"
        >
          <div className="h-full flex flex-col pt-8 pb-4 w-[260px]">
            {/* Sidebar Content wrapper ensures width consistency while container collapses */}
            <div className="flex-1 flex flex-col gap-8 overflow-y-auto px-3 custom-sidebar-scroll">
              {sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-2">
                  <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">
                    {section.title}
                  </div>
                  <div className="flex flex-col gap-1">
                    {section.items.map((item) => (
                      <SidebarLink
                        key={item.to}
                        {...item}
                        isCollapsed={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 px-3 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden group/workspace dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-lg shadow-blue-500/20 group-hover/workspace:scale-105 transition-transform">HQ</div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">JSHS Logistics</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{user?.role === 'MANAGER' ? 'Admin Portal' : user?.role === 'DRIVER' ? 'Driver Portal' : 'Customer Portal'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsSidebarPinned(false);
                  setIsSidebarHovered(false);
                }}
                className="absolute inset-0 z-40 bg-slate-900/5 dark:bg-slate-900/30 cursor-pointer lg:block hidden"
              />
            )}
          </AnimatePresence>

          <NotificationStrip />

          <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-8 pt-6 bg-[#f8fafc] dark:bg-slate-950 overflow-x-hidden">
            <div className="max-w-7xl mx-auto min-h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={loc.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  isCollapsed
}: {
  to: string;
  label: string;
  icon: any;
  isCollapsed: boolean
}) {
  const loc = useLocation()
  const active = loc.pathname === to

  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all group ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
        }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-white'}`} />

      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="truncate"
        >
          {label}
        </motion.span>
      )}

      {isCollapsed && (
        <div className="absolute left-full ml-4 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
          {label}
        </div>
      )}
    </Link>
  )
}
