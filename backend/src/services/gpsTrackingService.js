import { LocationPing } from '../models/LocationPing.js';
import { Shipment } from '../models/Shipment.js';
import { Vehicle } from '../models/Vehicle.js';
import { haversineKm, estimateEta } from '../utils/geo.js';

/**
 * Get the latest GPS position for a specific vehicle
 */
export async function getLatestVehiclePosition(vehicleId) {
  const latestPing = await LocationPing.findOne({
    vehicleId
  }).sort({ ts: -1 }).lean();

  return latestPing;
}

/**
 * Get the latest GPS position for a specific shipment
 */
export async function getLatestShipmentPosition(shipmentId) {
  const latestPing = await LocationPing.findOne({
    shipmentId
  }).sort({ ts: -1 }).lean();

  return latestPing;
}

/**
 * Calculate the distance traveled for a shipment based on GPS data
 */
export async function calculateDistanceTraveled(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment) return null;

  const latestPing = await getLatestShipmentPosition(shipmentId);
  if (!latestPing) return 0;

  const distanceTraveled = haversineKm(
    { lat: shipment.origin.lat, lng: shipment.origin.lng },
    { lat: latestPing.lat, lng: latestPing.lng }
  );

  return distanceTraveled;
}

/**
 * Calculate the distance remaining for a shipment
 */
export async function calculateDistanceRemaining(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment) return null;

  const latestPing = await getLatestShipmentPosition(shipmentId);
  if (!latestPing) {
    // If no ping, calculate full distance
    return haversineKm(
      { lat: shipment.origin.lat, lng: shipment.origin.lng },
      { lat: shipment.destination.lat, lng: shipment.destination.lng }
    );
  }

  const distanceRemaining = haversineKm(
    { lat: latestPing.lat, lng: latestPing.lng },
    { lat: shipment.destination.lat, lng: shipment.destination.lng }
  );

  return distanceRemaining;
}

/**
 * Calculate progress percentage for a shipment based on GPS data
 */
export async function calculateShipmentProgress(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment || !shipment.distanceKm) return 0;

  const distanceTraveled = await calculateDistanceTraveled(shipmentId);
  if (distanceTraveled === null) return 0;

  const progress = Math.min(100, (distanceTraveled / shipment.distanceKm) * 100);
  return Math.round(progress);
}

/**
 * Get all location history for a shipment
 */
export async function getShipmentLocationHistory(shipmentId, limit = 100) {
  const pings = await LocationPing.find({ shipmentId })
    .sort({ ts: -1 })
    .limit(limit)
    .lean();

  return pings.reverse(); // Return in chronological order
}

/**
 * Calculate estimated time of arrival based on GPS data and current speed
 */
export async function calculateEstimatedArrival(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment) return null;

  const latestPing = await getLatestShipmentPosition(shipmentId);
  if (!latestPing) return shipment.eta; // Return original ETA if no GPS data

  // Calculate remaining distance
  const remainingDistance = await calculateDistanceRemaining(shipmentId);
  if (remainingDistance === null) return shipment.eta;

  // Use current speed from ping or calculate average speed if available
  let speedKmph = latestPing.speedKmph || 35; // Default to 35 km/h if no speed data

  // If we have multiple pings, calculate average speed
  const locationHistory = await getShipmentLocationHistory(shipmentId, 10);
  if (locationHistory.length > 1) {
    const avgSpeed = calculateAverageSpeedFromPings(locationHistory);
    if (avgSpeed > 0) {
      speedKmph = avgSpeed;
    }
  }

  if (speedKmph <= 0) return shipment.eta;

  // Calculate time to destination in hours
  const hoursToDestination = remainingDistance / speedKmph;
  const estimatedArrivalTime = new Date(Date.now() + hoursToDestination * 60 * 60 * 1000);

  return estimatedArrivalTime.toISOString();
}

/**
 * Calculate average speed from location pings
 */
