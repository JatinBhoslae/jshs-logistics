import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, LogOut, User, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import NotificationDropdown from './NotificationDropdown'
import { SimulationToggle } from './SimulationToggle'
import { ThemeToggle } from './ThemeToggle'
import { GlobalSearch } from './GlobalSearch' // Added import for GlobalSearch

interface TopNavProps {
  onOpenMenu?: () => void
  onToggleSidebar?: () => void
  onMouseEnterSidebar?: () => void
  onMouseLeaveSidebar?: () => void
  isSidebarOpen?: boolean
}

export function TopNav({ onOpenMenu, onToggleSidebar, onMouseEnterSidebar, onMouseLeaveSidebar, isSidebarOpen }: TopNavProps) {
  const { user, logout } = useAuth()
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 border-b border-white/20 dark:bg-slate-900/70 dark:border-white/10 h-16 shrink-0 shadow-sm supports-[backdrop-filter]:bg-white/60"
    >
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 bg-white dark:bg-slate-900 z-50 flex items-center px-4 gap-4"
          >
            <div className="flex-1">
              <GlobalSearch />
            </div>
            <button onClick={() => setIsMobileSearchOpen(false)} className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4 max-w-7xl mx-auto relative">
        {/* Left Side: Logo & Sidebar Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenMenu}
                className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/50 hover:text-indigo-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </motion.button>
            )}

            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggleSidebar}
                onMouseEnter={onMouseEnterSidebar}
                onMouseLeave={onMouseLeaveSidebar}
                className="hidden lg:flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/50 hover:text-indigo-600 transition-colors shrink-0 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                <Menu className="h-5 w-5" />
              </motion.button>
            )}
          </div>

          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative flex items-center justify-center h-10 w-10 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/20"
            >
              <img src="/logo.png" alt="JSHS Logo" className="h-full w-full object-contain" />
            </motion.div>
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-slate-900 dark:text-white text-sm tracking-widest leading-none">
                JSHS
              </span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 tracking-[0.2em] uppercase">
                Logistics
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar (Centered) */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block w-full max-w-md z-10">
          <GlobalSearch />
        </div>

        {/* Right Side Actions Section */}
        <div className="flex items-center gap-2 sm:gap-3 z-20">
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Search className="h-5 w-5" />
          </button>

          {user?.role === 'MANAGER' && (
            <div className="hidden lg:block">
              <SimulationToggle />
            </div>
          )}

          <ThemeToggle className="h-10 px-3 flex items-center justify-center" />

          {user && <NotificationDropdown />}

          {user ? (
            <div className="flex items-center gap-3 ml-1 sm:ml-2 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-700">
              <Link to="/app/profile">
                <motion.div
                  className="flex items-center gap-3 cursor-pointer group"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex flex-col items-end leading-none hidden lg:flex">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors font-['Poppins']">{user.name}</span>
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wide dark:bg-indigo-900/30 dark:text-indigo-300 font-['Poppins']">{user.role}</span>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border-2 border-white flex items-center justify-center shadow-md overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-indigo-500/20 transition-all dark:from-slate-800 dark:to-slate-700 dark:border-slate-600">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </motion.div>
              </Link>

              <motion.button
                onClick={logout}
                whileHover={{ scale: 1.05, backgroundColor: "#fee2e2", color: "#ef4444" }}
                whileTap={{ scale: 0.95 }}
                className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0 ml-1"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </motion.button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.header>
  )
}
