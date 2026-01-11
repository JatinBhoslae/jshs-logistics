import { motion } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2, Circle, Clock, MapPin, Truck, AlertTriangle } from 'lucide-react';
import EnhancedTrackingMap from './EnhancedTrackingMap';
import type { Shipment, LocationPing, ShipmentEvent } from '../types';
import { useAuth } from '../auth/AuthContext';

interface LiveShipmentTrackerProps {
    shipment: Shipment;
    locations: LocationPing[];
    liveLocation?: { lat: number; lng: number } | null;
    events: ShipmentEvent[];
    onClose?: () => void;
    isDialog?: boolean;
}

export default function LiveShipmentTracker({ shipment, locations, liveLocation, events, onClose, isDialog = false }: LiveShipmentTrackerProps) {
    const { user } = useAuth();
    const role = user?.role || 'CUSTOMER';

    const getTimelineTitle = () => {
        if (role === 'DRIVER') return 'Journey Timeline';
        if (role === 'CUSTOMER') return 'Delivery Timeline';
        return 'Mission Protocol Timeline'; // For Manager
    };

    const milestones = [
        { key: 'CREATED', label: 'Order Created', icon: Circle, date: shipment.createdAt },
        { key: 'ASSIGNED', label: 'Rider Assigned', icon: ShieldCheck, date: events.find(e => e.type === 'SHIPMENT_ASSIGNED')?.createdAt },
        { key: 'PICKED_UP', label: 'Package Picked Up', icon: MapPin, date: events.find(e => e.type === 'SHIPMENT_PICKED_UP' || e.type === 'MARK_LOADED')?.createdAt },
        { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck, date: events.find(e => e.type === 'SHIPMENT_DISPATCHED')?.createdAt },
        { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, date: shipment.status === 'DELIVERED' ? events.find(e => e.type === 'SHIPMENT_DELIVERED')?.createdAt : null },
    ];

    const content = (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 w-full">
            {/* Header */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shadow-sm z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{shipment.referenceId}</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${shipment.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {shipment.status}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="truncate max-w-[150px]">{shipment.origin.name}</span>
                        <span>→</span>
                        <span className="truncate max-w-[150px]">{shipment.destination.name}</span>
                    </div>
                </div>
                {isDialog && onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Map Section */}
                <div className="h-[280px] w-full rounded-2xl overflow-hidden glass-card p-0 shadow-lg border-0 shrink-0 relative">
                    <EnhancedTrackingMap shipment={shipment} locations={locations} liveLocation={liveLocation} />
                    <div className="absolute top-3 right-3 z-[400] pointer-events-none">
                        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1.5 rounded-lg shadow-lg border border-slate-100 dark:border-white/10 text-right">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ETA Window</div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white">
                                {shipment.predictedEta ? new Date(shipment.predictedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Timeline Header with Progress */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${role === 'DRIVER' ? 'text-emerald-500' :
                                role === 'CUSTOMER' ? 'text-blue-500' :
                                    'text-rose-500'
                                }`}>
                                {getTimelineTitle()}
                            </h3>
                            <div className="text-[10px] font-bold text-slate-400">{shipment.progressPercentage || 0}% Complete</div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${shipment.progressPercentage || 0}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={`h-full rounded-full ${role === 'DRIVER' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
                                    role === 'CUSTOMER' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                        'bg-gradient-to-r from-rose-500 to-rose-600'
                                    }`}
                            />
                        </div>

                        {/* ETA Display */}
                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimated Arrival</span>
                            </div>
                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                {shipment.predictedEta ? new Date(shipment.predictedEta).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                }) : 'Calculating...'}
                            </div>
                        </div>
                    </div>

                    {/* Comprehensive Milestone Timeline */}
                    <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 before:via-blue-300 before:to-slate-200 dark:before:to-slate-700">
                        {milestones.map((m, idx) => {
                            const isCompleted = !!m.date;
                            const isCurrent = shipment.status === m.key || (m.key === 'IN_TRANSIT' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'].includes(shipment.status));
                            const relatedEvent = events.find(e =>
                                e.type === `SHIPMENT_${m.key}` ||
                                (m.key === 'PICKED_UP' && (e.type === 'SHIPMENT_PICKED_UP' || e.type === 'MARK_LOADED')) ||
                                (m.key === 'IN_TRANSIT' && e.type === 'SHIPMENT_DISPATCHED') ||
                                (m.key === 'ASSIGNED' && e.type === 'SHIPMENT_ASSIGNED')
                            );

                            return (
                                <motion.div
                                    key={m.key}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="relative"
                                >
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-8 h-6 w-6 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300
                                        ${isCompleted ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/40' :
                                            isCurrent ? 'bg-amber-500 border-amber-400 text-white animate-pulse shadow-lg shadow-amber-500/40' :
                                                'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400'}`}>
                                        <m.icon className="h-3 w-3" />
                                    </div>

                                    {/* Milestone Content */}
                                    <div className={`pb-2 ${isCompleted || isCurrent ? 'opacity-100' : 'opacity-50'}`}>
                                        {/* Main Label & Timestamp */}
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1">
                                                <div className={`text-sm font-black uppercase tracking-wide mb-0.5 ${isCompleted || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                                                    }`}>
                                                    {m.label}
                                                </div>
                                                {m.date && (
                                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                                        {new Date(m.date).toLocaleString([], {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            {isCompleted && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            )}
                                        </div>

                                        {/* Role-Specific Details */}
                                        {isCompleted && (
                                            <>


                                                {/* Customer View - Delivery Updates */}
                                                {role === 'CUSTOMER' && relatedEvent?.description && (
                                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                                        <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                                                            {relatedEvent.description}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Driver View - Completion Confirmation */}
                                                {role === 'DRIVER' && (
                                                    <div className="mt-2 flex items-center gap-2 text-[9px] text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        <span className="font-bold">Checkpoint Completed</span>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Current Milestone - Action Required */}
                                        {isCurrent && !isCompleted && (
                                            <>
                                                {role === 'DRIVER' && (
                                                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-2 border-amber-200 dark:border-amber-900/30">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                                            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Action Required</span>
                                                        </div>
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-300 font-medium">
                                                            Proceed to complete this checkpoint
                                                        </p>
                                                    </div>
                                                )}
                                                {role === 'CUSTOMER' && (
                                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                                            Currently in progress...
                                                        </p>
                                                    </div>
                                                )}
                                                {role === 'MANAGER' && (
                                                    <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/10 rounded-lg border border-rose-100 dark:border-rose-900/20">
                                                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wide">
                                                            ⚡ Active Monitoring Required
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>


            </div>


        </div>
    );

    if (isDialog) {
        return (
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[400px] md:w-[450px] z-[3000] shadow-2xl"
            >
                {content}
            </motion.div>
        )
    }

    return content;
}
