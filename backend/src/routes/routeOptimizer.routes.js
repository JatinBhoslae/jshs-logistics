import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { optimizeRoute, calculateFuelCost, estimateDeliveryTime } from '../services/routeOptimizer.js'
import { Shipment } from '../models/Shipment.js'

export const routeOptimizerRouter = Router()

routeOptimizerRouter.use(requireAuth)

routeOptimizerRouter.post('/optimize', requireRole(['DRIVER', 'MANAGER']), asyncHandler(async (req, res) => {
  const driverId = req.body.driverId
  if (!driverId) return res.status(400).json({ error: { message: 'driverId required' } })
  if (req.user.role === 'DRIVER' && String(driverId) !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }
  const result = await optimizeRoute({ driverId })
  const fuel = await calculateFuelCost({ driverId, totalDistanceKm: result.totalDistance })
  const time = await estimateDeliveryTime({ totalDistanceKm: result.totalDistance })
  const shipments = await Shipment.find({ assignedDriverId: driverId, status: { $nin: ['DELIVERED', 'CLOSED', 'CANCELLED'] } })
  const stops = result.stops
  for (const s of shipments) {
    const matched = stops.find(x => String(x.shipmentId) === String(s._id))
    if (matched) {
      s.optimizedRoute = {
        driverId,
        stops: [matched],
        totalDistance: result.totalDistance,
        estimatedTime: time.estimatedTimeMin
      }
      await s.save()
    }
  }
  res.json({
    route: result.route,
    origin: result.origin,
    stops: result.stops,
    totalDistanceKm: result.totalDistance,
    estimatedTimeMin: result.estimatedTimeMin,
    fuelUsedLiters: fuel.fuelUsedLiters,
    fuelCost: fuel.fuelCost
  })
}))

