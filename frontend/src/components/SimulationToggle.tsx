import { useState } from 'react';
import { Play, Loader2, Activity } from 'lucide-react';
import { simulationApi } from '../services/apiService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';

export function SimulationToggle() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const { data } = useQuery({
        queryKey: ['sim-status'],
        queryFn: () => simulationApi.getStatus(),
        enabled: user?.role === 'MANAGER',
        refetchInterval: (query) => {
            return (query.state.data as any)?.running ? 10000 : false;
        },
        refetchOnWindowFocus: true
    });

    if (user?.role !== 'MANAGER') return null;

    const isRunning = !!data?.running;

    async function toggleSimulation() {
        setIsLoading(true);
        try {
            if (isRunning) {
                await simulationApi.stop();
                toast.success('Simulation Paused');
            } else {
                await simulationApi.start();
                toast.success('Simulation Started');
            }
            // Invalidate to trigger immediate update
            queryClient.invalidateQueries({ queryKey: ['sim-status'] });
        } catch (e) {
            toast.error('Failed to toggle simulation');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <button
            onClick={toggleSimulation}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isRunning
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
            title={isRunning ? "Simulating Live Traffic & Movement" : "Start Simulation"}
        >
            {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRunning ? (
                <>
                    <Activity className="h-3.5 w-3.5 animate-pulse" />
                    <span className="hidden sm:inline">LIVE SIM</span>
                </>
            ) : (
                <>
                    <Play className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">START SIM</span>
                </>
            )}
        </button>
    );
}

