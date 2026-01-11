import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, User, Mail, Lock, ArrowRight, Phone } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth, type Role } from '../../auth/AuthContext'
import { TopNav } from '../../components/TopNav'
import { getAppType } from '../../utils/subdomainUtils'
import { api } from '../../lib/api'

export default function Register() {
  const { user: authenticatedUser } = useAuth()
  const nav = useNavigate()
  const appType = getAppType()

  // Redirect Manager to login immediately (redundant but safe)
  useEffect(() => {
    if (appType === 'MANAGER') {
      nav('/login')
    }
  }, [appType, nav])

  // If already logged in and role matches, redirect away from register
  useEffect(() => {
    if (authenticatedUser) {
      const isManager = appType === 'MANAGER'
      const isDriver = appType === 'DRIVER'
      const isCustomer = appType === 'CUSTOMER'

      if (isManager && authenticatedUser.role === 'MANAGER') nav('/app/dashboard')
      else if (isDriver && authenticatedUser.role === 'DRIVER') nav('/app/dashboard')
      else if (isCustomer && authenticatedUser.role === 'CUSTOMER') nav('/app/dashboard')
    }
  }, [authenticatedUser, appType, nav])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [password, setPassword] = useState('password123')

  // Auto-select role based on app type. Default to CUSTOMER if unknown.
  // Note: MANAGER case is handled above, so here we only care about DRIVER/CUSTOMER.
  const [role] = useState<Role>(appType === 'DRIVER' ? 'DRIVER' : 'CUSTOMER')
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  async function onSendOtp() {
    setError(null)
    setIsSendingOtp(true)
    try {
      await api.post('/auth/send-otp', { email: email.trim(), purpose: 'REGISTER' })
      setIsOtpSent(true)
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as Error).message
      setError(msg ?? 'Failed to send OTP')
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsRegistering(true)
    try {
      await api.post('/auth/register', { name, email, phone, password, role, otp })
      nav('/app/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as Error).message
      setError(msg ?? 'Register failed')
    } finally {
      setIsRegistering(false)
    }
  }

  const getTitle = () => {
    if (role === 'DRIVER') return 'Join the Fleet'
    return 'Create Account'
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

  if (appType === 'MANAGER') return null // Should have redirected

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 relative z-10">
        <TopNav />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -90, 0],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-[20%] -right-[10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            x: [0, -50, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[10%] -left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-400/10 blur-[100px]"
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
              {role === 'DRIVER'
                ? 'Start earning by delivering shipments'
                : 'Track shipments and manage your orders'}
            </motion.p>
          </div>

          <motion.form
            onSubmit={onSubmit}
            className="glass-card space-y-5 p-6 md:p-8 shadow-xl backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10"
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
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="Rahul Sharma"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Mobile Number</label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      setPhone(val)
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">
                  Email Verification Code
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1 group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
                    <motion.input
                      whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                      placeholder="Check your email"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onSendOtp}
                    disabled={isSendingOtp || !email}
                    className="shrink-0 rounded-xl border border-cyan-500 px-3 py-2 text-xs font-semibold text-cyan-600 hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? 'Sending...' : isOtpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-cyan-500" />
                  <motion.input
                    whileFocus={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                    placeholder="Create a password"
                  />
                </div>
              </div>
            </motion.div>

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isRegistering}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isRegistering ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Account...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400"
          >
            Already have an account?{' '}
            <Link className="font-medium text-cyan-600 hover:text-cyan-500 hover:underline dark:text-cyan-400" to="/login">
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
