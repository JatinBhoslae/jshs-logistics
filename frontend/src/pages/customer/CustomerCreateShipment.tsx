import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { api } from '../../lib/api'
import { toast } from 'react-hot-toast'
import {
    Package,
    MapPin,
    Truck,
    CreditCard,
    Camera,
    AlertCircle,
    ReceiptText,
    ChevronRight,
    TrendingUp,
    Loader2,
    Trash2
} from 'lucide-react'
import LocationSearch from '../../components/LocationSearch'
import { formatCurrency } from '../../utils'
import { PACKAGE_DIMENSIONS } from '../../constants'

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function CustomerCreateShipment() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1)
    const [paymentOption, setPaymentOption] = useState<'PAY_NOW' | 'PAY_LATER'>('PAY_NOW')
    const [formData, setFormData] = useState({
        origin: null as any,
        destination: null as any,
        goodsImages: [] as string[],
        weight: 0,
        dimensions: '',
        deliveryType: 'standard' as 'standard' | 'express',
        category: 'KIRANA' as 'KIRANA' | 'DAWAI' | 'KAPDA' | 'DAIRY' | 'AUTO_PARTS' | 'ELECTRONICS' | 'CUSTOM',
        customCategory: '',
        notes: '',
        consigneeName: '',
        consigneeContact: ''
    })

    const [pricingMode, setPricingMode] = useState<'AUTO' | 'CUSTOM'>('AUTO')
    const [customPrice, setCustomPrice] = useState<number | ''>('')
    const [estimatedCost, setEstimatedCost] = useState(0)
    const [createdShipment, setCreatedShipment] = useState<any>(null)
    const [razorpayOrder, setRazorpayOrder] = useState<any>(null)

    const isPhoneValid = /^(\+91)?[6-9]\d{9}$/.test(formData.consigneeContact)



    // ... existing imports ...

    const [isCustomDimensions, setIsCustomDimensions] = useState(false)
    // ... existing state ...

    // Replace the local useEffect with API call
    useEffect(() => {
        if (!formData.origin || !formData.destination) return

        const fetchEstimate = async () => {
            try {
                const res = await api.post('/shipments/estimate', {
                    origin: formData.origin,
                    destination: formData.destination,
                    weight: Number(formData.weight),
                    dimensions: formData.dimensions,
                    delivery_type: formData.deliveryType,
                    shipmentType: formData.category
                })

                if (res.data.serviceable) {
                    setEstimatedCost(res.data.estimated_cost)
                }
            } catch (err) {
                console.error('Estimation failed', err)
            }
        }

        const timer = setTimeout(() => {
            if (formData.weight > 0) fetchEstimate()
        }, 800)

        return () => clearTimeout(timer)
    }, [formData.origin, formData.destination, formData.weight, formData.dimensions, formData.deliveryType, formData.category])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files) return

        // For demo, we'll convert to base64 or just use placeholder URLs
        // In production, these would be uploaded to S3/Cloudinary
        const newImages = Array.from(files).map(() =>
            `https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=400`
        )

        setFormData(prev => ({
            ...prev,
            goodsImages: [...prev.goodsImages, ...newImages]
        }))
        toast.success('Images uploaded successfully!')
    }

    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            goodsImages: prev.goodsImages.filter((_, i) => i !== index)
        }))
    }

    const handleSubmit = async () => {
        if (!formData.origin || !formData.destination) {
            toast.error('Please select both origin and destination')
            return
        }

        setLoading(true)
        try {
            const payload = {
                origin: formData.origin,
                destination: formData.destination,
                paymentOption,
                pricingMode,
                customPrice: pricingMode === 'CUSTOM' ? Number(customPrice) || undefined : undefined,
                category: formData.category === 'CUSTOM' ? undefined : formData.category,
                customCategory: formData.category === 'CUSTOM' ? formData.customCategory || undefined : undefined,
                packageDetails: {
                    weight: formData.weight,
                    dimensions: formData.dimensions
                },
                deliveryType: formData.deliveryType,
                goodsImages: formData.goodsImages,
                consigneeName: formData.consigneeName,
                consigneeContact: formData.consigneeContact.startsWith('+91') ? formData.consigneeContact : `+91${formData.consigneeContact}`
            }

            console.log('Submitting Payload:', payload)

            const res = await api.post('/customer/shipments', payload)
            setCreatedShipment(res.data.shipment)

            if ((res.data.paymentOption || paymentOption) === 'PAY_NOW' && res.data.razorpayOrder) {
                setRazorpayOrder(res.data.razorpayOrder)
                setStep(3) // Move to Payment Step
                toast.success('Shipment created! Proceed to payment.')
            } else {
                setStep(4) // Directly show success with Pay Later info
                toast.success('Shipment created with Pay Later option.')
            }


        } catch (err: any) {
            console.error('Create Shipment Error Object:', err)
            if (err.response) {
                console.error('Server Response:', err.response.data)
                console.error('Status:', err.response.status)
            }
            toast.error(err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to create shipment')
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = () => {
        if (!razorpayOrder || !createdShipment) return

        const options = {
            key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Ru1kOSbo78LMRS',
            amount: razorpayOrder.amount * 100,
            currency: razorpayOrder.currency,
            name: 'JSHS Logistics',
            description: `Shipment Payment - ${createdShipment.referenceId}`,
            order_id: razorpayOrder.orderId,
            handler: async (response: any) => {
                try {
                    const res = await api.post('/customer/payments/verify', {
                        razorpayOrderId: response.razorpay_order_id,
                        razorpayPaymentId: response.razorpay_payment_id,
                        razorpaySignature: response.razorpay_signature
                    })
                    // Update the local createdShipment with the now-real shipment from DB
                    setCreatedShipment(res.data.shipment)
                    toast.success('Payment successful!')
                    setStep(4) // Success Step
                } catch (err) {
                    toast.error('Payment verification failed')
                    console.error('Verification Error:', err)
                }
            },
            prefill: {
                name: user?.name,
                email: user?.email,
            },
            theme: { color: '#4F46E5' },
            modal: {
                ondismiss: async () => {
                    try {
                        await api.post('/customer/payments/failure', {
                            razorpayOrderId: razorpayOrder.orderId,
                            shipmentId: 'PENDING',
                            error: 'Payment cancelled by user'
                        })
                    } catch (e) {
                        console.error('Failed to log payment cancellation', e)
                    }
                }
            }
        }

        const rzp = new window.Razorpay(options)
        rzp.open()
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create Shipment</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Book a new consignment with real-time AI categorization.</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full">
                    <Truck className="h-4 w-4" />
                    <span>Professional Network</span>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { icon: MapPin, label: 'Route' },
                    { icon: Package, label: 'Details' },
                    { icon: CreditCard, label: 'Payment' },
                    { icon: ReceiptText, label: 'Invoice' }
                ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${step > i + 1 ? 'bg-emerald-500 text-white' :
                            step === i + 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20' :
                                'bg-slate-200 dark:bg-white/10 text-slate-500'
                            }`}>
                            <s.icon className="h-5 w-5" />
                        </div>
                        <span className={`text-xs font-medium ${step === i + 1 ? 'text-indigo-600' : 'text-slate-500'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            {/* Step 1: Route Selection */}
            {step === 1 && (
                <div className="glass-card p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pickup Location</label>
                            <LocationSearch
                                value={formData.origin}
                                onChange={(loc: any) => setFormData(prev => ({ ...prev, origin: loc }))}
                                placeholder="Enter pickup address..."
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Dropoff Location</label>
                            <LocationSearch
                                value={formData.destination}
                                onChange={(loc: any) => setFormData(prev => ({ ...prev, destination: loc }))}
                                placeholder="Enter destination address..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Consignee Name</label>
                            <input
                                type="text"
                                value={formData.consigneeName}
                                onChange={(e) => setFormData(prev => ({ ...prev, consigneeName: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Enter recipient's name"
                            />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Consignee Number</label>
                            <input
                                type="text"
                                value={formData.consigneeContact}
                                onChange={(e) => setFormData(prev => ({ ...prev, consigneeContact: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Enter recipient's contact number"
                            />
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!formData.origin || !formData.destination || !formData.consigneeName || !isPhoneValid}
                            className={`px-6 py-3 text-white rounded-xl font-bold transition-all flex items-center gap-2 ${!formData.origin || !formData.destination || !formData.consigneeName || !isPhoneValid
                                ? 'bg-slate-300 cursor-not-allowed opacity-50'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25'
                                }`}
                        >
                            {isPhoneValid ? (
                                <>Next Step <ChevronRight className="h-5 w-5" /></>
                            ) : formData.consigneeContact ? (
                                <>Invalid Number</>
                            ) : (
                                <>Enter Number</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Package Details & AI Categorization */}
            {step === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="glass-card p-6 space-y-6">
                            <h2 className="text-xl font-bold">Package Information</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Estimated Weight (kg)</label>
                                    <input
                                        type="number"
                                        max={1000}
                                        value={formData.weight || ''}
                                        onChange={(e) => {
                                            const val = Number(e.target.value)
                                            if (val > 1000) return
                                            setFormData(prev => ({ ...prev, weight: val }))
                                        }}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. 50 (Max 1000kg)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dimensions</label>
                                    <select
                                        value={isCustomDimensions ? 'custom' : formData.dimensions}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setIsCustomDimensions(true)
                                                setFormData(prev => ({ ...prev, dimensions: '' }))
                                            } else {
                                                setIsCustomDimensions(false)
                                                setFormData(prev => ({ ...prev, dimensions: e.target.value }))
                                            }
                                        }}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                                    >
                                        {PACKAGE_DIMENSIONS.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                    {isCustomDimensions && (
                                        <input
                                            type="text"
                                            value={formData.dimensions}
                                            onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 100 x 80 x 60"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Goods Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="KIRANA">Kirana (Grocery)</option>
                                        <option value="DAWAI">Dawai (Pharma)</option>
                                        <option value="KAPDA">Kapda (Textiles)</option>
                                        <option value="DAIRY">Dairy / Perishables</option>
                                        <option value="AUTO_PARTS">Auto Parts</option>
                                        <option value="ELECTRONICS">Electronics</option>
                                        <option value="CUSTOM">Other (Custom)</option>
                                    </select>
                                    {formData.category === 'CUSTOM' && (
                                        <input
                                            type="text"
                                            value={formData.customCategory}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customCategory: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none mt-2"
                                            placeholder="Enter custom goods category (e.g. Machinery, Furniture)"
                                        />
                                    )}
                                </div>
                                <label className="text-sm font-medium">Upload Photos of Goods (For AI Categorization)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {formData.goodsImages.map((img, i) => (
                                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 dark:border-white/10">
                                            <img src={img} alt="Product" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => removeImage(i)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                        <Camera className="h-8 w-8 text-slate-400" />
                                        <span className="text-xs text-slate-500 mt-2">Add Photo</span>
                                        <input type="file" multiple className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <button
                                onClick={() => setStep(1)}
                                className="px-6 py-3 text-slate-600 font-bold hover:text-slate-900 transition-colors"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || formData.goodsImages.length === 0 || (pricingMode === 'CUSTOM' && (!customPrice || Number(customPrice) <= 0))}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm & Proceed'}
                                {!loading && <ChevronRight className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-card p-6 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border-indigo-200 dark:border-indigo-500/20">
                            <div className="flex items-center gap-2 text-indigo-600 mb-4">
                                <TrendingUp className="h-5 w-5" />
                                <h3 className="font-bold">Cost Estimate</h3>
                            </div>
                            <div className="text-4xl font-black text-slate-900 dark:text-white">
                                {pricingMode === 'CUSTOM' && customPrice
                                    ? formatCurrency(Number(customPrice))
                                    : formatCurrency(estimatedCost)}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Includes base price, distance fees, and weight surcharges.</p>

                            <div className="mt-6 space-y-3 pt-6 border-t border-slate-200 dark:border-white/10">
                                <div className="flex justify-between text-xs font-semibold text-slate-500">
                                    <span>Pricing Mode</span>
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                className="h-3 w-3 text-indigo-600"
                                                checked={pricingMode === 'AUTO'}
                                                onChange={() => setPricingMode('AUTO')}
                                            />
                                            <span>Auto</span>
                                        </label>
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="radio"
                                                className="h-3 w-3 text-indigo-600"
                                                checked={pricingMode === 'CUSTOM'}
                                                onChange={() => setPricingMode('CUSTOM')}
                                            />
                                            <span>Custom</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Service Fee</span>
                                    <span className="font-medium">{formatCurrency(100)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Distance Charge</span>
                                    <span className="font-medium">{formatCurrency(estimatedCost - 100 - (formData.weight * 2))}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600 font-bold">
                                    <span>Hacknova Demo Mode</span>
                                    <span>- ₹{estimatedCost - 1}</span>
                                </div>
                                {pricingMode === 'CUSTOM' && (
                                    <div className="space-y-1 text-sm">
                                        <label className="text-slate-500">Enter your own price (₹)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={customPrice}
                                            onChange={(e) => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. 5000"
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between text-sm font-medium pt-2 items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            className="h-4 w-4 text-indigo-600"
                                            checked={paymentOption === 'PAY_NOW'}
                                            onChange={() => setPaymentOption('PAY_NOW')}
                                        />
                                        <span>Pay Now (demo charge)</span>
                                    </label>
                                    <span className="text-indigo-600 font-bold">₹1.00</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium items-center">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            className="h-4 w-4 text-indigo-600"
                                            checked={paymentOption === 'PAY_LATER'}
                                            onChange={() => setPaymentOption('PAY_LATER')}
                                        />
                                        <span>Pay Later (invoice / offline)</span>
                                    </label>
                                    <span className="text-slate-500 font-semibold">₹{estimatedCost}</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-card p-4 space-y-3 bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20">
                            <div className="flex gap-3 text-amber-700 dark:text-amber-400">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <div className="text-sm">
                                    <p className="font-bold">Approval Required</p>
                                    <p className="mt-1 opacity-80">Shipments created by customers require manager approval before resource dispatch.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Step 3: Payment (only for Pay Now flow) */}
            {
                step === 3 && createdShipment && paymentOption === 'PAY_NOW' && (
                    <div className="max-w-md mx-auto animate-in zoom-in-95 duration-300">
                        <div className="glass-card p-8 text-center space-y-6">
                            <div className="h-20 w-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CreditCard className="h-10 w-10 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Complete Payment</h2>
                                <p className="text-slate-500 mt-2">Finish booking by paying the demonstration fee of ₹1.</p>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl text-left space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Ref ID</span>
                                    <span className="font-mono font-bold">{createdShipment.referenceId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-bold">₹1.00</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                            >
                                Pay via Razorpay
                            </button>
                            <p className="text-xs text-slate-400 italic">Secure payment gateway powered by Razorpay</p>
                        </div>
                    </div>
                )
            }

            {/* Step 4: Success */}
            {
                step === 4 && (
                    <div className="max-w-md mx-auto animate-in zoom-in-95 duration-500">
                        <div className="glass-card p-8 text-center space-y-6 border-emerald-500/30">
                            <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <ReceiptText className="h-14 w-14 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">Booking Requested!</h2>
                                <p className="text-slate-500 mt-2">
                                    {paymentOption === 'PAY_NOW'
                                        ? "Payment verified. Your shipment is now in the manager's review queue."
                                        : "Your shipment request has been submitted with Pay Later option. Our team will review and share payment instructions."
                                    }
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                            <Package className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold">{createdShipment?.referenceId}</h4>
                                            <span className="text-[10px] text-slate-400 uppercase font-black">Shipment Reference</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                                        <div className={`h-2 w-2 rounded-full ${createdShipment?.aiCategorization?.category !== 'UNKNOWN' ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                        {createdShipment?.aiCategorization?.category !== 'UNKNOWN' ? (
                                            <span>AI categorized this as <span className="font-bold text-indigo-600 uppercase">{createdShipment?.aiCategorization?.category}</span></span>
                                        ) : (
                                            <span>Manual categorization pending</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-slate-400 block mb-1">Status</span>
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">Awaiting Approval</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block mb-1">Payment</span>
                                            {paymentOption === 'PAY_NOW' ? (
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold">Verified ₹1.00</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">Pay Later</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => navigate('/app/shipments')}
                                        className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-all"
                                    >
                                        Track in Shipments
                                    </button>
                                    <button
                                        onClick={() => navigate('/app/dashboard')}
                                        className="w-full py-3 text-slate-500 font-bold hover:text-slate-900 transition-all"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
