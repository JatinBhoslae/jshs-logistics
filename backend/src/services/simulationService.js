import { Shipment } from '../models/Shipment.js';
import { Vehicle } from '../models/Vehicle.js';
import { LocationPing } from '../models/LocationPing.js';
import { getIO } from '../sockets/io.js';
import { createNotification } from './notificationService.js';
import { User } from '../models/User.js';

let simulationInterval = null;

import { getDrivingRoute } from './routeService.js';



export function startSimulation() {
    if (simulationInterval) return { message: 'Simulation already running', running: true };

    console.log('[SIMULATION] Engine Started');

    simulationInterval = setInterval(async () => {
        try {
            const shipments = await Shipment.find({
                status: { $in: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP'] }
            });

            const io = getIO();

            if (shipments.length === 0) return;

            for (const s of shipments) {
                // Ensure Route Exists
                if (!s.routeGeoJson || !s.routeGeoJson.coordinates || s.routeGeoJson.coordinates.length < 2) {
                    try {
                        const route = await getDrivingRoute({ origin: s.origin, destination: s.destination });
                        if (route.geojson) {
                            s.routeProvider = route.provider;
                            s.routeGeoJson = route.geojson;
                            s.distanceKm = route.distanceKm || s.distanceKm;
                            s.currentRouteIndex = 0; // Start at beginning
                            await s.save();
                        }
                    } catch (err) {
                        console.error(`[SIMULATION] Route calc failed for ${s.referenceId}:`, err.message);
                        continue; // Skip this shipment this tick
                    }
                }

                if (!s.routeGeoJson || !s.routeGeoJson.coordinates) continue;

                const routePoints = s.routeGeoJson.coordinates; // [[lng, lat]]
                let idx = s.currentRouteIndex || 0;

                // Move forward by constant steps (e.g. 5 points per tick to be visible)
                // OSRM points are dense.
                const speedMultiplier = 3;
                let nextIdx = idx + speedMultiplier;

                if (nextIdx >= routePoints.length) {
                    nextIdx = routePoints.length - 1;
                    // Arrived? Maybe stop? allow looping or stay at end
                }

                const nextPoint = routePoints[nextIdx]; // [lng, lat]
                if (!nextPoint) continue;

                const newLat = nextPoint[1];
                const newLng = nextPoint[0];

                // Update location
                s.currentLocation = {
                    lat: newLat,
                    lng: newLng,
                    updatedAt: new Date()
                };
                s.currentRouteIndex = nextIdx;

                // Progress
                const progress = Math.min(100, Math.round((nextIdx / routePoints.length) * 100));
                s.progressPercentage = progress;

                await s.save();

                // Update Associated Vehicle with IoT Simulation
                if (s.assignedVehicleId) {
                    const vehicle = await Vehicle.findById(s.assignedVehicleId);
                    if (vehicle) {
                        // 1. Update Location
                        vehicle.currentLocation = { lat: newLat, lng: newLng, updatedAt: new Date() };
                        vehicle.odometerKm += 0.5; // Simulate distance increase

                        // 2. Simulate Fuel Consumption
                        // Consumes 0.05 to 0.15 liters per tick
                        const fuelConsumed = 0.05 + Math.random() * 0.1;
                        vehicle.currentFuelLiters = Math.max(0, vehicle.currentFuelLiters - fuelConsumed);

                        // 3. Simulate Chiller Temperature (if refrigerated)
                        if (vehicle.isRefrigerated) {
                            if (!vehicle.currentTemperatureC) vehicle.currentTemperatureC = -20;
                            // Small fluctuation
                            const change = (Math.random() - 0.5) * 0.5;
                            vehicle.currentTemperatureC += change;

                            // Threshold Alert (High Temp)
                            if (vehicle.currentTemperatureC > vehicle.temperatureThresholdMaxC) {
                                // Find manager to notify
                                const manager = await User.findOne({ role: 'MANAGER' });
                                if (manager) {
                                    await createNotification({
                                        userId: manager._id,
                                        type: 'IOT_ALERT_TEMP',
                                        severity: 'ERROR',
                                        message: `CRITICAL: Chiller temperature breach in vehicle ${vehicle.plateNumber}. Current: ${vehicle.currentTemperatureC.toFixed(1)}°C`,
                                        metadata: { vehicleId: vehicle._id, plateNumber: vehicle.plateNumber, temperature: vehicle.currentTemperatureC }
                                    });
                                }
                            }
                        }

                        // Low Fuel Alert
                        if (vehicle.currentFuelLiters < vehicle.fuelThresholdLowLiters) {
                            const manager = await User.findOne({ role: 'MANAGER' });
                            if (manager) {
                                await createNotification({
                                    userId: manager._id,
                                    type: 'IOT_ALERT_FUEL',
                                    severity: 'WARNING',
                                    message: `LOW FUEL: Vehicle ${vehicle.plateNumber} has only ${vehicle.currentFuelLiters.toFixed(1)}L remaining.`,
                                    metadata: { vehicleId: vehicle._id, plateNumber: vehicle.plateNumber, fuel: vehicle.currentFuelLiters }
                                });
                            }
                        }

                        await vehicle.save();

                        // Emit Fleet Update with IoT Data
                        if (io) {
                            io.emit('fleet:iotUpdate', {
                                vehicleId: vehicle._id,
                                plateNumber: vehicle.plateNumber,
                                fuel: vehicle.currentFuelLiters,
                                temp: vehicle.currentTemperatureC,
                                lat: newLat,
                                lng: newLng
                            });
                        }
                    }
                }

                // Emit Shipment Events
                if (io) {
                    io.to(`shipment:${s._id}`).emit('shipment:locationUpdate', {
                        shipmentId: s._id,
                        lat: newLat,
                        lng: newLng,
                        ts: new Date().toISOString()
                    });

                    if (s.assignedVehicleId) {
                        io.emit('fleet:locationUpdate', {
                            vehicleId: s.assignedVehicleId,
                            lat: newLat,
                            lng: newLng,
                            ts: new Date().toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            console.error('[SIMULATION] Step Error:', e);
        }
    }, 2000);

    return { message: 'Simulation started', running: true };
}

export function stopSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
        console.log('[SIMULATION] Engine Stopped');
    }
    return { message: 'Simulation stopped', running: false };
}

export function getSimulationStatus() {
    return { running: !!simulationInterval };
}
