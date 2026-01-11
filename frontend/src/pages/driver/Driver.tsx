import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import type { Payout, Shipment } from '../../types'
import {
  Star,
  Award,
  Shield,
  Truck,
  Navigation,
  IndianRupee,
  TrendingUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type GeoState =
  | { status: 'idle' }
  | { status: 'unsupported' }
  | { status: 'watching'; lat: number; lng: number; accuracyM?: number; heading?: number | null; speedMps?: number | null }
  | { status: 'error'; message: string }

type Review = {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function Driver() {
  const { user, socket } = useAuth()
  const [selectedIdState, setSelectedIdState] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' })

  const shipmentsQ = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await api.get('/shipments', { params: { tab: 'active' } })
      return res.data.shipments as Shipment[]
    },
  })

  const payoutsQ = useQuery({
    queryKey: ['payouts'],
    queryFn: async () => {
      const res = await api.get('/payments/payouts')
      return res.data.payouts as Payout[]
    },
  })

  const reviewsQ = useQuery({
    queryKey: ['myReviews', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await api.get(`/reviews/driver/${user.id}`);
      return res.data.reviews as Review[];
    },
    enabled: !!user?.id
  })

  const selectedId = selectedIdState ?? (shipmentsQ.data ?? [])[0]?._id ?? ''

  const selected = useMemo(
    () => (shipmentsQ.data ?? []).find((s) => s._id === selectedId) ?? null,
    [shipmentsQ.data, selectedId]
  )

  useEffect(() => {
    if (!socket) return

    const handler = (msg: any) => {
      if (msg?.type === 'ASSIGNMENT') shipmentsQ.refetch()
      if (msg?.type === 'PAYOUT') payoutsQ.refetch()
    }

    socket.on('notification:new', handler)
    socket.on('payment:payout', () => payoutsQ.refetch())
    return () => {
      socket.off('notification:new', handler)
      socket.off('payment:payout')
    }
  }, [socket, shipmentsQ, payoutsQ])

  function stop() {
    setRunning(false)
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setGeo({ status: 'idle' })
  }

  function startLiveGps() {
    if (!socket || !selected) return
    const dest = selected.destination
    if (dest?.lat && dest?.lng) {
      window.open(`https://www.openstreetmap.org/directions?to=${dest.lat}%2C${dest.lng}`, '_blank', 'noopener,noreferrer')
    }
    if (!navigator.geolocation) {
      setGeo({ status: 'unsupported' })
      return
    }
    stop()
    setRunning(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: accuracyM, heading, speed: speedMps } = pos.coords
        setGeo({ status: 'watching', lat, lng, accuracyM, heading, speedMps })
        socket.emit('driver:locationPing', {
          shipmentId: selected._id,
          lat, lng,
          speedKmph: speedMps ? Math.round(speedMps * 3.6) : undefined,
          heading: heading || undefined,
          ts: new Date(pos.timestamp).toISOString(),
        })
      },
      (err) => {
        setGeo({ status: 'error', message: err.message || 'Failed GPS' })
        setRunning(false)
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    )
  }

  const totalEarned = (payoutsQ.data ?? []).reduce((sum, p) => sum + (p.status === 'SUCCEEDED' ? p.amount : 0), 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Driver Dashboard Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-950 p-10 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />

        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
              <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                Professional Driver
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-[10px] font-black border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </div>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Driver <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">Command Center</span></h1>
            <p className="mt-2 text-blue-200/60 font-medium">Monitoring your performance, earnings, and active routes.</p>
          </div>

          <div className="flex gap-4">
            <StatBox label="Trust Score" value={`${user?.performanceRating?.toFixed(1) || '5.0'}`} icon={Star} color="amber" />
            <StatBox label="Trip Efficiency" value="94%" icon={TrendingUp} color="emerald" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel: Active Duty & Tracking */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              In-Transit Control
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Active Shipment</label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedIdState(e.target.value)}
                  className="input-glass text-lg font-bold py-4"
                >
                  {(shipmentsQ.data ?? []).map((s) => (
                    <option key={s._id} value={s._id} className="bg-slate-900 text-white">
                      {s.referenceId} — {s.status}
                    </option>
                  ))}
                </select>
              </div>

              {selected && (
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-200/50 dark:border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{selected.referenceId}</div>
                        <div className="text-xs font-bold text-slate-500">{selected.origin.name} → {selected.destination.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                      <div className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800/50">
                        {selected.status}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <button
                      onClick={startLiveGps}
                      disabled={!socket || running || !selected}
                      className="h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-30"
                    >
                      <Navigation className="h-5 w-5" /> Start Trip
                    </button>
                    <button
                      onClick={stop}
                      disabled={!running}
                      className="h-14 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-30"
                    >
                      <Shield className="h-5 w-5" /> Stop Signal
                    </button>
                  </div>

                  <AnimatePresence>
                    {geo.status === 'watching' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full bg-green-500 animate-ping" />
                          <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Live Telemetry Active</span>
                        </div>
                        <div className="text-[10px] font-mono text-green-600 dark:text-green-300">
                          {geo.lat.toFixed(5)}, {geo.lng.toFixed(5)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Earnings List */}
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-emerald-500" />
              Payout History
            </h2>
            <div className="space-y-3">
              {payoutsQ.data && payoutsQ.data.length > 0 ? (
                payoutsQ.data.map((p) => (
                  <div key={p._id} className="group p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-tighter">Settlement #{p._id.slice(-6)}</div>
                        <div className="text-[10px] font-bold text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 dark:text-emerald-400 text-lg">₹{p.amount}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{p.status}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 opacity-50">No payouts found yet.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Performance & Reviews */}
        <div className="space-y-8">
          {/* Wallet Balance */}
          <div className="glass-card bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 border-none shadow-2xl shadow-emerald-500/20">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Withdrawn Earnings</div>
                <div className="text-4xl font-black">₹{totalEarned}</div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
            <p className="text-xs opacity-70 leading-relaxed font-medium">Automatic settlement to your registered bank account after shipment completion.</p>
          </div>

          {/* Awards & Badges */}
          <div className="glass-card p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Your Achievements
            </h2>
            <div className="flex flex-wrap gap-3">
              {user?.awards && user.awards.length > 0 ? (
                user.awards.map((award, i) => (
                  <div key={i} className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {award}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-medium italic">Complete trips with high ratings to earn badges.</div>
              )}
            </div>
          </div>

          {/* Recent Reviews Summary */}
          <div className="glass-card p-8">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Customer Feedback
            </h2>
            <div className="space-y-4">
              {reviewsQ.data && reviewsQ.data.length > 0 ? (
                reviewsQ.data.slice(0, 3).map((r) => (
                  <div key={r._id} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-2.5 w-2.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">"{r.comment}"</p>
                  </div>
                ))
              ) : (
                <div className="text-center opacity-50 text-xs">No reviews yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'amber' | 'emerald' }) {
  const colors = {
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
  return (
    <div className={`p-4 rounded-[1.5rem] border ${colors[color]} min-w-[120px]`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  )
}
