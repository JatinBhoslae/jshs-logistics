import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, CheckCircle2, MapPin, Package, MessageCircle, Phone, Share2, Heart, TrendingUp, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import EnhancedTrackingMap from '../EnhancedTrackingMap';
import { useAuth } from '../../auth/AuthContext';

interface CustomerLiveTrackingModalProps {
    shipmentId: string | null;
    onClose: () => void;
}

export default function CustomerLiveTrackingModal({ shipmentId, onClose }: CustomerLiveTrackingModalProps) {
    const { socket } = useAuth();
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [showDriverDetails, setShowDriverDetails] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['shipment-tracking', shipmentId],
        queryFn: async () => {
            const res = await api.get(`/shipments/${shipmentId}/tracking`);
            return res.data;
        },
        enabled: !!shipmentId,
        refetchInterval: 5000,
    });

    useEffect(() => {
        if (!socket || !shipmentId) return;

        socket.emit('join-shipment', shipmentId);
        socket.on('location-update', (location: { lat: number; lng: number }) => {
            setLiveLocation(location);
        });

        return () => {
            socket.emit('leave-shipment', shipmentId);
            socket.off('location-update');
        };
    }, [socket, shipmentId]);

    if (!shipmentId) return null;

    return (
        <Transition appear show={!!shipmentId} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl transition-all">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-96">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                    </div>
                                ) : error ? (
                                    <div className="p-6 text-center">
                                        <p className="text-red-500">Error loading tracking data</p>
                                    </div>
                                ) : data ? (
                                    <div className="flex flex-col h-[90vh]">
                                        {/* Header */}
                                        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                            <div className="flex items-center justify-between mb-4">
                                                <DialogTitle className="text-2xl font-black flex items-center gap-3">
                                                    <Package className="h-7 w-7" />
                                                    Track Your Delivery
                                                </DialogTitle>
                                                <button
                                                    onClick={onClose}
                                                    className="rounded-full bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-colors"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {/* ETA Banner */}
                                            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Estimated Arrival</div>
                                                        <div className="text-3xl font-black">
                                                            {data.shipment.predictedEta ? new Date(data.shipment.predictedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Progress</div>
                                                        <div className="text-3xl font-black">{data.progressPercentage}%</div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${data.progressPercentage}%` }}
                                                        transition={{ duration: 1 }}
                                                        className="h-full bg-white rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                                            {/* Map Section - 65% */}
                                            <div className="lg:w-[65%] relative bg-slate-100 dark:bg-slate-800">
                                                <EnhancedTrackingMap
                                                    shipment={data.shipment}
                                                    locations={data.locations || []}
                                                    liveLocation={liveLocation || data.currentLocation}
                                                />

                                                {/* Live Badge Overlay */}
                                                <div className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                                    <span className="text-xs font-bold">LIVE</span>
                                                </div>

                                                {/* Driver Info Card - Collapsible */}
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
                                                        <button
                                                            onClick={() => setShowDriverDetails(!showDriverDetails)}
                                                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-black text-lg">
                                                                    {data.shipment.assignedDriver?.name?.charAt(0) || 'D'}
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-sm font-black text-slate-900 dark:text-white">
                                                                        {data.shipment.assignedDriver?.name || 'Your Driver'}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                        {data.shipment.assignedVehicle?.registrationNumber || 'On the way'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showDriverDetails ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        <AnimatePresence>
                                                            {showDriverDetails && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="p-4 pt-0 border-t border-slate-200 dark:border-slate-700">
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                                                                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                                                                                <div className="text-xs font-bold text-blue-700 dark:text-blue-300">Call</div>
                                                                            </button>
                                                                            <button className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                                                                                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                                                                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Message</div>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details Panel - 35% */}
                                            <div className="lg:w-[35%] overflow-y-auto p-6 space-y-6">
                                                {/* Delivery Timeline */}
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Delivery Timeline
                                                    </h3>
                                                    <div className="relative pl-6 space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-blue-400 before:via-blue-300 before:to-slate-200 dark:before:to-slate-700">
                                                        {[
                                                            { label: 'Order Placed', completed: true, time: data.shipment.createdAt },
                                                            { label: 'Picked Up', completed: !!data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_PICKED_UP'), time: data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_PICKED_UP')?.createdAt },
                                                            { label: 'In Transit', completed: data.shipment.status === 'IN_TRANSIT', time: data.recentEvents?.find((e: any) => e.type === 'SHIPMENT_DISPATCHED')?.createdAt, current: data.shipment.status === 'IN_TRANSIT' },
                                                            { label: 'Out for Delivery', completed: data.shipment.status === 'OUT_FOR_DELIVERY', current: data.shipment.status === 'OUT_FOR_DELIVERY' },
                                                            { label: 'Delivered', completed: data.shipment.status === 'DELIVERED' },
                                                        ].map((step, idx) => (
                                                            <div key={idx} className="relative">
                                                                <div className={`absolute -left-6 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg ${step.completed ? 'bg-blue-500' :
                                                                    step.current ? 'bg-amber-500 animate-pulse' :
                                                                        'bg-slate-300 dark:bg-slate-600'
                                                                    }`}>
                                                                    {step.completed && <CheckCircle2 className="h-2 w-2 text-white" />}
                                                                </div>
                                                                <div className={`${step.completed || step.current ? 'opacity-100' : 'opacity-50'}`}>
                                                                    <div className="text-sm font-black text-slate-900 dark:text-white">{step.label}</div>
                                                                    {step.time && (
                                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                                            {new Date(step.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                    )}
                                                                    {step.current && (
                                                                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-900/30">
                                                                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                                                                                Your package is on its way! 🚚
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Package Details */}
                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Package Details</h3>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">Tracking ID</span>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{data.shipment.trackingId}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">Weight</span>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{data.shipment.weight || '--'} kg</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400">Type</span>
                                                            <span className="text-xs font-bold text-slate-900 dark:text-white">{data.shipment.packageType || 'Standard'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delivery Address */}
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-900/30">
                                                    <div className="flex items-start gap-3">
                                                        <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                                                        <div>
                                                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Delivering To</div>
                                                            <div className="text-sm font-black text-slate-900 dark:text-white mb-1">{data.shipment.destination.name}</div>
                                                            <div className="text-xs text-slate-600 dark:text-slate-400">{data.shipment.destination.address}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Quick Actions */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <Share2 className="h-5 w-5 text-slate-600 dark:text-slate-400 mx-auto mb-1" />
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Share</div>
                                                    </button>
                                                    <button className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                        <Heart className="h-5 w-5 text-slate-600 dark:text-slate-400 mx-auto mb-1" />
                                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Save</div>
                                                    </button>
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
