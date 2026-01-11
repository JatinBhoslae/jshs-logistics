import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Activity, AlertCircle, CheckCircle2, User as UserIcon, MapPin, Navigation, Clock } from 'lucide-react';
import type { Shipment } from '../../types';
import { SHIPMENT_TYPES } from '../../constants';
import { formatDate, formatDistance } from '../../utils';

interface ShipmentCardProps {
    shipment: Shipment;
    viewMode: 'grid' | 'list';
    onTrack: (id: string) => void;
}

const statusColors: Record<string, string> = {
    CREATED: 'from-blue-500/10 to-blue-500/5 text-blue-600 ring-blue-500/20',
    ASSIGNED: 'from-amber-500/10 to-amber-500/5 text-amber-600 ring-amber-500/20',
    DISPATCHED: 'from-indigo-500/10 to-indigo-500/5 text-indigo-600 ring-indigo-500/20',
    PICKED_UP: 'from-cyan-500/10 to-cyan-500/5 text-cyan-600 ring-cyan-500/20',
    IN_TRANSIT: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 ring-emerald-500/20',
    DELAYED: 'from-orange-500/10 to-orange-500/5 text-orange-600 ring-orange-500/20',
    OUT_FOR_DELIVERY: 'from-lime-500/10 to-lime-500/5 text-lime-600 ring-lime-500/20',
    DELIVERED: 'from-slate-500/10 to-slate-500/5 text-slate-600 ring-slate-500/20',
    CLOSED: 'from-gray-500/10 to-gray-500/5 text-gray-600 ring-gray-500/20',
    CANCELLED: 'from-red-500/10 to-red-500/5 text-red-600 ring-red-500/20',
}

const StatusIconMap: Record<string, any> = {
    CREATED: Clock,
    ASSIGNED: UserIcon,
    DISPATCHED: Truck,
    PICKED_UP: Truck,
    IN_TRANSIT: Activity,
    DELAYED: AlertCircle,
    OUT_FOR_DELIVERY: Truck,
    DELIVERED: CheckCircle2,
    CLOSED: CheckCircle2,
    CANCELLED: AlertCircle,
}

export default function ShipmentCard({ shipment, viewMode, onTrack }: ShipmentCardProps) {
    const StatusIcon = StatusIconMap[shipment.status] || Activity;

    if (viewMode === 'grid') {
        return (
            <Link
                to={`/app/shipment/${shipment._id}`}
                className="group relative flex flex-col glass-frame p-6 hover:translate-y-[-4px] transition-all duration-300"
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 ring-1 ring-slate-900/5 group-hover:bg-blue-500 transition-colors">
                        <Truck className="h-6 w-6 text-slate-500 dark:text-white/40 group-hover:text-white" />
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase bg-gradient-to-br ring-1 ring-inset ${statusColors[shipment.status]}`}>
                        {shipment.status.replace(/_/g, ' ')}
                    </div>
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-500 transition-colors">
                    {shipment.referenceId}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
                    {SHIPMENT_TYPES.find(t => t.value === shipment.shipmentType)?.label} • {formatDistance(shipment.distanceKm)}
                </p>

                <div className="space-y-4 mt-auto">
                    <div className="col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Origin → Destination</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {shipment.origin?.name} → {shipment.destination?.name}
                        </p>
                    </div>

                    {[
                        'ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED'
                    ].includes(shipment.status) && (
                            <div className="col-span-2">
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onTrack(shipment._id);
                                    }}
                                    className="w-full py-2 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition-colors"
                                >
                                    <Navigation className="h-3.5 w-3.5" />
                                    Track Live
                                </button>
                            </div>
                        )}


                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Assigned Rider</p>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <UserIcon className="h-3 w-3" />
                            <span className="text-sm font-semibold truncate">
                                {(shipment.assignedDriverId as any)?.name || 'Unassigned'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">{shipment.origin?.name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">{shipment.destination?.name}</p>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Arrival</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(shipment.predictedEta || shipment.eta)}</p>
                    </div>
                </div>
            </Link >
        )
    }

    return (
        <Link
            to={`/app/shipment/${shipment._id}`}
            className="group flex flex-col md:flex-row items-center gap-6 glass-frame p-5 hover:bg-white/80 dark:hover:bg-white/[0.07] transition-all"
        >
            <div className="flex items-center gap-4 flex-1 w-full min-w-0">
                <div className="relative hidden sm:block">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ring-1 ring-inset ${statusColors[shipment.status]}`}>
                        <StatusIcon className="h-6 w-6" />
                    </div>
                    {shipment.status === 'IN_TRANSIT' && (
                        <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                    )}
                </div>

                <div className="min-w-0 flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div className="col-span-1">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                {shipment.referenceId}
                            </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-tighter uppercase bg-slate-100 dark:bg-white/5 text-slate-500`}>
                            {shipment.shipmentType}
                        </span>
                    </div>

                    <div className="col-span-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Consignor</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {typeof shipment.customerId === 'object' ? (shipment.customerId as any)?.name : 'Unknown'}
                        </div>
                    </div>

                    <div className="col-span-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rider</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {(shipment.assignedDriverId as any)?.name || 'Unassigned'}
                        </div>
                    </div>

                    <div className="col-span-1">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Consignee</div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {shipment.consignee?.name || 'NA'}
                        </div>
                        <div className="text-[9px] font-medium text-slate-400">
                            {shipment.consignee?.contact || 'No Contact'}
                        </div>
                    </div>

                    <div className="col-span-1 flex items-center gap-2 text-slate-400">
                        <MapPin className="h-3 w-3" />
                        <p className="text-xs font-bold truncate max-w-[200px]">
                            {shipment.origin?.name} <span className="mx-1 text-slate-300">→</span> {shipment.destination?.name}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 w-full md:w-auto md:border-l border-slate-100 dark:border-white/5 md:pl-8">
                <div className="hidden lg:block">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payload Path</p>
                    <div className="h-1.5 w-24 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${shipment.progressPercentage || 0}%` }}
                            className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                        />
                    </div>
                </div>

                <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">ETA Window</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(shipment.predictedEta || shipment.eta)}</p>

                </div>

                <div className="text-right sm:text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tracking</p>
                    {[
                        'ASSIGNED', 'DISPATCHED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELAYED'
                    ].includes(shipment.status) ? (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onTrack(shipment._id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-900 text-white hover:bg-blue-600 transition-colors"
                        >
                            <Navigation className="h-3 w-3" />
                            Live View
                        </button>
                    ) : (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${statusColors[shipment.status]}`}>
                            {shipment.status.replace(/_/g, ' ')}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    )
}
