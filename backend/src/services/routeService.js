import { env } from '../config/env.js'
import { estimateEta } from '../utils/geo.js'

export async function getDrivingRoute({ origin, destination, waypoints = [] }) {
  // Always use OSRM (Open Source Routing Machine)
  // Use public demo server if not configured, but warn about usage policies in prod
  const routingUrl = env.ROUTING_URL?.replace(/\/$/, '') || 'https://router.project-osrm.org'

  // Validate inputs
  if (!origin || !destination || typeof origin.lat !== 'number' || typeof origin.lng !== 'number' || typeof destination.lat !== 'number' || typeof destination.lng !== 'number') {
    throw new Error('Invalid origin or destination coordinates');
  }

  // OSRM expects [lng, lat] order
  let coords = `${origin.lng},${origin.lat}`;

  // Add waypoints if any
  if (waypoints && waypoints.length > 0) {
    for (const wp of waypoints) {
      if (wp && typeof wp.lat === 'number' && typeof wp.lng === 'number') {
        coords += `;${wp.lng},${wp.lat}`;
      }
    }
  }

  coords += `;${destination.lng},${destination.lat}`;

  const url = `${routingUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
    })

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Routing service rate limit exceeded')
      }
      const err = new Error(`Routing failed (${res.status})`)
      err.statusCode = 502
      throw err
    }

    const data = await res.json()
    const route = data?.routes?.[0]
    const geom = route?.geometry

    if (!route || !geom || geom.type !== 'LineString' || !Array.isArray(geom.coordinates)) {
      const err = new Error('Invalid routing response')
      err.statusCode = 502
      throw err
    }

    return {
      provider: 'osrm',
      distanceKm: typeof route.distance === 'number' ? route.distance / 1000 : null,
      durationMin: typeof route.duration === 'number' ? route.duration / 60 : null,
      geojson: geom, // { type: 'LineString', coordinates: [ [lng,lat], ... ] }
    }
  } catch (error) {
    console.warn('OSRM Routing failed, falling back to straight line:', error.message)
    // Fallback to straight line (Haversine) if OSRM fails
    // This ensures the app doesn't crash if the demo server is down
    const dist = calculateHaversineDistance(origin, destination)

    // Create a simple LineString between origin and destination
    return {
      provider: 'fallback',
      distanceKm: dist,
      durationMin: (dist / 40) * 60, // Assume 40km/h average speed
      geojson: {
        type: 'LineString',
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat]
        ]
      }
    }
  }
}

// Function to calculate optimized route with multiple stops
export async function getOptimizedRoute({ stops }) {
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error('At least 2 stops required for optimization')
  }

  // Simple optimization by distance (Nearest Neighbor)
  // OSRM also has a /trip endpoint (TSP) but we'll stick to simple logic for now

  const optimizedStops = [stops[0]] // Start with the first stop
  const remainingStops = stops.slice(1)

  let currentStop = stops[0]

  while (remainingStops.length > 0) {
    let closestStop = null
    let closestDistance = Infinity
    let closestIndex = -1

    for (let i = 0; i < remainingStops.length; i++) {
      const stop = remainingStops[i]
      const distance = calculateHaversineDistance(currentStop, stop)

      if (distance < closestDistance) {
        closestDistance = distance
        closestStop = stop
        closestIndex = i
      }
    }

    if (closestStop) {
      optimizedStops.push(closestStop)
      remainingStops.splice(closestIndex, 1)
      currentStop = closestStop
    }
  }

  return optimizedStops
}

// Function to get real-time optimized route for a shipment
export async function getRealTimeOptimizedRoute({ shipmentId, currentLocation }) {
  const { Shipment } = await import('../models/Shipment.js')

  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    throw new Error('Shipment not found')
  }

  // Calculate the optimized route from current location to destination
  const route = await getDrivingRoute({
    origin: currentLocation || shipment.currentLocation || shipment.origin,
    destination: shipment.destination
  })

  return route
}

// Function to get real-time traffic-adjusted ETA
export async function getRealTimeEta({ shipmentId, currentLocation, speedKmph }) {
  const { Shipment } = await import('../models/Shipment.js')

  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    throw new Error('Shipment not found')
  }

  // Get the real-time optimized route
  const route = await getRealTimeOptimizedRoute({
    shipmentId,
    currentLocation: currentLocation || shipment.currentLocation || shipment.origin
  })

  // Calculate ETA based on current speed and route duration
  const now = new Date()

  if (speedKmph && speedKmph > 0) {
    // If we have current speed, use it to calculate more accurate ETA
    const distanceRemaining = route.distanceKm
    const timeHours = distanceRemaining / speedKmph
    const timeMs = timeHours * 60 * 60 * 1000

    return new Date(now.getTime() + timeMs)
  } else if (route.durationMin) {
    // If we have route duration, use it
    const timeMs = route.durationMin * 60 * 1000

    return new Date(now.getTime() + timeMs)
  } else {
    // Fallback to simple estimate
    return estimateEta({
      from: currentLocation || shipment.currentLocation || shipment.origin,
      to: shipment.destination,
      speedKmph: 40, // Default average speed
      now
    })
  }
}

// Helper function to calculate distance between two points
function calculateHaversineDistance(point1, point2) {
  const R = 6371 // Earth's radius in km
  const dLat = deg2rad(point2.lat - point1.lat)
  const dLon = deg2rad(point2.lng - point1.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) * Math.cos(deg2rad(point2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}
