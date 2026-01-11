import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { User } from 'lucide-react'
import Skeleton from '../../components/Skeleton'

type AuditLog = {
    _id: string
    actorId: {
        _id: string
        name: string
        email: string
        role: string
    }
    action: string
    entityType: string
    entityId: string
    metadata: any
    createdAt: string
}

export default function AuditLogs() {
    const { data, isLoading } = useQuery({
        queryKey: ['audit-logs'],
        queryFn: async () => {
            const res = await api.get('/audit')
            return res.data.logs as AuditLog[]
        }
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
                <p className="text-sm text-slate-500 dark:text-white/60">
                    Track system activities and security events.
                </p>
            </div>

            <div className="glass-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr className="border-b border-slate-200/60 dark:border-white/10">
                                <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Actor</th>
                                <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Action</th>
                                <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Entity</th>
                                <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white">Details</th>
                                <th className="px-4 py-3 font-semibold text-slate-900 dark:text-white text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
                            {isLoading ? (
                                <AuditLogsSkeleton />
                            ) : data?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-slate-500">No audit logs found</td>
                                </tr>
                            ) : (
                                data?.map((log) => (
                                    <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 dark:text-white">{log.actorId?.name || 'System'}</div>
                                                    <div className="text-xs text-slate-500 dark:text-white/50">{log.actorId?.email || '-'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${log.action.includes('CREATED') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                log.action.includes('DELETED') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    log.action.includes('UPDATED') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-900 dark:text-white">{log.entityType}</div>
                                            <div className="text-xs font-mono text-slate-500 truncate max-w-[100px]">{log.entityId}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <pre className="text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-950 p-1 rounded max-w-[200px] overflow-x-auto">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </td>
                                        <td className="px-4 py-3 text-right text-xs text-slate-500 dark:text-white/50">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function AuditLogsSkeleton() {
    return (
        <>
            {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-white/5">
                    <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3">
                        <Skeleton className="h-6 w-20 rounded-md" />
                    </td>
                    <td className="px-4 py-3">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                    </td>
                    <td className="px-4 py-3">
                        <Skeleton className="h-10 w-40 rounded" />
                    </td>
                    <td className="px-4 py-3 text-right">
                        <Skeleton className="h-4 w-32 ml-auto" />
                    </td>
                </tr>
            ))}
        </>
    )
}
