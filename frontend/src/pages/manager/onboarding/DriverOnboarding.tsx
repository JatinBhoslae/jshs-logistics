import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
    UserPlus,
    ArrowLeft,
    Zap,
    Save,
    Shield,
    CreditCard,
    FileText,
    User
} from 'lucide-react'
import { api } from '../../../lib/api'
import { toast } from 'react-hot-toast'

export default function DriverOnboarding() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        phone: '',
        dob: '',
        gender: 'MALE',
        address: '',
        aadhaarNumber: '',
        panNumber: '',
        licenseNumber: '',
        licenseType: 'HMV',
        licenseExpiryDate: '',
        emergencyContact: {
            name: '',
            phone: ''
        },
        bankDetails: {
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            holderName: ''
        },
        yearsOfExperience: 0,
        employmentId: '',
        insuranceProvider: '',
        insuranceCoverage: '',
        onboardingStatus: 'COMPLETED'
    })

    const autofill = async () => {
        setGenerating(true)
        try {
            const res = await api.get('/fleet/drivers/dummy')
            setFormData(res.data)
            toast.success('Professional driver profile generated!')
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
            await api.post('/fleet/drivers/onboard', formData)
            toast.success('Driver onboarding successful! Awaiting approval.')
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
                    className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20"
                >
                    <Zap className={`h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? 'Verifying Identity...' : 'Autofill for Dev'}
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-0 overflow-hidden shadow-2xl border-none"
            >
                <div className="bg-slate-900 p-8 text-white relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <UserPlus size={120} />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Driver Personnel Onboarding</h2>
                    <p className="text-slate-400 font-medium">Verify credentials and establish professional profile.</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-10">
                    <Section title="Persona Information" icon={User}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField
                                label="Full Legal Name"
                                value={formData.name}
                                onChange={(v: any) => handleChange('name', v)}
                                placeholder="As per Aadhaar"
                                required
                            />
                            <InputField
                                label="Email Address"
                                type="email"
                                value={formData.email}
                                onChange={(v: any) => handleChange('email', v)}
                                placeholder="name@company.com"
                                required
                            />
                            <InputField
                                label="Primary Contact"
                                value={formData.phone}
                                onChange={(v: any) => handleChange('phone', v)}
                                placeholder="+91..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <InputField label="Date of Birth" type="date" value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''} onChange={(v: any) => handleChange('dob', v)} />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e: any) => handleChange('gender', e.target.value)}
                                    className="input-glass"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <InputField label="Resident Address" value={formData.address} onChange={(v: any) => handleChange('address', v)} placeholder="Full street address" />
                        </div>
                    </Section>

                    <Section title="Statutory Compliance" icon={Shield}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField label="Aadhaar ID" value={formData.aadhaarNumber} onChange={(v: any) => handleChange('aadhaarNumber', v)} placeholder="0000 0000 0000" />
                            <InputField label="PAN Identifier" value={formData.panNumber} onChange={(v: any) => handleChange('panNumber', v)} placeholder="ABCDE1234F" />
                        </div>
                    </Section>

                    <Section title="Driving Credentials" icon={FileText}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="License Number" value={formData.licenseNumber} onChange={(v: any) => handleChange('licenseNumber', v)} placeholder="DL-..." />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">License Category</label>
                                <select
                                    value={formData.licenseType}
                                    onChange={(e: any) => handleChange('licenseType', e.target.value)}
                                    className="input-glass"
                                >
                                    <option value="LMV">LMV (Light Motor)</option>
                                    <option value="HMV">HMV (Heavy Motor)</option>
                                    <option value="HGMV">HGMV (Heavy Goods)</option>
                                    <option value="TRANS">Transport</option>
                                </select>
                            </div>
                            <InputField label="License Expiry" type="date" value={formData.licenseExpiryDate ? new Date(formData.licenseExpiryDate).toISOString().split('T')[0] : ''} onChange={(v: any) => handleChange('licenseExpiryDate', v)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            <InputField label="Internal Emp ID" value={formData.employmentId} onChange={(v: any) => handleChange('employmentId', v)} />
                            <InputField label="Experience (Years)" type="number" value={formData.yearsOfExperience} onChange={(v: any) => handleChange('yearsOfExperience', v)} />
                            <InputField label="Joining Date" type="date" value={formData.joiningDate ? new Date(formData.joiningDate).toISOString().split('T')[0] : ''} onChange={(v: any) => handleChange('joiningDate', v)} />
                        </div>
                    </Section>

                    <Section title="Emergency & Financial Hub" icon={CreditCard}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card bg-slate-50 dark:bg-white/5 border-none p-6 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                    Emergency Contact
                                </h4>
                                <InputField label="Contact Name" value={formData.emergencyContact.name} onChange={(v: any) => handleChange('emergencyContact.name', v)} />
                                <InputField label="Contact Phone" value={formData.emergencyContact.phone} onChange={(v: any) => handleChange('emergencyContact.phone', v)} />
                            </div>
                            <div className="glass-card bg-slate-50 dark:bg-white/5 border-none p-6 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                    Bank Settlement Account
                                </h4>
                                <InputField label="Account Number" value={formData.bankDetails.accountNumber} onChange={(v: any) => handleChange('bankDetails.accountNumber', v)} />
                                <InputField label="IFSC Code" value={formData.bankDetails.ifscCode} onChange={(v: any) => handleChange('bankDetails.ifscCode', v)} />
                                <InputField label="Bank Name" value={formData.bankDetails.bankName} onChange={(v: any) => handleChange('bankDetails.bankName', v)} />
                            </div>
                        </div>
                    </Section>

                    <div className="pt-10 border-t border-slate-100 dark:border-white/5 flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <Zap className="h-5 w-5 animate-spin" />
                            ) : (
                                <Save className="h-5 w-5" />
                            )}
                            Register Professional Pilot
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
