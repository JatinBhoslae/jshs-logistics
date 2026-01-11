import { Shipment } from '../models/Shipment.js';
import { LocationPing } from '../models/LocationPing.js';
import { DriverEvent } from '../models/DriverEvent.js';
import { haversineKm, estimateEta } from '../utils/geo.js';
import { getSpeedAnalysis } from './gpsTrackingService.js';
import { createPredictiveNotifications } from './notificationService.js';

/**
 * Predict delivery time based on current location, speed, and historical data
 */
export async function predictDeliveryTime(shipmentId) {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    throw new Error('Shipment not found');
  }

  // Get recent location pings to calculate average speed and direction
  const recentPings = await LocationPing.find({
    shipmentId: shipment._id
  }).sort({ ts: -1 }).limit(10);

  if (!recentPings || recentPings.length === 0) {
    // If no pings, return original predicted ETA
    return shipment.predictedEta;
  }

  // Calculate average speed from recent pings
  const avgSpeed = calculateAverageSpeed(recentPings);

  // Get the most recent ping
  const lastPing = recentPings[0];

  // Calculate remaining distance
  const remainingDistance = haversineKm(
    { lat: lastPing.lat, lng: lastPing.lng },
    shipment.destination
  );

  // Predict delivery time based on current position, remaining distance, and average speed
  const predictedDelivery = estimateEta({
    from: { lat: lastPing.lat, lng: lastPing.lng },
    to: shipment.destination,
    speedKmph: avgSpeed,
    now: lastPing.ts
  });

  // Adjust prediction based on historical data and driver behavior
  const adjustedPrediction = await adjustPredictionForFactors(
    shipment,
    predictedDelivery,
    avgSpeed
  );

  return adjustedPrediction;
}

/**
 * Enhanced prediction using real-time GPS data and speed analysis
 */
export async function predictDeliveryTimeWithGPS(shipmentId) {
  const shipment = await Shipment.findById(shipmentId);

  if (!shipment) {
    throw new Error('Shipment not found');
  }

  // Get the latest location ping for this shipment
  const latestPing = await LocationPing.findOne({ shipmentId: shipment._id }).sort({ ts: -1 }).lean();

  if (!latestPing) {
    // If no location data, return original ETA if available
    return {
      predictedDelivery: shipment.eta || null,
      confidence: 'LOW',
      reason: 'No GPS data available',
      confidencePercentage: 30
    };
  }

  // Get speed analysis for this shipment
  const speedAnalysis = await getSpeedAnalysis(shipmentId);

  // Calculate remaining distance to destination
  const remainingDistance = haversineKm(
    { lat: latestPing.lat, lng: latestPing.lng },
    { lat: shipment.destination.lat, lng: shipment.destination.lng }
  );

  // Use current speed from ping if available, otherwise use average from analysis
  let currentSpeed = latestPing.speedKmph || speedAnalysis.averageSpeed;

  // Adjust for traffic and road conditions based on speed patterns
  if (currentSpeed > speedAnalysis.averageSpeed * 1.2) {
    // If current speed is significantly higher than average, likely highway conditions
    currentSpeed = speedAnalysis.averageSpeed * 1.1; // Reduce slightly for safety
  } else if (currentSpeed < speedAnalysis.averageSpeed * 0.7) {
    // If current speed is significantly lower, likely traffic conditions
    currentSpeed = speedAnalysis.averageSpeed * 0.8; // Adjust for traffic
  }

  // Ensure we have a reasonable minimum speed
  currentSpeed = Math.max(currentSpeed, 10); // Minimum 10 km/h

  // Calculate predicted delivery time based on remaining distance and current speed
  const hoursRemaining = remainingDistance / currentSpeed;
  const predictedDelivery = new Date(latestPing.ts.getTime() + hoursRemaining * 60 * 60 * 1000);

  // Calculate confidence level based on data availability
  let confidencePercentage = 70; // Base confidence

  if (speedAnalysis.timeInMotion > 0) {
    confidencePercentage += 10; // More confidence with movement data
  }

  if (latestPing.speedKmph !== undefined) {
    confidencePercentage += 15; // Additional confidence with real-time speed
  }

  // Cap confidence at 95%
  confidencePercentage = Math.min(confidencePercentage, 95);

  let confidenceLevel = 'MEDIUM';
  if (confidencePercentage >= 85) confidenceLevel = 'HIGH';
  else if (confidencePercentage < 60) confidenceLevel = 'LOW';

  // Adjust prediction based on historical data and driver behavior
  const adjustedPrediction = await adjustPredictionForFactors(
    shipment,
    predictedDelivery,
    currentSpeed
  );

  return {
    predictedDelivery: adjustedPrediction,
    confidence: confidenceLevel,
    reason: 'Calculated from real-time GPS data',
    confidencePercentage,
    currentSpeed,
    remainingDistance,
    timeRemainingHours: hoursRemaining,
    latestPingTime: latestPing.ts
  };
}