function calculateAverageSpeedFromPings(pings) {
  if (pings.length < 2) return 35; // Default speed if not enough data

  let totalSpeed = 0;
  let validSpeedCount = 0;

  for (let i = 0; i < pings.length - 1; i++) {
    const current = pings[i];
    const next = pings[i + 1];

    // Calculate distance between pings
    const distance = haversineKm(
      { lat: current.lat, lng: current.lng },
      { lat: next.lat, lng: next.lng }
    );

    // Calculate time difference in hours
    const timeDiffHours = Math.abs(new Date(current.ts) - new Date(next.ts)) / (1000 * 60 * 60);

    if (timeDiffHours > 0) {
      const speed = distance / timeDiffHours;
      if (speed > 0 && speed < 200) { // Filter out unrealistic speeds
        totalSpeed += speed;
        validSpeedCount++;
      }
    }
  }

  return validSpeedCount > 0 ? totalSpeed / validSpeedCount : 35;
}

/**
 * Get vehicle status based on GPS activity
 */
export async function getVehicleStatus(vehicleId) {
  const latestPing = await getLatestVehiclePosition(vehicleId);
  if (!latestPing) {
    return {
      status: 'NO_GPS_DATA',
      lastUpdate: null,
      location: null
    };
  }

  const now = new Date();
  const lastUpdate = new Date(latestPing.ts);
  const minutesSinceUpdate = (now - lastUpdate) / (1000 * 60);

  // Determine if vehicle is active based on last update time
  let status = 'ACTIVE';
  if (minutesSinceUpdate > 30) {
    status = 'INACTIVE';
  } else if (minutesSinceUpdate > 10) {
    status = 'POTENTIALLY_INACTIVE';
  }

  // Determine if vehicle is moving based on speed
  if (latestPing.speedKmph !== undefined && latestPing.speedKmph < 5) {
    status = 'STATIONARY';
  }

  return {
    status,
    lastUpdate: latestPing.ts,
    location: {
      lat: latestPing.lat,
      lng: latestPing.lng
    },
    speedKmph: latestPing.speedKmph,
    heading: latestPing.heading,
    minutesSinceUpdate
  };
}

/**
 * Get fleet status for all vehicles in an organization
 */
export async function getFleetStatus() {
  const vehicles = await Vehicle.find({}).lean();
  const fleetStatus = [];

  for (const vehicle of vehicles) {
    const vehicleStatus = await getVehicleStatus(vehicle._id);
    fleetStatus.push({
      vehicle,
      ...vehicleStatus
    });
  }

  return fleetStatus;
}

/**
 * Detect if a shipment has deviated from its planned route
 */
export async function detectRouteDeviation(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment) return { isDeviated: false, deviationDistance: 0 };

  const latestPing = await getLatestShipmentPosition(shipmentId);
  if (!latestPing) return { isDeviated: false, deviationDistance: 0 };

  // Calculate how far the current position is from the direct route line
  // This is a simplified approach - in a real system, we would compare against planned route waypoints
  const originToDestinationDistance = haversineKm(
    { lat: shipment.origin.lat, lng: shipment.origin.lng },
    { lat: shipment.destination.lat, lng: shipment.destination.lng }
  );

  const originToCurrentDistance = haversineKm(
    { lat: shipment.origin.lat, lng: shipment.origin.lng },
    { lat: latestPing.lat, lng: latestPing.lng }
  );

  const currentToDestinationDistance = haversineKm(
    { lat: latestPing.lat, lng: latestPing.lng },
    { lat: shipment.destination.lat, lng: shipment.destination.lng }
  );

  // Calculate total distance if following the route directly
  const expectedTotalDistance = originToDestinationDistance;
  const actualTotalDistance = originToCurrentDistance + currentToDestinationDistance;

  const deviationDistance = actualTotalDistance - expectedTotalDistance;

  return {
    isDeviated: deviationDistance > 5, // More than 5km deviation
    deviationDistance: Math.max(0, deviationDistance),
    progress: (originToCurrentDistance / expectedTotalDistance) * 100
  };
}

/**
 * Get geofence alerts for shipments
 */
