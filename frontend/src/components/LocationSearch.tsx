import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, X, Crosshair } from 'lucide-react'
import { api } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'
import { AnimatePresence, motion } from 'framer-motion'

interface LocationSearchProps {
    value: any
    onChange: (loc: any) => void
    placeholder?: string
    className?: string
}

export default function LocationSearch({ value, onChange, placeholder, className }: LocationSearchProps) {
    const [query, setQuery] = useState(value?.name || '')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const debouncedQuery = useDebounce(query, 400)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (value?.name) setQuery(value.name)
    }, [value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!debouncedQuery.trim() || (value && debouncedQuery === value.name)) {
            setSuggestions([])
            return
        }

        async function fetchSuggestions() {
            setIsLoading(true)
            try {
                const res = await api.get('/locations/autocomplete', { params: { input: debouncedQuery } })
                setSuggestions(res.data.predictions || [])
                setShowSuggestions(true)
            } catch (err) {
                console.error('Autocomplete error', err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchSuggestions()
    }, [debouncedQuery, value])

    const handleSelect = async (suggestion: any) => {
        try {
            const res = await api.get('/locations/details', { params: { placeId: suggestion.place_id } })
            const { location, name, address } = res.data
            const fullAddress = address || name
            const newLoc = { name: fullAddress, lat: location.lat, lng: location.lng }
            setQuery(fullAddress)
            onChange(newLoc)
            setShowSuggestions(false)
        } catch (err) {
            console.error('Details error', err)
        }
    }

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser')
            return
        }

        setIsLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude: lat, longitude: lng } = position.coords
                    const res = await api.get('/locations/reverse', { params: { lat, lng } })
                    const { name, address, location } = res.data
                    const fullAddress = address || name
                    const newLoc = { name: fullAddress, lat: location.lat, lng: location.lng }
                    setQuery(fullAddress)
                    onChange(newLoc)
                } catch (err) {
                    console.error('Reverse geocoding error', err)
                    alert('Failed to get current location address')
                } finally {
                    setIsLoading(false)
                }
            },
            (error) => {
                console.error('Geolocation error', error)
                setIsLoading(false)
                alert('Allow location access to use this feature')
            }
        )
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative group">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder || 'Search location...'}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-10 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                    </div>
                )}
                {query && !isLoading && (
                    <button
                        onClick={() => { setQuery(''); onChange(null); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                        title="Clear"
                    >
                        <X className="h-3 w-3 text-slate-400" />
                    </button>
                )}
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all disabled:opacity-50"
                    title="Use Current Location"
                >
                    <Crosshair className={`h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
                </button>
            </div>

            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden max-h-60 overflow-y-auto"
                    >
                        {suggestions.map((s) => (
                            <button
                                key={s.place_id}
                                onClick={() => handleSelect(s)}
                                className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-50 dark:border-white/5 last:border-0 transition-colors"
                            >
                                <p className="font-bold text-slate-900 dark:text-white line-clamp-1">{s.structured_formatting.main_text}</p>
                                <p className="text-xs text-slate-500 line-clamp-1">{s.structured_formatting.secondary_text}</p>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
