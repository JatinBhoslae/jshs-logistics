import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import type { Shipment } from '../../types'
import ErrorDisplay from '../../components/ErrorDisplay'
import TrackingModal from '../../components/TrackingModal'
import ShipmentCard from '../../components/shipments/ShipmentCard'
import ShipmentsSkeleton from '../../components/shipments/ShipmentsSkeleton'

export default function DriverShipments() {
    const { user } = useAuth()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<string>('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [trackingShipmentId, setTrackingShipmentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

    const debouncedSearch = useDebounce(search, 300)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['driver-shipments', page, debouncedSearch, status, activeTab],
        queryFn: async () => {
            const res = await api.get('/shipments', {
                params: {
                    page,
                    search: debouncedSearch,
                    status: status || undefined,
                    tab: activeTab,
                    limit: 10
                }
            })
            return res.data
        }
    })

    useEffect(() => {
        setPage(1)
    }, [debouncedSearch, status, activeTab])

    if (isError) return <ErrorDisplay message="Failed to load your assignments." onRetry={refetch} />

    const shipments: Shipment[] = data?.shipments || []
    const pagination = {
        total: data?.total || 0,
        pages: data?.pages || 0,
        currentPage: data?.currentPage || 1
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Driver Focused Header */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Rider Intelligence Terminal</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Active Duty Assignments</h1>
                    <p className="text-slate-500 font-medium font-mono text-sm uppercase tracking-widest">
                        ID: {user?.id?.slice(-8) || 'SESSION-ACTIVE'} • SYSTEM ONLINE
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-md text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-8 border-b border-slate-100 dark:border-white/5 px-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'active' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Priority Assignments
                    {activeTab === 'active' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'past' ? 'text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Historical Logs
                    {activeTab === 'past' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-t-full" />}
                </button>
            </div>

            {/* Driver Filter Bar */}
            <div className="glass-frame p-2 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                <div className="relative group flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search your assigned dockets..."
                        className="w-full bg-transparent pl-12 pr-4 py-3 text-sm font-bold focus:outline-none placeholder:text-slate-400 dark:text-white"
                    />
                </div>

                <div className="flex items-center gap-2 p-1">
                    <button
                        onClick={() => setStatus('')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!status ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                    >
                        ALL
                    </button>
                    {activeTab === 'active' ? (
                        <button
                            onClick={() => setStatus('IN_TRANSIT')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === 'IN_TRANSIT' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            TRANSIT
                        </button>
                    ) : (
                        <button
                            onClick={() => setStatus('DELIVERED')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === 'DELIVERED' ? 'bg-slate-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}
                        >
                            COMPLETED
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <ShipmentsSkeleton viewMode={viewMode} />
            ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 glass-frame border-dashed bg-transparent text-center">
                    <div className="p-8 rounded-full bg-slate-100 dark:bg-white/5 mb-6">
                        <CheckCircle2 className="h-12 w-12 text-slate-300 dark:text-white/20" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Mission Board Clear</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">No {activeTab} assignments match your current filter. Enjoy the downtime or refresh.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                        {shipments.map((s) => (
                            <ShipmentCard key={s._id} shipment={s} viewMode={viewMode} onTrack={(id) => setTrackingShipmentId(id)} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-6">
                            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <div className="text-xs font-black text-slate-500 tracking-widest uppercase text-center">
                                Assignment Page {page} of {pagination.pages}
                            </div>
                            <button disabled={page === pagination.pages} onClick={() => setPage(page + 1)} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <TrackingModal
                shipmentId={trackingShipmentId}
                onClose={() => setTrackingShipmentId(null)}
            />
        </div>
    )
}