/**
 * Calculate average speed from location pings
 */
function calculateAverageSpeed(pings) {
  if (pings.length < 2) {
    return 35; // Default speed if not enough data
  }

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
    const timeDiffHours = (current.ts - next.ts) / (1000 * 60 * 60);

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
 * Adjust prediction based on various factors
 */
async function adjustPredictionForFactors(shipment, predictedDelivery, avgSpeed) {
  let adjustmentMinutes = 0;

  // Adjust based on driver behavior
  if (shipment.assignedDriverId) {
    const driverEvents = await DriverEvent.find({
      driverId: shipment.assignedDriverId,
      ts: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    // More speeding events might mean faster delivery but higher risk
    const speedingEvents = driverEvents.filter(e => e.type === 'SPEEDING');
    if (speedingEvents.length > 5) {
      adjustmentMinutes -= 15; // Potentially faster due to speeding
    } else if (speedingEvents.length === 0) {
      adjustmentMinutes += 10; // More cautious driver
    }

    // Harsh turns might indicate aggressive driving
    const harshTurnEvents = driverEvents.filter(e => e.type === 'HARSH_TURN');
    if (harshTurnEvents.length > 3) {
      adjustmentMinutes += 5; // May cause delays due to traffic stops
    }
  }

  // Adjust based on vehicle condition if available
  if (shipment.assignedVehicleId) {
    // In a real system, we would check vehicle maintenance records
    // For now, we'll use a placeholder
    adjustmentMinutes += 5; // General buffer for vehicle-related delays
  }

  // Adjust based on traffic patterns (simulated)
  adjustmentMinutes += getTrafficAdjustment();

  // Adjust based on weather conditions (simulated)
  adjustmentMinutes += getWeatherAdjustment();

  // Apply adjustment
  return new Date(predictedDelivery.getTime() + adjustmentMinutes * 60 * 1000);
}

/**
 * Get traffic-related adjustment (simulated)
 */
function getTrafficAdjustment() {
  // Simulate traffic adjustment based on time of day
  const hour = new Date().getHours();

  if (hour >= 8 && hour <= 10 || hour >= 17 && hour <= 19) {
    return 20; // Rush hour - add 20 minutes
  } else if (hour >= 12 && hour <= 14) {
    return 10; // Lunch hour - add 10 minutes
  }

  return 0; // No significant traffic adjustment
}

/**
 * Get weather-related adjustment (simulated)
 */
function getWeatherAdjustment() {
  // In a real system, this would connect to a weather API
  // For demo, return a random adjustment
  const conditions = ['clear', 'light_rain', 'heavy_rain', 'fog', 'storm'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

  switch (randomCondition) {
    case 'clear':
      return 0;
    case 'light_rain':
      return 10;
    case 'heavy_rain':
      return 25;
    case 'fog':
      return 20;
    case 'storm':
      return 45;
    default:
      return 5;
  }
}

/**
 * Predict delay risk for a shipment
 */
export async function predictDelayRisk(shipmentId) {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    throw new Error('Shipment not found');
  }

  let riskScore = 0;

  // Check if shipment is already delayed
  if (shipment.predictedEta && new Date(shipment.predictedEta) > new Date()) {
    riskScore += 30;
  }

  // Check driver behavior
  if (shipment.assignedDriverId) {
    const recentEvents = await DriverEvent.find({
      driverId: shipment.assignedDriverId,
      ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    const speedingEvents = recentEvents.filter(e => e.type === 'SPEEDING').length;
    const harshTurnEvents = recentEvents.filter(e => e.type === 'HARSH_TURN').length;

    riskScore += (speedingEvents * 2) + (harshTurnEvents * 3);
  }

  // Check distance remaining vs time remaining
  if (shipment.distanceRemainingKm && shipment.predictedEta) {
    const timeRemainingHours = (new Date(shipment.predictedEta) - new Date()) / (1000 * 60 * 60);
    if (timeRemainingHours > 0) {
      const requiredSpeed = shipment.distanceRemainingKm / timeRemainingHours;
      if (requiredSpeed > 80) { // If required speed is unrealistic
        riskScore += 40;
      } else if (requiredSpeed > 60) {
        riskScore += 20;
      }
    } else {
      riskScore += 50; // Already past predicted time
    }
  }

  // Risk categories
  if (riskScore >= 70) return { level: 'high', message: 'High risk of delay' };
  if (riskScore >= 40) return { level: 'medium', message: 'Medium risk of delay' };
  return { level: 'low', message: 'Low risk of delay' };
}

/**
 * Get predictive insights for all shipments
 */
export async function getPredictiveInsights() {
  const shipments = await Shipment.find({
    status: { $in: ['IN_TRANSIT', 'DISPATCHED'] }
  });

  const insights = {
    totalShipments: shipments.length,
    highRiskDelays: 0,
    mediumRiskDelays: 0,
    lowRiskDelays: 0,
    avgDeliveryAccuracy: 0,
    demandForecast: [],
    fuelSavings: {},
    shipments: []
  };

  let accuratePredictions = 0;

  for (const shipment of shipments) {
    const delayRisk = await predictDelayRisk(shipment._id);
    const predictedDelivery = await predictDeliveryTime(shipment._id);

    // Categorize risk
    if (delayRisk.level === 'high') insights.highRiskDelays++;
    else if (delayRisk.level === 'medium') insights.mediumRiskDelays++;
    else insights.lowRiskDelays++;

    // Check if prediction was accurate (for historical analysis)
    if (shipment.eta && predictedDelivery) {
      const predictionAccuracy = Math.abs(
        new Date(shipment.eta).getTime() - new Date(predictedDelivery).getTime()
      );

      // If prediction was within 2 hours of actual, consider accurate
      if (predictionAccuracy <= 2 * 60 * 60 * 1000) {
        accuratePredictions++;
      }
    }

    insights.shipments.push({
      shipmentId: shipment._id,
      referenceId: shipment.referenceId,
      delayRisk,
      predictedDelivery,
      progressPercentage: shipment.progressPercentage || 0
    });

    // Trigger predictive notifications (fire and forget)
    createPredictiveNotifications(shipment).catch(err => console.error('Failed to create predictive notifications:', err));
  }

  insights.avgDeliveryAccuracy = Math.round((accuratePredictions / shipments.length) * 100);

  // Add Demand Forecast (Mock)
  insights.demandForecast = [
    { day: 'Mon', shipments: 45 },
    { day: 'Tue', shipments: 52 },
    { day: 'Wed', shipments: 48 },
    { day: 'Thu', shipments: 60 },
    { day: 'Fri', shipments: 55 },
    { day: 'Sat', shipments: 40 },
    { day: 'Sun', shipments: 35 }
  ];

  // Add Fuel Savings Prediction (Mock)
  insights.fuelSavings = {
    monthlyProjected: 12500, // INR
    optimizationScore: 85, // 0-100
    suggestion: 'Route optimization saved 120km this week'
  };

  return insights;
}