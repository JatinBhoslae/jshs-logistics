import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { formatDate } from '../../utils'
import Skeleton from '../Skeleton'
import {
    Package,
    ArrowRight,
    TrendingUp,
    ExternalLink
} from 'lucide-react'

export function MetricCard({ label, value, sub, icon: Icon, color, alert, delay }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
        cyan: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10',
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
        rose: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10',
        indigo: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10',
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay }}
            className={`bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 transition-all ${alert ? 'border-amber-400 bg-amber-50/30' : 'border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                {alert && <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white truncate">{value}</p>
                <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{sub}</span>
                </div>
            </div>
        </motion.div>
    )
}

export function ControlCard({ to, icon: Icon, title, desc, color }: any) {
    const colors: any = {
        indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600',
        purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600',
        cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600',
        emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600',
        orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-600',
        blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600',
    }

    return (
        <Link to={to} className="group relative bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-white/5 p-5 shadow-sm hover:shadow-xl transition-all overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-3 w-3 text-slate-300" />
            </div>
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-all ${colors[color]} group-hover:text-white`}>
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white tracking-tight">{title}</h3>
            <p className="mt-1 text-xs font-bold text-slate-400 leading-relaxed">{desc}</p>
            <div className="mt-4 flex items-center text-[10px] font-black uppercase tracking-widest text-blue-500">
                Launch Control <ArrowRight className="ml-1 h-3 w-3" />
            </div>
        </Link>
    )
}

export function IntelligenceComponent({ title, icon: Icon, status, desc, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        red: 'bg-red-50 text-red-600',
        purple: 'bg-purple-50 text-purple-600',
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-white/5 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-center bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest ${colorClasses[color]}`}>{status}</span>
            </div>
            <p className="text-xs font-bold text-slate-400 leading-relaxed">{desc}</p>
        </div>
    )
}

export function RecentShipmentsList({ limit = 5 }: { limit?: number }) {
    const { data, isLoading } = useQuery({
        queryKey: ['recentShipments', limit],
        queryFn: async () => {
            const res = await api.get('/shipments', { params: { limit, tab: 'active' } })
            return res.data.shipments
        }
    })

    if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />

    if (!data || data.length === 0) return (
        <div className="py-12 text-center text-slate-400">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm font-bold">Fleet is currently idle</p>
        </div>
    )

    return (
        <div className="space-y-4">
            {data.map((s: any) => (
                <Link
                    key={s._id}
                    to={`/app/shipment/${s._id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors gap-4"
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-600 mt-0.5">
                            <Package className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{s.referenceId}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                {s.origin?.name} <ArrowRight className="h-2 w-2" /> {s.destination?.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-8">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest
                                          ${s.status === 'CREATED' ? 'bg-blue-50 text-blue-600' :
                                    s.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {s.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <div className="text-right hidden sm:block min-w-[100px]">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</p>
                            <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{s.eta ? formatDate(s.eta) : 'Pending'}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    )
}
