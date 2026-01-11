import { Link } from 'react-router-dom'
import Spline from '@splinetool/react-spline'
import { User, Truck } from 'lucide-react'

import { useAuth } from '../../auth/AuthContext'
import { TopNav } from '../../components/TopNav'

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      {/* Full-screen Spline (background) */}
      <div className="pointer-events-none absolute inset-0">
        <Spline scene="https://prod.spline.design/5cLwKcSw92RaWGEv/scene.splinecode" />
      </div>

      {/* Readability overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white/70 dark:from-slate-950/70 dark:via-slate-950/30 dark:to-slate-950/70" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-48 -top-48 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/20" />
        <div className="absolute -right-48 -bottom-48 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-400/20" />
      </div>

      <div className="relative z-20 mx-auto w-full max-w-6xl px-6 py-5">
        <TopNav />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center px-6 pb-16 pt-6">
        <section className="flex max-w-2xl flex-col justify-center">


          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            The single platform to run
            <span className="block bg-gradient-to-r from-indigo-600 via-slate-900 to-cyan-600 bg-clip-text text-transparent dark:from-indigo-200 dark:via-white dark:to-cyan-200">
              modern logistics.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-slate-600 dark:text-white/70">
            Manage shipments end-to-end, track vehicles in real time, verify proof-of-delivery, and settle invoices — with
            analytics and automated notifications built in.
          </p>

          {user ? (
            <div className="mt-6">
              <Link
                to="/app/dashboard"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:opacity-90"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Customer Section */}
              <div className="group relative overflow-hidden rounded-2xl border border-indigo-100 bg-white/60 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:ring-1 hover:ring-indigo-400/30 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  <User size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Customer</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Track shipments & manage orders
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 rounded-lg bg-indigo-600 py-2 text-center text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex-1 rounded-lg border border-indigo-200 py-2 text-center text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                  >
                    Register
                  </Link>
                </div>
              </div>

              {/* Driver Section */}
              <div className="group relative overflow-hidden rounded-2xl border border-cyan-100 bg-white/60 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:shadow-md hover:ring-1 hover:ring-cyan-400/30 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300">
                  <Truck size={20} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Driver</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Join fleet & earn money
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    to="/login?app=driver"
                    className="flex-1 rounded-lg bg-cyan-600 py-2 text-center text-xs font-medium text-white hover:bg-cyan-700"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register?app=driver"
                    className="flex-1 rounded-lg border border-cyan-200 py-2 text-center text-xs font-medium text-cyan-700 hover:bg-cyan-50 dark:border-cyan-500/30 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
                  >
                    Register
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass-card">
              <div className="text-xs text-slate-600 dark:text-white/60">Realtime</div>
              <div className="mt-1 text-sm font-medium">Live GPS tracking</div>
            </div>
            <div className="glass-card">
              <div className="text-xs text-slate-600 dark:text-white/60">Payments</div>
              <div className="mt-1 text-sm font-medium">POD-gated settlement</div>
            </div>
            <div className="glass-card">
              <div className="text-xs text-slate-600 dark:text-white/60">Insights</div>
              <div className="mt-1 text-sm font-medium">Manager KPIs</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-8 text-xs text-slate-500 dark:text-white/50">
        {/* Built for hackathon demo: unified dashboard, realtime tracking, documents, payments, analytics. */}
      </footer>
    </div>
  )
}
