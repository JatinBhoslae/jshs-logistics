import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, GeoJSON, ZoomControl, ScaleControl, AttributionControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Navigation2, Target, Layers, Map as MapIcon } from 'lucide-react';
import type { Shipment, LocationPing } from '../types';


// Custom icons for Map
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const truckIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18]
});

interface EnhancedTrackingMapProps {
  shipment: Shipment;
  locations: LocationPing[];
  liveLocation?: { lat: number; lng: number } | null;
}

function MapUpdater({ center, zoom, bounds }: { center?: [number, number], zoom?: number, bounds?: L.LatLngBoundsExpression }) {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;

    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
      setHasInitialized(true);
    } else if (center) {
      map.setView(center, zoom || 13, { animate: true });
      setHasInitialized(true);
    }
  }, [center, zoom, bounds, map, hasInitialized]);

  return null;
}

export default function EnhancedTrackingMap({ shipment, locations, liveLocation }: EnhancedTrackingMapProps) {
  const [followMode, setFollowMode] = useState(true);
  const [mapType, setMapType] = useState<'light' | 'dark' | 'satellite'>('light');
  const [isExpanded, setIsExpanded] = useState(false);

  const origin: [number, number] = [shipment.origin.lat, shipment.origin.lng];
  const destination: [number, number] = [shipment.destination.lat, shipment.destination.lng];

  const historyCoords: [number, number][] = locations.map(l => [l.lat, l.lng]);
  const currentCoords: [number, number] | null = liveLocation
    ? [liveLocation.lat, liveLocation.lng]
    : (locations.length > 0 ? [locations[locations.length - 1].lat, locations[locations.length - 1].lng] : null);

  const tileUrls = {
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  const bounds = L.latLngBounds([origin, destination]);
  if (currentCoords) bounds.extend(currentCoords);
  historyCoords.forEach(c => bounds.extend(c));

  // Function to fit bounds to show all relevant points
  const fitToBounds = () => {
    const mapBounds = L.latLngBounds([origin, destination]);
    if (currentCoords) mapBounds.extend(currentCoords);
    historyCoords.forEach(c => mapBounds.extend(c));

    // Add padding to the bounds
    mapBounds.pad(0.1);

    // This will be handled by the MapUpdater component
    return mapBounds;
  };

  return (
    <div className={`glass-card overflow-hidden p-0 relative border-none shadow-2xl rounded-3xl group transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-[2000] h-[calc(100vh-2rem)]' : 'h-[500px]'}`}>

      {/* Expanded Backdrop for Blur Effect if needed */}
      {isExpanded && <div className="absolute inset-0 z-[-1] bg-slate-900/50 backdrop-blur-sm" />}

      {/* Overlays */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md dark:bg-slate-900/90 p-3 rounded-2xl shadow-xl border border-slate-200/60 dark:border-white/10 text-xs font-black uppercase tracking-widest pointer-events-auto">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
            <span>Origin: {shipment.origin.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-rose-600 dark:text-rose-400">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
            <span>Dest: {shipment.destination.name}</span>
          </div>
          {currentCoords && (
            <div className="flex items-center gap-2 mt-2 text-emerald-600 dark:text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span>Live Tracking Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        {/* Toggle Expanded View */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 hover:scale-105 transition-all"
          title={isExpanded ? "Exit Fullscreen" : "Fullscreen Map"}
        >
          {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        {/* Follow Mode */}
        <button
          onClick={() => setFollowMode(!followMode)}
          className={`p-2.5 rounded-xl shadow-lg border transition-all ${followMode ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-white/10'}`}
          title="Toggle Auto-Follow"
        >
          <Target className="h-5 w-5" />
        </button>

        {/* Map Type Toggle */}
        <button
          onClick={() => {
            const types: ('light' | 'dark' | 'satellite')[] = ['light', 'dark', 'satellite'];
            setMapType(types[(types.indexOf(mapType) + 1) % types.length]);
          }}
          className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 hover:scale-105 transition-all text-xs font-bold uppercase"
          title="Change Map Style"
        >
          {mapType === 'light' && <MapIcon className="h-5 w-5" />}
          {mapType === 'dark' && <span className="text-[10px]">DARK</span>}
          {mapType === 'satellite' && <Layers className="h-5 w-5" />}
        </button>

        {/* Fit to Route Button */}
        <button
          onClick={() => {
            fitToBounds();
            // This will be handled by the MapUpdater component
          }}
          className="p-2.5 bg-white/90 dark:bg-slate-900/90 rounded-xl shadow-lg border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-blue-500 hover:scale-105 transition-all"
          title="Fit to Route"
        >
          <Navigation2 className="h-5 w-5" />
        </button>
      </div>

      <MapContainer
        center={currentCoords || origin}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrls[mapType]}
        />

        {/* User Friendly Zoom Controls at Bottom Right */}
        <ZoomControl position="bottomright" />
        <ScaleControl imperial={true} />
        <AttributionControl position="bottomleft" prefix="" />

        {followMode && currentCoords ? (
          <MapUpdater center={currentCoords} zoom={15} />
        ) : !liveLocation && (
          <MapUpdater bounds={bounds} />
        )}

        <Marker position={origin} icon={originIcon}>
          <Popup className="custom-popup">
            <div className="p-1 font-bold">Origin: {shipment.origin.name}</div>
          </Popup>
        </Marker>

        <Marker position={destination} icon={destinationIcon}>
          <Popup className="custom-popup">
            <div className="p-1 font-bold">Destination: {shipment.destination.name}</div>
          </Popup>
        </Marker>

        {historyCoords.length > 0 && (
          <Polyline
            positions={historyCoords}
            color="#10b981" // Emerald
            weight={4}
            opacity={0.8}
            lineCap="round"
          />
        )}

        {currentCoords && (
          <Marker position={currentCoords} icon={truckIcon}>
            <Popup className="custom-popup">
              <div className="p-2">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Navigation2 className="h-3 w-3 text-blue-500" /> Current Position
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentCoords[0].toFixed(5)}, {currentCoords[1].toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {shipment.routeGeoJson ? (
          <>
            <GeoJSON key={`route-${shipment._id}`} data={shipment.routeGeoJson} style={{ color: '#3b82f6', weight: 6, opacity: 0.4, lineCap: 'round' }} />
            <Polyline positions={[origin, destination]} color="#64748b" weight={2} opacity={0.2} dashArray="5, 10" />
          </>
        ) : (
          <Polyline
            positions={[origin, destination]}
            color="#3b82f6"
            weight={2}
            dashArray="10, 10"
            opacity={0.2}
          />
        )}
      </MapContainer>
    </div>
  );
}