import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Truck, UserPlus, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function OnboardingHub() {
    return (
        <div className="space-y-10 pb-12">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-10 text-white shadow-2xl border border-white/5"
            >
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Fleet Expansion Portal</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                        Asset <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">Onboarding</span>
                    </h1>
                    <p className="text-slate-400 font-medium max-w-xl text-lg leading-relaxed">
                        Scale your logistics operation by integrating new high-performance vehicles and professional drivers into the JSHS ecosystem.
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <OnboardingCard
                    to="/app/onboarding/vehicle"
                    title="Vehicle Onboarding"
                    desc="Register new trucks, vans, or specialized cooling units. Configure IoT telemetry and service schedules."
                    icon={Truck}
                    color="blue"
                    stats="42 Active Units"
                />
                <OnboardingCard
                    to="/app/onboarding/driver"
                    title="Driver Onboarding"
                    desc="Enroll professional drivers with background verification, license validation, and performance tracking."
                    icon={UserPlus}
                    color="emerald"
                    stats="128 Verified Pilots"
                />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-10 border-none shadow-xl bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-white/5 dark:to-white/5"
            >
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Compliance & Verification</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                            All onboarded assets undergo a multi-point verification process including document validation,
                            IoT connectivity testing, and background checks to ensure the highest safety standards.
                        </p>
                    </div>
                    <Link
                        to="/app/pending-approvals"
                        className="md:ml-auto px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
                    >
                        Review Pending <Zap className="h-4 w-4 text-amber-500" />
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}

function OnboardingCard({ to, title, desc, icon: Icon, color, stats }: any) {
    const colors: any = {
        blue: 'from-blue-600 to-indigo-700 shadow-blue-500/20',
        emerald: 'from-emerald-600 to-teal-700 shadow-emerald-500/20',
    }

    return (
        <motion.div
            whileHover={{ y: -10 }}
            className="group relative h-80"
        >
            <Link to={to} className="block h-full">
                <div className={`h-full rounded-[2.5rem] p-10 bg-gradient-to-br ${colors[color]} text-white shadow-2xl transition-all overflow-hidden relative`}>
                    <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform">
                        <Icon size={240} strokeWidth={1} />
                    </div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-auto">
                            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6">
                                <Icon className="h-7 w-7" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight mb-3">{title}</h2>
                            <p className="text-white/70 font-medium text-sm leading-relaxed max-w-[240px]">{desc}</p>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                {stats}
                            </span>
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-all">
                                <ArrowRight className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    )
}
