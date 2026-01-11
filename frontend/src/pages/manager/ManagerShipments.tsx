import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Truck, X, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, Filter, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Shipment } from '../../types'
import { SHIPMENT_TYPES } from '../../constants'
import ErrorDisplay from '../../components/ErrorDisplay'
import ShipmentCard from '../../components/shipments/ShipmentCard'
import ShipmentsSkeleton from '../../components/shipments/ShipmentsSkeleton'
import CreateShipmentModal from '../../components/shipments/CreateShipmentModal'
import TrackingModal from '../../components/TrackingModal'

export default function ManagerShipments() {
    const [page, setPage] = useState(1)
    const [status, setStatus] = useState<string>('')
    const [type, setType] = useState<string>('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
    const [trackingShipmentId, setTrackingShipmentId] = useState<string | null>(null)



    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

    const { data, isLoading, isError, refetch, isPlaceholderData } = useQuery({
        queryKey: ['manager-shipments', page, status, type, activeTab],
        queryFn: async () => {
            const res = await api.get('/shipments', {
                params: {
                    page,
                    status: status || undefined,
                    shipmentType: type || undefined,
                    tab: activeTab, // Let the backend handle tab filtering if possible, or filter locally if not
                    limit: 12
                }
            })
            return res.data
        },
        placeholderData: (previousData) => previousData
    })

    useEffect(() => {
        setPage(1)
    }, [status, type, activeTab])

    if (isError) return <ErrorDisplay message="Cloud synchronization failed." onRetry={refetch} />

    const shipments: Shipment[] = data?.shipments || []
    const pagination = {
        total: data?.total || 0,
        pages: data?.pages || 0,
        currentPage: data?.currentPage || 1
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Premium Manager Header */}
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Logistics Command Center</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Enterprise Fleet Control</h1>
                    <p className="text-slate-500 font-medium">Orchestrating {pagination.total} global shipments across the network.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p - 2.5 rounded - xl transition - all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p - 2.5 rounded - xl transition - all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'} `}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 hover:scale-105 active:scale-95 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Book New Docket</span>
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-8 border-b border-slate-100 dark:border-white/5 px-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb - 4 text - xs font - black uppercase tracking - widest transition - all relative ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'} `}
                >
                    Active Shipments
                    {activeTab === 'active' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`pb - 4 text - xs font - black uppercase tracking - widest transition - all relative ${activeTab === 'past' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'} `}
                >
                    Past & Recent
                    {activeTab === 'past' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {/* Intelligent Filter Bar */}
            <div className="glass-frame p-2 flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-4">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Filter Management Active</span>
                </div>

                <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden lg:block" />

                <div className="flex flex-wrap items-center gap-2 p-1">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="bg-transparent text-[11px] font-black text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer uppercase tracking-wider"
                        >
                            <option value="">All Statuses</option>
                            {activeTab === 'active' ? (
                                ['CREATED', 'ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY'].map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                ))
                            ) : (
                                ['DELIVERED', 'CLOSED', 'CANCELLED'].map(s => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                        <Zap className="h-3.5 w-3.5 text-slate-400" />
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="bg-transparent text-[11px] font-black text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer uppercase tracking-wider"
                        >
                            <option value="">All Categories</option>
                            {SHIPMENT_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {(status || type) && (
                        <button
                            onClick={() => { setStatus(''); setType(''); }}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-600 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 uppercase tracking-widest"
                        >
                            <X className="h-3 w-3" />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <ShipmentsSkeleton viewMode={viewMode} />
            ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 glass-frame border-dashed bg-transparent">
                    <div className="p-8 rounded-[2.5rem] bg-slate-100 dark:bg-white/5 mb-6">
                        <Truck className="h-12 w-12 text-slate-300 dark:text-white/20" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">No {activeTab} Protocols Found</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Refine your search parameters or initiate a new logistics docket.</p>
                </div>
            ) : (
                <>
                    <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isPlaceholderData ? 0.6 : 1 }}
                        className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}
                    >

                        <AnimatePresence mode="popLayout">
                            {shipments.map((s) => (
                                <motion.div
                                    key={s._id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                >
                                    <ShipmentCard
                                        shipment={s}
                                        viewMode={viewMode}
                                        onTrack={(id) => setTrackingShipmentId(id)}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>

                    {/* Premium Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-12">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 transition-all shadow-sm"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <div className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                                <span className="text-sm font-black text-slate-400">PAGE</span>
                                <span className="text-sm font-black text-blue-600">{page}</span>
                                <span className="text-sm font-black text-slate-400">OF</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">{pagination.pages}</span>
                            </div>

                            <button
                                disabled={page === pagination.pages}
                                onClick={() => setPage(p => p + 1)}
                                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500 transition-all shadow-sm"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Tracking and Creation Portals */}
            <AnimatePresence>
                {isModalOpen && (
                    <CreateShipmentModal
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={() => {
                            setIsModalOpen(false)
                            refetch()
                        }}
                    />
                )}
            </AnimatePresence>

            <TrackingModal
                shipmentId={trackingShipmentId}
                onClose={() => setTrackingShipmentId(null)}
            />
        </div>
    )
}
