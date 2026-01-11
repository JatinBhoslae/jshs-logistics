import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { FuelAnalytics, MaintenanceOverview } from '../../types'
import {
    Wrench,
    AlertTriangle,
    Clock,
    Activity,
    Users,
    TrendingUp,
    Zap,
    Leaf,
    ArrowUpRight,
    Gauge,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react'
import Skeleton from '../../components/Skeleton'
import { Link } from 'react-router-dom'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from 'recharts'

interface FuelAlert {
    plateNumber: string;
    message: string;
    actualEfficiency: string;
}

interface DriverRank {
    driverId: string;
    name: string;
    score: number;
}

export default function FleetPerformance() {
    const [dateRange] = useState({ days: 30 })

    // Fetch fuel analytics
    const fuelAnalyticsQ = useQuery({
        queryKey: ['fuelAnalytics', dateRange],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/fuel/analytics')
            return res.data as FuelAnalytics
        }
    })

    // Fetch maintenance overview
    const maintenanceQ = useQuery({
        queryKey: ['maintenanceOverview'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/maintenance/overview')
            return res.data as MaintenanceOverview
        }
    })

    // Fetch driver leaderboard
    const driverLeaderboardQ = useQuery({
        queryKey: ['driverLeaderboard'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/drivers/leaderboard', {
                params: { limit: 10 }
            })
            return res.data.leaderboard as any[]
        }
    })

    // Fetch fuel alerts
    const fuelAlertsQ = useQuery({
        queryKey: ['fuelAlerts'],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/fuel/alerts')
            return res.data.alerts as any[]
        }
    })

    // Fetch fuel trends
    const fuelTrendsQ = useQuery({
        queryKey: ['fuelTrends', dateRange],
        queryFn: async () => {
            const res = await api.get('/fleet-performance/fuel/trends')
            return res.data.trends as any[]
        }
    })

    // Mock data for charts if real data is sparse
    const efficiencyTrendData = useMemo(() => {
        if (!fuelTrendsQ.data || fuelTrendsQ.data.length < 2) {
            return [
                { name: 'Week 1', efficiency: 12.5, cost: 45000 },
                { name: 'Week 2', efficiency: 13.2, cost: 42000 },
                { name: 'Week 3', efficiency: 12.8, cost: 48000 },
                { name: 'Week 4', efficiency: 14.1, cost: 39000 },
            ]
        }
        return fuelTrendsQ.data.map((t: any) => ({
            name: t.date,
            efficiency: t.totalLiters > 0 ? (t.totalDistance / t.totalLiters) || 12 : 12,
            cost: t.totalCost
        }))
    }, [fuelTrendsQ.data])

    const safetyBreakdownData = [
        { name: 'Speeding', value: 40, color: '#3b82f6' },
        { name: 'Harsh Turn', value: 25, color: '#8b5cf6' },
        { name: 'Harsh Brake', value: 20, color: '#f59e0b' },
        { name: 'Idling', value: 15, color: '#ef4444' },
    ]

    const isLoading = fuelAnalyticsQ.isLoading || maintenanceQ.isLoading || driverLeaderboardQ.isLoading

    if (isLoading) return <FleetPerformanceSkeleton />

    const maintenanceData = maintenanceQ.data
    const driverData = driverLeaderboardQ.data || []
    const fuelAlerts = fuelAlertsQ.data || []

    return (
        <div className="space-y-10 pb-20">
            {/* Contextual Intelligence Header */}
            <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 p-12 text-white shadow-2xl border border-white/10 group">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-blue-600/20 blur-[120px] group-hover:bg-blue-600/30 transition-all duration-1000" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-[0.2em]">
                                Enterprise Intelligence v2.1
                            </span>
                            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-[0.2em]">
                                <Leaf className="h-3 w-3" />
                                Green Fleet Certified
                            </span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                            Fleet Intelligence <br />
                            <span className="text-3xl text-slate-500">& Performance Insights</span>
                        </h1>
                        <p className="text-slate-400 font-medium max-w-xl text-lg leading-relaxed">
                            Context-aware analytics for multi-modal logistics. Real-time monitoring of fuel thermodynamics, driver behavior patterns, and structural maintenance.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 lg:justify-end">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl min-w-[200px] hover:border-blue-500/50 transition-colors">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Fleet Safety Score</p>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-black text-blue-400">92%</span>
                                <span className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-0.5">
                                    <ArrowUpRight className="h-3 w-3" /> +4.2%
                                </span>
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl min-w-[200px] hover:border-emerald-500/50 transition-colors">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Carbon Handprint</p>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-black text-emerald-400">-12.8</span>
                                <span className="text-[10px] font-bold text-slate-400 mb-1">MT CO2e</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Intelligence Alerts */}
            {fuelAlerts.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="bg-amber-500/5 backdrop-blur-xl border border-amber-500/20 rounded-[2.5rem] p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Anomalous Activity Detected</h2>
                                <p className="text-sm text-slate-500 font-medium">System identified {fuelAlerts.length} high-variance performance issues requiring review.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fuelAlerts.map((alert: FuelAlert, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 border border-amber-500/10 p-5 rounded-2xl flex items-center justify-between group hover:border-amber-500/40 transition-all">
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-amber-600 p-0">{alert.plateNumber}</p>
                                        <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{alert.message}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-rose-500">{alert.actualEfficiency}</div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">KMPL ACTUAL</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Strategic Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* 1. Fuel Thermodynamic Trends */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Fuel Efficiency Correlation</h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">Average KMPL vs Operational Cost Trend Analysis</p>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Daily</button>
                                <button className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">Weekly</button>
                            </div>
                        </div>

                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={efficiencyTrendData}>
                                    <defs>
                                        <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 700 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="efficiency"
                                        stroke="#3b82f6"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorEfficiency)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Peak</p>
                                <p className="text-xl font-black text-blue-600">14.1 kmpl</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Delta</p>
                                <p className="text-xl font-black text-emerald-500">+1.2 kmpl</p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost/KM</p>
                                <p className="text-xl font-black text-slate-900 dark:text-white">₹18.4</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight">Maintenance Priority Matrix</h3>
                            <div className="space-y-4">
                                {maintenanceData?.upcoming.slice(0, 3).map((record: any) => (
                                    <div key={record._id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${record.priority === 'CRITICAL' ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-600'
                                                }`}>
                                                <Wrench className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{record.vehicleId?.plateNumber || 'FLEET-VH'}</p>
                                                <p className="text-[10px] font-bold text-slate-500">{record.type.replace(/_/g, ' ')}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(record.scheduledDate).toLocaleDateString()}</p>
                                            <p className={`text-[10px] font-black ${record.priority === 'CRITICAL' ? 'text-rose-500' : 'text-blue-500'}`}>{record.priority}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link to="/fleet" className="mt-8 block w-full py-4 rounded-2xl bg-slate-900 text-white text-center text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                                View Full Logistics Schedule
                            </Link>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 tracking-tight">Driver Sentiment & Compliance</h3>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={safetyBreakdownData}>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '20px', border: 'none', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                                            {safetyBreakdownData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {safetyBreakdownData.map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Leaderboard & Performance Dedicated Sidebar */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-500/20">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black tracking-tight">Safety Leaders</h3>
                            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                                <Users className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {driverData.slice(0, 5).map((driver: DriverRank, idx: number) => (
                                <div key={driver.driverId} className="flex items-center gap-4 group cursor-pointer">
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                                            <span className="text-lg font-black">{idx + 1}</span>
                                        </div>
                                        {idx === 0 && (
                                            <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-slate-900 shadow-lg">
                                                <Zap className="h-3 w-3 fill-current" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white truncate text-base">{driver.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-400"
                                                    style={{ width: `${driver.score}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-white/60">{driver.score}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-10 w-full py-4 rounded-2xl bg-white text-blue-700 text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-blue-900/40">
                            Download Safety Report
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-sm">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6">Efficiency Indices</h3>
                        <div className="space-y-8">
                            <EfficiencyItem
                                label="Route Compliance"
                                value="98.2%"
                                icon={TrendingUp}
                                color="emerald"
                            />
                            <EfficiencyItem
                                label="Idling Variance"
                                value="-12%"
                                icon={Clock}
                                color="blue"
                            />
                            <EfficiencyItem
                                label="Load Factor"
                                value="84.5%"
                                icon={Activity}
                                color="purple"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-900 p-8 rounded-[3rem] border border-white/5 text-white overflow-hidden relative group">
                        <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all" />
                        <div className="relative z-10 space-y-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Gauge className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight">Real-time Telemetry</h3>
                            <p className="text-slate-400 text-xs font-medium leading-relaxed">
                                High-frequency pings are being processed from 144 vehicle endpoints. Latency: 42ms.
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">System Active</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Pagination Mock for demo */}
            <div className="flex justify-center gap-4 py-8">
                <button className="h-12 w-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-400">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                    <span className="h-10 w-10 flex items-center justify-center bg-blue-600 text-white rounded-xl">1</span>
                    <span className="text-slate-400">/</span>
                    <span>12</span>
                </div>
                <button className="h-12 w-12 flex items-center justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-400">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <div className="fixed bottom-10 right-10 z-50">
                <button className="h-16 w-16 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all">
                    <X className="h-6 w-6" />
                </button>
            </div>
        </div>
    )
}

function EfficiencyItem({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: 'emerald' | 'blue' | 'purple' }) {
    const colors = {
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
    }

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{label}</p>
            </div>
            <span className="text-sm font-black text-slate-900 dark:text-white">{value}</span>
        </div>
    )
}

function FleetPerformanceSkeleton() {
    return (
        <div className="space-y-10 pb-12">
            <Skeleton className="h-[400px] w-full rounded-[3rem]" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-[400px] w-full rounded-[3rem]" />
                    <div className="grid grid-cols-2 gap-6">
                        <Skeleton className="h-[300px] w-full rounded-[3rem]" />
                        <Skeleton className="h-[300px] w-full rounded-[3rem]" />
                    </div>
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-[500px] w-full rounded-[3rem]" />
                    <Skeleton className="h-[200px] w-full rounded-[3rem]" />
                </div>
            </div>
        </div>
    )
}
