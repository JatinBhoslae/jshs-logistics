import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, ChevronRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

interface Notification {
    _id: string;
    title: string;
    message: string;
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
    read: boolean;
    importance: 'HIGH' | 'LOW';
    link?: string;
    createdAt: string;
}

export default function NotificationStrip() {
    const navigate = useNavigate();
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    const { data: notifications } = useQuery({
        queryKey: ['unread-notifications'],
        queryFn: async () => {
            const res = await api.get('/notifications/unread?importance=HIGH');
            return res.data.notifications as Notification[];
        },
        refetchInterval: 15000, // Poll every 15 seconds
    });

    const activeNotifications = notifications?.filter(n => !hiddenIds.includes(n._id)) || [];

    if (activeNotifications.length === 0) return null;

    const current = activeNotifications[0];

    const getIcon = (type: string) => {
        switch (type) {
            case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'ERROR': return <AlertTriangle className="h-4 w-4 text-rose-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'WARNING': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/20 text-amber-900 dark:text-amber-200';
            case 'SUCCESS': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/20 text-emerald-900 dark:text-emerald-200';
            case 'ERROR': return 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/20 text-rose-900 dark:text-rose-200';
            default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/20 text-blue-900 dark:text-blue-200';
        }
    };

    const handleAction = async () => {
        try {
            await api.patch(`/notifications/${current._id}/read`);
            if (current.link) {
                navigate(current.link);
            }
        } catch (err) {
            console.error('Failed to mark notification as read', err);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`border-b relative z-40 overflow-hidden ${getBgColor(current.type)}`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0">
                            {getIcon(current.type)}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                            <span className="text-xs font-black uppercase tracking-widest shrink-0">{current.type}</span>
                            <span className="text-sm font-bold truncate">
                                {current.title}: <span className="font-medium opacity-80">{current.message}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleAction}
                            className="flex items-center gap-1 text-xs font-black uppercase tracking-widest hover:underline px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/5"
                        >
                            View Action <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setHiddenIds(prev => [...prev, current._id])}
                            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                {activeNotifications.length > 1 && (
                    <div className="absolute bottom-0 left-0 h-0.5 bg-black/10 transition-all" style={{ width: `${(1 / activeNotifications.length) * 100}%` }} />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
