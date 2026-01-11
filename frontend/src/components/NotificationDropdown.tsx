import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Clock } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../auth/AuthContext'
import toast from 'react-hot-toast'
import { formatDate } from '../utils'

type Notification = {
    _id: string
    userId?: string
    type: string
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
    message: string
    metadata?: any
    readAt?: string
    createdAt: string
}

export default function NotificationDropdown() {
    const { socket, user } = useAuth()
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const unreadCount = notifications.filter((n) => !n.readAt).length

    const handleNotificationClick = async (n: Notification) => {
        if (!n.readAt) {
            await markAsRead(n._id)
        }

        // Navigation logic based on notification type
        if (n.type === 'LOW_FUEL' || n.type === 'TEMP_BREACH' || n.type === 'MAINTENANCE') {
            const vehicleId = n.metadata?.vehicleId || n.metadata?.id;
            if (vehicleId) {
                navigate(`/app/iot-monitor?highlight=${vehicleId}`);
            } else {
                navigate('/app/iot-monitor');
            }
            setIsOpen(false);
        } else if (n.metadata?.shipmentId) {
            navigate(`/app/shipment/${n.metadata.shipmentId}`);
            setIsOpen(false);
        }
    }

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/notifications')
            setNotifications(res.data.notifications)
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        }
    }

    useEffect(() => {
        if (!user) return
        fetchNotifications()
    }, [user])

    useEffect(() => {
        if (!socket || !user) return

        const onNotification = (newNotif: Notification) => {
            // Safety check: Filter out notifications meant for other users
            if (newNotif.userId && newNotif.userId !== user.id) {
                return
            }

            setNotifications((prev) => [newNotif, ...prev])

            const toastOptions = {
                duration: 5000,
                position: 'top-right' as const,
            }

            switch (newNotif.severity) {
                case 'SUCCESS':
                    toast.success(newNotif.message, toastOptions)
                    break
                case 'ERROR':
                    toast.error(newNotif.message, toastOptions)
                    break
                case 'WARNING':
                    toast(newNotif.message, { ...toastOptions, icon: '⚠️' })
                    break
                default:
                    toast(newNotif.message, { ...toastOptions, icon: '🔔' })
            }

            // Play sound (simulated/optional)
            // const audio = new Audio('/notification.mp3')
            // audio.play().catch(() => { })
        }

        socket.on('notification:new', onNotification)
        return () => {
            socket.off('notification:new', onNotification)
        }
    }, [socket, user?.id])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const markAsRead = async (id: string) => {
        try {
            await api.patch(`/notifications/${id}/read`)
            setNotifications((prev) =>
                prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
            )
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors relative"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 h-4 w-4 bg-blue-600 text-white text-[10px] font-bold rounded-full ring-2 ring-white flex items-center justify-center transform translate-x-1 -translate-y-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed inset-x-4 top-20 z-50 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {unreadCount} New
                            </span>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="h-12 w-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-sm text-slate-500">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50 dark:divide-white/5">
                                {notifications.map((n) => (
                                    <div
                                        key={n._id}
                                        className={`p-4 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer relative group ${!n.readAt ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''
                                            }`}
                                        onClick={() => handleNotificationClick(n)}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${n.severity === 'ERROR' ? 'bg-red-500' :
                                            n.severity === 'WARNING' ? 'bg-amber-500' :
                                                n.severity === 'SUCCESS' ? 'bg-green-500' :
                                                    'bg-blue-600'
                                            } ${!n.readAt ? 'opacity-100' : 'opacity-30'}`}></div>
                                        <div className="flex gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-snug ${!n.readAt ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-white/60'}`}>
                                                    {n.message}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Clock className="h-3 w-3 text-slate-400" />
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatDate(n.createdAt)}
                                                    </span>
                                                </div>
                                            </div>
                                            {!n.readAt && (
                                                <button
                                                    className="h-6 w-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        markAsRead(n._id)
                                                    }}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-slate-50/50 dark:bg-white/5 text-center">
                            <button className="text-[11px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                                View All Activity
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
