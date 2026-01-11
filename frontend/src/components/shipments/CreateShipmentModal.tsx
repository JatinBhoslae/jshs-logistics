import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Loader2, Activity, AlertCircle, Crosshair } from 'lucide-react'
import { MapContainer, Marker, TileLayer, ZoomControl, ScaleControl, useMapEvents } from 'react-leaflet'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { shipmentApi } from '../../services/apiService'
import { useAuth } from '../../auth/AuthContext'
import { useDebounce } from '../../hooks/useDebounce'
import { handleApiError } from '../../utils/errorHandler'
import { SHIPMENT_TYPES, DEFAULT_CENTER, PACKAGE_DIMENSIONS } from '../../constants'
import { formatDate } from '../../utils'

type LatLng = { lat: number; lng: number }

function Picker({ value, onPick }: { value: LatLng | null; onPick: (p: LatLng) => void }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
        },
    })
    return value ? <Marker position={[value.lat, value.lng]} /> : null
}

interface CreateShipmentModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateShipmentModal({ onClose, onSuccess }: CreateShipmentModalProps) {
    const { user } = useAuth()
    const [originName, setOriginName] = useState('')
    const [originPos, setOriginPos] = useState<LatLng | null>(null)
    const [destinationName, setDestinationName] = useState('')
    const [destinationPos, setDestinationPos] = useState<LatLng | null>(null)
    const [shipmentType, setShipmentType] = useState<(typeof SHIPMENT_TYPES)[number]['value']>('KIRANA')
    const [driverId, setDriverId] = useState('')
    const [vehicleId, setVehicleId] = useState('')
    const [weight, setWeight] = useState(1)
    const [dimensions, setDimensions] = useState('30x20x10')
    const [isCustomDimensions, setIsCustomDimensions] = useState(false)
    const [customerId, setCustomerId] = useState('')
    const [deliveryType, setDeliveryType] = useState('standard')
    const [consigneeName, setConsigneeName] = useState('')
    const [consigneeContact, setConsigneeContact] = useState('')

    const [step, setStep] = useState<1 | 2>(1)
    const [estimateData, setEstimateData] = useState<any>(null)
    const [isEstimating, setIsEstimating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerTarget, setPickerTarget] = useState<'origin' | 'destination'>('origin')

    const [originSuggestions, setOriginSuggestions] = useState<any[]>([])
    const [destSuggestions, setDestSuggestions] = useState<any[]>([])
    const [isOriginLoading, setIsOriginLoading] = useState(false)
    const [isDestLoading, setIsDestLoading] = useState(false)
    const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
    const [showDestSuggestions, setShowDestSuggestions] = useState(false)

    const debouncedOrigin = useDebounce(originName, 400)
    const debouncedDest = useDebounce(destinationName, 400)

    const originRef = useRef<HTMLDivElement>(null)
    const destRef = useRef<HTMLDivElement>(null)

