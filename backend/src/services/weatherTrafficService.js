/**
 * Service for weather and traffic impact predictions
 */

// Simulated weather service (in a real system, this would connect to a weather API)
export async function getWeatherImpact({ lat, lng, timeWindowHours = 24 }) {
  // In a real system, we would call a weather API like OpenWeatherMap
  // For demo purposes, we'll simulate weather conditions

  const weatherConditions = [
    { condition: 'clear', impact: 0, description: 'Clear skies, no impact on delivery' },
    { condition: 'light_rain', impact: 5, description: 'Light rain, minor impact on delivery time' },
    { condition: 'rain', impact: 15, description: 'Rain, moderate impact on delivery time' },
    { condition: 'heavy_rain', impact: 30, description: 'Heavy rain, significant impact on delivery time' },
    { condition: 'storm', impact: 45, description: 'Storm, major impact on delivery time' },
    { condition: 'fog', impact: 25, description: 'Fog, impacts visibility and delivery time' },
    { condition: 'snow', impact: 40, description: 'Snow, major impact on delivery time' }
  ];

  // Randomly select a weather condition based on location and time
  const randomIndex = Math.floor(Math.random() * weatherConditions.length);
  const selectedWeather = weatherConditions[randomIndex];

  return {
    condition: selectedWeather.condition,
    impact: selectedWeather.impact, // Additional minutes delay
    description: selectedWeather.description,
    timestamp: new Date(),
    location: { lat, lng }
  };
}

// Simulated traffic service (in a real system, this would connect to a traffic API)
export async function getTrafficImpact({ origin, destination, departureTime = new Date() }) {
  // In a real system, we would call a traffic API like Google Maps Distance Matrix
  // For demo purposes, we'll simulate traffic conditions

  const hour = departureTime.getHours();
  const dayOfWeek = departureTime.getDay(); // 0 = Sunday, 6 = Saturday

  // Simulate traffic based on time of day and day of week
  let baseImpact = 0;
  let description = '';

  // Weekend vs weekday traffic patterns
  if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
    // Rush hour patterns
    if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
      baseImpact = 30; // Heavy traffic during rush hours
      description = 'Heavy traffic expected during rush hour';
    } else if ((hour >= 12 && hour <= 14)) {
      baseImpact = 15; // Lunch hour traffic
      description = 'Moderate traffic during lunch hour';
    } else {
      baseImpact = 5; // Light traffic
      description = 'Light traffic expected';
    }
  } else { // Weekend
    baseImpact = 10; // Weekend traffic
    description = 'Moderate weekend traffic';
  }

  // Add random variation
  const randomVariation = Math.floor(Math.random() * 15) - 7; // -7 to +7 minutes
  const totalImpact = Math.max(0, baseImpact + randomVariation);

  return {
    impact: totalImpact, // Additional minutes delay
    description: description,
    timestamp: new Date(),
    route: { origin, destination }
  };
}

// Function to calculate combined weather and traffic impact
export async function getCombinedImpact({ origin, destination }) {
  // Get weather impact for destination
  const weatherImpact = await getWeatherImpact({
    lat: destination.lat,
    lng: destination.lng
  });

  // Get traffic impact for route
  const trafficImpact = await getTrafficImpact({
    origin,
    destination
  });

  // Calculate combined impact
  const combinedImpact = weatherImpact.impact + trafficImpact.impact;

  // Determine risk level
  let riskLevel = 'low';
  if (combinedImpact > 40) {
    riskLevel = 'high';
  } else if (combinedImpact > 20) {
    riskLevel = 'medium';
  }

  return {
    weather: weatherImpact,
    traffic: trafficImpact,
    combined: {
      impact: combinedImpact,
      riskLevel,
      description: `Combined impact: ${weatherImpact.description} and ${trafficImpact.description}`
    },
    timestamp: new Date()
  };
}

// Function to create weather and traffic alerts for shipments
export async function createWeatherTrafficAlerts(shipment) {
  try {
    const impact = await getCombinedImpact({
      origin: shipment.origin,
      destination: shipment.destination
    });

    // Only create alerts if impact is significant
    if (impact.combined.impact > 15) {
      const alertMessage = `Weather and traffic conditions may impact delivery of shipment ${shipment.referenceId}. Expected additional delay: ${impact.combined.impact} minutes.`;

      // Import notification service to create alerts
      const { createTrafficWeatherAlerts } = await import('./notificationService.js');

      await createTrafficWeatherAlerts(
        shipment,
        impact.combined.riskLevel === 'high' ? 'WEATHER_ALERT' : 'TRAFFIC_ALERT',
        alertMessage
      );
    }

    return impact;
  } catch (error) {
    console.error('Error creating weather/traffic alerts:', error);
    return null;
  }
}

// Function to periodically check and update weather/traffic impacts for active shipments
export async function updateActiveShipmentsImpacts() {
  try {
    // Import required models
    const { Shipment } = await import('../models/Shipment.js');

    // Get all active shipments (in transit or dispatched)
    const activeShipments = await Shipment.find({
      status: { $in: ['DISPATCHED', 'IN_TRANSIT'] }
    });

    const results = [];

    for (const shipment of activeShipments) {
      const impact = await getCombinedImpact({
        origin: shipment.origin,
        destination: shipment.destination
      });

      results.push({
        shipmentId: shipment._id,
        referenceId: shipment.referenceId,
        impact
      });

      // Update shipment with new impact data
      shipment.weatherTrafficImpact = impact;
      shipment.lastWeatherTrafficUpdate = new Date();
      await shipment.save();
    }

    return results;
  } catch (error) {
    console.error('Error updating active shipments impacts:', error);
    throw error;
  }
}

// Function to get historical weather/traffic impact for analytics
export async function getHistoricalImpact() {
  try {
    // Import required models
    const { Shipment } = await import('../models/Shipment.js');

    // Get completed shipments
    const completedShipments = await Shipment.find({
      status: 'DELIVERED',
      deliveredAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Calculate average impact
    let totalWeatherImpact = 0;
    let totalTrafficImpact = 0;
    let count = 0;

    for (const shipment of completedShipments) {
      if (shipment.weatherTrafficImpact) {
        totalWeatherImpact += shipment.weatherTrafficImpact.weather.impact || 0;
        totalTrafficImpact += shipment.weatherTrafficImpact.traffic.impact || 0;
        count++;
      }
    }

    const avgWeatherImpact = count > 0 ? totalWeatherImpact / count : 0;
    const avgTrafficImpact = count > 0 ? totalTrafficImpact / count : 0;

    return {
      period: 'last_30_days',
      count,
      avgWeatherImpact: Math.round(avgWeatherImpact * 100) / 100,
      avgTrafficImpact: Math.round(avgTrafficImpact * 100) / 100,
      totalAvgImpact: Math.round((avgWeatherImpact + avgTrafficImpact) * 100) / 100
    };
  } catch (error) {
    console.error('Error getting historical impact:', error);
    throw error;
  }
}