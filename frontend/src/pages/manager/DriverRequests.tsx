import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

type DriverRow = {
  _id: string
  name: string
  email: string
  driverApprovalStatus?: string
}

export default function DriverRequests() {
  const q = useQuery({
    queryKey: ['pendingDrivers'],
    queryFn: async () => {
      const res = await api.get('/fleet/drivers/pending')
      return res.data.drivers as DriverRow[]
    },
  })

  async function approve(id: string) {
    await api.post(`/fleet/drivers/${id}/approve`)
    await q.refetch()
  }

  async function reject(id: string) {
    await api.post(`/fleet/drivers/${id}/reject`)
    await q.refetch()
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Driver requests</h1>
        <p className="text-sm text-slate-600 dark:text-white/70">Approve or reject drivers requesting access to your logistics.</p>
      </div>

      {q.isLoading ? <div>Loading…</div> : null}
      {q.isError ? <div className="text-red-600">Failed to load pending drivers.</div> : null}

      <div className="table-glass">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((d) => (
              <tr key={d._id} className="border-t border-slate-200/60 dark:border-white/10">
                <td className="p-3 font-medium">{d.name}</td>
                <td className="p-3">{d.email}</td>
                <td className="p-3">{d.driverApprovalStatus ?? 'PENDING'}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => approve(d._id)} className="btn-primary px-3 py-1 text-xs">
                      Approve
                    </button>
                    <button
                      onClick={() => reject(d._id)}
                      className="btn-ghost border border-red-300/50 px-3 py-1 text-xs text-red-700 hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!q.isLoading && (q.data ?? []).length === 0 ? (
              <tr>
                <td className="p-3 text-slate-600 dark:text-white/70" colSpan={4}>
                  No pending requests.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