    // Handle click outside to close suggestions
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (originRef.current && !originRef.current.contains(event.target as Node)) {
                setShowOriginSuggestions(false)
            }
            if (destRef.current && !destRef.current.contains(event.target as Node)) {
                setShowDestSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Fetch origin suggestions
    useEffect(() => {
        if (!debouncedOrigin.trim() || originPos) {
            setOriginSuggestions([])
            setShowOriginSuggestions(false)
            return
        }

        async function fetchSuggestions() {
            setIsOriginLoading(true)
            try {
                const res = await api.get('/locations/autocomplete', { params: { input: debouncedOrigin } })
                setOriginSuggestions(res.data.predictions || [])
                setShowOriginSuggestions(true)
            } catch (err) {
                console.error('Failed to fetch origin suggestions', err)
            } finally {
                setIsOriginLoading(false)
            }
        }
        fetchSuggestions()
    }, [debouncedOrigin, originPos])

    // Fetch destination suggestions
    useEffect(() => {
        if (!debouncedDest.trim() || destinationPos) {
            setDestSuggestions([])
            setShowDestSuggestions(false)
            return
        }

        async function fetchSuggestions() {
            setIsDestLoading(true)
            try {
                const res = await api.get('/locations/autocomplete', { params: { input: debouncedDest } })
                setDestSuggestions(res.data.predictions || [])
                setShowDestSuggestions(true)
            } catch (err) {
                console.error('Failed to fetch destination suggestions', err)
            } finally {
                setIsDestLoading(false)
            }
        }
        fetchSuggestions()
    }, [debouncedDest, destinationPos])

    async function handleSelectSuggestion(target: 'origin' | 'destination', prediction: any) {
        try {
            const res = await api.get('/locations/details', { params: { placeId: prediction.place_id } })
            const { location, name, address } = res.data
            const fullAddress = address || name

            if (target === 'origin') {
                setOriginName(fullAddress)
                setOriginPos({ lat: location.lat, lng: location.lng })
                setShowOriginSuggestions(false)
            } else {
                setDestinationName(fullAddress)
                setDestinationPos({ lat: location.lat, lng: location.lng })
                setShowDestSuggestions(false)
            }
        } catch (err) {
            console.error('Failed to fetch place details', err)
        }
    }

    const getCurrentLocation = (target: 'origin' | 'destination') => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser')
            return
        }

