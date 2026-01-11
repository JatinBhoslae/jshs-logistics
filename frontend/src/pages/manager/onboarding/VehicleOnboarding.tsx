import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    Truck,
    ArrowLeft,
    Zap,
    Save,
    Settings,
    Shield,
    Thermometer,
    Info
} from 'lucide-react'
import { api } from '../../../lib/api'
import { toast } from 'react-hot-toast'

export default function VehicleOnboarding() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [formData, setFormData] = useState<any>({
        plateNumber: '',
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        fuelType: 'DIESEL',
        fuelCapacityLiters: 100,
        isRefrigerated: false,
        operationalTempRange: { min: -25, max: -15 },
        odometerKm: 0,
        engineCapacityCc: 2500,
        capacityKg: 1000,
        gpsDeviceId: '',
        simNumber: '',
        insuranceDetails: {
            policyNumber: '',
            expiryDate: '',
            provider: ''
        },
        type: 'TRUCK_SM',
        status: 'AVAILABLE'
    })

    const autofill = async () => {
        setGenerating(true)
        try {
            const res = await api.get('/fleet/vehicles/dummy')
            setFormData(res.data)
            toast.success('Professional parameters generated!')
        } catch (err) {
            toast.error('Failed to generate dummy data')
        } finally {
            setGenerating(false)
        }
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post('/fleet/vehicles', formData)
            toast.success('Vehicle successfully onboarded!')
            navigate('/app/onboarding')
        } catch (err: any) {
            toast.error(err.response?.data?.error?.message || 'Onboarding failed')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (path: string, value: any) => {
        const keys = path.split('.')
        const newFormData = { ...formData }
        let current = newFormData
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]]
        }
        current[keys[keys.length - 1]] = value
        setFormData(newFormData)
    }

    return (
        <div className="space-y-8 pb-12 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/app/onboarding')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-black text-xs uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Portal
                </button>

                <button
                    onClick={autofill}
                    disabled={generating}
                    className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-amber-500/20"
                >
                    <Zap className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? 'Simulating...' : 'Autofill for Dev'}
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-0 overflow-hidden shadow-2xl border-none"
            >
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Truck size={120} />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Create Vehicle Asset</h2>
                    <p className="text-slate-400 font-medium">Register hardware capabilities and regulatory attributes.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-10">
                    <Section title="Primary Identification" icon={Info}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Number Plate"
                                value={formData.plateNumber}
                                onChange={(v: any) => handleChange('plateNumber', v)}
                                placeholder="HR-26-AB-1234"
                                required
                            />
                            <InputField
                                label="VIN Number"
                                value={formData.vin}
                                onChange={(v: any) => handleChange('vin', v)}
                                placeholder="Global Unique ID"
                            />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Category</label>
                                <select
                                    value={formData.type}
                                    onChange={(e: any) => handleChange('type', e.target.value)}
                                    className="input-glass"
                                >
                                    <option value="TRUCK_LG">Heavy Truck (LG)</option>
                                    <option value="TRUCK_SM">Small Truck (SM)</option>
                                    <option value="VAN">Delivery Van</option>
                                    <option value="BIKE">Courier Bike</option>
                                </select>
                            </div>
                        </div>
                    </Section>

                    <Section title="Technical Specifications" icon={Settings}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <InputField label="Make" value={formData.make} onChange={(v: any) => handleChange('make', v)} placeholder="e.g. Tata" />
                            <InputField label="Model" value={formData.model} onChange={(v: any) => handleChange('model', v)} placeholder="e.g. Ultra" />
                            <InputField label="Year" type="number" value={formData.year} onChange={(v: any) => handleChange('year', v)} />
                            <InputField label="Color" value={formData.color} onChange={(v: any) => handleChange('color', v)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fuel Type</label>
                                <select
                                    value={formData.fuelType}
                                    onChange={(e: any) => handleChange('fuelType', e.target.value)}
                                    className="input-glass"
                                >
                                    <option value="DIESEL">Diesel</option>
                                    <option value="PETROL">Petrol</option>
                                    <option value="ELECTRIC">Electric</option>
                                    <option value="CNG">CNG</option>
                                </select>
                            </div>
                            <InputField label="Tank Capacity (L)" type="number" value={formData.fuelCapacityLiters} onChange={(v: any) => handleChange('fuelCapacityLiters', v)} />
                            <InputField label="Engine CC" type="number" value={formData.engineCapacityCc} onChange={(v: any) => handleChange('engineCapacityCc', v)} />
                            <InputField label="Load Payload (KG)" type="number" value={formData.capacityKg} onChange={(v: any) => handleChange('capacityKg', v)} />
                        </div>
                    </Section>

                    <Section title="IoT & Telemetry" icon={Zap}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="IoT Device ID" value={formData.gpsDeviceId} onChange={(v: any) => handleChange('gpsDeviceId', v)} placeholder="IMEI or Hardware ID" />
                            <InputField label="SIM Number" value={formData.simNumber} onChange={(v: any) => handleChange('simNumber', v)} placeholder="+91..." />
                            <InputField label="Initial Odometer" type="number" value={formData.odometerKm} onChange={(v: any) => handleChange('odometerKm', v)} />
                        </div>
                    </Section>

                    <Section title="Cold Chain Capability" icon={Thermometer}>
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <label className="flex items-center gap-3 cursor-pointer mt-4">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.isRefrigerated}
                                        onChange={(e: any) => handleChange('isRefrigerated', e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-12 h-6 rounded-full transition-colors ${formData.isRefrigerated ? 'bg-blue-600' : 'bg-slate-300 dark:bg-white/10'}`} />
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isRefrigerated ? 'translate-x-6' : ''}`} />
                                </div>
                                <span className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Chiller Support</span>
                            </label>

                            <AnimatePresence>
                                {formData.isRefrigerated && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="flex-1 grid grid-cols-2 gap-6"
                                    >
                                        <InputField label="Min Temp (°C)" type="number" value={formData.operationalTempRange.min} onChange={(v: any) => handleChange('operationalTempRange.min', v)} />
                                        <InputField label="Max Temp (°C)" type="number" value={formData.operationalTempRange.max} onChange={(v: any) => handleChange('operationalTempRange.max', v)} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Section>

                    <Section title="Regulatory & Insurance" icon={Shield}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="Policy Number" value={formData.insuranceDetails.policyNumber} onChange={(v: any) => handleChange('insuranceDetails.policyNumber', v)} />
                            <InputField label="Insurance Provider" value={formData.insuranceDetails.provider} onChange={(v: any) => handleChange('insuranceDetails.provider', v)} />
                            <InputField label="Expiry Date" type="date" value={formData.insuranceDetails.expiryDate ? new Date(formData.insuranceDetails.expiryDate).toISOString().split('T')[0] : ''} onChange={(v: any) => handleChange('insuranceDetails.expiryDate', v)} />
                        </div>
                    </Section>

                    <div className="pt-10 border-t border-slate-100 dark:border-white/5 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Zap className="h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            Finalize Onboarding
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/app/onboarding')}
                            className="px-10 h-14 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-widest text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    )
}

function Section({ title, icon: Icon, children }: any) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-50 dark:border-white/5">
                <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500">
                    <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-white">{title}</h3>
            </div>
            <div>{children}</div>
        </div>
    )
}

function InputField({ label, type = 'text', value, onChange, placeholder, required }: { label: string, type?: string, value: any, onChange: (v: any) => void, placeholder?: string, required?: boolean }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label} {required && '*'}</label>
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                placeholder={placeholder}
                required={required}
                className="input-glass"
            />
        </div>
    )
}
