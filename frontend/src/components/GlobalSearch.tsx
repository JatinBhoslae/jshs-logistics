import { useState, useEffect, useRef } from 'react'
import { Search, Package, User, Truck, MapPin, Loader2, X, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useDebounce } from '../hooks/useDebounce'

interface SearchResult {
    id: string
    type: 'shipment' | 'driver' | 'customer' | 'vehicle' | 'document'
    title: string
    subtitle: string
    status?: string
    link: string
}

export function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const debouncedQuery = useDebounce(query, 300)
    const navigate = useNavigate()
    const searchRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcut Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setIsOpen(true)
            }
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (debouncedQuery.length < 2) {
            setResults([])
            setIsLoading(false)
            return
        }

        const fetchResults = async () => {
            setIsLoading(true)
            try {
                const res = await api.get(`/search?q=${debouncedQuery}`)
                setResults(res.data.results)
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchResults()
    }, [debouncedQuery])

    const handleSelect = (link: string) => {
        navigate(link)
        setIsOpen(false)
        setQuery('')
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'shipment': return <Package className="h-4 w-4" />
            case 'driver': return <User className="h-4 w-4" />
            case 'customer': return <User className="h-4 w-4 text-indigo-400" />
            case 'vehicle': return <Truck className="h-4 w-4" />
            case 'document': return <FileText className="h-4 w-4 text-purple-600" />
            default: return <MapPin className="h-4 w-4" />
        }
    }

    return (
        <div className="relative w-full" ref={searchRef}>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search ecosystem..."
                    className="block w-full rounded-2xl border-0 py-2 pl-10 pr-12 text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-slate-50/50 hover:bg-slate-50 transition-all dark:bg-slate-800/50 dark:ring-slate-700 dark:text-white dark:placeholder:text-slate-500 shadow-sm"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    {query ? (
                        <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                    ) : (
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-black text-slate-400 dark:bg-slate-900 dark:border-white/10 uppercase">
                            <span className="text-[8px]">Ctrl</span> K
                        </kbd>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {isOpen && (query.length >= 2 || results.length > 0) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden"
                    >
                        <div className="max-h-[min(400px,70vh)] overflow-y-auto p-2 scrollbar-thin">
                            {isLoading && results.length === 0 && (
                                <div className="p-8 text-center">
                                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Scanning ecosystem...</p>
                                </div>
                            )}

                            {!isLoading && results.length === 0 && query.length >= 2 && (
                                <div className="p-8 text-center">
                                    <Search className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matches found</p>
                                </div>
                            )}

                            {results.map((result) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result.link)}
                                    className="w-full flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all group text-left"
                                >
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/10 transition-colors ${result.type === 'shipment' ? 'bg-blue-50 text-blue-600' :
                                        result.type === 'driver' ? 'bg-emerald-50 text-emerald-600' :
                                            result.type === 'vehicle' ? 'bg-amber-50 text-amber-600' :
                                                result.type === 'document' ? 'bg-purple-50 text-purple-600' : 'bg-slate-50 text-slate-600'
                                        }`}>
                                        {getIcon(result.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">{result.title}</span>
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">
                                                {result.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-medium truncate">{result.subtitle}</p>
                                    </div>
                                    {result.status && (
                                        <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${result.status === 'DELIVERED' || result.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {result.status}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Search Intelligence Active</span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[9px] font-black text-slate-400">ESC to Close</kbd>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
