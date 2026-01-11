import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { shipmentApi } from '../../services/apiService'
import { useAuth } from '../../auth/AuthContext'
import { motion } from 'framer-motion'
import {
    Package,
    Truck,
    ArrowRight,
    Clock,
    MapPin,
    Navigation,
    CheckCircle2
} from 'lucide-react'
import ErrorDisplay from '../../components/ErrorDisplay'
import Skeleton from '../../components/Skeleton'
import type { Shipment } from '../../types'

export default function CustomerDashboard() {
    const { user, isLoading: authLoading } = useAuth()

    const { data: shipments, isLoading, isError, refetch } = useQuery<Shipment[]>({
        queryKey: ['customer-shipments', user?.id],
        queryFn: async () => {
            const res = await shipmentApi.getAll({ limit: 5, tab: 'active' })
            return res.shipments
        },
        staleTime: 0, // Always fetch fresh data
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
        refetchOnMount: 'always', // Always refetch when component mounts
        refetchOnWindowFocus: false, // Don't refetch on window focus
        enabled: !authLoading && !!user, // Only fetch when auth is ready and user exists
    })

    if (authLoading) return <CustomerDashboardSkeleton />

    if (isLoading) return <CustomerDashboardSkeleton />

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
                className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 right-0 -m-20 h-80 w-80 rounded-full bg-emerald-600/20 blur-[100px]" />
                <div className="relative">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Hello, {user?.name.split(' ')[0]}!</h1>
                    <p className="text-slate-400 font-medium max-w-md">Track your active dockets and manage global deliveries in one unified portal.</p>
                    <div className="mt-6 flex gap-3">
                        <Link to="/app/create-shipment" className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Book New Shipment
                        </Link>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Active Transmissions</h2>
                        <Link to="/app/shipments" className="text-sm font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                            View All
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {shipments?.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem]">
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active shipments</p>
                            </div>
                        ) : (
                            shipments?.map((s: any) => (
                                <Link key={s._id} to={`/app/shipment/${s._id}`} className="block group">
                                    <div className="glass-card p-5 hover:bg-white dark:hover:bg-white/5 transition-all border-none shadow-sm group-hover:shadow-md">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                                                    <Truck className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{s.referenceId}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.shipmentType}</p>
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${s.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20'
                                                }`}>
                                                {s.status}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 text-slate-300" />
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{s.origin.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Navigation className="h-3 w-3 text-slate-300" />
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">{s.destination.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-3">
                        <Link to="/app/payments" className="p-6 bg-blue-600 rounded-[2rem] text-white overflow-hidden relative group shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
                            <div className="relative z-10">
                                <CheckCircle2 className="h-6 w-6 mb-2 opacity-80" />
                                <h3 className="font-black text-lg">Financial Audit</h3>
                                <p className="text-xs text-blue-100 font-medium">Clear dockets & manage escrow</p>
                            </div>
                            <div className="absolute -bottom-4 -right-4 h-24 w-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform" />
                        </Link>

                        <div className="glass-card p-6 border-none shadow-sm">
                            <Clock className="h-5 w-5 text-slate-400 mb-3" />
                            <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm">Customer Support</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Need urgent assistance with a high-priority payload? Contact our ops team.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function CustomerDashboardSkeleton() {
    return (
        <div className="space-y-8 pb-12">
            <Skeleton className="h-48 w-full rounded-[2rem]" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-8 w-48" />
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)}
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-40 w-full rounded-[2rem]" />
                    <Skeleton className="h-40 w-full rounded-[2rem]" />
                </div>
            </div>
        </div>
    )
}
