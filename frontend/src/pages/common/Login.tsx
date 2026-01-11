import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ArrowRight, Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../../auth/AuthContext'
import { TopNav } from '../../components/TopNav'
import { MobileNav } from '../../components/MobileNav'
import { getAppType } from '../../utils/subdomainUtils'

export default function Login({ managerMode = false }: { managerMode?: boolean }) {
  const { login, logout, user: authenticatedUser } = useAuth()
  const nav = useNavigate()
  const location = useLocation()

  const appType = managerMode ? 'MANAGER' : getAppType()
  const isManager = appType === 'MANAGER'
  const isDriver = appType === 'DRIVER'
  const isCustomer = appType === 'CUSTOMER'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  // Determine defaults for demo ease
  useEffect(() => {
    if (isManager) setEmail('manager@jshs.app')
    else if (isDriver) setEmail('driver@jshs.app')
    else setEmail('customer@jshs.app')
    setPassword('jshs2024')
  }, [isManager, isDriver])

  // If already logged in and role matches, redirect away from login
  useEffect(() => {
    if (authenticatedUser) {
      if (isManager && authenticatedUser.role === 'MANAGER') nav('/app/dashboard')
      else if (isDriver && authenticatedUser.role === 'DRIVER') nav('/app/dashboard')
      else if (isCustomer && authenticatedUser.role === 'CUSTOMER') nav('/app/dashboard')
    }
  }, [authenticatedUser, isManager, isDriver, isCustomer, nav])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoggingIn(true)
    try {
      const user = await login(email, password)

      // Enforce Portal-Role Mapping
      if (isManager && user.role !== 'MANAGER') {
        throw new Error('Access Denied: This portal is for Managers only.')
      }
      if (isDriver && user.role !== 'DRIVER') {
        throw new Error('Access Denied: This portal is for Drivers only.')
      }
      if (isCustomer && user.role !== 'CUSTOMER') {
        throw new Error('Access Denied: Please use the Driver or Manager portal.')
      }

      // Small delay to ensure token is properly set in API interceptor
      await new Promise(resolve => setTimeout(resolve, 100))

      const from = (location.state as any)?.from?.pathname || '/app/dashboard'
      nav(from, { replace: true })
    } catch (err: unknown) {
      // Ensure we log out if the login succeeded but role check failed
      logout()

      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as Error).message
      setError(msg ?? 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const getTitle = () => {
    if (isManager) return 'Manager Portal'
    if (isDriver) return 'Driver Portal'
    return 'Welcome Back'
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 relative z-10">
        <TopNav onOpenMenu={() => setMobileOpen(true)} />
      </div>

      {authenticatedUser && (
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} role={authenticatedUser.role} />
      )}


      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, 50, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[20%] -right-[10%] h-[500px] w-[500px] rounded-full bg-cyan-400/10 blur-[100px]"
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative"
        >
          <div className="mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              {getTitle()}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-sm text-slate-600 dark:text-slate-400"
            >
              Enter your credentials to access your account
            </motion.p>
          </div>

          <motion.form
            onSubmit={onSubmit}
            className="glass-card space-y-5 p-8 shadow-xl backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 ring-1 ring-red-500/20 dark:text-red-400"
              >
                {error}
              </motion.div>
            )}

            <motion.div className="space-y-4" variants={itemVariants}>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div className="flex items-center justify-between text-xs" variants={itemVariants}>
              <span className="text-slate-500 dark:text-slate-400" />
              <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Forgot password?
              </Link>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoggingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Sign In <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </motion.button>
          </motion.form>

          {!isManager && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400"
            >
              Don't have an account?{' '}
              <Link className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400" to="/register">
                Create Account
              </Link>
            </motion.div>
          )}

          {isDriver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-4 rounded-lg bg-blue-500/10 p-3 text-center text-xs text-blue-600 dark:text-blue-300"
            >
              Note: Drivers may require admin approval after registration.
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
