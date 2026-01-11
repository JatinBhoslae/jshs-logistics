import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    FileText,
    Search,
    Filter,
    Eye,
    Plus,
    Trash2,
    Zap,
    ArrowRight,
    Anchor,
    Plane,
    Truck,
    Globe,
    Users,
    ChevronLeft,
    ChevronRight,
    Calendar,
    LayoutGrid,
    Shield,
    RefreshCw,
    X,
    FileCheck
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { formatDate, buildDocumentUrl } from '../../utils'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import IssueDocumentModal from '../../components/IssueDocumentModal'
import { useParams, useNavigate } from 'react-router-dom'

interface Document {
    _id: string
    shipmentId?: {
        _id: string
        referenceId: string
        status: string
    }
    customerId?: {
        _id: string
        name: string
        email: string
    }
    driverId?: {
        _id: string
        name: string
    }
    vehicleId?: {
        _id: string
        plateNumber: string
        model: string
    }
    type: string
    fileName: string
    filePath: string
    verified: boolean
    createdAt: string
}

interface PaginationData {
    total: number
    page: number
    limit: number
    totalPages: number
}

const ALL_CATEGORIES = [
    { id: 'all', label: 'Master Archive', icon: FileText, roles: ['MANAGER', 'DRIVER', 'CUSTOMER'], color: 'slate' },
    { id: 'universal', label: 'Commercial & Legal', icon: Globe, roles: ['MANAGER', 'CUSTOMER'], color: 'blue' },
    { id: 'road', label: 'Inland Transport', icon: Truck, roles: ['MANAGER', 'DRIVER', 'CUSTOMER'], color: 'emerald' },
    { id: 'sea', label: 'Maritime/Sea', icon: Anchor, roles: ['MANAGER', 'CUSTOMER'], color: 'indigo' },
    { id: 'air', label: 'Aviation/Air', icon: Plane, roles: ['MANAGER', 'CUSTOMER'], color: 'sky' },
    { id: 'customs', label: 'Cross-Border/Customs', icon: Security, roles: ['MANAGER', 'CUSTOMER'], color: 'violet' },
    { id: 'consignor-wise', label: 'Partner Management', icon: Users, roles: ['MANAGER'], color: 'amber' },
    { id: 'shipment', label: 'Journey Sequence', icon: Zap, roles: ['MANAGER', 'DRIVER', 'CUSTOMER'], color: 'rose' },
    { id: 'driver', label: 'Personnel Records', icon: Shield, roles: ['MANAGER', 'DRIVER'], color: 'cyan' },
    { id: 'vehicle', label: 'Fleet Compliance', icon: RefreshCw, roles: ['MANAGER', 'DRIVER'], color: 'purple' },
]

function Security(props: any) { return <Shield {...props} /> } // Helper for custom icon name

