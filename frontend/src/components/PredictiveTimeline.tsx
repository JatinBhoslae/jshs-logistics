import { CheckCircle2, UserCheck, PlayCircle, Navigation, Package, Truck, AlertTriangle } from 'lucide-react';
import type { Shipment, ShipmentEvent } from '../types';

interface PredictiveTimelineProps {
    shipment: Shipment;
    events: ShipmentEvent[];
}

const BASE_STEPS = [
    { id: 'CREATED', label: 'Order Placed', icon: Package },
    { id: 'ASSIGNED', label: 'Driver Assigned', icon: UserCheck },
    { id: 'PICKED_UP', label: 'Picked Up', icon: Truck },
    { id: 'IN_TRANSIT', label: 'In Transit', icon: PlayCircle }, // This is the moving part
    { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Navigation },
    { id: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

export default function PredictiveTimeline({ shipment, events }: PredictiveTimelineProps) {

    // Find current step index
    const currentStepIndex = BASE_STEPS.findIndex(s => s.id === shipment.status) !== -1
        ? BASE_STEPS.findIndex(s => s.id === shipment.status)
        : (shipment.status === 'DISPATCHED' ? 3 : 0); // fallback mapping

    // Get the most relevant event for a status
    const getEvent = (status: string) => {
        const index = BASE_STEPS.findIndex(s => s.id === status);
        const isDone = index < currentStepIndex;

        const event = events?.find(e => {
            if (status === 'CREATED') return e.type === 'SHIPMENT_CREATED';
            if (status === 'ASSIGNED') return e.type === 'SHIPMENT_ASSIGNED';
            if (status === 'PICKED_UP') return e.type === 'SHIPMENT_PICKED_UP' || e.type === 'MARK_LOADED';
            if (status === 'IN_TRANSIT') return e.type === 'SHIPMENT_DISPATCHED' || e.type === 'SHIPMENT_IN_TRANSIT';
            if (status === 'OUT_FOR_DELIVERY') return e.type === 'SHIPMENT_OUT_FOR_DELIVERY';
            if (status === 'DELIVERED') return e.type === 'SHIPMENT_DELIVERED';
            return false;
        });

        if (event) return event;
        // Fallback: if step is conceptually done but no exact event log found
        if (isDone) return { createdAt: shipment.updatedAt || shipment.createdAt } as any;
        return null;
    };

    return (
        <div className="relative pl-4 border-l-2 border-slate-100 dark:border-white/10 ml-3 space-y-8 py-2">
            {BASE_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isFuture = index > currentStepIndex;

                const event = getEvent(step.id);
                const timestamp = event ? new Date(event.createdAt) : null;

                let displayTime = timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let displayDate = timestamp?.toLocaleDateString();

                // If future and we have prediction
                if (isFuture && shipment.predictedEta && step.id === 'DELIVERED') {
                    const pred = new Date(shipment.predictedEta);
                    displayTime = pred.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Est.)';
                    displayDate = pred.toLocaleDateString();
                }

                return (
                    <div key={step.id} className="relative group">
                        {/* Connector Dot */}
                        <div className={`
              absolute -left-[25px] top-1 h-5 w-5 rounded-full border-4 box-content
              flex items-center justify-center transition-all duration-500
              ${isCompleted
                                ? 'bg-emerald-500 border-white dark:border-slate-900 shadow-[0_0_0_2px_#10b981]'
                                : isCurrent
                                    ? 'bg-blue-500 border-white dark:border-slate-900 shadow-[0_0_0_2px_#3b82f6] animate-pulse'
                                    : 'bg-slate-200 dark:bg-slate-700 border-white dark:border-slate-900'}
            `}>
                            {isCompleted ? <CheckCircle2 className="h-3 w-3 text-white" /> : <div className="h-2 w-2 rounded-full bg-white/50" />}
                        </div>

                        {/* Content Card */}
                        <div className={`
               rounded-xl border p-4 transition-all duration-300
               ${isCurrent
                                ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800 shadow-lg shadow-blue-500/5 translate-x-2'
                                : 'bg-white/50 border-slate-100 dark:border-white/5 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10'}
            `}>
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <step.icon className={`h-4 w-4 ${isCompleted ? 'text-emerald-500' : isCurrent ? 'text-blue-500' : 'text-slate-400'}`} />
                                    <h4 className={`text-sm font-bold uppercase tracking-tight ${isCurrent ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {step.label}
                                    </h4>
                                </div>
                                {displayDate && (
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{displayDate}</div>
                                        <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-400">{displayTime}</div>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Context for Current Step */}
                            {isCurrent && step.id === 'IN_TRANSIT' && shipment.distanceRemainingKm && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-blue-100/50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Remaining</div>
                                        <div className="text-sm font-bold text-blue-800 dark:text-blue-200">{shipment.distanceRemainingKm.toFixed(1)} km</div>
                                    </div>
                                    <div className="p-2 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-lg">
                                        <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">Progress</div>
                                        <div className="text-sm font-bold text-indigo-800 dark:text-indigo-200">{shipment.progressPercentage || 0}%</div>
                                    </div>
                                </div>
                            )}

                            {/* Warnings/Alerts embedded in timeline */}
                            {isCurrent && shipment.weatherTrafficImpact?.riskLevel === 'high' && (
                                <div className="mt-2 flex items-start gap-2 p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Delay Risk Detected</div>
                                        <div className="text-[10px] text-rose-600 dark:text-rose-400 leading-tight">
                                            Heavy traffic reported on route. ETA updated automatically. +{shipment.weatherTrafficImpact.impact}m
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Driver Context if applicable */}
                            {isCurrent && step.id === 'ASSIGNED' && shipment.assignedDriverId && !isCompleted && (
                                <div className="mt-2 text-xs text-slate-500 italic">
                                    Driver is on the way to pickup location.
                                </div>
                            )}

                        </div>
                    </div>
                );
            })}
        </div>
    );
}
