import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Skeleton from '../../components/Skeleton'

export default function Analytics() {
  type KPIs = {
    shipmentsTotal: number
    shipmentsInTransit: number
    shipmentsDelivered: number
    shipmentsLast7d: number
    vehiclesTotal: number
    invoicesPaid: number
    revenuePaid: number
    revenuePending: number
    driverPayoutsPending: number
    maintenanceDueSoon: number
  }

  const q = useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview')
      return res.data.kpis as KPIs
    },
  })

  // Fetch predictive insights
  const q2 = useQuery({
    queryKey: ['predictiveInsights'],
    queryFn: async () => {
      const res = await api.get('/analytics/predictive-insights')
      return res.data as { insights: any }
    },
  })

  if (q.isLoading || q2.isLoading) return <AnalyticsSkeleton />
  if (q.isError || q2.isError) return (
    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-3xl">
      <h2 className="text-xl font-bold text-red-900">Analytics Synchronisation Error</h2>
      <p className="text-red-700 mt-2">{(q.error as any)?.message || (q2.error as any)?.message || 'Failed to fetch analytics data'}</p>
      <button onClick={() => { q.refetch(); q2.refetch(); }} className="btn-primary mt-6">Retry Sync</button>
    </div>
  )

  const data = q.data!

  const chartData = [
    { name: 'Total', value: data.shipmentsTotal },
    { name: 'In Transit', value: data.shipmentsInTransit },
    { name: 'Delivered', value: data.shipmentsDelivered },
    { name: 'Last 7d', value: data.shipmentsLast7d },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-slate-600 dark:text-white/70">KPIs and predictive insights (heuristics for hackathon demo).</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Revenue (Paid)</div>
          <div className="text-2xl font-semibold text-emerald-600">₹ {data!.revenuePaid?.toLocaleString() ?? 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Pending Invoices</div>
          <div className="text-2xl font-semibold text-amber-600">₹ {data!.revenuePending?.toLocaleString() ?? 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Driver Payouts (Due)</div>
          <div className="text-2xl font-semibold text-blue-600">₹ {data!.driverPayoutsPending?.toLocaleString() ?? 0}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Active Vehicles</div>
          <div className="text-2xl font-semibold">{data!.vehiclesTotal}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Shipment Volume</div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Demand Forecast (AI Predicted)</div>
          <div style={{ height: 280 }}>
            {/* Using BarChart for simplicity as LineChart needs slightly different data structure, 
                or we can import LineChart. Let's stick to BarChart with different color for now 
                or import LineChart if possible. Since I can't easily add import without another tool call, 
                I will use BarChart to represent trend or add LineChart import in a separate tool call if needed.
                Actually, I should add LineChart to imports. I will do that in next step or use BarChart now.
                Let's use BarChart.
            */}
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={q2.data!.insights.demandForecast}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="shipments" fill="#8b5cf6" name="Predicted Shipments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="glass-card bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-200/50 dark:border-green-900/30">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">Fuel Savings Prediction</h3>
              <p className="text-sm text-slate-600 dark:text-white/60 mt-1">
                AI Route Optimization Impact
              </p>
            </div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {q2.data?.insights.fuelSavings?.optimizationScore ?? 0}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">₹ {q2.data?.insights.fuelSavings?.monthlyProjected?.toLocaleString() ?? 0}</div>
            <div className="text-xs text-slate-500 dark:text-white/60">Projected savings this month</div>
          </div>
          <div className="mt-4 text-xs font-medium text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2 rounded">
            💡 {q2.data?.insights.fuelSavings?.suggestion ?? 'Optimize routes to save fuel'}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="font-medium mb-3">Risk Assessment</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-red-50 rounded-lg dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600">{q2.data!.insights.highRiskDelays}</div>
              <div className="text-xs text-red-800 dark:text-red-300">High Risk</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg dark:bg-amber-900/20">
              <div className="text-2xl font-bold text-amber-600">{q2.data!.insights.mediumRiskDelays}</div>
              <div className="text-xs text-amber-800 dark:text-amber-300">Medium Risk</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600">{q2.data!.insights.lowRiskDelays}</div>
              <div className="text-xs text-green-800 dark:text-green-300">Low Risk</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card h-24 flex flex-col justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="glass-card h-80">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
        <div className="glass-card h-80">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="glass-card h-48 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-16" />
          </div>
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
        <div className="glass-card h-48 space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