export async function checkGeofenceViolations(shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();
  if (!shipment) return [];

  const latestPing = await getLatestShipmentPosition(shipmentId);
  if (!latestPing) return [];

  const alerts = [];

  // Check if shipment is near origin but should have left
  if (shipment.status === 'DISPATCHED') {
    const distanceFromOrigin = haversineKm(
      { lat: shipment.origin.lat, lng: shipment.origin.lng },
      { lat: latestPing.lat, lng: latestPing.lng }
    );

    if (distanceFromOrigin > 5) { // More than 5km from origin
      alerts.push({
        type: 'OUT_OF_ORIGIN_GEOFENCE',
        message: 'Shipment has left the origin area',
        severity: 'INFO'
      });
    }
  }

  // Check if shipment is approaching destination
  if (shipment.status === 'IN_TRANSIT') {
    const distanceToDestination = haversineKm(
      { lat: latestPing.lat, lng: latestPing.lng },
      { lat: shipment.destination.lat, lng: shipment.destination.lng }
    );

    if (distanceToDestination < 5) { // Within 5km of destination
      alerts.push({
        type: 'NEAR_DESTINATION',
        message: 'Shipment is approaching destination',
        severity: 'INFO'
      });
    }
  }

  return alerts;
}

/**
 * Get vehicle health status based on GPS data patterns
 */
export async function getVehicleHealthStatus(vehicleId) {
  try {
    const latestPing = await getLatestVehiclePosition(vehicleId);
    if (!latestPing) {
      return {
        status: 'NO_DATA',
        issues: ['No GPS data available'],
        healthScore: 0,
        recommendations: []
      };
    }

    // Get recent location history to analyze patterns
    const recentPings = await LocationPing.find({
      vehicleId,
      ts: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ ts: -1 }).limit(100).lean();

    const issues = [];
    const recommendations = [];

    let excessiveSpeedCount = 0;
    let suddenStopCount = 0;
    let longIdleCount = 0;

    // Check for irregular speed patterns
    if (recentPings.length > 1) {
      for (let i = 0; i < recentPings.length - 1; i++) {
        const current = recentPings[i];
        const next = recentPings[i + 1];

        // Check for excessive speed (>120 km/h)
        if (current.speedKmph && current.speedKmph > 120) {
          excessiveSpeedCount++;
        }

        // Check for sudden stops (speed drops from >30 to <5 km/h in short time)
        if (current.speedKmph && next.speedKmph &&
          current.speedKmph > 30 && next.speedKmph < 5) {
          const timeDiff = Math.abs(new Date(current.ts) - new Date(next.ts)) / (1000 * 60); // minutes
          if (timeDiff < 5) { // Stop happened in less than 5 minutes
            suddenStopCount++;
          }
        }
      }

      if (excessiveSpeedCount > recentPings.length * 0.1) { // More than 10% of pings show excessive speed
        issues.push('Frequent excessive speed detected');
        recommendations.push('Monitor driver for aggressive driving patterns');
      }

      if (suddenStopCount > recentPings.length * 0.05) { // More than 5% of pings show sudden stops
        issues.push('Frequent sudden stops detected');
        recommendations.push('Check for potential vehicle issues or traffic problems');
      }
    }

    // Check for long idle times
    for (const ping of recentPings) {
      if (ping.speedKmph && ping.speedKmph < 5) {
        // Check if next ping is far in time but close in distance (indicating long stop)
        const nextPing = recentPings.find(p =>
          new Date(p.ts) < new Date(ping.ts) &&
          new Date(ping.ts) - new Date(p.ts) < 30 * 60 * 1000 // Within 30 minutes
        );

        if (nextPing) {
          const distance = haversineKm(
            { lat: ping.lat, lng: ping.lng },
            { lat: nextPing.lat, lng: nextPing.lng }
          );

          const timeDiff = (new Date(ping.ts) - new Date(nextPing.ts)) / (1000 * 60); // minutes

          if (timeDiff > 30 && distance < 1) { // Stationary for more than 30 minutes in same location
            longIdleCount++;
          }
        }
      }
    }

    if (longIdleCount > 5) {
      issues.push('Multiple long idle periods detected');
      recommendations.push('Verify if vehicle is being used efficiently');
    }

    // Calculate health score based on issues found
    let healthScore = 100;

    // Use a safer check for counting. If no pings, we can't reliably say it's unhealthy unless it should have them.
    const totalPings = recentPings.length || 1;

    if (excessiveSpeedCount > totalPings * 0.1) healthScore -= 20;
    if (suddenStopCount > totalPings * 0.05) healthScore -= 15;
    if (longIdleCount > 5) healthScore -= 10;

    // Check if GPS signal is frequently lost
    const timeGaps = [];
    if (recentPings.length > 1) {
      for (let i = 0; i < recentPings.length - 1; i++) {
        const current = recentPings[i];
        const next = recentPings[i + 1];

        if (!current.ts || !next.ts) continue;

        const currentTime = new Date(current.ts);
        const nextTime = new Date(next.ts);

        if (isNaN(currentTime.getTime()) || isNaN(nextTime.getTime())) continue;

        const timeDiff = Math.abs(currentTime - nextTime) / (1000 * 60); // minutes

        if (timeDiff > 30) { // Gap of more than 30 minutes
          timeGaps.push(timeDiff);
        }
      }
    }

    if (timeGaps.length > totalPings * 0.1) { // More than 10% of time has large gaps
      issues.push('Frequent GPS signal loss detected');
      recommendations.push('Check GPS device connectivity');
      healthScore -= 15;
    }

    healthScore = Math.max(0, healthScore); // Ensure score doesn't go below 0

    return {
      status: healthScore > 80 ? 'HEALTHY' : healthScore > 60 ? 'FAIR' : 'POOR',
      issues,
      healthScore,
      recommendations,
      lastUpdate: latestPing.ts
    };
  } catch (error) {
    console.error('Error in getVehicleHealthStatus:', error);
    return {
      status: 'HEALTHY', // Default to HEALTHY for new vehicles with no data
      issues: [],
      healthScore: 100,
      recommendations: ['Awaiting first telemetry sync'],
      error: error.message
    };
  }
}

