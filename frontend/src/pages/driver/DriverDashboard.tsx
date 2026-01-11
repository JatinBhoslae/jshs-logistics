import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentApi } from '../../services/apiService'
import { useAuth } from '../../auth/AuthContext'
import { motion } from 'framer-motion'
import {
    Truck,
    Zap,
    Navigation,
    Calendar,
    ArrowRight
} from 'lucide-react'
import ErrorDisplay from '../../components/ErrorDisplay'
import Skeleton from '../../components/Skeleton'
import type { Shipment } from '../../types'

export default function DriverDashboard() {
    const { user, isLoading: authLoading } = useAuth()

    const { data: assignments, isLoading, isError, refetch } = useQuery<Shipment[]>({
        queryKey: ['driver-assignments', user?.id],
        queryFn: async () => {
            const res = await shipmentApi.getAll({ status: 'ASSIGNED,PICKED_UP,IN_TRANSIT,OUT_FOR_DELIVERY', limit: 3 })
            return res.shipments
        },
        staleTime: 0, // Always fetch fresh data
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
        refetchOnMount: 'always', // Always refetch when component mounts
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: !authLoading && !!user, // Only fetch when auth is ready and user exists
    })

    if (authLoading) return <DriverDashboardSkeleton />

    if (isLoading) return <DriverDashboardSkeleton />

    if (isError) return (
        <div className="p-6">
            <ErrorDisplay 
                message="Failed to load dashboard data. Please check your connection." 
                onRetry={() => refetch()} 
            />
        </div>
    )

    return (
        <div className="space-y-8 pb-12">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 right-0 -m-20 h-80 w-80 rounded-full bg-blue-600/20 blur-[100px]" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Duty Status: Active</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight mb-2">Safe Journey, {user?.name.split(' ')[0]}!</h1>
                    <p className="text-slate-400 font-medium max-w-md">Your vehicle is healthy and ready for deployment. Manage your assigned payloads below.</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Assignments</h2>

                    <div className="space-y-4">
                        {assignments?.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem]">
                                <Truck className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Awaiting new assignments…</p>
                            </div>
                        ) : (
                            assignments?.map((s: any) => (
                                <Link key={s._id} to={`/app/shipment/${s._id}`} className="block group">
                                    <div className="glass-card p-6 hover:bg-white dark:hover:bg-white/10 transition-all border-none shadow-sm group-hover:shadow-md">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                                                    <Navigation className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{s.referenceId}</p>
                                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        <span>{s.shipmentType}</span>
                                                        <span>•</span>
                                                        <span>{s.distanceKm} KM</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase text-center ${s.status === 'IN_TRANSIT' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20'
                                                }`}>
                                                {s.status}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{s.origin.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{s.destination.name}</span>
                                            </div>
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Calendar className="h-3 w-3" />
                                                <span className="text-xs font-bold uppercase tracking-widest">ETA: {new Date(s.eta).toLocaleDateString()}</span>
                                            </div>
                                            <span className="text-blue-600 font-black text-xs uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                                                Execute Dispatch
                                                <ArrowRight className="h-3 w-3" />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Earnings & Stats</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="p-6 bg-emerald-600 rounded-[2rem] text-white shadow-lg shadow-emerald-500/20">
                            <Zap className="h-6 w-6 mb-2 opacity-80" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Pending Payouts</p>
                            <h3 className="text-3xl font-black tracking-tighter">₹ 12,450</h3>
                            <Link to="/app/earnings" className="mt-4 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg inline-block transition-colors">
                                View Ledger
                            </Link>
                        </div>

                        <div className="glass-card p-6 border-none shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">Performance</h3>
                                <span className="text-emerald-500 font-black">98.2%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[98.2%]" />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-widest text-center">Platinum Driver Status</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function DriverDashboardSkeleton() {
    return (
        <div className="space-y-8 pb-12">
            <Skeleton className="h-48 w-full rounded-[2rem]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-[2rem]" />)}
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-48 w-full rounded-[2rem]" />
                    <Skeleton className="h-40 w-full rounded-[2rem]" />
                </div>
            </div>
        </div>
    )
}
