import React, { useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';
import { motion } from 'framer-motion';
import { ArrowRight, Globe as GlobeIcon, Package, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
    const navigate = useNavigate();
    // Use proper ref type for Globe if possible, or any
    const globeEl = useRef<any>(null);

    useEffect(() => {
        // Auto-rotate globe
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
        }
    }, []);

    const user = JSON.parse(localStorage.getItem('international_user') || 'null');

    const featureCards = [
        {
            icon: <GlobeIcon className="w-8 h-8 text-blue-500" />,
            title: "Global Reach",
            description: "Seamless logistics across 200+ countries with real-time tracking."
        },
        {
            icon: <Package className="w-8 h-8 text-blue-500" />,
            title: "Smart Consolidation",
            description: "AI-driven cargo consolidation to minimize costs and maximize efficiency."
        },
        {
            icon: <ShieldCheck className="w-8 h-8 text-blue-500" />,
            title: "Secure & Compliant",
            description: "Automated customs clearance and insurance for peace of mind."
        }
    ];

    return (
        <div className="relative w-full min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">

            {/* Header / Nav */}
            <header className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                    JSHS International
                </div>
                <div className="flex gap-4">
                    {user ? (
                        <button onClick={() => navigate('/dashboard')} className="glass px-4 py-2 rounded-lg font-medium hover:bg-white/20 transition-all flex items-center gap-2">
                            <User className="w-4 h-4" /> {user.name.split(' ')[0]}
                        </button>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="glass px-6 py-2 rounded-lg font-medium hover:bg-white/20 transition-all">
                                Log In
                            </button>
                            <button onClick={() => navigate('/register')} className="hidden sm:block btn-primary px-6 py-2 rounded-lg font-medium">
                                Sign Up
                            </button>
                        </>
                    )}
                </div>
            </header>

            {/* 3D Background */}
            <div className="absolute inset-0 z-0 opacity-30 dark:opacity-40 pointer-events-none">
                <Globe
                    ref={globeEl}
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    backgroundColor="rgba(0,0,0,0)"
                    width={window.innerWidth}
                    height={window.innerHeight}
                />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto space-y-6"
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="px-3 py-1 text-xs font-semibold tracking-wider text-blue-600 border border-blue-500/30 rounded-full bg-blue-500/10 backdrop-blur-md">
                            INTERNATIONAL DIVISION
                        </span>
                    </div>

                    <h1 className="text-5xl font-bold tracking-tight md:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400">
                        Logistics Without <br /> Borders
                    </h1>

                    <p className="max-w-xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                        Experience next-generation international shipping.
                        AI-powered routes, real-time predictions, and premium handling for your most valuable cargo.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                        <button
                            onClick={() => navigate('/quote')}
                            className="btn-primary flex items-center justify-center gap-2 shadow-2xl py-4 px-8 text-lg"
                        >
                            Get Instant Quote <ArrowRight className="w-5 h-5" />
                        </button>
                        <button onClick={() => navigate('/login')} className="glass flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Track Shipment
                        </button>
                    </div>
                </motion.div>

                {/* Features Strip */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full"
                >
                    {featureCards.map((feature, idx) => (
                        <div key={idx} className="glass-card hover:scale-105 transition-transform duration-300">
                            <div className="mb-4 bg-blue-500/10 w-fit p-3 rounded-xl">{feature.icon}</div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">{feature.description}</p>
                        </div>
                    ))}
                </motion.div>
            </div>

        </div>
    );
};

export default LandingPage;
