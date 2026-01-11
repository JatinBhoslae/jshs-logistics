import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import EnhancedTrackingMap from '../../components/EnhancedTrackingMap';
import LiveShipmentTracker from '../../components/LiveShipmentTracker';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type { Shipment, Vehicle, LocationPing } from '../../types';

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type definitions
type DriverPerformance = {
  driverId: string;
  name: string;
  email: string;
  score: number;
  speedingCount: number;
  harshTurnCount: number;
  idlingCount: number;
  lastEventAt: string | null;
};

export default function TrackingDashboard() {
  const { user, socket } = useAuth();
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<Record<string, { lat: number; lng: number; ts?: string }>>({});

  // Fetch all shipments
  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await api.get('/shipments');
      return res.data.shipments as Shipment[];
    },
  });

  // Fetch all vehicles
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/fleet/vehicles');
      return res.data.vehicles as Vehicle[];
    },
    enabled: user?.role === 'MANAGER',
  });

  // Fetch driver performance
  const performanceQuery = useQuery({
    queryKey: ['driverPerformance'],
    queryFn: async () => {
      const res = await api.get('/analytics/driver-performance');
      return res.data.performance as DriverPerformance[];
    },
    enabled: user?.role === 'MANAGER',
  });

  // Fetch predictive insights
  const predictiveInsightsQuery = useQuery({
    queryKey: ['predictiveInsights'],
    queryFn: async () => {
      const res = await api.get('/analytics/predictive-insights');
      return res.data.insights;
    },
    enabled: user?.role === 'MANAGER',
    refetchInterval: 30000, // Refetch every 30 seconds
  });



  // Set up socket listeners for live updates
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (msg: { shipmentId?: string; lat: number; lng: number; ts?: string }) => {
      if (msg?.shipmentId) {
        setLiveUpdates(prev => ({
          ...prev,
          [msg.shipmentId as string]: { lat: msg.lat, lng: msg.lng, ts: msg.ts }
        }));
      }
    };

    socket.on('shipment:locationUpdate', handleLocationUpdate);

    return () => {
      socket.off('shipment:locationUpdate', handleLocationUpdate);
    };
  }, [socket]);

  // Get selected shipment details
  const selectedShipmentData = shipmentsQuery.data?.find(s => s._id === selectedShipment) || null;

  // Get location history for selected shipment
  const locationHistoryQuery = useQuery({
    queryKey: ['shipmentLocations', selectedShipment],
    queryFn: async () => {
      if (!selectedShipment) return [];
      const res = await api.get(`/shipments/${selectedShipment}/locations`);
      return res.data.locations as LocationPing[];
    },
    enabled: !!selectedShipment,
  });

  // Filter shipments by status for quick access
  const activeShipments = shipmentsQuery.data!.filter(s =>
    s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED'
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Real-time Shipment Tracking</h1>
        <p className="text-sm text-slate-600 dark:text-white/70">Track shipments from origin to destination with live updates and predictive analytics.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Active Shipments</div>
          <div className="text-2xl font-semibold">{activeShipments.length}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Vehicles in Transit</div>
          <div className="text-2xl font-semibold">
            {vehiclesQuery.data!.filter(v => v.status === 'IN_USE').length}
          </div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">On-time Rate</div>
          <div className="text-2xl font-semibold">87%</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Avg. Driver Score</div>
          <div className="text-2xl font-semibold">82</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main map view */}
        <div className="lg:col-span-2">
          <div className="glass-card h-[600px]">
            <div className="mb-2 text-sm font-medium">Live Shipment Tracking</div>
            <EnhancedTrackingMap
              shipment={selectedShipmentData || { origin: { lat: 20.5937, lng: 78.9629, name: 'India Center' }, destination: { lat: 20.5937, lng: 78.9629, name: 'India Center' }, routeGeoJson: null } as any}
              locations={locationHistoryQuery.data || []}
              liveLocation={selectedShipmentData ? liveUpdates[selectedShipmentData._id] : undefined}
            />
          </div>
        </div>

        {/* Sidebar with shipment list and details */}
        <div className="space-y-4">
          {/* Shipment selector */}
          <div className="glass-card">
            <div className="mb-2 text-sm font-medium">Active Shipments</div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {shipmentsQuery.isLoading ? (
                <div>Loading shipments...</div>
              ) : shipmentsQuery.isError ? (
                <div className="text-red-600">Failed to load shipments.</div>
              ) : (
                activeShipments.map(shipment => (
                  <div
                    key={shipment._id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedShipment === shipment._id
                      ? 'bg-indigo-100 dark:bg-indigo-900/50'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    onClick={() => setSelectedShipment(shipment._id)}
                  >
                    <div className="font-medium">{shipment.referenceId}</div>
                    <div className="text-xs text-slate-600 dark:text-white/70">
                      {shipment.status} • {shipment.origin.name} → {shipment.destination.name}
                    </div>
                    {shipment.predictedEta && (
                      <div className="text-xs mt-1">
                        Predicted: {new Date(shipment.predictedEta).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shipment details - Replaced with LiveShipmentTracker for unified experience */}
          {selectedShipmentData && (
            <div className="fixed inset-0 z-[2000] bg-slate-900/50 backdrop-blur-sm flex justify-end">
              <div onClick={() => setSelectedShipment(null)} className="absolute inset-0" /> {/* Click backdrop to close */}

              <div className="relative w-full sm:w-[500px] h-full bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
                <LiveShipmentTracker
                  shipment={selectedShipmentData}
                  locations={locationHistoryQuery.data || []}
                  liveLocation={liveUpdates[selectedShipmentData._id]}
                  events={[]} // TrackingDashboard might need to fetch events if we want full timeline, for now passing empty or fetching
                  onClose={() => setSelectedShipment(null)}
                  isDialog={false} // We are handling the dialog container here
                />
              </div>
            </div>
          )}

          {/* Driver performance */}
          {user?.role === 'MANAGER' && (
            <div className="glass-card">
              <div className="mb-2 text-sm font-medium">Driver Performance</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {performanceQuery.isLoading ? (
                  <div>Loading performance...</div>
                ) : performanceQuery.isError ? (
                  <div className="text-red-600">Failed to load performance.</div>
                ) : (
                  (performanceQuery.data!).slice(0, 5).map(driver => (
                    <div key={driver.driverId} className="p-2 border-b border-slate-200/60 dark:border-white/10">
                      <div className="flex justify-between">
                        <div className="font-medium">{driver.name}</div>
                        <div className={`px-2 py-1 rounded-full text-xs ${driver.score >= 80 ? 'bg-green-500/10 text-green-700 dark:text-green-200' :
                          driver.score >= 60 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200' :
                            'bg-red-500/10 text-red-700 dark:text-red-200'
                          }`}>
                          {driver.score}
                        </div>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-white/60">
                        Speeding: {driver.speedingCount}, Harsh Turns: {driver.harshTurnCount}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional analytics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Route optimization suggestions */}
        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Route Optimization</div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Optimized route available</span>
              <span className="text-green-600 dark:text-green-400">+12% efficiency</span>
            </div>
            <div className="flex justify-between">
              <span>Traffic delay warnings</span>
              <span className="text-amber-600 dark:text-amber-400">2 alerts</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel saving opportunities</span>
              <span className="text-green-600 dark:text-green-400">15% savings</span>
            </div>
          </div>
        </div>

        {/* Predictive analytics */}
        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Predictive Analytics</div>
          <div className="text-sm space-y-2">
            {predictiveInsightsQuery.data ? (
              <>
                <div className="flex justify-between">
                  <span>Delivery accuracy</span>
                  <span className="text-green-600 dark:text-green-400">{predictiveInsightsQuery.data.avgDeliveryAccuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>On-time rate</span>
                  <span className="text-green-600 dark:text-green-400">{predictiveInsightsQuery.data.onTimeRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Predicted delays</span>
                  <span className="text-amber-600 dark:text-amber-400">{predictiveInsightsQuery.data.highRiskDelays} high risk</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. driver score</span>
                  <span className="text-slate-600 dark:text-white/70">{predictiveInsightsQuery.data.avgDriverScore}</span>
                </div>
              </>
            ) : (
              <div>Loading predictive analytics...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