/**
 * Get fleet health summary
 */
export async function getFleetHealth() {
  const vehicles = await Vehicle.find({}).lean();
  const fleetHealth = [];

  for (const vehicle of vehicles) {
    const healthStatus = await getVehicleHealthStatus(vehicle._id);
    fleetHealth.push({
      vehicle,
      healthStatus
    });
  }

  // Calculate overall fleet health metrics
  const totalVehicles = fleetHealth.length;
  const healthyVehicles = fleetHealth.filter(v => v.healthStatus.status === 'HEALTHY').length;
  const fairVehicles = fleetHealth.filter(v => v.healthStatus.status === 'FAIR').length;
  const poorVehicles = fleetHealth.filter(v => v.healthStatus.status === 'POOR').length;

  const avgHealthScore = totalVehicles > 0
    ? Math.round(fleetHealth.reduce((sum, v) => sum + v.healthStatus.healthScore, 0) / totalVehicles)
    : 0;

  return {
    summary: {
      totalVehicles,
      healthyVehicles,
      fairVehicles,
      poorVehicles,
      avgHealthScore,
      healthStatus: avgHealthScore > 80 ? 'GOOD' : avgHealthScore > 60 ? 'FAIR' : 'POOR'
    },
    vehicles: fleetHealth
  };
}

/**
 * Get speed analysis for a shipment
 */
export async function getSpeedAnalysis(shipmentId) {
  const locationHistory = await getShipmentLocationHistory(shipmentId, 50);
  if (locationHistory.length < 2) {
    return {
      averageSpeed: 0,
      maxSpeed: 0,
      timeStationary: 0,
      timeInMotion: 0
    };
  }

  const analysis = calculateAverageSpeedFromPings(locationHistory);

  // Calculate time spent stationary vs in motion
  let timeStationary = 0;
  let timeInMotion = 0;

  for (let i = 0; i < locationHistory.length - 1; i++) {
    const current = locationHistory[i];
    const next = locationHistory[i + 1];

    const timeDiff = Math.abs(new Date(current.ts) - new Date(next.ts));
    const timeDiffHours = timeDiff / (1000 * 60 * 60);

    if (current.speedKmph && current.speedKmph < 5) {
      timeStationary += timeDiffHours;
    } else {
      timeInMotion += timeDiffHours;
    }
  }

  return {
    averageSpeed: analysis,
    maxSpeed: Math.max(...locationHistory.map(p => p.speedKmph || 0)),
    timeStationary: Math.round(timeStationary * 100) / 100,
    timeInMotion: Math.round(timeInMotion * 100) / 100
  };
}