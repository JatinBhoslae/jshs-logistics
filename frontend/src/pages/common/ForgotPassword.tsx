import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Lock } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopNav } from '../../components/TopNav'
import { api } from '../../lib/api'

export default function ForgotPassword() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      setInfo('OTP sent to your registered email address')
      setStep('RESET')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as Error).message
      setError(msg ?? 'Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { email: email.trim(), otp, newPassword })
      nav('/login')
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
        || (err as Error).message
      setError(msg ?? 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 relative z-10">
        <TopNav />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-md flex-col justify-center px-4 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative"
        >
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Forgot Password
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We will send an OTP to your registered email address.
            </p>
          </div>

          <form
            onSubmit={step === 'REQUEST' ? requestOtp : reset}
            className="glass-card space-y-5 p-6 md:p-8 shadow-xl backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-white/20 dark:border-white/10"
          >
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 ring-1 ring-red-500/20 dark:text-red-400">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                {info}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {step === 'RESET' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">OTP</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                      placeholder="Enter OTP"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
                      placeholder="Create a new password"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {step === 'REQUEST' ? 'Sending OTP...' : 'Resetting password...'}
                </div>
              ) : step === 'REQUEST' ? (
                'Send OTP'
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}