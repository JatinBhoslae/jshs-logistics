import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { X, Activity, Shield, AlertTriangle, Zap, Truck, Phone, MessageSquare, Camera, FileText, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import EnhancedTrackingMap from '../EnhancedTrackingMap';
import { useAuth } from '../../auth/AuthContext';

interface ManagerLiveTrackingModalProps {
    shipmentId: string | null;
    onClose: () => void;
}

export default function ManagerLiveTrackingModal({ shipmentId, onClose }: ManagerLiveTrackingModalProps) {
    const { socket } = useAuth();
    const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'analytics': true,
        'events': true,
        'vehicle': true
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['shipment-tracking', shipmentId],
        queryFn: async () => {
            const res = await api.get(`/shipments/${shipmentId}/tracking`);
            return res.data;
        },
        enabled: !!shipmentId,
        refetchInterval: 3000, // More frequent for managers
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

    const toggleSection = (section: string) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

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
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
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
                            <DialogPanel className="w-full max-w-[95vw] transform overflow-hidden rounded-2xl bg-slate-900 shadow-2xl transition-all">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-96">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
                                    </div>
                                ) : error ? (
                                    <div className="p-6 text-center">
                                        <p className="text-red-500">Error loading tracking data</p>
                                    </div>
                                ) : data ? (
                                    <div className="flex flex-col h-[95vh]">
                                        {/* Mission Control Header */}
                                        <div className="p-4 bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white">
                                            <div className="flex items-center justify-between">
                                                <DialogTitle className="text-xl font-black flex items-center gap-3">
                                                    <Shield className="h-6 w-6" />
                                                    MISSION CONTROL CENTER
                                                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">LIVE</span>
                                                </DialogTitle>
                                                <button
                                                    onClick={onClose}
                                                    className="rounded-full bg-white/20 backdrop-blur-sm p-2 hover:bg-white/30 transition-colors"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>

                                            {/* Critical Stats Bar */}
                                            <div className="mt-4 grid grid-cols-5 gap-3">
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                                                    <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Status</div>
                                                    <div className="text-sm font-black">{data.shipment.status}</div>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                                                    <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Progress</div>
                                                    <div className="text-sm font-black">{data.progressPercentage}%</div>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                                                    <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-0.5">ETA</div>
                                                    <div className="text-sm font-black">
                                                        {data.shipment.predictedEta ? new Date(data.shipment.predictedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </div>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                                                    <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Distance</div>
                                                    <div className="text-sm font-black">{data.shipment.distanceKm ? `${Math.round(data.shipment.distanceKm)} km` : '--'}</div>
                                                </div>
                                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/20">
                                                    <div className="text-[8px] font-bold text-white/70 uppercase tracking-widest mb-0.5">Priority</div>
                                                    <div className="text-sm font-black">{data.shipment.priority || 'NORMAL'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Content Grid */}
                                        <div className="flex-1 flex overflow-hidden">
                                            {/* LEFT: Map - 50% */}
                                            <div className="w-1/2 relative bg-slate-800">
                                                <EnhancedTrackingMap
                                                    shipment={data.shipment}
                                                    locations={data.locations || []}
                                                    liveLocation={liveLocation || data.currentLocation}
                                                />

                                                {/* Map Overlays */}
                                                <div className="absolute top-4 left-4 right-4 space-y-2">
                                                    {/* Live Tracking Badge */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-rose-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                                            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                                                            <span className="text-xs font-bold">REAL-TIME MONITORING</span>
                                                        </div>
                                                        <div className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full shadow-lg">
                                                            <span className="text-xs font-bold">ID: {data.shipment.trackingId}</span>
                                                        </div>
                                                    </div>

                                                    {/* Alert Banner */}
                                                    {data.shipment.status === 'IN_TRANSIT' && data.progressPercentage < 50 && (
                                                        <div className="bg-amber-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <span className="text-xs font-bold">Early Stage - Monitor Closely</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* MIDDLE: Analytics & Events - 25% */}
                                            <div className="w-1/4 bg-slate-800 border-l border-slate-700 overflow-y-auto p-4 space-y-4">
                                                {/* Real-Time Analytics */}
                                                <div className="bg-slate-900 rounded-xl border border-slate-700">
                                                    <button
                                                        onClick={() => toggleSection('analytics')}
                                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-800 transition-colors rounded-t-xl"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Activity className="h-4 w-4 text-rose-400" />
                                                            <span className="text-xs font-black uppercase text-white">Analytics</span>
                                                        </div>
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedSections.analytics ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedSections.analytics && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 space-y-2 border-t border-slate-700">
                                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                                        <div className="text-[8px] text-slate-400 font-bold uppercase mb-1">Avg Speed</div>
                                                                        <div className="text-lg font-black text-white">{data.vehicleHealth?.speed || '--'} km/h</div>
                                                                    </div>
                                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                                        <div className="text-[8px] text-slate-400 font-bold uppercase mb-1">Fuel Level</div>
                                                                        <div className="text-lg font-black text-emerald-400">{data.vehicleHealth?.fuelLevel || '--'}%</div>
                                                                    </div>
                                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                                        <div className="text-[8px] text-slate-400 font-bold uppercase mb-1">Health Score</div>
                                                                        <div className="text-lg font-black text-blue-400">{data.vehicleHealth?.healthScore || '--'}/100</div>
                                                                    </div>
                                                                    <div className="p-2 bg-slate-800 rounded-lg">
                                                                        <div className="text-[8px] text-slate-400 font-bold uppercase mb-1">On-Time %</div>
                                                                        <div className="text-lg font-black text-purple-400">98.5%</div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Event Log */}
                                                <div className="bg-slate-900 rounded-xl border border-slate-700">
                                                    <button
                                                        onClick={() => toggleSection('events')}
                                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-800 transition-colors rounded-t-xl"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="h-4 w-4 text-amber-400" />
                                                            <span className="text-xs font-black uppercase text-white">Event Log</span>
                                                        </div>
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedSections.events ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedSections.events && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 space-y-2 border-t border-slate-700 max-h-64 overflow-y-auto">
                                                                    {data.recentEvents?.slice(0, 10).map((event: any, idx: number) => (
                                                                        <div key={idx} className="p-2 bg-slate-800 rounded-lg">
                                                                            <div className="text-[9px] font-bold text-white mb-0.5">{event.type}</div>
                                                                            <div className="text-[8px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</div>
                                                                            {event.description && (
                                                                                <div className="text-[8px] text-slate-300 mt-1">{event.description}</div>
                                                                            )}
                                                                        </div>
                                                                    )) || <div className="text-xs text-slate-500 text-center py-4">No events yet</div>}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                {/* Vehicle Health */}
                                                <div className="bg-slate-900 rounded-xl border border-slate-700">
                                                    <button
                                                        onClick={() => toggleSection('vehicle')}
                                                        className="w-full p-3 flex items-center justify-between hover:bg-slate-800 transition-colors rounded-t-xl"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Truck className="h-4 w-4 text-blue-400" />
                                                            <span className="text-xs font-black uppercase text-white">Vehicle</span>
                                                        </div>
                                                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expandedSections.vehicle ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {expandedSections.vehicle && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 space-y-2 border-t border-slate-700">
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase">Registration</div>
                                                                    <div className="text-sm font-black text-white">{data.shipment.assignedVehicle?.registrationNumber || 'N/A'}</div>
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">Type</div>
                                                                    <div className="text-sm font-bold text-slate-300">{data.shipment.assignedVehicle?.type || 'N/A'}</div>
                                                                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">Capacity</div>
                                                                    <div className="text-sm font-bold text-slate-300">{data.shipment.assignedVehicle?.capacity || '--'} kg</div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            {/* RIGHT: Detailed Info & Controls - 25% */}
                                            <div className="w-1/4 bg-slate-850 border-l border-slate-700 overflow-y-auto p-4 space-y-4">
                                                {/* Driver Info */}
                                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Assigned Driver</h3>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-rose-400 to-orange-600 flex items-center justify-center text-white font-black text-lg">
                                                            {data.shipment.assignedDriver?.name?.charAt(0) || 'D'}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white">{data.shipment.assignedDriver?.name || 'Unassigned'}</div>
                                                            <div className="text-xs text-slate-400">{data.shipment.assignedDriver?.phone || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors">
                                                            <Phone className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                                                            <div className="text-[9px] font-bold text-blue-300">Call</div>
                                                        </button>
                                                        <button className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors">
                                                            <MessageSquare className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                                                            <div className="text-[9px] font-bold text-emerald-300">Message</div>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Shipment Details */}
                                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Shipment Details</h3>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-400">Weight</span>
                                                            <span className="text-xs font-bold text-white">{data.shipment.weight || '--'} kg</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-400">Type</span>
                                                            <span className="text-xs font-bold text-white">{data.shipment.packageType || 'Standard'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-400">Value</span>
                                                            <span className="text-xs font-bold text-white">₹{data.shipment.value || '--'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-xs text-slate-400">Created</span>
                                                            <span className="text-xs font-bold text-white">{new Date(data.shipment.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Route Info */}
                                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Route Information</h3>
                                                    <div className="space-y-3">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Origin</span>
                                                            </div>
                                                            <div className="text-xs font-bold text-white">{data.shipment.origin.name}</div>
                                                            <div className="text-[10px] text-slate-400">{data.shipment.origin.address}</div>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="h-2 w-2 rounded-full bg-rose-500" />
                                                                <span className="text-[9px] text-slate-400 font-bold uppercase">Destination</span>
                                                            </div>
                                                            <div className="text-xs font-bold text-white">{data.shipment.destination.name}</div>
                                                            <div className="text-[10px] text-slate-400">{data.shipment.destination.address}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Manager Actions */}
                                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Manager Controls</h3>
                                                    <div className="space-y-2">
                                                        <button className="w-full p-2 bg-rose-500/20 rounded-lg border border-rose-500/30 hover:bg-rose-500/30 transition-colors text-xs font-bold text-rose-300">
                                                            <AlertTriangle className="h-3 w-3 inline mr-2" />
                                                            Flag Issue
                                                        </button>
                                                        <button className="w-full p-2 bg-blue-500/20 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-xs font-bold text-blue-300">
                                                            <FileText className="h-3 w-3 inline mr-2" />
                                                            View Audit Log
                                                        </button>
                                                        <button className="w-full p-2 bg-purple-500/20 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors text-xs font-bold text-purple-300">
                                                            <Camera className="h-3 w-3 inline mr-2" />
                                                            Request POD
                                                        </button>
                                                    </div>
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
