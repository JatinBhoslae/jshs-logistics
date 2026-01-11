import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Truck, AlertTriangle, Phone, MessageSquare, Camera, Package, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import EnhancedTrackingMap from '../EnhancedTrackingMap';
import { useAuth } from '../../auth/AuthContext';

interface DriverLiveTrackingModalProps {
    shipmentId: string | null;
    onClose: () => void;
}

export default function DriverLiveTrackingModal({ shipmentId, onClose }: DriverLiveTrackingModalProps) {
    const { socket } = useAuth();
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);

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
                            <DialogPanel className="w-full max-w-7xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl transition-all">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-96">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
                                    </div>
                                ) : error ? (
                                    <div className="p-6 text-center">
                                        <p className="text-red-500">Error loading tracking data</p>
                                    </div>
                                ) : data ? (
                                    <div className="flex flex-col lg:flex-row h-[90vh]">
                                        {/* LEFT: Map Section - 60% */}
                                        <div className="lg:w-[60%] relative bg-slate-100 dark:bg-slate-800">
                                            {/* Map Header */}
                                            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
                                                <div className="flex items-center justify-between">
                                                    <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                                                        <Truck className="h-5 w-5 text-emerald-400" />
                                                        Driver Navigation
                                                    </DialogTitle>
                                                    <button
                                                        onClick={onClose}
                                                        className="rounded-full bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-colors"
                                                    >
                                                        <X className="h-5 w-5 text-white" />
                                                    </button>
                                                </div>

                                                {/* Live Status Badge */}
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="flex items-center gap-2 bg-emerald-500/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                                        <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                                        <span className="text-xs font-bold text-white">LIVE TRACKING</span>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                                                        <span className="text-xs font-bold text-white">{data.progressPercentage}% Complete</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Map */}
                                            <EnhancedTrackingMap
                                                shipment={data.shipment}
                                                locations={data.locations || []}
                                                liveLocation={liveLocation || data.currentLocation}
                                            />

                                            {/* Bottom Navigation Stats */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                        <div className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1">Distance Left</div>
                                                        <div className="text-xl font-black text-white">
                                                            {data.shipment.distanceKm ? `${Math.round(data.shipment.distanceKm * (100 - (data.progressPercentage || 0)) / 100)} km` : '--'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                        <div className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1">ETA</div>
                                                        <div className="text-xl font-black text-white">
                                                            {data.shipment.predictedEta ? new Date(data.shipment.predictedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                                                        <div className="text-[9px] font-bold text-white/70 uppercase tracking-widest mb-1">Speed</div>
                                                        <div className="text-xl font-black text-white">
                                                            {data.vehicleHealth?.speed || '--'} <span className="text-sm">km/h</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: Action Panel - 40% */}
                                        <div className="lg:w-[40%] flex flex-col bg-white dark:bg-slate-900">
                                            {/* Scrollable Content */}
                                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                                {/* Quick Actions */}
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Quick Actions</h3>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <button className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors group">
                                                            <Phone className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                                                            <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">Call Customer</div>
                                                        </button>
                                                        <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group">
                                                            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                                                            <div className="text-xs font-black text-blue-700 dark:text-blue-300">Send Message</div>
                                                        </button>
                                                        <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-900/40 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group">
                                                            <Camera className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                                                            <div className="text-xs font-black text-purple-700 dark:text-purple-300">Upload POD</div>
                                                        </button>
                                                        <button className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group">
                                                            <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                                                            <div className="text-xs font-black text-amber-700 dark:text-amber-300">Report Issue</div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Current Task */}
                                                {data.shipment.status === 'IN_TRANSIT' && (
                                                    <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-xl border-2 border-emerald-300 dark:border-emerald-900/40">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                                                            <h3 className="text-sm font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Active Task</h3>
                                                        </div>
                                                        <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                                            Deliver to {data.shipment.destination.name}
                                                        </p>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                                            {data.shipment.destination.address}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Delivery Details */}
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Delivery Information</h3>
                                                    <div className="space-y-3">
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tracking ID</div>
                                                            <div className="text-sm font-black text-slate-900 dark:text-white font-mono">{data.shipment.trackingId}</div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</div>
                                                            <div className="text-sm font-black text-slate-900 dark:text-white">{data.shipment.consignee?.name || 'N/A'}</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{data.shipment.consignee?.phone || 'N/A'}</div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Package Details</div>
                                                            <div className="flex items-center gap-2">
                                                                <Package className="h-4 w-4 text-slate-400" />
                                                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                                    {data.shipment.weight || '--'} kg • {data.shipment.packageType || 'Standard'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Journey Milestones */}
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Journey Progress
                                                    </h3>
                                                    <div className="relative pl-6 space-y-3 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-emerald-400 before:via-emerald-300 before:to-slate-200 dark:before:to-slate-700">
                                                        {(() => {
                                                            const achievements = [];
                                                            const progress = data.progressPercentage || 0;
                                                            const distanceCovered = data.shipment.distanceKm ? Math.round((data.shipment.distanceKm * progress) / 100) : 0;

                                                            if (progress >= 25) achievements.push({ label: '25% Complete', icon: '🎯', color: 'emerald', value: '25%' });
                                                            if (progress >= 50) achievements.push({ label: 'Halfway Point', icon: '⚡', color: 'blue', value: '50%' });
                                                            if (progress >= 75) achievements.push({ label: '75% Complete', icon: '🚀', color: 'purple', value: '75%' });
                                                            if (distanceCovered >= 25) achievements.push({ label: '25km Covered', icon: '📍', color: 'indigo', value: '25 km' });
                                                            if (distanceCovered >= 50) achievements.push({ label: '50km Covered', icon: '🏁', color: 'pink', value: '50 km' });

                                                            const recent = achievements.slice(-4);

                                                            if (recent.length === 0) {
                                                                return (
                                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg text-center">
                                                                        <p className="text-xs text-slate-400">Journey just started...</p>
                                                                    </div>
                                                                );
                                                            }

                                                            return recent.map((a, i) => (
                                                                <div key={i} className="relative">
                                                                    <div className="absolute -left-6 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-lg">
                                                                        <CheckCircle2 className="h-2 w-2 text-white" />
                                                                    </div>
                                                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-900/30">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm">{a.icon}</span>
                                                                            <div className="flex-1">
                                                                                <div className="text-xs font-black text-emerald-700 dark:text-emerald-300">{a.label}</div>
                                                                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{a.value}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Fixed Bottom Action Button */}
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/5">
                                                <button className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-105">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <CheckCircle2 className="h-5 w-5" />
                                                        <span>MARK AS DELIVERED</span>
                                                    </div>
                                                </button>
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
