import { motion } from 'framer-motion'
import { User, Mail, Shield, Calendar, MapPin, Phone } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

export default function Profile() {
    const { user } = useAuth()

    if (!user) return null

    const profileFields = [
        { label: 'Full Name', value: user.name, icon: User },
        { label: 'Email Address', value: user.email, icon: Mail },
        { label: 'Role', value: user.role, icon: Shield },
        { label: 'Phone', value: user.phone || 'Not provided', icon: Phone },
        { label: 'Location', value: 'HQ - New Delhi', icon: MapPin },
        { label: 'Member Since', value: 'January 2024', icon: Calendar },
    ]

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">MY PROFILE</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your personal information and security settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1 space-y-6"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 flex flex-col items-center text-center">
                        <div className="relative group">
                            <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center p-1 shadow-2xl shadow-indigo-500/20">
                                <div className="h-full w-full rounded-[1.8rem] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                    <User className="h-16 w-16 text-indigo-500" />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center shadow-lg">
                                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>

                        <h2 className="mt-6 text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.name}</h2>
                        <span className="mt-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                            {user.role}
                        </span>

                        <div className="mt-8 w-full grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</div>
                                <div className="text-xs font-black text-emerald-500 uppercase">Active</div>
                            </div>
                            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Impact</div>
                                <div className="text-xs font-black text-indigo-500 uppercase">Top 5%</div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Details Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 space-y-8"
                >
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                            <div className="h-1.5 w-6 rounded-full bg-indigo-500" />
                            Account Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {profileFields.map((field, idx) => (
                                <div key={idx} className="group p-4 rounded-3xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                                            <field.icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{field.label}</div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{field.value}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Shield className="h-32 w-32" />
                            </div>
                            <h4 className="font-black text-sm uppercase tracking-widest mb-2">Security Score</h4>
                            <div className="text-3xl font-black mb-4">98%</div>
                            <p className="text-xs text-indigo-100 font-medium">Your account is highly secure. Two-factor authentication is active.</p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-widest mb-2">Recent Activity</h4>
                            <div className="space-y-4 mt-4">
                                {[1, 2].map((_, i) => (
                                    <div key={i} className="flex gap-3">
                                        <div className="h-8 w-8 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate">Authorized login from New Device</div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase">2 hours ago</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
