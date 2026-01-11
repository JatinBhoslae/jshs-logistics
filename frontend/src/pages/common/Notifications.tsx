import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import type { Notification } from '../../types'

type DriverRequestMetadata = { driverId?: string }

import { Bell, CheckCircle2, Truck, UserPlus, AlertCircle } from 'lucide-react'

export default function Notifications() {
  const { socket } = useAuth()
  const [liveCount, setLiveCount] = useState(0)

  const q = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((res) => res.data.notifications),
  })

  useEffect(() => {
    if (!socket) return

    const handler = () => {
      setLiveCount((c) => c + 1)
      q.refetch()
    }

    socket.on('notification:new', handler)
    return () => {
      socket.off('notification:new', handler)
    }
  }, [socket, q])

  if (q.isError) return (
    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-3xl">
      <h2 className="text-xl font-bold text-red-900">Notification Sync Error</h2>
      <p className="text-red-700 mt-2">{q.error instanceof Error ? q.error.message : 'Failed to fetch notifications'}</p>
      <button onClick={() => q.refetch()} className="btn-primary mt-6">Retry Sync</button>
    </div>
  )

  if (q.isLoading) return <div className="p-12 text-center text-slate-500">Retrieving alerts...</div>

  async function approve(driverId: string) {
    await api.post(`/fleet/drivers/${driverId}/approve`)
    await q.refetch()
  }

  async function reject(driverId: string) {
    await api.post(`/fleet/drivers/${driverId}/reject`)
    await q.refetch()
  }

  function getIcon(type: string) {
    if (type.includes('DRIVER')) return <UserPlus className="h-5 w-5 text-blue-500" />
    if (type.includes('SHIPMENT')) return <Truck className="h-5 w-5 text-indigo-500" />
    if (type.includes('ERROR') || type.includes('ALERT')) return <AlertCircle className="h-5 w-5 text-red-500" />
    if (type.includes('SUCCESS') || type.includes('APPROVED')) return <CheckCircle2 className="h-5 w-5 text-green-500" />
    return <Bell className="h-5 w-5 text-slate-500" />
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-600 dark:text-white/70">Real-time alerts and updates.</p>
        </div>
        {liveCount > 0 && (
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            {liveCount} New Updates
          </span>
        )}
      </div>

      <div className="space-y-3">
        {(q.data || []).length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No notifications yet.</p>
          </div>
        ) : (q.data || []).map((n) => {
          const meta = (n as unknown as { metadata?: DriverRequestMetadata }).metadata
          const driverId = meta?.driverId

          return (
            <div key={n._id} className="glass-frame p-4 flex gap-3 sm:gap-4 transition-all hover:bg-slate-50/50 dark:hover:bg-white/5">
              <div className="mt-1 h-10 w-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate pr-2">{n.type.replace(/_/g, ' ')}</h3>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-white/60 mt-1 break-words">{n.message}</p>

                {n.type === 'DRIVER_REQUEST' && driverId ? (
                  <div className="mt-3 flex gap-3">
                    <button onClick={() => approve(driverId)} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700">
                      Approve Request
                    </button>
                    <button
                      onClick={() => reject(driverId)}
                      className="rounded-lg bg-white border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-white"
                    >
                      Decline
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

