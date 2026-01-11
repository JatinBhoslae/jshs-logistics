import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import EnhancedTrackingMap from '../../components/EnhancedTrackingMap';
import FleetTrackingMap from '../../components/FleetTrackingMap';
import 'leaflet/dist/leaflet.css';
import { api } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';
import type { Shipment, LocationPing } from '../../types';

type VehiclePosition = {
  _id: string;
  position: LocationPing;
  lastUpdate: string;
  status: string;
  vehicle: {
    _id: string;
    plateNumber: string;
    model?: string;
    status: string;
  };
};

type TrackingData = {
  shipment: Shipment;
  currentLocation: LocationPing | null;
  locationHistory: LocationPing[];
  progressPercentage: number;
  estimatedArrival: string | null;
  vehicle: any;
};

type FleetPosition = {
  vehicles: VehiclePosition[];
};

export default function EnhancedTrackingDashboard() {
  const { socket } = useAuth();
  const [selectedShipment, setSelectedShipment] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<Record<string, { lat: number; lng: number; ts?: string }>>({});
  const [activeTab, setActiveTab] = useState<'shipments' | 'fleet'>('shipments');

  // Fetch all shipments
  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const res = await api.get('/shipments');
      return res.data.shipments as Shipment[];
    },
  });

  // Fetch fleet positions
  const fleetQuery = useQuery({
    queryKey: ['fleetPositions'],
    queryFn: async () => {
      const res = await api.get('/shipments/fleet/positions');
      return res.data as FleetPosition;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch detailed tracking for selected shipment
  const trackingQuery = useQuery({
    queryKey: ['shipmentTracking', selectedShipment],
    queryFn: async () => {
      if (!selectedShipment) return null;
      const res = await api.get(`/shipments/${selectedShipment}/tracking`);
      return res.data as TrackingData;
    },
    enabled: !!selectedShipment,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Handle live location updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: { shipmentId: string; lat: number; lng: number; ts?: string }) => {
      setLiveUpdates(prev => ({
        ...prev,
        [data.shipmentId]: { lat: data.lat, lng: data.lng, ts: data.ts }
      }));
    };

    socket.on('shipment:locationUpdate', handleLocationUpdate);

    return () => {
      socket.off('shipment:locationUpdate', handleLocationUpdate);
    };
  }, [socket]);

  // Auto-select first shipment if none selected
  useEffect(() => {
    if (shipmentsQuery.data && !selectedShipment) {
      const inTransitShipment = shipmentsQuery.data.find(s => s.status === 'IN_TRANSIT' || s.status === 'DISPATCHED');
      if (inTransitShipment) {
        setSelectedShipment(inTransitShipment._id);
      } else if (shipmentsQuery.data.length > 0) {
        setSelectedShipment(shipmentsQuery.data[0]._id);
      }
    }
  }, [shipmentsQuery.data, selectedShipment]);



  // Filter active shipments
  const activeShipments = shipmentsQuery.data!.filter(s =>
    ['CREATED', 'ASSIGNED', 'PICKED_UP', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY'].includes(s.status)
  )

  // Calculate statistics
  const stats = {
    totalShipments: shipmentsQuery.data!.length,
    inTransit: activeShipments.length,
    deliveredToday: shipmentsQuery.data!.filter(s =>
      s.status === 'DELIVERED' &&
      new Date(s.updatedAt).toDateString() === new Date().toDateString()
    ).length,
    onTimeRate: shipmentsQuery.data!
      ? Math.round(
        (shipmentsQuery.data!.filter(s =>
          s.predictedEta && new Date(s.predictedEta) >= new Date(s.eta || 0)
        ).length / shipmentsQuery.data!.length) * 100
      ) || 0
      : 0
  };

  if (shipmentsQuery.isError || fleetQuery.isError) return (
    <div className="p-12 text-center bg-red-50 rounded-3xl border border-red-200">
      <h2 className="text-xl font-bold text-red-900">Tracking System Error</h2>
      <p className="text-red-700 mt-2">Could not establish connection to tracking services.</p>
      <button onClick={() => { shipmentsQuery.refetch(); fleetQuery.refetch(); }} className="btn-primary mt-6">Restart Sync</button>
    </div>
  )

  if (shipmentsQuery.isLoading || fleetQuery.isLoading) return <div className="p-12 text-center text-slate-400">Initializing GPS Network...</div>

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Total Shipments</div>
          <div className="text-2xl font-semibold">{stats.totalShipments}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">In Transit</div>
          <div className="text-2xl font-semibold">{stats.inTransit}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">Delivered Today</div>
          <div className="text-2xl font-semibold">{stats.deliveredToday}</div>
        </div>
        <div className="glass-card">
          <div className="text-sm text-slate-600 dark:text-white/60">On-time Rate</div>
          <div className="text-2xl font-semibold">{stats.onTimeRate}%</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/10">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'shipments'
            ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-cyan-400 dark:border-cyan-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white/90'
            }`}
          onClick={() => setActiveTab('shipments')}
        >
          Shipment Tracking
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'fleet'
            ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-cyan-400 dark:border-cyan-400'
            : 'text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white/90'
            }`}
          onClick={() => setActiveTab('fleet')}
        >
          Fleet Overview
        </button>
      </div>

      {activeTab === 'shipments' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Shipment List */}
          <div className="lg:col-span-1">
            <div className="glass-card">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-medium">Active Shipments</h2>
                <span className="text-xs px-2 py-1 bg-slate-200/60 dark:bg-white/10 rounded-full">
                  {activeShipments.length} in transit
                </span>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {activeShipments.map(shipment => {
                  const liveLocation = liveUpdates[shipment._id];
                  const isSelected = selectedShipment === shipment._id;

                  return (
                    <div
                      key={shipment._id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 dark:border-cyan-400 dark:bg-slate-800/50'
                        : 'border-slate-200/60 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-800/30'
                        }`}
                      onClick={() => setSelectedShipment(shipment._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{shipment.referenceId}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${shipment.status === 'IN_TRANSIT'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          }`}>
                          {shipment.status}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-slate-600 dark:text-white/60">
                        <div>{shipment.origin.name} → {shipment.destination.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span>Progress: {shipment.progressPercentage || 0}%</span>
                          {liveLocation && (
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                              Live
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {shipmentsQuery.isLoading && (
                  <div className="p-3 text-center text-sm text-slate-500 dark:text-white/60">Loading...</div>
                )}

                {!shipmentsQuery.isLoading && activeShipments.length === 0 && (
                  <div className="p-3 text-center text-sm text-slate-500 dark:text-white/60">
                    No active shipments
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map and Details */}
          <div className="lg:col-span-2 space-y-4">
            {selectedShipment && trackingQuery.data ? (
              <>
                <div className="overflow-hidden rounded-2xl ring-1 ring-slate-900/10 bg-white/70 backdrop-blur-xl dark:ring-white/10 dark:bg-white/5">
                  <div className="border-b border-slate-200/60 p-3 text-sm font-medium dark:border-white/10">
                    Real-time Tracking: {trackingQuery.data.shipment.referenceId}
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/30">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-xs text-slate-500 dark:text-white/60">Progress</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden dark:bg-slate-700">
                            <div
                              className="h-full bg-indigo-600 transition-all duration-500 dark:bg-cyan-500"
                              style={{ width: `${trackingQuery.data.progressPercentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{trackingQuery.data.progressPercentage}%</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <div className="text-xs text-slate-500 dark:text-white/60">Estimated Arrival</div>
                        <div className="text-sm font-medium">
                          {trackingQuery.data.estimatedArrival
                            ? new Date(trackingQuery.data.estimatedArrival).toLocaleString()
                            : 'Calculating...'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-[200px]">
                        <div className="text-xs text-slate-500 dark:text-white/60">Distance Remaining</div>
                        <div className="text-sm font-medium">
                          {trackingQuery.data.shipment.distanceRemainingKm !== undefined
                            ? `${trackingQuery.data.shipment.distanceRemainingKm.toFixed(1)} km`
                            : 'Calculating...'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ height: 500 }}>
                    <EnhancedTrackingMap
                      shipment={trackingQuery.data.shipment}
                      locations={trackingQuery.data.locationHistory}
                      liveLocation={liveUpdates[selectedShipment] as any || trackingQuery.data.currentLocation}
                    />
                  </div>

                  <div className="p-3 text-xs text-slate-500 dark:text-white/60">
                    Real-time updates via Socket.IO • Status: {trackingQuery.data.shipment.status}
                  </div>
                </div>

                {trackingQuery.data.vehicle && (
                  <div className="glass-card">
                    <h3 className="font-medium mb-3">Vehicle Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/60">Plate Number</div>
                        <div className="font-medium">{trackingQuery.data.vehicle.plateNumber}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/60">Model</div>
                        <div className="font-medium">{trackingQuery.data.vehicle.model || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/60">Status</div>
                        <div className="font-medium">{trackingQuery.data.vehicle.status}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/60">Last Updated</div>
                        <div className="font-medium">
                          {trackingQuery.data.currentLocation?.ts
                            ? new Date(trackingQuery.data.currentLocation.ts).toLocaleString()
                            : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-medium text-slate-700 dark:text-white/80">Select a shipment to track</div>
                  <div className="text-sm text-slate-500 dark:text-white/60 mt-1">
                    Choose a shipment from the list to view real-time tracking data
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card">
            <h2 className="font-medium mb-3">Fleet Positions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {fleetQuery.data!.vehicles.map((vehiclePos) => (
                <div
                  key={vehiclePos.vehicle._id}
                  className="p-4 rounded-xl border border-slate-200/60 dark:border-white/10"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{vehiclePos.vehicle.plateNumber}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${vehiclePos.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : vehiclePos.status === 'STATIONARY'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300'
                      }`}>
                      {vehiclePos.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-white/60">Model:</span>
                      <span>{vehiclePos.vehicle.model || 'N/A'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-white/60">Last Update:</span>
                      <span>{vehiclePos.lastUpdate ? new Date(vehiclePos.lastUpdate).toLocaleTimeString() : 'Never'}</span>
                    </div>

                    {vehiclePos.position.speedKmph !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-white/60">Speed:</span>
                        <span>{vehiclePos.position.speedKmph} km/h</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-white/60">Location:</span>
                      <span>
                        {vehiclePos.position.lat.toFixed(4)}, {vehiclePos.position.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {!fleetQuery.isLoading && fleetQuery.data!.vehicles.length === 0 && (
                <div className="col-span-full p-4 text-center text-sm text-slate-500 dark:text-white/60">
                  No vehicles with GPS data available
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-900/10 bg-white/70 backdrop-blur-xl dark:ring-white/10 dark:bg-white/5">
            <div className="border-b border-slate-200/60 p-3 text-sm font-medium dark:border-white/10">
              Fleet Map View
            </div>

            <div style={{ height: 600 }}>
              <FleetTrackingMap
                vehicles={fleetQuery.data!.vehicles.map(v => ({
                  _id: v.vehicle._id,
                  type: 'TRUCK', // Default type if not available
                  plateNumber: v.vehicle.plateNumber,
                  status: v.vehicle.status === 'ACTIVE' ? 'IN_USE' : v.vehicle.status === 'STATIONARY' ? 'IDLE' : 'MAINTENANCE',
                  location: v.position as any
                })) as any[]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
