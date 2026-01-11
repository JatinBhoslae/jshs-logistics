import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import {
    Wallet,
    TrendingUp,
    Package,
    CheckCircle2,
    AlertCircle,
    Loader2,
    HandCoins,
    History,
    Info,
    Banknote,
    Smartphone,
    XCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import Skeleton from '../../components/Skeleton'
import { formatCurrency, formatDate } from '../../utils'
import type { DriverEarnings as DriverEarningsType } from '../../types'

export default function DriverEarnings() {
    const queryClient = useQueryClient()
    const [withdrawAmount, setWithdrawAmount] = useState('')
    const [upiId, setUpiId] = useState('')
    const [showWithdrawModal, setShowWithdrawModal] = useState(false)

    const { data, isLoading } = useQuery<DriverEarningsType>({
        queryKey: ['driverEarnings'],
        queryFn: async () => {
            const res = await api.get('/drivers/earnings/summary')
            return res.data
        }
    })

    const withdrawMutation = useMutation({
        mutationFn: async ({ amount, upiId }: { amount: number, upiId: string }) => {
            return api.post('/drivers/earnings/withdraw', { amount, upiId })
        },
        onSuccess: () => {
            toast.success('Withdrawal request submitted!')
            queryClient.invalidateQueries({ queryKey: ['driverEarnings'] })
            setShowWithdrawModal(false)
            setWithdrawAmount('')
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Withdrawal failed')
        }
    })

    if (isLoading) return <LoadingSkeleton />

    const summary = data?.summary
    const shipments = data?.shipments || []
    const withdrawals = data?.withdrawals || []

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Earnings & Wallet</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Track your income and withdraw earnings to your bank account.</p>
                </div>
                <button
                    onClick={() => setShowWithdrawModal(true)}
                    disabled={!summary || summary.availableBalance < 100}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 group disabled:opacity-50"
                >
                    <HandCoins className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    Withdraw Funds
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                        <Wallet className="h-16 w-16" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Balance</span>
                    <div className="mt-2 text-3xl font-black text-indigo-600">
                        {formatCurrency(summary?.availableBalance || 0)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Ready for withdrawal</p>
                </div>

                <div className="glass-card">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Earnings</span>
                    <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                        {formatCurrency(summary?.totalLifetimeEarnings || 0)}
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase">
                        <TrendingUp className="h-3 w-3" />
                        Lifetime income
                    </div>
                </div>

                <div className="glass-card">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Processing</span>
                    <div className="mt-2 text-3xl font-black text-amber-500">
                        {formatCurrency(summary?.processingAmount || 0)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Ongoing withdrawals</p>
                </div>

                <div className="glass-card">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Withdrawals</span>
                    <div className="mt-2 text-3xl font-black text-emerald-500">
                        {formatCurrency(summary?.successfullyWithdrawn || 0)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">Successfully settled</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Shipments Breakdown */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Package className="h-5 w-5 text-indigo-500" />
                            Shipment Earnings
                        </h3>
                        <span className="text-xs text-slate-400">{shipments.length} Completed Journeys</span>
                    </div>

                    <div className="glass-frame p-0 overflow-hidden overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 dark:border-white/5">
                                    <th className="px-6 py-4">Shipment</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Total Price</th>
                                    <th className="px-6 py-4 text-right">Your Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {shipments.map((s) => (
                                    <tr key={s._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900 dark:text-white uppercase text-sm group-hover:text-indigo-600 transition-colors">
                                                {s.referenceId}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">
                                                {s.deliveredAt ? formatDate(s.deliveredAt) : 'Pending Delivery'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${s.status === 'DELIVERED' || s.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-500 tabular-nums">
                                            {formatCurrency(s.totalPrice)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-indigo-600 text-sm tabular-nums">
                                                {formatCurrency(s.driverShare)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Withdrawal History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <History className="h-5 w-5 text-indigo-500" />
                            Activity
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {withdrawals.length === 0 ? (
                            <div className="glass-card p-8 text-center border-dashed border-2">
                                <Banknote className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs text-slate-500">No withdrawal activity yet.</p>
                            </div>
                        ) : (
                            withdrawals.map((w) => (
                                <div key={w._id} className="glass-card p-4 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${w.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                                            w.status === 'FAILED' ? 'bg-red-50 text-red-600' :
                                                'bg-amber-50 text-amber-600'
                                            }`}>
                                            {w.status === 'SUCCESS' ? <CheckCircle2 className="h-5 w-5" /> :
                                                w.status === 'FAILED' ? <AlertCircle className="h-5 w-5" /> :
                                                    <Loader2 className="h-5 w-5 animate-spin" />}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                                {formatCurrency(w.amount)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase">
                                                {formatDate(w.requestedAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${w.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            w.status === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                            {w.status}
                                        </span>
                                        <div className="text-[10px] text-slate-400 mt-1 font-mono">{w.upiId}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="glass-card p-4 bg-indigo-500/5 border-indigo-500/10">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-indigo-500 shrink-0" />
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                <p className="font-bold text-indigo-600 uppercase mb-1">Payment Policy</p>
                                <p>Withdrawals are processed instantly via Razorpay Payouts. Minimum withdrawal amount is ₹100.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in transition-all">
                    <div className="glass-card max-w-md w-full p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600">
                                <Banknote className="h-8 w-8" />
                            </div>
                            <button
                                onClick={() => setShowWithdrawModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                                <XCircle className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Withdraw Funds</h3>
                            <p className="text-slate-500 mt-2">Enter the amount and your UPI ID to receive payments instantly.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Amount (INR)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</div>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="Min 100"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-8 pr-4 py-4 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="flex justify-between px-1">
                                    <span className="text-[10px] text-slate-400 font-bold">Max: {formatCurrency(summary?.availableBalance || 0)}</span>
                                    <button
                                        onClick={() => setWithdrawAmount(String(summary?.availableBalance || 0))}
                                        className="text-[10px] text-indigo-600 font-black uppercase"
                                    >
                                        Withdraw Max
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">UPI ID</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="e.g. driver@upi"
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                if (Number(withdrawAmount) < 100) return toast.error('Minimum withdrawal is ₹100')
                                if (!upiId.includes('@')) return toast.error('Invalid UPI ID')
                                withdrawMutation.mutate({ amount: Number(withdrawAmount), upiId })
                            }}
                            disabled={!withdrawAmount || !upiId || withdrawMutation.isPending}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {withdrawMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <HandCoins className="h-5 w-5" />}
                            Send to Bank
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}



function LoadingSkeleton() {
    return (
        <div className="space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-12 w-48 rounded-xl" />
            </div>
            <div className="grid grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
            </div>
            <div className="grid grid-cols-3 gap-8">
                <Skeleton className="col-span-2 h-[400px] rounded-2xl" />
                <Skeleton className="h-[400px] rounded-2xl" />
            </div>
        </div>
    )
}
