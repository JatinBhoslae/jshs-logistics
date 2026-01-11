import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Package, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, Plus, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { useDebounce } from '../../hooks/useDebounce'
import type { Shipment } from '../../types'
import ErrorDisplay from '../../components/ErrorDisplay'
import TrackingModal from '../../components/TrackingModal'
import ShipmentCard from '../../components/shipments/ShipmentCard'
import ShipmentsSkeleton from '../../components/shipments/ShipmentsSkeleton'

export default function CustomerShipments() {
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [trackingShipmentId, setTrackingShipmentId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

    const debouncedSearch = useDebounce(search, 300)

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['customer-shipments', page, debouncedSearch, activeTab],
        queryFn: async () => {
            const res = await api.get('/shipments', {
                params: {
                    page,
                    search: debouncedSearch,
                    tab: activeTab,
                    limit: 9
                }
            })
            return res.data
        }
    })

    useEffect(() => {
        setPage(1)
    }, [debouncedSearch, activeTab])

    if (isError) return <ErrorDisplay message="Unable to fetch your shipment logs." onRetry={refetch} />

    const shipments: Shipment[] = data?.shipments || []
    const pagination = {
        total: data?.total || 0,
        pages: data?.pages || 0,
        currentPage: data?.currentPage || 1
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Customer Focused Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-8 border-b border-slate-200 dark:border-white/10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 rounded-md">My Shipments</span>
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Your Digital Logistics Console</h1>
                    <p className="text-slate-500 font-medium text-lg">Track, manage, and book your business logistics with ease.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutList className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => navigate('/app/create-shipment')}
                        className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[2rem] font-black text-sm transition-all shadow-2xl shadow-blue-500/30 active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        <span>BOOK SHIPMENT</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-8 border-b border-slate-100 dark:border-white/5 px-2">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'active' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Active Movements
                    {activeTab === 'active' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('past')}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'past' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Past Shipments
                    {activeTab === 'past' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                </button>
            </div>

            {/* Modern Search Experience */}
            <div className="relative group max-w-2xl mx-auto">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Enter Tracking ID or destination to find your package..."
                    className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-[3rem] pl-16 pr-8 py-5 text-lg font-medium focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm group-hover:shadow-md dark:text-white"
                />
            </div>

            {isLoading ? (
                <ShipmentsSkeleton viewMode={viewMode} />
            ) : shipments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-slate-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10 text-center px-6">
                    <div className="p-10 rounded-full bg-white dark:bg-slate-800 mb-8 shadow-xl">
                        <Package className="h-16 w-16 text-blue-500 opacity-40" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">No {activeTab} Shipments</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-4 text-lg max-w-md mx-auto">You don't have any {activeTab} shipments matching your search.</p>
                </div>
            ) : (
                <div className="space-y-10">
                    <motion.div
                        layout
                        className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-4 max-w-5xl mx-auto"}
                    >
                        <AnimatePresence mode="popLayout">
                            {shipments.map((s) => (
                                <motion.div
                                    key={s._id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
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
                        <div className="flex items-center justify-center gap-6 pt-6 text-center">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="h-12 w-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:shadow-lg transition-all"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                            <div className="flex items-center gap-4">
                                {[...Array(pagination.pages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setPage(i + 1)}
                                        className={`h-1.5 rounded-full transition-all ${page === i + 1 ? 'w-12 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
                                        title={`Page ${i + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                disabled={page === pagination.pages}
                                onClick={() => setPage(page + 1)}
                                className="h-12 w-12 flex items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:shadow-lg transition-all"
                            >
                                <ChevronRight className="h-6 w-6" />
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