export default function Documents() {
    const { user } = useAuth()
    const { category: categoryParam } = useParams<{ category: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Derived state from URL
    const category = categoryParam || null

    const [searchTerm, setSearchTerm] = useState('')
    const [page, setPage] = useState(1)
    const [filterType, setFilterType] = useState('ALL')
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)

    // Map URL param to Backend API Category Enum
    const apiCategory = useMemo(() => {
        if (!category) return undefined
        if (category === 'consignor-wise') return 'CONSIGNOR'
        if (category === 'customer-wise') return 'CUSTOMER'
        return category.toUpperCase()
    }, [category])

    const { data, isLoading } = useQuery({
        queryKey: ['docs', apiCategory, page, searchTerm, filterType],
        queryFn: async () => {
            const res = await api.get('/docs', {
                params: {
                    category: apiCategory === 'ALL' ? undefined : apiCategory,
                    page,
                    limit: 12,
                    search: searchTerm || undefined,
                    type: filterType === 'ALL' ? undefined : filterType
                }
            })
            return res.data as { documents: Document[], pagination: PaginationData }
        },
        enabled: !!user && !!category
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/docs/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['docs'] })
            toast.success('Document removed from vault')
        }
    })

    const docTypes = [
        'ALL', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'BILL_OF_LADING', 'TELEX_RELEASE',
        'SEA_WAYBILL', 'AIR_WAYBILL', 'CMR_ROAD_CONSIGNMENT_NOTE', 'TRIP_SHEET', 'SHIPPING_BILL',
        'BILL_OF_ENTRY', 'POD', 'GST_INVOICE', 'DISPATCH_MANIFEST', 'VEHICLE_INSPECTION'
    ]

    const visibleCategories = useMemo(() => {
        return ALL_CATEGORIES.filter(cat => cat.roles.includes(user?.role || ''))
    }, [user?.role])

    // Grouping Logic
    const groupedDocs = useMemo(() => {
        if (!data?.documents) return {}

        if (category === 'consignor-wise' || category === 'customer-wise') {
            return data.documents.reduce((acc, doc) => {
                const key = doc.customerId?.name || 'External Partner'
                if (!acc[key]) acc[key] = []
                acc[key].push(doc)
                return acc
            }, {} as Record<string, Document[]>)
        }

        if (category === 'shipment') {
            return data.documents.reduce((acc, doc) => {
                const key = doc.shipmentId?.referenceId || 'General Records'
                if (!acc[key]) acc[key] = []
                acc[key].push(doc)
                return acc
            }, {} as Record<string, Document[]>)
        }

        if (category === 'driver') {
            return data.documents.reduce((acc, doc) => {
                const key = doc.driverId?.name || 'System/Unassigned'
                if (!acc[key]) acc[key] = []
                acc[key].push(doc)
                return acc
            }, {} as Record<string, Document[]>)
        }

        if (category === 'vehicle') {
            return data.documents.reduce((acc, doc) => {
                const key = doc.vehicleId?.plateNumber || 'Fleet Inventory'
                if (!acc[key]) acc[key] = []
                acc[key].push(doc)
                return acc
            }, {} as Record<string, Document[]>)
        }

        // Default Date-wise grouping
        return data.documents.reduce((acc, doc) => {
            const dateStr = new Date(doc.createdAt).toDateString()
            const todayStr = new Date().toDateString()
            const yesterdayStr = new Date(Date.now() - 86400000).toDateString()

            let key = formatDate(doc.createdAt)
            if (dateStr === todayStr) key = 'Today'
            else if (dateStr === yesterdayStr) key = 'Yesterday'

            if (!acc[key]) acc[key] = []
            acc[key].push(doc)
            return acc
        }, {} as Record<string, Document[]>)
    }, [data?.documents, category])

    if (!user) return null

    return (
        <div className="space-y-8 pb-20">
            {/* Context Intelligence Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 py-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-white/10">
                            Regulatory Vault
                        </div>
                        {category && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <ArrowRight className="h-3 w-3" />
                                <span className="text-[10px] font-black dark:text-blue-400 uppercase tracking-widest">
                                    {visibleCategories.find(c => c.id === category)?.label}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {category && (
                            <button
                                onClick={() => navigate('/app/documents')}
                                className="h-12 w-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 hover:scale-105 transition-transform shadow-sm"
                            >
                                <ChevronLeft className="h-6 w-6 text-slate-600" />
                            </button>
                        )}
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {category ? visibleCategories.find(c => c.id === category)?.label : 'Compliance Archive'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {category && user.role === 'MANAGER' && (
                        <button
                            onClick={() => setIsIssueModalOpen(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            Issue Record
                        </button>
                    )}
                    <div className="h-12 w-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-400">
                        <LayoutGrid className="h-5 w-5" />
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!category ? (
                    // HIGH-END DASHBOARD CATEGORY SELECTOR
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        {visibleCategories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => navigate(`/app/documents/${cat.id}`)}
                                className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all text-left flex flex-col justify-between h-[280px]"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity grayscale">
                                    <cat.icon size={140} />
                                </div>
                                <div className="space-y-6 relative z-10">
                                    <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-lg bg-slate-100 dark:bg-white/5 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-110 transition-all duration-500`}>
                                        <cat.icon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{cat.label}</h3>
                                        <p className="text-slate-500 text-xs font-medium mt-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            Managed access to technical records, legal manifests, and operational sequence for {cat.id.replace('-', ' ')}.
                                        </p>
                                    </div>
                                </div>
                                <div className="relative z-10 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Open Archive</span>
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </button>
                        ))}
                    </motion.div>
                ) : (
                    // PREMIUM LIST/GRID VIEW
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-10"
                    >
                        {/* Advanced Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 bg-white/70 dark:bg-slate-900/70 p-4 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl backdrop-blur-2xl sticky top-6 z-30 transition-all">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by ID, Name, or Metadata..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:ring-2 ring-blue-500 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold appearance-none cursor-pointer focus:ring-2 ring-blue-500 transition-all"
                                >
                                    <option value="ALL">All Types</option>
                                    {docTypes.filter(t => t !== 'ALL').map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <button className="h-14 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors">
                                <FileCheck className="h-4 w-4 text-blue-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Verified Only</span>
                            </button>
                            <button
                                onClick={() => navigate('/app/documents')}
                                className="h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                            >
                                <X className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Close Vault</span>
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-10">
                                {[...Array(6)].map((_, i) => <div key={i} className="h-64 bg-slate-50 dark:bg-white/5 rounded-[2.5rem] animate-pulse" />)}
                            </div>
                        ) : (
                            <div className="space-y-16">
                                {Object.keys(groupedDocs).length > 0 ? (
                                    Object.entries(groupedDocs).map(([groupKey, groupDocs]) => (
                                        <div key={groupKey} className="space-y-8">
                                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 text-xl font-black bg-blue-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-500/20">
                                                        {groupKey.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{groupKey}</h3>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{groupDocs.length} Total Records Found</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8">
                                                {groupDocs
                                                    .filter(d => filterType === 'ALL' || d.type === filterType)
                                                    .map((doc) => (
                                                        <motion.div
                                                            key={doc._id}
                                                            layout
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all relative overflow-hidden"
                                                        >
                                                            {/* Status Decor */}
                                                            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl opacity-20 ${doc.verified ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                                                            <div className="relative z-10 flex flex-col h-full justify-between">
                                                                <div>
                                                                    <div className="flex items-start justify-between mb-8">
                                                                        <div className="h-14 w-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner">
                                                                            <FileText className="h-8 w-8" />
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 dark:border-white/10">
                                                                                {doc.type.replace(/_/g, ' ')}
                                                                            </span>
                                                                            {doc.verified ? (
                                                                                <span className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                                                                                    <FileCheck className="h-3 w-3" /> Legitimacy Verified
                                                                                </span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                                                                    Pending Review
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 line-clamp-2 leading-tight" title={doc.fileName}>
                                                                        {doc.fileName || 'Untitled Documentation'}
                                                                    </h3>

                                                                    <div className="space-y-2 mt-auto">
                                                                        {doc.shipmentId && (
                                                                            <div className="flex items-center justify-between text-[10px]">
                                                                                <span className="font-black text-slate-400 uppercase">Sequence ID</span>
                                                                                <span className="font-black text-blue-600">{doc.shipmentId.referenceId}</span>
                                                                            </div>
                                                                        )}
                                                                        {doc.customerId && (
                                                                            <div className="flex items-center justify-between text-[10px]">
                                                                                <span className="font-black text-slate-400 uppercase">Entity</span>
                                                                                <span className="font-black text-slate-900 dark:text-white truncate max-w-[120px]">{doc.customerId.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <Calendar className="h-3 w-3 text-slate-400" />
                                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{formatDate(doc.createdAt)}</span>
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <a
                                                                            href={buildDocumentUrl(doc.filePath)}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="h-10 w-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <Eye className="h-4 w-4" />
                                                                        </a>
                                                                        {user.role === 'MANAGER' && (
                                                                            <button
                                                                                onClick={() => deleteMutation.mutate(doc._id)}
                                                                                className="h-10 w-10 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-32 text-center bg-slate-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                                        <div className="h-24 w-24 mx-auto rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center mb-6">
                                            <FileText className="h-12 w-12 text-slate-400" />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Vault Entry Empty</h4>
                                        <p className="text-slate-500 max-w-sm mx-auto mt-2 font-medium">No specialized documentation found for this category criteria. Please verify search parameters or filters.</p>
                                        <button
                                            onClick={() => { setSearchTerm(''); setFilterType('ALL'); }}
                                            className="mt-8 text-blue-600 font-black text-xs uppercase tracking-[0.2em] hover:text-blue-700 underline"
                                        >
                                            Reset Archive Scanning
                                        </button>
                                    </div>
                                )}

                                {/* Pagination */}
                                {data?.pagination && data.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-6 py-12">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:scale-105 transition-all shadow-md flex items-center justify-center"
                                        >
                                            <ChevronLeft className="h-6 w-6" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <span className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-lg shadow-blue-500/20">
                                                {page}
                                            </span>
                                            <span className="text-slate-400 px-2 font-black">/</span>
                                            <span className="text-slate-600 dark:text-slate-400 font-black text-sm">
                                                {data.pagination.totalPages}
                                            </span>
                                        </div>
                                        <button
                                            disabled={page === data.pagination.totalPages}
                                            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                                            className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 disabled:opacity-30 hover:scale-105 transition-all shadow-md flex items-center justify-center"
                                        >
                                            <ChevronRight className="h-6 w-6" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            <IssueDocumentModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} />
        </div>
    )
}
