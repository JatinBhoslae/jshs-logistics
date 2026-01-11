import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import Modal from '../Modal'
import { Shield, Award, Star, Clock, FileText, CheckCircle2, Zap, Mail } from 'lucide-react'
import Skeleton from '../Skeleton'

interface DriverProfileModalProps {
    driverId: string | null
    isOpen: boolean
    onClose: () => void
}

export default function DriverProfileModal({ driverId, isOpen, onClose }: DriverProfileModalProps) {
    const { data: driver, isLoading, isError } = useQuery({
        queryKey: ['driver-profile', driverId],
        queryFn: async () => {
            const res = await api.get(`/fleet/drivers/${driverId}`)
            return res.data.driver
        },
        enabled: !!driverId && isOpen
    })

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quantum Driver Intelligence">
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-48 w-full rounded-2xl" />
                </div>
            ) : isError ? (
                <div className="p-8 text-center text-rose-500 font-bold">Failed to load driver intel profile.</div>
            ) : driver ? (
                <div className="space-y-6">
                    {/* Header Info */}
                    <div className="flex items-center gap-6 p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Shield size={80} />
                        </div>
                        <div className="h-20 w-20 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-3xl font-black shrink-0">
                            {driver.name[0]}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-2xl font-black tracking-tight">{driver.name}</h3>
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                <Mail className="h-3.5 w-3.5" />
                                {driver.email}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                            <Star className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                            <div className="text-xl font-black text-slate-900 dark:text-white">{driver.performanceRating}/5</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rating</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                            <Clock className="h-5 w-5 text-blue-500 mx-auto mb-2" />
                            <div className="text-xl font-black text-slate-900 dark:text-white">{driver.yearsOfExperience || 0}y</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Exp</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5 text-center">
                            <Zap className="h-5 w-5 text-emerald-500 mx-auto mb-2" />
                            <div className="text-xl font-black text-slate-900 dark:text-white">{driver.totalTrips || 0}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trips</div>
                        </div>
                    </div>

                    {/* Trustworthiness Factors */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Vetting Status & Compliance</label>
                        <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Challans</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black ${driver.challansCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {driver.challansCount || 0} Detected
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">License Verification</span>
                                </div>
                                <span className="text-[10px] font-mono font-black text-slate-400">{driver.licenseNumber || 'JSHS-V-001'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Recognitions */}
                    {(driver.awards?.length > 0) && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Quantum Achievements</label>
                            <div className="flex flex-wrap gap-2">
                                {driver.awards.map((a: string, i: number) => (
                                    <span key={i} className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-black">
                                        <Award className="h-3 w-3" />
                                        {a}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <button className="w-full btn-primary py-4 shadow-xl shadow-blue-500/20 font-black uppercase tracking-widest text-xs">
                        Assign Priority Task
                    </button>
                </div>
            ) : null}
        </Modal>
    )
}
