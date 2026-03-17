import { env } from '../config/env.js'
import { Shipment } from '../models/Shipment.js'
import { LocationPing } from '../models/LocationPing.js'
import { Vehicle } from '../models/Vehicle.js'
import { haversineKm, estimateEta } from '../utils/geo.js'

const cache = new Map()

function keyForMatrix(points) {
  return JSON.stringify(points.map(p => [p.lat, p.lng]))
}

async function getDistanceMatrix(points) {
  const key = keyForMatrix(points)
  if (cache.has(key)) return cache.get(key)
  const n = points.length
  const matrix = Array.from({ length: n }, () => Array(n).fill(0))
  const apiKey = env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) matrix[i][j] = 0
        else matrix[i][j] = haversineKm(points[i], points[j])
      }
    }
    cache.set(key, matrix)
    return matrix
  }
  try {
    const origins = points.map(p => `${p.lat},${p.lng}`).join('|')
    const destinations = origins
    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json'
    const res = await fetch(`${url}?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&key=${apiKey}`)
    const data = await res.json()
    if (data.status !== 'OK') {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) matrix[i][j] = 0
          else matrix[i][j] = haversineKm(points[i], points[j])
        }
      }
      cache.set(key, matrix)
      return matrix
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const el = data.rows[i]?.elements?.[j]
        matrix[i][j] = el?.distance?.value ? el.distance.value / 1000 : haversineKm(points[i], points[j])
      }
    }
    cache.set(key, matrix)
    return matrix
  } catch {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) matrix[i][j] = 0
        else matrix[i][j] = haversineKm(points[i], points[j])
      }
    }
    cache.set(key, matrix)
    return matrix
  }
}

function nearestNeighborOrder(matrix) {
  const n = matrix.length
  const visited = Array(n).fill(false)
  const order = [0]
  visited[0] = true
  for (let k = 1; k < n; k++) {
    const last = order[order.length - 1]
    let best = -1
    let bestDist = Infinity
    for (let i = 0; i < n; i++) {
      if (!visited[i] && matrix[last][i] < bestDist) {
        bestDist = matrix[last][i]
        best = i
      }
    }
    order.push(best)
    visited[best] = true
  }
  return order
}

function twoOptImprove(order, matrix) {
  let improved = true
  while (improved) {
    improved = false
    for (let i = 1; i < order.length - 2; i++) {
      for (let j = i + 1; j < order.length - 1; j++) {
        const a = order[i - 1], b = order[i], c = order[j], d = order[j + 1]
        const current = matrix[a][b] + matrix[c][d]
        const swapped = matrix[a][c] + matrix[b][d]
        if (swapped < current) {
          const segment = order.slice(i, j + 1).reverse()
          order.splice(i, segment.length, ...segment)
          improved = true
        }
      }
    }
  }
  return order
}

export async function optimizeRoute({ driverId }) {
  const shipments = await Shipment.find({
    assignedDriverId: driverId,
    status: { $nin: ['DELIVERED', 'CLOSED', 'CANCELLED'] }
  }).lean()
  if (!shipments.length) {
    return { route: [], totalDistance: 0, estimatedTimeMin: 0, stops: [] }
  }
  const latestPing = await LocationPing.findOne({ driverId }).sort({ ts: -1 }).lean()
  const origin = latestPing ? { lat: latestPing.lat, lng: latestPing.lng } : { lat: shipments[0].origin.lat, lng: shipments[0].origin.lng }
  const points = [origin, ...shipments.map(s => ({ lat: s.destination.lat, lng: s.destination.lng }))]
  const matrix = await getDistanceMatrix(points)
  let order = nearestNeighborOrder(matrix)
  order = twoOptImprove(order, matrix)
  const stops = order.slice(1).map((idx, i) => ({
    shipmentId: shipments[i]?._id,
    order: i + 1,
    latitude: points[idx].lat,
    longitude: points[idx].lng
  }))
  let totalDistance = 0
  for (let i = 0; i < order.length - 1; i++) {
    totalDistance += matrix[order[i]][order[i + 1]]
  }
  const lastDest = points[order[order.length - 1]]
  const etaDate = estimateEta({ from: origin, to: lastDest })
  const now = new Date()
  const estimatedTimeMin = Math.round((etaDate.getTime() - now.getTime()) / 60000)
  return { route: order, totalDistance, estimatedTimeMin, origin, stops }
}

export async function calculateFuelCost({ driverId, totalDistanceKm }) {
  const vehicle = await Vehicle.findOne({ assignedDriverId: driverId }).lean()
  const mileage = vehicle?.fuelEfficiencyKmpl ?? 10
  const pricePerLiter = 105
  const used = totalDistanceKm / mileage
  const cost = used * pricePerLiter
  return { fuelUsedLiters: used, fuelCost: Math.round(cost * 100) / 100 }
}

export async function estimateDeliveryTime({ totalDistanceKm }) {
  const avgSpeed = 40
  const hours = totalDistanceKm / avgSpeed
  const minutes = Math.round(hours * 60)
  return { estimatedTimeMin: minutes }
}
