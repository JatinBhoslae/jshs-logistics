import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import {
    ShieldCheck,
    User,
    XCircle,
    Truck,
    ImageIcon,
    CheckCircle,
    Clock,
    ChevronRight,
    ShieldAlert
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Skeleton from '../../components/Skeleton'
import { formatCurrency } from '../../utils'
import type { Shipment } from '../../types'

export default function PendingApprovals() {
    const queryClient = useQueryClient()
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
    const [rejectionReason, setRejectionReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState(false)

    const { data: shipments, isLoading } = useQuery<Shipment[]>({
        queryKey: ['pendingApprovals'],
        queryFn: async () => {
            const res = await api.get('/customer/approvals/pending')
            return res.data
        }
    })

    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.post(`/customer/approvals/${id}/approve`)
        },
        onSuccess: () => {
            toast.success('Shipment approved successfully!')
            queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
            setSelectedShipment(null)
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Approval failed'
            toast.error(typeof msg === 'string' ? msg : 'Approval failed')
        }
    })

    const rejectMutation = useMutation({
        mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
            return api.post(`/customer/approvals/${id}/reject`, { reason })
        },
        onSuccess: () => {
            toast.success('Shipment rejected')
            queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] })
            setShowRejectModal(false)
            setSelectedShipment(null)
            setRejectionReason('')
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error?.message || err.response?.data?.error || 'Rejection failed'
            toast.error(typeof msg === 'string' ? msg : 'Rejection failed')
        }
    })

    if (isLoading) return <LoadingSkeleton />

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Customer Approvals</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Review and approve self-service shipments created by customers.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-200 dark:border-amber-500/20">
                        <Clock className="h-4 w-4" />
                        <span>{shipments?.length || 0} Pending Requests</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Shipment List */}
                <div className="lg:col-span-2 space-y-4">
                    {!shipments || shipments.length === 0 ? (
                        <div className="glass-card p-12 text-center">
                            <ShieldCheck className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">All Clear!</h3>
                            <p className="text-slate-500 mt-2">No shipments currently awaiting approval.</p>
                        </div>
                    ) : (
                        shipments.map((s) => (
                            <div
                                key={s._id}
                                onClick={() => setSelectedShipment(s)}
                                className={`glass-card p-5 cursor-pointer transition-all border-l-4 group ${selectedShipment?._id === s._id
                                    ? 'border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5 ring-2 ring-indigo-500/10'
                                    : 'border-l-transparent hover:border-l-slate-300 dark:hover:border-l-white/20'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0 text-indigo-600">
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                    {s.referenceId}
                                                </h4>
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${s.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {s.paymentStatus === 'PAID' ? 'PAID ₹1.00' : 'UNPAID'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {(s.customerId as any)?.name || 'Unknown Customer'}
                                            </p>
                                            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-slate-400 block uppercase font-bold tracking-widest text-[9px]">Pickup</span>
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{s.origin.name}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-slate-400 block uppercase font-bold tracking-widest text-[9px]">Destination</span>
                                                    <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-1">{s.destination.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className={`h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-all ${selectedShipment?._id === s._id ? 'translate-x-1' : ''}`} />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right: Details Panel */}
                <div className="lg:col-span-1">
                    <div className="sticky top-24 space-y-6">
                        {selectedShipment ? (
                            <div className="glass-frame p-0 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                                {/* Header Image/Banner */}
                                <div className="h-48 relative group">
                                    {selectedShipment.goodsImages && selectedShipment.goodsImages.length > 0 ? (
                                        <img
                                            src={selectedShipment.goodsImages[0]}
                                            alt="Goods"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                                            <ImageIcon className="h-10 w-10 text-slate-300" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Pricing</span>
                                            <h3 className="text-2xl font-black text-white">{formatCurrency(selectedShipment.price || 0)}</h3>
                                        </div>
                                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs text-white border border-white/30">
                                            {selectedShipment.deliveryType?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    {/* AI Categorization Callout */}
                                    <div className={`p-4 rounded-xl border flex gap-3 ${selectedShipment.aiCategorization?.category !== 'UNKNOWN'
                                        ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                                        : 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400'
                                        }`}>
                                        {selectedShipment.aiCategorization?.category !== 'UNKNOWN' ? <ShieldCheck className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
                                        <div className="text-xs">
                                            <p className="font-black uppercase tracking-wider mb-1">AI Intelligence Report</p>
                                            <p className="opacity-80">
                                                {selectedShipment.aiCategorization?.category !== 'UNKNOWN'
                                                    ? `Goods identified as ${selectedShipment.aiCategorization?.category} with ${Math.round((selectedShipment.aiCategorization?.confidence || 0) * 100)}% confidence.`
                                                    : "AI was unable to definitively categorize these goods. Manual review required."
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Summary Details */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 block uppercase font-bold tracking-widest text-[9px]">Calculated Distance</span>
                                            <span className="text-slate-900 dark:text-white font-bold">{selectedShipment.distanceKm?.toFixed(1)} km</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-slate-400 block uppercase font-bold tracking-widest text-[9px]">Reported Weight</span>
                                            <span className="text-slate-900 dark:text-white font-bold">{selectedShipment.packageDetails?.weight} kg</span>
                                        </div>
                                    </div>

                                    {/* Assignment Insights */}
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Assignment</h5>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Truck className="h-4 w-4 text-indigo-500" />
                                                    <span className="text-sm font-bold">{(selectedShipment.assignedVehicleId as any)?.plateNumber || 'TBD'}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Auto-Assigned</span>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-sm font-bold">{(selectedShipment.assignedDriverId as any)?.name || 'TBD'}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Auto-Assigned</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/5">
                                        <button
                                            onClick={() => approveMutation.mutate(selectedShipment._id)}
                                            disabled={approveMutation.isPending || selectedShipment.paymentStatus !== 'PAID'}
                                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            {approveMutation.isPending ? <Loader className="animate-spin h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                            Approve & Dispatch
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(true)}
                                            disabled={rejectMutation.isPending}
                                            className="w-full py-3 text-red-500 dark:text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-500/5 rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="h-5 w-5" />
                                            Reject Shipment
                                        </button>
                                        {selectedShipment.paymentStatus !== 'PAID' && (
                                            <p className="text-[10px] text-center text-amber-600 font-bold uppercase tracking-wider">
                                                Approval disabled: Payment pending
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-12 text-center border-dashed border-2">
                                <Clock className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                                <p className="text-sm text-slate-500">Select a shipment to review details and take action.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && selectedShipment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all">
                    <div className="glass-card max-w-md w-full p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="h-16 w-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-600">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Reject Shipment?</h3>
                            <p className="text-slate-500 mt-2">Please provide a reason. This will be visible to the customer and the shipment will be cancelled.</p>
                        </div>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Overweight for assigned vehicle, restricted location..."
                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none h-32"
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="py-3 px-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate({ id: selectedShipment._id, reason: rejectionReason })}
                                disabled={!rejectionReason || rejectMutation.isPending}
                                className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {rejectMutation.isPending ? <Loader className="animate-spin h-4 w-4" /> : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Loader({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    )
}

function LoadingSkeleton() {
    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-40" />
            </div>
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-[600px] w-full rounded-2xl" />
            </div>
        </div>
    )
}
