import { MapContainer, TileLayer, Marker, Popup, ZoomControl, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Vehicle, LocationPing } from '../types';
import { useState, useEffect } from 'react';
import { Maximize2, Minimize2, Layers, Map as MapIcon, Truck, Navigation, Activity, ChevronRight } from 'lucide-react';
import { useMap } from 'react-leaflet';



interface FleetTrackingMapProps {
    vehicles: {
        vehicle: Vehicle;
        position: LocationPing;
        lastUpdate: string;
        status: string;
        isSimulated?: boolean;
    }[];
    height?: string;
}

export default function FleetTrackingMap({ vehicles, height = '500px' }: FleetTrackingMapProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [mapType, setMapType] = useState<'light' | 'dark' | 'satellite'>('light');
    const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India center
    const [mapZoom, setMapZoom] = useState(5);

    // Custom Marker Creator with status colors
    const createMarkerIcon = (status: string, isSimulated: boolean) => {
        let color = '#3b82f6'; // Blue for IN_USE
        if (status === 'AVAILABLE') color = '#10b981'; // Green
        if (status === 'MAINTENANCE') color = '#f59e0b'; // Amber

        const svg = `
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="white" fill-opacity="0.9" stroke="${color}" stroke-width="2"/>
                <circle cx="20" cy="20" r="14" fill="${color}" fill-opacity="0.2"/>
                <path d="M12 18L14 18M12 22L14 22M26 18L28 18M26 22L28 22M15 15H25C26.1046 15 27 15.8954 27 17V24C27 25.1046 26.1046 26 25 26H15C13.8954 26 13 25.1046 13 24V17C13 15.8954 13.8954 15 15 15Z" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
                ${!isSimulated ? `<circle cx="32" cy="8" r="4" fill="#ef4444" class="animate-pulse">
                    <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
                </circle>` : ''}
            </svg>
        `;

        return L.divIcon({
            html: svg,
            className: 'custom-truck-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });
    };

    // Calculate center based on vehicles if available
    useEffect(() => {
        if (vehicles && vehicles.length > 0) {
            const avgLat = vehicles.reduce((sum, v) => sum + v.position.lat, 0) / vehicles.length;
            const avgLng = vehicles.reduce((sum, v) => sum + v.position.lng, 0) / vehicles.length;
            setMapCenter([avgLat, avgLng]);
        }
    }, [vehicles]);

    const tileUrls = {
        light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    };

    const fitToVehicles = () => {
        if (vehicles.length === 0) return;
        const lats = vehicles.map(v => v.position.lat);
        const lngs = vehicles.map(v => v.position.lng);
        const southWest = L.latLng(Math.min(...lats), Math.min(...lngs));
        const northEast = L.latLng(Math.max(...lats), Math.max(...lngs));
        const bounds = L.latLngBounds(southWest, northEast);
        bounds.pad(0.2);

        setMapCenter([
            (Math.min(...lats) + Math.max(...lats)) / 2,
            (Math.min(...lngs) + Math.max(...lngs)) / 2
        ]);

        const latDiff = Math.max(...lats) - Math.min(...lats);
        const lngDiff = Math.max(...lngs) - Math.min(...lngs);
        const maxDiff = Math.max(latDiff, lngDiff);
        const calculatedZoom = Math.max(3, Math.min(12, Math.round(8 - Math.log2(maxDiff))));
        setMapZoom(calculatedZoom);
    };

    function MapUpdater() {
        const map = useMap();
        useEffect(() => {
            if (vehicles.length > 1) {
                const lats = vehicles.map(v => v.position.lat);
                const lngs = vehicles.map(v => v.position.lng);
                const southWest = L.latLng(Math.min(...lats), Math.min(...lngs));
                const northEast = L.latLng(Math.max(...lats), Math.max(...lngs));
                const bounds = L.latLngBounds(southWest, northEast);
                bounds.pad(0.1);
                map.fitBounds(bounds, { animate: true });
            } else if (vehicles.length === 1) {
                map.setView([vehicles[0].position.lat, vehicles[0].position.lng], 10, { animate: true });
            }
        }, [vehicles, map]);
        return null;
    }

    return (
        <div
            className={`glass-card overflow-hidden p-0 relative transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-[2000] h-[calc(100vh-2rem)]' : ''}`}
            style={isExpanded ? {} : { height }}
        >
            {isExpanded && <div className="absolute inset-0 z-[-1] bg-slate-900/50 backdrop-blur-sm" />}

            <div className="absolute top-4 left-4 z-[1000] pointer-events-none flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-sm dark:bg-slate-900/90 p-2 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-xs font-medium pointer-events-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-slate-900 dark:text-white font-bold">{vehicles.length} Fleet Assets Active</span>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-xs dark:bg-slate-900/70 p-1.5 rounded-lg border border-slate-200/40 dark:border-white/5 flex gap-3 pointer-events-auto">
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">In Transit</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">Vacant</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                        <span className="text-slate-600 dark:text-slate-400">Service</span>
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all"
                >
                    {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </button>
                <button
                    onClick={() => {
                        const types: ('light' | 'dark' | 'satellite')[] = ['light', 'dark', 'satellite'];
                        setMapType(types[(types.indexOf(mapType) + 1) % types.length]);
                    }}
                    className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all"
                >
                    {mapType === 'light' && <MapIcon className="h-5 w-5" />}
                    {mapType === 'dark' && <span className="text-[10px] font-black">DRK</span>}
                    {mapType === 'satellite' && <Layers className="h-5 w-5" />}
                </button>
                <button
                    onClick={fitToVehicles}
                    className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all"
                >
                    <Navigation className="h-5 w-5" />
                </button>
            </div>

            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={isExpanded}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url={tileUrls[mapType]}
                />
                <ZoomControl position="bottomright" />
                <ScaleControl imperial={false} />
                <MapUpdater />

                {vehicles.map((v) => (
                    <Marker
                        key={v.vehicle._id}
                        position={[v.position.lat, v.position.lng]}
                        icon={createMarkerIcon(v.status, !!v.isSimulated)}
                    >
                        <Popup className="premium-popup">
                            <div className="w-64 overflow-hidden rounded-xl border-0 shadow-none">
                                <div className={`p-3 text-white flex justify-between items-center ${v.status === 'AVAILABLE' ? 'bg-emerald-600' :
                                    v.status === 'MAINTENANCE' ? 'bg-amber-600' : 'bg-blue-600'
                                    }`}>
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4" />
                                        <span className="font-bold uppercase tracking-tight">{v.vehicle.plateNumber}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black uppercase opacity-80">{v.status}</span>
                                        {v.isSimulated ? (
                                            <span className="text-[9px] bg-white/20 px-1 rounded">SIMULATED</span>
                                        ) : (
                                            <span className="text-[9px] bg-red-500/80 px-1 rounded animate-pulse">LIVE TRACK</span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-900 border-x border-b border-slate-200/60 dark:border-white/10 rounded-b-xl">
                                    <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100 dark:border-white/5 mb-3">
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Model</div>
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{v.vehicle.model || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] text-slate-400 uppercase font-bold">Capacity</div>
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{v.vehicle.capacityKg} kg</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <Activity className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-[10px] text-slate-500">Last sync: {new Date(v.lastUpdate).toLocaleTimeString()}</span>
                                        </div>
                                        <button className="text-[10px] font-bold text-blue-500 hover:text-blue-600 flex items-center gap-0.5">
                                            DETAILS <ChevronRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