        const setLoading = target === 'origin' ? setIsOriginLoading : setIsDestLoading
        setLoading(true)

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude: lat, longitude: lng } = position.coords
                    const res = await api.get('/locations/reverse', { params: { lat, lng } })
                    const { name, address, location } = res.data
                    const fullAddress = address || name

                    if (target === 'origin') {
                        setOriginName(fullAddress)
                        setOriginPos({ lat: location.lat, lng: location.lng })
                    } else {
                        setDestinationName(fullAddress)
                        setDestinationPos({ lat: location.lat, lng: location.lng })
                    }
                } catch (err) {
                    console.error('Reverse geocoding error', err)
                    alert('Failed to get current location address')
                } finally {
                    setLoading(false)
                }
            },
            (error) => {
                console.error('Geolocation error', error)
                setLoading(false)
                alert('Allow location access to use this feature')
            }
        )
    }

    const driversQ = useQuery({
        queryKey: ['drivers'],
        queryFn: async () => {
            const res = await api.get('/fleet/drivers')
            return res.data.drivers as any[]
        },
        enabled: user?.role === 'MANAGER',
    })

    const vehiclesQ = useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const res = await api.get('/fleet/vehicles')
            return res.data.vehicles as any[]
        },
        enabled: user?.role === 'MANAGER',
    })

    const customersQ = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const res = await api.get('/auth/users', { params: { role: 'CUSTOMER' } })
            return res.data.users as any[]
        },
        enabled: user?.role === 'MANAGER',
    })

    const mapCenter = useMemo(() => {
        if (originPos) return originPos
        if (destinationPos) return destinationPos
        return DEFAULT_CENTER
    }, [originPos, destinationPos])

    async function handleGetEstimate() {
        if (!originName.trim() || !originPos) return alert('Origin name and map location are required')
        if (!destinationName.trim() || !destinationPos) return alert('Destination name and map location are required')

        setIsEstimating(true)
        try {
            const res = await api.post('/shipments/estimate', {
                origin: { name: originName.trim(), lat: originPos.lat, lng: originPos.lng },
                destination: { name: destinationName.trim(), lat: destinationPos.lat, lng: destinationPos.lng },
                weight: Number(weight),
                dimensions,
                delivery_type: deliveryType
            })
            if (res.data.serviceable) {
                setEstimateData(res.data)
                setStep(2)
            } else {
                alert(res.data.message || 'Location not serviceable')
            }
        } catch (err: any) {
            alert(err.response?.data?.error?.message || 'Estimation failed')
        } finally {
            setIsEstimating(false)
        }
    }

    async function handleCreate() {
        if (!originPos || !destinationPos) return alert('Wait! Origin and Destination coordinates are required.')
        if (user?.role === 'MANAGER' && !customerId) return alert('Please select a Consignor (Customer).')

        setIsCreating(true)
        try {
            const payload: any = {
                origin: { name: originName.trim(), lat: originPos.lat, lng: originPos.lng },
                destination: { name: destinationName.trim(), lat: destinationPos.lat, lng: destinationPos.lng },
                shipmentType,
                package: {
                    weight: Number(weight),
                    dimensions,
                    type: 'BOX'
                },
                delivery_type: deliveryType,
                consignee: {
                    name: consigneeName,
                    contact: consigneeContact.startsWith('+91') ? consigneeContact : `+91${consigneeContact}`
                },
                customerId: customerId || undefined,
                driverId: driverId || undefined,
                vehicleId: vehicleId || undefined
            }
            await shipmentApi.create(payload)
            onSuccess()
        } catch (err: unknown) {
            const apiError = handleApiError(err)
            alert(apiError.message || 'Create shipment failed')
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col my-auto"
            >
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">New Shipment</h2>
                        <p className="text-sm text-slate-500">Enter delivery details and assign logistical assets.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {step === 1 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 relative" ref={originRef}>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Origin Point</label>
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <input
                                            value={originName}
                                            onChange={(e) => {
                                                setOriginName(e.target.value)
                                                if (originPos) setOriginPos(null)
                                            }}
                                            onFocus={() => { if (originSuggestions.length > 0) setShowOriginSuggestions(true) }}
                                            placeholder="Type origin city..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => getCurrentLocation('origin')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Use Current Location"
                                        >
                                            <Crosshair className={`h-4 w-4 ${isOriginLoading ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </div>
                                    {isOriginLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                                    <AnimatePresence>
                                        {showOriginSuggestions && originSuggestions.length > 0 && (
                                            <motion.div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[80] overflow-hidden max-h-60 overflow-y-auto">
                                                {originSuggestions.map((s) => (
                                                    <button key={s.place_id} onClick={() => handleSelectSuggestion('origin', s)} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 border-b last:border-0 transition-colors">
                                                        <p className="font-semibold">{s.structured_formatting.main_text}</p>
                                                        <p className="text-xs text-slate-500">{s.structured_formatting.secondary_text}</p>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button onClick={() => { setPickerTarget('origin'); setPickerOpen(true); }} className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {originPos ? `${originPos.lat.toFixed(4)}, ${originPos.lng.toFixed(4)}` : 'Set Location on Map'}
                                </button>
                            </div>

                            <div className="space-y-1.5 relative" ref={destRef}>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Destination Point</label>
                                <div className="space-y-2">
                                    <div className="relative group">
                                        <input
                                            value={destinationName}
                                            onChange={(e) => {
                                                setDestinationName(e.target.value)
                                                if (destinationPos) setDestinationPos(null)
                                            }}
                                            onFocus={() => { if (destSuggestions.length > 0) setShowDestSuggestions(true) }}
                                            placeholder="Type destination city..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => getCurrentLocation('destination')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Use Current Location"
                                        >
                                            <Crosshair className={`h-4 w-4 ${isDestLoading ? 'animate-pulse' : ''}`} />
                                        </button>
                                    </div>
                                    {isDestLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                                    <AnimatePresence>
                                        {showDestSuggestions && destSuggestions.length > 0 && (
                                            <motion.div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-[80] overflow-hidden max-h-60 overflow-y-auto">
                                                {destSuggestions.map((s) => (
                                                    <button key={s.place_id} onClick={() => handleSelectSuggestion('destination', s)} className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 border-b last:border-0 transition-colors">
                                                        <p className="font-semibold">{s.structured_formatting.main_text}</p>
                                                        <p className="text-xs text-slate-500">{s.structured_formatting.secondary_text}</p>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <button onClick={() => { setPickerTarget('destination'); setPickerOpen(true); }} className="flex items-center justify-center gap-2 w-full py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-100 transition-colors">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {destinationPos ? `${destinationPos.lat.toFixed(4)}, ${destinationPos.lng.toFixed(4)}` : 'Set Location on Map'}
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Consignee Name</label>
                                <input value={consigneeName} onChange={(e) => setConsigneeName(e.target.value)} placeholder="Receiver's Name" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Consignee Contact</label>
                                <input value={consigneeContact} onChange={(e) => setConsigneeContact(e.target.value)} placeholder="Phone Number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 transition-all" />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Weight (kg)</label>
                                <input type="number" max={1000} value={weight} onChange={(e) => setWeight(Math.min(1000, Number(e.target.value)))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Dimensions</label>
                                <div className="space-y-2">
                                    <select
                                        value={isCustomDimensions ? 'custom' : dimensions}
                                        onChange={(e) => {
                                            if (e.target.value === 'custom') {
                                                setIsCustomDimensions(true)
                                            } else {
                                                setIsCustomDimensions(false)
                                                setDimensions(e.target.value)
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all"
                                    >
                                        {PACKAGE_DIMENSIONS.map(d => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                    {isCustomDimensions && (
                                        <input
                                            value={dimensions}
                                            onChange={(e) => setDimensions(e.target.value)}
                                            placeholder="L x W x H (e.g. 10x10x10)"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Category</label>
                                <select value={shipmentType} onChange={(e) => setShipmentType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all">
                                    {SHIPMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Service Type</label>
                                <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all">
                                    <option value="standard">Standard</option>
                                    <option value="express">Express</option>
                                </select>
                            </div>

                            {user?.role === 'MANAGER' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Consignor (Customer)</label>
                                        <select
                                            value={customerId}
                                            onChange={(e) => setCustomerId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none transition-all"
                                        >
                                            <option value="">Select Consignor...</option>
                                            {(customersQ.data || []).map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Driver</label>
                                        <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm">
                                            <option value="">Auto-Assign</option>
                                            {(driversQ.data || []).map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Vehicle</label>
                                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm">
                                            <option value="">Auto-Assign</option>
                                            {(vehiclesQ.data || []).map(v => <option key={v._id} value={v._id}>{v.plateNumber}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex flex-col gap-4">
                                {estimateData?.isRemote && (
                                    <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700">
                                        <AlertCircle className="h-5 w-5 shrink-0" />
                                        <p className="text-xs font-bold leading-tight">{estimateData.message}</p>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">Estimated Cost</span>
                                    <span className="text-3xl font-black text-blue-900">₹{estimateData?.estimated_cost}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-blue-100">
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Expected Arrival</span>
                                    <span className="text-sm font-bold text-slate-900">{estimateData?.estimated_eta ? formatDate(estimateData.estimated_eta) : '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button onClick={step === 2 ? () => setStep(1) : onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                        {step === 2 ? 'Back' : 'Cancel'}
                    </button>
                    {step === 1 ? (
                        <button onClick={handleGetEstimate} disabled={isEstimating} className="px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                            {isEstimating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                            Get Estimate
                        </button>
                    ) : (
                        <button onClick={handleCreate} disabled={isCreating} className="px-10 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm Shipment
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {pickerOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl">
                                <div className="p-6 flex items-center justify-between border-b border-slate-100">
                                    <h3 className="font-bold">Select {pickerTarget} Point</h3>
                                    <button onClick={() => setPickerOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="h-5 w-5" /></button>
                                </div>
                                <div className="h-[500px]">
                                    <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <ZoomControl position="bottomright" />
                                        <ScaleControl imperial={true} />
                                        <Picker
                                            value={pickerTarget === 'origin' ? originPos : destinationPos}
                                            onPick={(p) => { if (pickerTarget === 'origin') setOriginPos(p); else setDestinationPos(p); }}
                                        />
                                    </MapContainer>
                                </div>
                                <div className="p-4 flex justify-end">
                                    <button onClick={() => setPickerOpen(false)} className="bg-slate-900 text-white px-8 py-2.5 rounded-2xl font-bold">Confirm Location</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div >
        </div >
    )
}
