import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import * as fleetPerformanceController from '../controllers/fleetPerformanceController.js'

export const fleetPerformanceRouter = Router()

fleetPerformanceRouter.use(requireAuth)

// ============ FUEL MANAGEMENT ROUTES ============
fleetPerformanceRouter.post(
    '/fuel/log',
    requireRole('MANAGER', 'DRIVER'),
    asyncHandler(fleetPerformanceController.logFuel)
)

fleetPerformanceRouter.get(
    '/fuel/vehicle/:vehicleId/stats',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getVehicleFuelStats)
)

fleetPerformanceRouter.get(
    '/fuel/analytics',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getFleetFuelAnalytics)
)

fleetPerformanceRouter.get(
    '/fuel/trends',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getFuelCostTrends)
)

fleetPerformanceRouter.post(
    '/fuel/:logId/verify',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.verifyFuelLog)
)

fleetPerformanceRouter.get(
    '/fuel/alerts',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getFuelAlerts)
)

// ============ MAINTENANCE ROUTES ============
fleetPerformanceRouter.post(
    '/maintenance/schedule',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.scheduleMaintenance)
)

fleetPerformanceRouter.post(
    '/maintenance/:maintenanceId/complete',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.completeMaintenance)
)

fleetPerformanceRouter.get(
    '/maintenance/vehicle/:vehicleId/schedule',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getVehicleMaintenanceSchedule)
)

fleetPerformanceRouter.get(
    '/maintenance/vehicle/:vehicleId/history',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getVehicleMaintenanceHistory)
)

fleetPerformanceRouter.get(
    '/maintenance/overview',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getFleetMaintenanceOverview)
)

fleetPerformanceRouter.get(
    '/maintenance/predictions',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.predictMaintenanceNeeds)
)

fleetPerformanceRouter.get(
    '/maintenance/alerts',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getMaintenanceAlerts)
)

fleetPerformanceRouter.post(
    '/maintenance/:maintenanceId/cancel',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.cancelMaintenance)
)

// ============ DRIVER ANALYTICS ROUTES ============
fleetPerformanceRouter.get(
    '/drivers/leaderboard',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getDriverLeaderboard)
)

fleetPerformanceRouter.get(
    '/drivers/:driverId/analytics',
    requireRole('MANAGER', 'DRIVER'),
    asyncHandler(fleetPerformanceController.getDriverBehaviorAnalytics)
)

fleetPerformanceRouter.get(
    '/drivers/:driverId/fatigue',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.detectDriverFatigue)
)

fleetPerformanceRouter.get(
    '/drivers/:driverId/trends',
    requireRole('MANAGER', 'DRIVER'),
    asyncHandler(fleetPerformanceController.getDriverPerformanceTrends)
)

fleetPerformanceRouter.get(
    '/drivers/:driverId/compliance',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getDriverHoursCompliance)
)

// ============ SCHEDULING ROUTES ============
fleetPerformanceRouter.post(
    '/schedule/create',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.createDriverSchedule)
)

fleetPerformanceRouter.post(
    '/schedule/:scheduleId/start',
    requireRole('DRIVER'),
    asyncHandler(fleetPerformanceController.startShift)
)

fleetPerformanceRouter.post(
    '/schedule/:scheduleId/end',
    requireRole('DRIVER'),
    asyncHandler(fleetPerformanceController.endShift)
)

fleetPerformanceRouter.post(
    '/schedule/:scheduleId/break',
    requireRole('DRIVER'),
    asyncHandler(fleetPerformanceController.addBreak)
)

fleetPerformanceRouter.get(
    '/schedule/driver/:driverId',
    requireRole('MANAGER', 'DRIVER'),
    asyncHandler(fleetPerformanceController.getDriverSchedule)
)

fleetPerformanceRouter.get(
    '/schedule/overview',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getFleetScheduleOverview)
)

fleetPerformanceRouter.get(
    '/schedule/suggestions',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.suggestOptimalPairing)
)

fleetPerformanceRouter.post(
    '/schedule/:scheduleId/cancel',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.cancelSchedule)
)

fleetPerformanceRouter.post(
    '/schedule/:scheduleId/no-show',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.markNoShow)
)

// ============ GEOFENCING ROUTES ============
fleetPerformanceRouter.post(
    '/geofence/create',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.createGeofence)
)

fleetPerformanceRouter.get(
    '/geofence/all',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getAllGeofences)
)

fleetPerformanceRouter.patch(
    '/geofence/:geofenceId',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.updateGeofence)
)

fleetPerformanceRouter.delete(
    '/geofence/:geofenceId',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.deleteGeofence)
)

fleetPerformanceRouter.get(
    '/geofence/shipment/:shipmentId/violations',
    requireRole('MANAGER'),
    asyncHandler(fleetPerformanceController.getShipmentGeofenceViolations)
)
