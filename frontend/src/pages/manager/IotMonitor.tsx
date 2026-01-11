import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import {
    Fuel,
    Thermometer,
    MapPin,
    AlertCircle,
    Truck,
    Activity,
    Zap,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type VehicleIotData = {
    _id: string;
    plateNumber: string;
    model: string;
    type: string;
    status: string;
    currentFuelLiters: number;
    fuelCapacityLiters: number;
    fuelThresholdLowLiters: number;
    isRefrigerated: boolean;
    currentTemperatureC?: number;
    temperatureThresholdMaxC?: number;
    batteryVoltage?: number;
    batteryHealthPercent?: number;
    engineStatus?: 'OFF' | 'IDLE' | 'RUNNING' | 'WARNING';
    engineLoadPercent?: number;
    oilLifeRemainingPercent?: number;
    tirePressurePsi?: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
    };
    coolantTempC?: number;
    currentLocation?: {
        lat: number;
        lng: number;
        updatedAt: string;
    };
};

export default function IotMonitor() {
    const { socket } = useAuth();
    const [searchParams] = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const [iotUpdates, setIotUpdates] = useState<Record<string, Partial<VehicleIotData>>>({});
    const highlightRef = useRef<HTMLDivElement>(null);

    const vehiclesQuery = useQuery({
        queryKey: ['fleetIot'],
        queryFn: async () => {
            const res = await api.get('/fleet/vehicles');
            return res.data.vehicles as VehicleIotData[];
        },
        refetchInterval: 30000,
    });

    const notificationsQuery = useQuery({
        queryKey: ['iotNotifications'],
        queryFn: async () => {
            const res = await api.get('/notifications');
            return res.data.notifications.filter((n: any) =>
                ['LOW_FUEL', 'TEMP_BREACH', 'MAINTENANCE'].includes(n.type) && !n.isResolved
            );
        },
        refetchInterval: 10000,
    });

    const resolveAlert = async (notificationId: string) => {
        try {
            await api.post(`/notifications/${notificationId}/resolve`);
            notificationsQuery.refetch();
            vehiclesQuery.refetch();
        } catch (err) {
            console.error('Failed to resolve alert:', err);
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleIotUpdate = (data: any) => {
            setIotUpdates(prev => ({
                ...prev,
                [data.vehicleId]: {
                    currentFuelLiters: data.fuel,
                    currentTemperatureC: data.temp,
                    batteryVoltage: data.batteryVoltage,
                    engineStatus: data.engineStatus,
                    currentLocation: {
                        lat: data.lat,
                        lng: data.lng,
                        updatedAt: new Date().toISOString()
                    }
                }
            }));
        };

        socket.on('fleet:iotUpdate', handleIotUpdate);

        return () => {
            socket.off('fleet:iotUpdate', handleIotUpdate);
        };
    }, [socket]);

    useEffect(() => {
        if (highlightId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId, vehiclesQuery.data]);

    const vehicles = (vehiclesQuery.data || []).map(v => ({
        ...v,
        ...(iotUpdates[v._id] || {})
    }));

    const activeVehicles = vehicles.filter(v => v.status === 'IN_USE');
    const alerts = notificationsQuery.data || [];

    // Derived alerts for the UI tags
    const alertVehicles = vehicles.filter(v =>
        v.status === 'MAINTENANCE' ||
        v.currentFuelLiters < v.fuelThresholdLowLiters ||
        (v.isRefrigerated && v.currentTemperatureC && v.temperatureThresholdMaxC && v.currentTemperatureC > v.temperatureThresholdMaxC) ||
        (v.batteryHealthPercent && v.batteryHealthPercent < 70) ||
        (v.engineStatus === 'WARNING')
    );

    return (
        <div className="space-y-8 pb-12">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-blue-900/40 to-slate-900 p-10 text-white shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px] animate-pulse delay-700" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider border border-blue-500/30">
                                Live Console
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                System Active
                            </div>
                        </div>
                        <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
                            IoT <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Fleet Monitor</span>
                        </h1>
                        <p className="mt-2 text-slate-400 font-medium max-w-2xl text-lg">
                            Real-time telemetry and sensor monitoring for your entire cold-chain and logistics fleet.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <StatCard label="Active Sensors" value={vehicles.length * 8} icon={Activity} />
                        <StatCard label="Critical Alerts" value={alertVehicles.length} icon={AlertCircle} isAlert />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Vehicle List & Live Gauges */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Truck className="h-6 w-6 text-blue-500" />
                            Live Fleet Streams
                        </h2>
                        <div className="text-sm text-slate-500">
                            {activeVehicles.length} vehicles currently in transit
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnimatePresence mode="popLayout">
                            {vehicles.map((vehicle) => (
                                <motion.div
                                    key={vehicle._id}
                                    ref={vehicle._id === highlightId ? highlightRef : null}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`glass-card overflow-hidden group border-t-4 transition-all duration-500 ${vehicle._id === highlightId
                                        ? 'ring-4 ring-blue-500 ring-offset-4 dark:ring-offset-slate-900 border-t-blue-600 scale-[1.02]'
                                        : vehicle.status === 'IN_USE'
                                            ? 'border-t-blue-500'
                                            : 'border-t-slate-300 dark:border-t-slate-700'
                                        }`}
                                >
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-6">
                                            <div>
                                                <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">{vehicle.plateNumber}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-slate-500 font-medium uppercase">{vehicle.model || 'Standard Truck'}</span>
                                                    {vehicle.engineStatus && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${vehicle.engineStatus === 'RUNNING' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            vehicle.engineStatus === 'WARNING' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                            }`}>
                                                            Engine {vehicle.engineStatus}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${vehicle.status === 'IN_USE'
                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                {vehicle.status}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {/* Fuel Gauge */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                                                        <Fuel className="h-4 w-4" /> Fuel Level
                                                    </span>
                                                    <span className={`font-black ${vehicle.currentFuelLiters < vehicle.fuelThresholdLowLiters ? 'text-red-500 animate-pulse' : 'text-slate-900 dark:text-white'
                                                        }`}>
                                                        {(vehicle.currentFuelLiters ?? 0).toFixed(1)} / {vehicle.fuelCapacityLiters} L
                                                    </span>
                                                </div>
                                                <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200/50 dark:border-white/5">
                                                    <motion.div
                                                        initial={false}
                                                        animate={{ width: `${((vehicle.currentFuelLiters ?? 0) / vehicle.fuelCapacityLiters) * 100}%` }}
                                                        className={`h-full rounded-full ${vehicle.currentFuelLiters < vehicle.fuelThresholdLowLiters
                                                            ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                                            : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                                            }`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Temperature Monitoring (if applicable) */}
                                            {vehicle.isRefrigerated ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-400">
                                                            <Thermometer className="h-4 w-4" /> Chiller Temp
                                                        </span>
                                                        <span className={`font-black ${vehicle.currentTemperatureC && vehicle.temperatureThresholdMaxC && vehicle.currentTemperatureC > vehicle.temperatureThresholdMaxC
                                                            ? 'text-red-500 animate-pulse'
                                                            : 'text-green-500'
                                                            }`}>
                                                            {vehicle.currentTemperatureC !== undefined ? `${vehicle.currentTemperatureC.toFixed(1)}°C` : 'Initializing...'}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1 h-3">
                                                        {[...Array(20)].map((_, i) => {
                                                            const isActive = (vehicle.currentTemperatureC || 0) > (-25 + (i * 0.5));
                                                            return (
                                                                <div
                                                                    key={i}
                                                                    className={`flex-1 rounded-sm transition-all duration-500 ${isActive
                                                                        ? (i > 15 ? 'bg-red-500' : 'bg-cyan-500')
                                                                        : 'bg-slate-200 dark:bg-white/5'
                                                                        }`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 text-xs italic">
                                                    <Info className="h-4 w-4" /> This vehicle is not refrigerated
                                                </div>
                                            )}

                                            {/* Health Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">Battery</span>
                                                        <Zap className={`h-3 w-3 ${vehicle.batteryHealthPercent && vehicle.batteryHealthPercent < 50 ? 'text-red-500' : 'text-green-500'}`} />
                                                    </div>
                                                    <div className="text-lg font-black">{vehicle.batteryVoltage?.toFixed(1) || '12.6'}V</div>
                                                    <div className="text-[10px] text-slate-500 mt-1">Health: {vehicle.batteryHealthPercent || 95}%</div>
                                                </div>
                                                <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">Oil Life</span>
                                                        <Activity className={`h-3 w-3 ${vehicle.oilLifeRemainingPercent && vehicle.oilLifeRemainingPercent < 20 ? 'text-red-500' : 'text-blue-500'}`} />
                                                    </div>
                                                    <div className="text-lg font-black">{vehicle.oilLifeRemainingPercent || 100}%</div>
                                                    <div className="text-[10px] text-slate-500 mt-1">Next Service: {(vehicle.oilLifeRemainingPercent || 100) * 50}km</div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
                                                <div className="flex items-center gap-1.5 w-full">
                                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                                    <span className="truncate max-w-[150px]">
                                                        {vehicle.currentLocation ? `${vehicle.currentLocation.lat.toFixed(4)}, ${vehicle.currentLocation.lng.toFixed(4)}` : 'Wait for signal...'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <Zap className="h-3 w-3 text-amber-500" />
                                                    98% Signal
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right Panel: Alerts & Analytics */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        Active Monitoring Alerts
                    </h2>

                    <div className="space-y-4">
                        {alerts.length > 0 ? (
                            alerts.map((notif: any) => (
                                <div key={notif._id} className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-[1.5rem] flex gap-4 items-start animate-in slide-in-from-right-4 duration-300">
                                    <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-red-900 dark:text-red-200">{notif.metadata?.plateNumber || 'System Alert'}</h4>
                                        <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">
                                            {notif.message}
                                        </p>
                                        <div className="mt-3 flex items-center gap-3">
                                            <button
                                                onClick={() => resolveAlert(notif._id)}
                                                className="text-xs font-black px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                            >
                                                Resolve Now
                                            </button>
                                            <button className="text-xs font-bold text-red-600 dark:text-red-400 underline underline-offset-2">
                                                Notify Driver
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center glass-card border-dashed border-2 flex flex-col items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                    <Activity className="h-6 w-6 text-green-500" />
                                </div>
                                <p className="text-slate-500 text-sm">No critical sensor breaches detected. All systems nominal.</p>
                            </div>
                        )}
                    </div>

                    <div className="glass-card mt-8 p-6">
                        <h3 className="font-bold mb-4">IoT Connectivity</h3>
                        <div className="space-y-4">
                            <ConnectionRow label="GPS Satellites" value="12 Active" />
                            <ConnectionRow label="Cellular Uplink" value="4G / 42ms" />
                            <ConnectionRow label="MQTT Broker" value="Healthy" />
                            <ConnectionRow label="Last Global Sync" value="Just now" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, isAlert = false }: { label: string, value: number | string, icon: any, isAlert?: boolean }) {
    return (
        <div className={`p-4 rounded-3xl min-w-[140px] ${isAlert ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10'}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${isAlert ? 'text-red-400' : 'text-blue-400'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            </div>
            <div className={`text-2xl font-black ${isAlert && Number(value) > 0 ? 'text-red-400' : 'text-white'}`}>{value}</div>
        </div>
    );
}

function ConnectionRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="font-bold text-slate-900 dark:text-white">{value}</span>
        </div>
    );
}
