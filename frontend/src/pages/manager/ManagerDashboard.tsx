import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { formatCurrency } from '../../utils'
import ErrorDisplay from '../../components/ErrorDisplay'
import Skeleton from '../../components/Skeleton'
import { motion } from 'framer-motion'
import {
    Package,
    Truck,
    BarChart3,
    Users,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    Zap,
    Shield,
    Clock,
    Activity,
    FileText,
    ThermometerSun
} from 'lucide-react'
import { MetricCard, ControlCard, IntelligenceComponent, RecentShipmentsList } from '../../components/dashboard/DashboardComponents'
import { simulationApi, analyticsApi } from '../../services/apiService'

export default function ManagerDashboard() {
    const { user } = useAuth()

    const simStatusQuery = useQuery({
        queryKey: ['sim-status'],
        queryFn: () => simulationApi.getStatus(),
        refetchInterval: (query) => {
            return (query.state.data as any)?.running ? 10000 : false;
        },
        refetchOnWindowFocus: true
    })

    const kpisQuery = useQuery({
        queryKey: ['kpis'],
        queryFn: async () => {
            const res = await analyticsApi.getOverview();
            return res.kpis;
        },
        refetchInterval: simStatusQuery.data?.running ? 5000 : false
    })


    if (kpisQuery.isLoading) return <ManagerDashboardSkeleton />
    if (kpisQuery.isError) return (
        <ErrorDisplay
            message={kpisQuery.error instanceof Error ? kpisQuery.error.message : "Failed to load manager records."}
            onRetry={() => kpisQuery.refetch()}
        />
    )

    const kpis = kpisQuery.data;

    return (
        <div className="space-y-8 pb-12">
            {/* Minimal Premium Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-slate-900 dark:bg-black/40 rounded-[2.5rem] p-10 text-white shadow-2xl border border-white/5"
            >
                {/* Subtle Ambient Background */}
                <div className="absolute top-0 right-0 -m-10 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute bottom-0 left-0 -m-10 h-48 w-48 rounded-full bg-purple-600/5 blur-[80px]" />

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <Shield className="h-3 w-3 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400/80">
                                Enterprise Manager Control
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter mb-1 leading-none">
                                    Welcome, {user?.name?.split(' ')[0]}
                                </h1>
                                <p className="text-slate-400 font-bold text-sm tracking-wide">
                                    OVERVIEW • <span className="text-emerald-400">OPTIMAL EFFICIENCY</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none hover:bg-white/10 transition-colors appearance-none cursor-pointer min-w-[140px]">
                                    <option className="bg-slate-900">System Logs</option>
                                    <option className="bg-slate-900">Resource Map</option>
                                    <option className="bg-slate-900">Audit Vault</option>
                                </select>
                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${simStatusQuery.data?.running ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                                    <Activity className={`h-4 w-4 ${simStatusQuery.data?.running ? 'animate-pulse' : ''}`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    label="Ecosystem Volume"
                    value={kpis?.shipmentsTotal ?? 0}
                    sub="Lifetime throughput"
                    icon={Package}
                    color="blue"
                    delay={0}
                />
                <MetricCard
                    label="Live Operations"
                    value={kpis?.shipmentsInTransit ?? 0}
                    sub="Currently active"
                    icon={TrendingUp}
                    color="cyan"
                    delay={0.1}
                />
                <MetricCard
                    label="Revenue (Paid)"
                    value={formatCurrency(kpis?.revenuePaid ?? 0).replace('₹', '₹ ')}
                    sub="Financial year"
                    icon={Zap}
                    color="emerald"
                    delay={0.2}
                />
                <MetricCard
                    label="Maintenance"
                    value={kpis?.maintenanceDueSoon ?? 0}
                    sub="Attention required"
                    icon={AlertCircle}
                    color="amber"
                    alert={kpis?.maintenanceDueSoon > 0}
                    delay={0.3}
                />
            </div>

            {/* Two Column Layout for Operations and Intelligence */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Operations Control (Left 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            Operations Center
                        </h2>
                        <Link to="/app/shipments" className="text-sm font-bold text-blue-600 hover:gap-2 transition-all flex items-center gap-1">
                            Operational View
                            <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ControlCard
                            to="/app/shipments"
                            icon={Package}
                            title="Shipment Lifecycle"
                            desc="Monitor live movement and update status logs."
                            color="indigo"
                        />
                        <ControlCard
                            to="/app/documents"
                            icon={FileText}
                            title="Global Paperwork"
                            desc="Audit journey docs and generate compliance files."
                            color="purple"
                        />
                        <ControlCard
                            to="/app/fleet"
                            icon={Truck}
                            title="Fleet Optimization"
                            desc="Real-time health and multi-leg asset tracking."
                            color="cyan"
                        />
                        <ControlCard
                            to="/app/drivers"
                            icon={Users}
                            title="Human Capital"
                            desc="Driver vetting, performance, and approvals."
                            color="emerald"
                        />
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm overflow-hidden relative">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Active Logs</h3>
                            <div className="flex gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5" />
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Real-time Feed</span>
                            </div>
                        </div>
                        <RecentShipmentsList />
                    </div>
                </div>

                {/* Integrated Intelligence (Right 1/3) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Predictive Insights
                    </h2>

                    <div className="space-y-4">
                        <IntelligenceComponent
                            title="Weather Impact"
                            icon={ThermometerSun}
                            status={kpis?.weatherImpact?.risk === 'high' ? 'HIGH' : 'LOW'}
                            desc={kpis?.weatherImpact?.description || 'No significant impact on active routes.'}
                            color={kpis?.weatherImpact?.risk === 'high' ? 'red' : 'blue'}
                        />
                        <IntelligenceComponent
                            title="Predicted Delays"
                            icon={Clock}
                            status={kpis?.predictedDelays > 0 ? 'ALERT' : 'NONE'}
                            desc={`${kpis?.predictedDelays || 0} shipments predicted to exceed ETA by >1hr.`}
                            color={kpis?.predictedDelays > 0 ? 'amber' : 'emerald'}
                        />
                        <IntelligenceComponent
                            title="System Efficiency"
                            icon={BarChart3}
                            status="98.2%"
                            desc="Infrastructure & platform uptime is within SLA."
                            color="blue"
                        />

                        {/* Recent Alerts Feed mockup */}
                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-5">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white mb-4 uppercase tracking-widest">Urgent Alerts</h4>
                            <div className="space-y-4">
                                {kpis?.maintenanceDueSoon > 0 && (
                                    <div className="flex gap-3">
                                        <div className="h-8 w-8 rounded-center bg-amber-500/10 flex items-center justify-center shrink-0">
                                            <Truck className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-900 dark:text-white">Fleet Maintenance</p>
                                            <p className="text-[10px] text-slate-500 font-bold">{kpis.maintenanceDueSoon} vehicles due for service.</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-center bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <Shield className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 dark:text-white">Global Compliance</p>
                                        <p className="text-[10px] text-slate-500 font-bold">New E-Way Bill regulations active.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ManagerDashboardSkeleton() {
    return (
        <div className="space-y-8 pb-12">
            <Skeleton className="h-64 w-full rounded-[2rem]" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-[2rem]" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-[1.5rem]" />)}
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[1.5rem]" />)}
                </div>
            </div>
        </div>
    )
}
