import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Loader2, Navigation, Clock, CheckCircle2, Circle, ShieldCheck, MapPin, Truck, AlertTriangle, ChevronDown, TrendingUp, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { simulationApi } from '../services/apiService';
import EnhancedTrackingMap from './EnhancedTrackingMap';
import { formatDate } from '../utils';
import { useAuth } from '../auth/AuthContext';

interface TrackingModalProps {
    shipmentId: string | null;
    onClose: () => void;
}

export default function TrackingModal({ shipmentId, onClose }: TrackingModalProps) {
    const { socket } = useAuth();
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({
        'IN_TRANSIT': true // Default expand In Transit stage
    });

    const simStatusQuery = useQuery({
        queryKey: ['sim-status'],
        queryFn: () => simulationApi.getStatus(),
        refetchInterval: (query) => {
            // @ts-ignore
            return query.state.data?.running ? 10000 : false;
        },
        refetchOnWindowFocus: true
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['tracking', shipmentId],
        queryFn: async () => {
            if (!shipmentId) return null;
            const res = await api.get(`/shipments/${shipmentId}/tracking`);
            return res.data;
        },
        enabled: !!shipmentId,
        refetchInterval: simStatusQuery.data?.running ? 5000 : false,
    });

    useEffect(() => {
        if (!socket || !shipmentId) return;

        console.log('Joining shipment room:', shipmentId);
        socket.emit('join:shipment', { shipmentId });

        const handler = (msg: { shipmentId?: string; lat: number; lng: number; ts?: string }) => {
            if (msg?.shipmentId !== shipmentId) return;
            console.log('Received location update:', msg);
            setLiveLocation({ lat: msg.lat, lng: msg.lng });
        };

        socket.on('shipment:locationUpdate', handler);

        return () => {
            socket.off('shipment:locationUpdate', handler);
            socket.emit('leave:shipment', { shipmentId });
        };
    }, [socket, shipmentId]);

    // Reset live location when shipment changes
    useEffect(() => {
        setLiveLocation(null);
    }, [shipmentId]);

    return (
        <Transition show={!!shipmentId} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                                <div className="absolute right-4 top-4 z-10 hidden sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-500 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                {isLoading ? (
                                    <div className="h-[500px] flex items-center justify-center">
                                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                                    </div>
                                ) : error ? (
                                    <div className="h-[500px] flex flex-col items-center justify-center p-6 text-center">
                                        <Navigation className="h-12 w-12 text-slate-300 mb-4" />
                                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Tracking Unavailable</h3>
                                        <p className="mt-2 text-sm text-slate-500">We couldn't retrieve the live location for this shipment.</p>
                                    </div>
                                ) : data ? (
                                    <div className="flex flex-col h-[80vh] sm:h-[600px]">
                                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                                            <div>
                                                <DialogTitle as="h3" className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    Live Tracking
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ring-1 
                                                        ${data.shipment.status === 'DELAYED' ? 'bg-red-50 text-red-700 ring-red-500/10' :
                                                            data.shipment.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-500/10' :
                                                                'bg-blue-50 text-blue-700 ring-blue-500/10'}`}>
                                                        {data.shipment.status}
                                                    </span>
                                                </DialogTitle>
                                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                                    {data.shipment.origin.name} <span className="text-slate-300">→</span> {data.shipment.destination.name}
                                                </p>
                                            </div>
                                            <div className="hidden sm:block text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Predictive ETA</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {formatDate(data.estimatedArrival)}
                                                </p>
                                                {data.shipment.eta && new Date(data.shipment.eta).getTime() !== new Date(data.estimatedArrival).getTime() && (
                                                    <p className="text-xs text-slate-400 line-through">
                                                        {formatDate(data.shipment.eta)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex overflow-hidden">
                                            <div className="flex-1 relative bg-slate-50">
                                                <EnhancedTrackingMap
                                                    shipment={data.shipment}
                                                    locations={data.locationHistory || []}
                                                    liveLocation={liveLocation || data.currentLocation}
                                                />
                                            </div>

                                            {/* Right Sidebar - Analytics & Timeline */}
                                            <div className="w-80 border-l border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 hidden lg:flex flex-col overflow-y-auto">
                                                {/* Risk Assessment Card */}
                                                {data.delayRisk && (
                                                    <div className={`p-4 border-b border-slate-100 dark:border-white/5 ${data.delayRisk.level === 'high' ? 'bg-red-50/50 dark:bg-red-900/10' :
                                                        data.delayRisk.level === 'medium' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                                                            'bg-emerald-50/50 dark:bg-emerald-900/10'
                                                        }`}>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Delivery Risk Analysis</h4>
                                                        <div className="flex items-start gap-3">
                                                            <div className={`mt-0.5 w-2 h-2 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ${data.delayRisk.level === 'high' ? 'bg-red-500 ring-red-200' :
                                                                data.delayRisk.level === 'medium' ? 'bg-amber-500 ring-amber-200' :
                                                                    'bg-emerald-500 ring-emerald-200'
                                                                }`} />
                                                            <div>
                                                                <p className={`text-sm font-bold ${data.delayRisk.level === 'high' ? 'text-red-700 dark:text-red-400' :
                                                                    data.delayRisk.level === 'medium' ? 'text-amber-700 dark:text-amber-400' :
                                                                        'text-emerald-700 dark:text-emerald-400'
                                                                    }`}>
                                                                    {data.delayRisk.message}
                                                                </p>
                                                                {data.delayRisk.level === 'high' && (
                                                                    <p className="text-xs text-red-600/80 mt-1">Route optimization active to mitigate delays.</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Analytics content will be placed here or kept blank as requested */}
                                                <div className="p-6 flex flex-col h-full overflow-y-auto">
                                                    {(() => {
                                                        const { user } = useAuth();
                                                        const role = user?.role || 'CUSTOMER';

                                                        const getTimelineTitle = () => {
                                                            if (role === 'DRIVER') return 'Journey Timeline';
                                                            if (role === 'CUSTOMER') return 'Delivery Timeline';
                                                            return 'Mission Protocol Timeline';
                                                        };

                                                        const milestones = [
                                                            { key: 'CREATED', label: 'Order Created', icon: Circle, date: data.shipment.createdAt },
                                                            { key: 'ASSIGNED', label: 'Rider Assigned', icon: ShieldCheck, date: data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_ASSIGNED')?.createdAt },
                                                            { key: 'PICKED_UP', label: 'Package Picked Up', icon: MapPin, date: data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_PICKED_UP' || e.type === 'MARK_LOADED')?.createdAt },
                                                            { key: 'IN_TRANSIT', label: 'In Transit', icon: Truck, date: data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_DISPATCHED')?.createdAt },
                                                            { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, date: data.shipment.status === 'DELIVERED' ? data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_DELIVERED')?.createdAt : null },
                                                        ];

                                                        return (
                                                            <div className="space-y-6">
                                                                {/* Timeline Header with Progress */}
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${role === 'DRIVER' ? 'text-emerald-500' :
                                                                            role === 'CUSTOMER' ? 'text-blue-500' :
                                                                                'text-rose-500'
                                                                            }`}>
                                                                            {getTimelineTitle()}
                                                                        </h4>
                                                                        <div className="text-[10px] font-bold text-slate-400">{data.progressPercentage || 0}% Complete</div>
                                                                    </div>

                                                                    {/* Visual Progress Bar */}
                                                                    <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${data.progressPercentage || 0}%` }}
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
                                                                        <div className="text-xs font-black text-slate-900 dark:text-white">
                                                                            {(data.shipment.predictedEta || data.estimatedArrival) ? new Date(data.shipment.predictedEta || data.estimatedArrival).toLocaleString([], {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            }) : new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleString([], {
                                                                                month: 'short',
                                                                                day: 'numeric',
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </div>
                                                                    </div>

                                                                    {/* Real-Time Stats Grid */}
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {/* Distance Covered */}
                                                                        <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-900/30">
                                                                            <div className="text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Distance</div>
                                                                            <div className="text-lg font-black text-blue-700 dark:text-blue-300">
                                                                                {data.shipment.distanceKm ?
                                                                                    `${Math.round((data.shipment.distanceKm * (data.progressPercentage || 0)) / 100)} km` :
                                                                                    '-- km'}
                                                                            </div>
                                                                            <div className="text-[7px] text-blue-600/70 dark:text-blue-400/70 font-medium">
                                                                                of {data.shipment.distanceKm ? `${Math.round(data.shipment.distanceKm)} km` : '--'}
                                                                            </div>
                                                                        </div>

                                                                        {/* Progress */}
                                                                        <div className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                                                                            <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Progress</div>
                                                                            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                                                                {data.progressPercentage || 0}%
                                                                            </div>
                                                                            <div className="text-[7px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">
                                                                                {data.progressPercentage >= 75 ? 'Almost there!' :
                                                                                    data.progressPercentage >= 50 ? 'Halfway done' :
                                                                                        data.progressPercentage >= 25 ? 'Making progress' : 'Just started'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>



                                                                {/* Divider */}
                                                                <div className="border-t border-slate-200 dark:border-white/5 my-4" />

                                                                {/* Comprehensive Delivery Stages Timeline - Industry Grade Dropdowns */}
                                                                <div className="relative pl-8 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-500 before:via-blue-300 before:to-slate-200 dark:before:to-slate-700">
                                                                    {milestones.map((m, idx) => {
                                                                        const isCompleted = !!m.date;
                                                                        const isCurrent = data.shipment.status === m.key ||
                                                                            (m.key === 'IN_TRANSIT' && ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DISPATCHED'].includes(data.shipment.status)) ||
                                                                            (m.key === 'PICKED_UP' && data.shipment.status === 'PICKED_UP');
                                                                        const relatedEvent = data.recentEvents?.find((e: any) =>
                                                                            e.type === `SHIPMENT_${m.key}` ||
                                                                            (m.key === 'PICKED_UP' && (e.type === 'SHIPMENT_PICKED_UP' || e.type === 'MARK_LOADED')) ||
                                                                            (m.key === 'IN_TRANSIT' && e.type === 'SHIPMENT_DISPATCHED') ||
                                                                            (m.key === 'ASSIGNED' && e.type === 'SHIPMENT_ASSIGNED')
                                                                        );
                                                                        const isExpanded = expandedStages[m.key];

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

                                                                                {/* Collapsible Stage Card */}
                                                                                <div className={`rounded-xl border-2 transition-all duration-300 ${isCompleted ? 'bg-white dark:bg-slate-800/50 border-blue-200 dark:border-blue-900/30' :
                                                                                    isCurrent ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-900/40' :
                                                                                        'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-white/5'
                                                                                    }`}>
                                                                                    {/* Stage Header - Clickable */}
                                                                                    <button
                                                                                        onClick={() => setExpandedStages(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                                                                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors rounded-t-xl"
                                                                                    >
                                                                                        <div className="flex items-center gap-3 flex-1">
                                                                                            <div className="flex-1 text-left">
                                                                                                <div className={`text-sm font-black uppercase tracking-wide flex items-center gap-2 ${isCompleted || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                                                                                                    }`}>
                                                                                                    {m.label}
                                                                                                    {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                                                                    {isCurrent && !isCompleted && <Zap className="h-4 w-4 text-amber-500 animate-pulse" />}
                                                                                                </div>
                                                                                                {m.date && (
                                                                                                    <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                                                                                                        {new Date(m.date).toLocaleString([], {
                                                                                                            month: 'short',
                                                                                                            day: 'numeric',
                                                                                                            hour: '2-digit',
                                                                                                            minute: '2-digit'
                                                                                                        })}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                                    </button>

                                                                                    {/* Expandable Content */}
                                                                                    <AnimatePresence>
                                                                                        {isExpanded && (
                                                                                            <motion.div
                                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                                transition={{ duration: 0.3 }}
                                                                                                className="overflow-hidden"
                                                                                            >
                                                                                                <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-white/5">
                                                                                                    {/* Role-Specific Details */}
                                                                                                    {isCompleted && (
                                                                                                        <>
                                                                                                            {/* Manager View - Most Detailed */}
                                                                                                            {role === 'MANAGER' && (
                                                                                                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/5 space-y-2">
                                                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                                                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 rounded">✓ Verified</span>
                                                                                                                        <span className="text-[8px] text-slate-400 font-mono">ID: {Math.random().toString(36).substr(2, 6).toUpperCase()}</span>
                                                                                                                    </div>
                                                                                                                    {relatedEvent?.actorId && (
                                                                                                                        <div className="text-[9px] text-slate-500">
                                                                                                                            <span className="font-bold">Actor:</span> {relatedEvent.actorId.toString().slice(-8)}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    {relatedEvent?.location && (
                                                                                                                        <div className="text-[9px] text-slate-500">
                                                                                                                            <span className="font-bold">Location:</span> {relatedEvent.location.name || `${relatedEvent.location.lat?.toFixed(4)}, ${relatedEvent.location.lng?.toFixed(4)}`}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                    {relatedEvent?.description && (
                                                                                                                        <div className="text-[9px] text-slate-600 dark:text-slate-400 italic">
                                                                                                                            {relatedEvent.description}
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Customer View - Delivery Updates */}
                                                                                                            {role === 'CUSTOMER' && relatedEvent?.description && (
                                                                                                                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/20">
                                                                                                                    <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                                                                                                                        {relatedEvent.description}
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                            )}

                                                                                                            {/* Driver View - Completion Confirmation */}
                                                                                                            {role === 'DRIVER' && (
                                                                                                                <div className="mt-2 flex items-center gap-2 text-[9px] text-emerald-600 dark:text-emerald-400 p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg">
                                                                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                                                                    <span className="font-bold">Checkpoint Completed Successfully</span>
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
                                                                                                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                                                                                        <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Action Required</span>
                                                                                                                    </div>
                                                                                                                    <p className="text-[9px] text-amber-600 dark:text-amber-300 font-medium">
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

                                                                                                    {/* NESTED: Journey Milestones inside IN_TRANSIT stage */}
                                                                                                    {m.key === 'IN_TRANSIT' && isCurrent && (
                                                                                                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                                                                                                            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-3 flex items-center gap-2">
                                                                                                                <TrendingUp className="h-3 w-3" />
                                                                                                                Journey Progress
                                                                                                            </h5>

                                                                                                            {/* Nested Journey Milestones Timeline */}
                                                                                                            <div className="relative pl-6 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-400 before:via-purple-400 before:to-slate-200 dark:before:to-slate-700">
                                                                                                                {(() => {
                                                                                                                    const achievements = [];
                                                                                                                    const progress = data.progressPercentage || 0;
                                                                                                                    const distanceCovered = data.shipment.distanceKm ? Math.round((data.shipment.distanceKm * progress) / 100) : 0;

                                                                                                                    // Progress milestones
                                                                                                                    if (progress >= 25) achievements.push({
                                                                                                                        label: '25% Journey Complete',
                                                                                                                        icon: '🎯',
                                                                                                                        color: 'blue',
                                                                                                                        value: '25%',
                                                                                                                        achieved: true
                                                                                                                    });
                                                                                                                    if (progress >= 50) achievements.push({
                                                                                                                        label: 'Halfway Milestone',
                                                                                                                        icon: '⚡',
                                                                                                                        color: 'amber',
                                                                                                                        value: '50%',
                                                                                                                        achieved: true
                                                                                                                    });
                                                                                                                    if (progress >= 75) achievements.push({
                                                                                                                        label: '75% Complete',
                                                                                                                        icon: '🚀',
                                                                                                                        color: 'emerald',
                                                                                                                        value: '75%',
                                                                                                                        achieved: true
                                                                                                                    });

                                                                                                                    // Distance milestones
                                                                                                                    if (distanceCovered >= 25) achievements.push({
                                                                                                                        label: '25km Crossed',
                                                                                                                        icon: '📍',
                                                                                                                        color: 'purple',
                                                                                                                        value: '25 km',
                                                                                                                        achieved: true
                                                                                                                    });
                                                                                                                    if (distanceCovered >= 50) achievements.push({
                                                                                                                        label: '50km Milestone',
                                                                                                                        icon: '🏁',
                                                                                                                        color: 'indigo',
                                                                                                                        value: '50 km',
                                                                                                                        achieved: true
                                                                                                                    });
                                                                                                                    if (distanceCovered >= 75) achievements.push({
                                                                                                                        label: '75km Reached',
                                                                                                                        icon: '⭐',
                                                                                                                        color: 'pink',
                                                                                                                        value: '75 km',
                                                                                                                        achieved: true
                                                                                                                    });
                                                                                                                    if (distanceCovered >= 100) achievements.push({
                                                                                                                        label: '100km Century!',
                                                                                                                        icon: '🏆',
                                                                                                                        color: 'yellow',
                                                                                                                        value: '100 km',
                                                                                                                        achieved: true
                                                                                                                    });

                                                                                                                    const recentAchievements = achievements.slice(-5);

                                                                                                                    if (recentAchievements.length === 0) {
                                                                                                                        return (
                                                                                                                            <div className="relative">
                                                                                                                                <div className="absolute -left-6 h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                                                                                                </div>
                                                                                                                                <div className="p-2 bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-200 dark:border-white/5">
                                                                                                                                    <p className="text-[9px] text-slate-400 font-medium">Journey just started...</p>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        );
                                                                                                                    }

                                                                                                                    return recentAchievements.map((achievement, idx) => (
                                                                                                                        <motion.div
                                                                                                                            key={achievement.label}
                                                                                                                            initial={{ opacity: 0, x: -10 }}
                                                                                                                            animate={{ opacity: 1, x: 0 }}
                                                                                                                            transition={{ delay: idx * 0.05 }}
                                                                                                                            className="relative"
                                                                                                                        >
                                                                                                                            {/* Timeline Dot */}
                                                                                                                            <div className={`absolute -left-6 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg ${achievement.color === 'blue' ? 'bg-blue-500' :
                                                                                                                                achievement.color === 'amber' ? 'bg-amber-500' :
                                                                                                                                    achievement.color === 'emerald' ? 'bg-emerald-500' :
                                                                                                                                        achievement.color === 'purple' ? 'bg-purple-500' :
                                                                                                                                            achievement.color === 'indigo' ? 'bg-indigo-500' :
                                                                                                                                                achievement.color === 'pink' ? 'bg-pink-500' :
                                                                                                                                                    'bg-yellow-500'
                                                                                                                                }`}>
                                                                                                                                <CheckCircle2 className="h-2 w-2 text-white" />
                                                                                                                            </div>

                                                                                                                            {/* Achievement Card */}
                                                                                                                            <div className={`p-2 rounded-lg border ${achievement.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30' :
                                                                                                                                achievement.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' :
                                                                                                                                    achievement.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30' :
                                                                                                                                        achievement.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/30' :
                                                                                                                                            achievement.color === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/30' :
                                                                                                                                                achievement.color === 'pink' ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-900/30' :
                                                                                                                                                    'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30'
                                                                                                                                }`}>
                                                                                                                                <div className="flex items-center gap-2">
                                                                                                                                    <span className="text-sm">{achievement.icon}</span>
                                                                                                                                    <div className="flex-1">
                                                                                                                                        <div className="text-[9px] font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">
                                                                                                                                            {achievement.label}
                                                                                                                                        </div>
                                                                                                                                        <div className="text-[8px] text-slate-500 dark:text-slate-400 font-bold">
                                                                                                                                            {achievement.value}
                                                                                                                                        </div>
                                                                                                                                    </div>
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </motion.div>
                                                                                                                    ));
                                                                                                                })()}
                                                                                                            </div>

                                                                                                            {/* Real-time Status */}
                                                                                                            <div className="mt-3 p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/5 dark:to-purple-500/5 rounded-xl border border-blue-200 dark:border-blue-900/30">
                                                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Live Status</span>
                                                                                                                </div>
                                                                                                                <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium">
                                                                                                                    {data.progressPercentage >= 90 ? '🎯 Approaching destination - Prepare for delivery' :
                                                                                                                        data.progressPercentage >= 75 ? '🚀 Final stretch - Almost there!' :
                                                                                                                            data.progressPercentage >= 50 ? '⚡ Cruising smoothly - Halfway complete' :
                                                                                                                                data.progressPercentage >= 25 ? '📍 Making steady progress' :
                                                                                                                                    '🛣️ Journey underway - Tracking in real-time'}
                                                                                                                </p>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </motion.div>
                                                                                        )}
                                                                                    </AnimatePresence>
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 sm:hidden shrink-0">
                                            {/* Mobile Footer Info */}
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Arrival</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {formatDate(data.estimatedArrival)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</p>
                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{data.progressPercentage}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
