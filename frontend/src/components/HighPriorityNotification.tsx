import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle, X, ExternalLink, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';

type Notification = {
    _id: string;
    type: string;
    title?: string;
    message: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    importance: 'LOW' | 'HIGH';
    metadata?: any;
    createdAt: string;
};

export function HighPriorityNotification() {
    const { socket, user } = useAuth();
    const navigate = useNavigate();
    const [activeNotif, setActiveNotif] = useState<Notification | null>(null);

    useEffect(() => {
        if (!socket || !user) return;

        const handleNewNotification = (notif: Notification) => {
            // Only show modal for HIGH importance notifications that haven't been seen
            if (notif.importance === 'HIGH') {
                setActiveNotif(notif);
                // Play alert sound for high priority
                try {
                    const audio = new Audio('/alert.mp3');
                    audio.play().catch(() => {});
                } catch (e) {}
            }
        };

        socket.on('notification:new', handleNewNotification);
        return () => {
            socket.off('notification:new', handleNewNotification);
        };
    }, [socket, user]);

    const handleDismiss = async () => {
        if (activeNotif) {
            try {
                await api.patch(`/notifications/${activeNotif._id}/read`);
            } catch (err) {
                console.error('Failed to mark high priority notification as read:', err);
            }
            setActiveNotif(null);
        }
    };

    const handleAction = async () => {
        if (!activeNotif) return;

        await handleDismiss();

        if (activeNotif.type === 'SHIPMENT_CREATED' && user?.role === 'MANAGER') {
            navigate('/app/approvals');
        } else if (activeNotif.metadata?.shipmentId) {
            navigate(`/app/shipment/${activeNotif.metadata.shipmentId}`);
        } else if (activeNotif.type === 'LOW_FUEL' || activeNotif.type === 'TEMP_BREACH') {
            navigate('/app/iot-monitor');
        }
    };

    return (
        <AnimatePresence>
            {activeNotif && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-md overflow-hidden"
                    >
                        <div className={`h-2 ${
                            activeNotif.severity === 'ERROR' ? 'bg-red-500' : 
                            activeNotif.severity === 'WARNING' ? 'bg-amber-500' : 
                            'bg-blue-600'
                        }`} />
                        
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                                    activeNotif.severity === 'ERROR' ? 'bg-red-50 dark:bg-red-500/10 text-red-600' : 
                                    activeNotif.severity === 'WARNING' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 
                                    'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                                }`}>
                                    {activeNotif.severity === 'ERROR' ? <ShieldAlert className="h-8 w-8" /> : 
                                     activeNotif.severity === 'WARNING' ? <AlertTriangle className="h-8 w-8" /> : 
                                     <Bell className="h-8 w-8" />}
                                </div>
                                <button 
                                    onClick={handleDismiss}
                                    className="h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
                                {activeNotif.title || 'Priority Alert'}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                                {activeNotif.message}
                            </p>

                            <div className="mt-8 flex flex-col gap-3">
                                <button
                                    onClick={handleAction}
                                    className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                                        activeNotif.severity === 'ERROR' ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20' : 
                                        activeNotif.severity === 'WARNING' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 
                                        'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
                                    }`}
                                >
                                    Take Action
                                    <ExternalLink className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-4 px-6 rounded-2xl font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                >
                                    Dismiss for now
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
