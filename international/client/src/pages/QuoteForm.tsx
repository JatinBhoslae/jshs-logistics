import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, Plane, Ship, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const QuoteForm = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        origin: '',
        destination: '',
        weight: '',
        type: 'AIR'
    });

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const steps = [
        { title: "Route", desc: "Where are we shipping?" },
        { title: "Details", desc: "Cargo specifics" },
        { title: "Service", desc: "Delivery options" }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <div className="p-6">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back to Home
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl"
                >
                    {/* Progress */}
                    <div className="flex justify-between mb-12 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -z-10" />
                        {steps.map((s, i) => (
                            <div key={i} className={`flex flex-col items-center gap-2 bg-slate-900 px-2 ${i + 1 <= step ? 'text-brand-light' : 'text-slate-600'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${i + 1 <= step ? 'border-brand-light bg-brand/10' : 'border-slate-700 bg-slate-800'}`}>
                                    {i + 1 < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
                                </div>
                                <span className="text-xs font-medium uppercase tracking-wider">{s.title}</span>
                            </div>
                        ))}
                    </div>

                    {/* Form Content */}
                    <div className="min-h-[300px]">
                        {step === 1 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Origin & Destination</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Origin Country/City</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-light focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. Mumbai, India"
                                            value={formData.origin}
                                            onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Destination Country/City</label>
                                        <input
                                            type="text"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-light focus:border-transparent outline-none transition-all"
                                            placeholder="e.g. Dubai, UAE"
                                            value={formData.destination}
                                            onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Cargo Details</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Total Weight (kg)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-light focus:border-transparent outline-none"
                                            placeholder="0.00"
                                            value={formData.weight}
                                            onChange={e => setFormData({ ...formData, weight: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Commodity Type</label>
                                        <select className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-light outline-none">
                                            <option>General Cargo</option>
                                            <option>Perishable</option>
                                            <option>Hazardous / DG</option>
                                            <option>Electronics</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <h2 className="text-2xl font-bold">Select Service</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'AIR', label: 'Air Freight', icon: <Plane className="w-6 h-6" />, time: '2-4 Days' },
                                        { id: 'OCEAN', label: 'Ocean Freight', icon: <Ship className="w-6 h-6" />, time: '20-30 Days' },
                                        { id: 'ROAD', label: 'Cross-Border Truck', icon: <Truck className="w-6 h-6" />, time: '5-10 Days' },
                                    ].map(opt => (
                                        <div
                                            key={opt.id}
                                            onClick={() => setFormData({ ...formData, type: opt.id })}
                                            className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-3 transition-all ${formData.type === opt.id ? 'border-brand-light bg-brand/10 text-white' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'}`}
                                        >
                                            {opt.icon}
                                            <span className="font-semibold">{opt.label}</span>
                                            <span className="text-xs opacity-70">{opt.time}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-emerald-400 font-medium">AI Estimated Price:</span>
                                        <span className="text-2xl font-bold text-white">$ 1,240.00</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Based on current market rates and historical data.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between mt-8 pt-8 border-t border-slate-800">
                        {step > 1 ? (
                            <button onClick={handleBack} className="px-6 py-2 text-slate-400 hover:text-white transition-colors">
                                Back
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button onClick={handleNext} className="bg-white text-slate-900 px-8 py-2 rounded-lg font-semibold hover:bg-slate-200 transition-colors">
                                Continue
                            </button>
                        ) : (
                            <button className="bg-brand text-white px-8 py-2 rounded-lg font-semibold hover:bg-brand-dark transition-colors shadow-lg shadow-brand/25">
                                Request Quote
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default QuoteForm;
