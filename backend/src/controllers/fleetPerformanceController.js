import { z } from 'zod'
import * as fuelService from '../services/fuelManagementService.js'
import * as maintenanceService from '../services/maintenanceService.js'
import * as driverAnalyticsService from '../services/driverAnalyticsService.js'
import * as schedulingService from '../services/schedulingService.js'
import * as geofencingService from '../services/geofencingService.js'

// ============ FUEL MANAGEMENT ============

const logFuelSchema = z.object({
    vehicleId: z.string(),
    driverId: z.string().optional(),
    shipmentId: z.string().optional(),
    fuelType: z.enum(['DIESEL', 'PETROL', 'CNG', 'ELECTRIC']),
    quantityLiters: z.number().positive(),
    pricePerLiter: z.number().positive(),
    odometerAtFill: z.number().positive(),
    fuelStationName: z.string().optional(),
    location: z.object({
        lat: z.number(),
        lng: z.number()
    }).optional(),
    receiptImage: z.string().optional(),
    notes: z.string().optional()
})

export async function logFuel(req, res) {
    const data = logFuelSchema.parse(req.body)
    const log = await fuelService.logFuelTransaction(data)
    res.status(201).json({ fuelLog: log })
}

export async function getVehicleFuelStats(req, res) {
    const { vehicleId } = req.params
    const { startDate, endDate } = req.query

    const stats = await fuelService.getVehicleFuelStats(vehicleId, { startDate, endDate })
    res.json(stats)
}

export async function getFleetFuelAnalytics(req, res) {
    const { startDate, endDate } = req.query
    const analytics = await fuelService.getFleetFuelAnalytics({ startDate, endDate })
    res.json(analytics)
}

export async function getFuelCostTrends(req, res) {
    const { vehicleId, days } = req.query
    const trends = await fuelService.getFuelCostTrends({
        vehicleId,
        days: days ? parseInt(days) : 30
    })
    res.json({ trends })
}

export async function verifyFuelLog(req, res) {
    const { logId } = req.params
    const log = await fuelService.verifyFuelLog(logId, req.user._id)
    res.json({ fuelLog: log })
}

export async function getFuelAlerts(req, res) {
    const alerts = await fuelService.getFuelAlerts()
    res.json({ alerts })
}

// ============ MAINTENANCE MANAGEMENT ============

const scheduleMaintenanceSchema = z.object({
    vehicleId: z.string(),
    type: z.enum([
        'OIL_CHANGE',
        'TIRE_ROTATION',
        'BRAKE_SERVICE',
        'ENGINE_TUNE',
        'TRANSMISSION',
        'BATTERY',
        'AC_SERVICE',
        'GENERAL_SERVICE',
        'EMERGENCY_REPAIR',
        'PUC_RENEWAL',
        'INSURANCE_RENEWAL',
        'FITNESS_CERTIFICATE'
    ]),
    scheduledDate: z.string(),
    scheduledOdometer: z.number().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    estimatedCost: z.number().optional(),
    serviceProvider: z.object({
        name: z.string().optional(),
        contact: z.string().optional(),
        address: z.string().optional()
    }).optional(),
    notes: z.string().optional()
})

const completeMaintenanceSchema = z.object({
    completedDate: z.string().optional(),
    actualOdometer: z.number().optional(),
    actualCost: z.number().optional(),
    laborCost: z.number().optional(),
    partsCost: z.number().optional(),
    partsReplaced: z.array(z.object({
        name: z.string(),
        partNumber: z.string().optional(),
        quantity: z.number().optional(),
        cost: z.number().optional(),
        warrantyMonths: z.number().optional()
    })).optional(),
    invoiceNumber: z.string().optional(),
    invoiceImage: z.string().optional(),
    nextServiceDate: z.string().optional(),
    nextServiceOdometer: z.number().optional(),
    notes: z.string().optional()
})

export async function scheduleMaintenance(req, res) {
    const data = scheduleMaintenanceSchema.parse(req.body)
    const maintenance = await maintenanceService.scheduleMaintenance({
        ...data,
        createdBy: req.user._id
    })
    res.status(201).json({ maintenance })
}

export async function completeMaintenance(req, res) {
    const { maintenanceId } = req.params
    const data = completeMaintenanceSchema.parse(req.body)

    const maintenance = await maintenanceService.completeMaintenance({
        maintenanceId,
        ...data,
        completedBy: req.user._id
    })

    res.json({ maintenance })
}

export async function getVehicleMaintenanceSchedule(req, res) {
    const { vehicleId } = req.params
    const { includeCompleted } = req.query

    const schedule = await maintenanceService.getVehicleMaintenanceSchedule(vehicleId, {
        includeCompleted: includeCompleted === 'true'
    })

    res.json({ schedule })
}

export async function getFleetMaintenanceOverview(req, res) {
    const overview = await maintenanceService.getFleetMaintenanceOverview()
    res.json(overview)
}

export async function getVehicleMaintenanceHistory(req, res) {
    const { vehicleId } = req.params
    const { limit } = req.query

    const history = await maintenanceService.getVehicleMaintenanceHistory(vehicleId, {
        limit: limit ? parseInt(limit) : 20
    })

    res.json({ history })
}

export async function predictMaintenanceNeeds(req, res) {
    const predictions = await maintenanceService.predictMaintenanceNeeds()
    res.json({ predictions })
}

export async function getMaintenanceAlerts(req, res) {
    const alerts = await maintenanceService.getMaintenanceAlerts()
    res.json({ alerts })
}

export async function cancelMaintenance(req, res) {
    const { maintenanceId } = req.params
    const { reason } = req.body

    const maintenance = await maintenanceService.cancelMaintenance(maintenanceId, reason)
    res.json({ maintenance })
}

// ============ DRIVER ANALYTICS ============

export async function getDriverLeaderboard(req, res) {
    const { startDate, endDate, limit } = req.query

    const leaderboard = await driverAnalyticsService.getDriverLeaderboard({
        startDate,
        endDate,
        limit: limit ? parseInt(limit) : 50
    })

    res.json({ leaderboard })
}

export async function getDriverBehaviorAnalytics(req, res) {
    const { driverId } = req.params
    const { days } = req.query

    const analytics = await driverAnalyticsService.getDriverBehaviorAnalytics(driverId, {
        days: days ? parseInt(days) : 30
    })

    res.json(analytics)
}

export async function detectDriverFatigue(req, res) {
    const { driverId } = req.params
    const fatigue = await driverAnalyticsService.detectDriverFatigue(driverId)
    res.json(fatigue)
}

export async function getDriverPerformanceTrends(req, res) {
    const { driverId } = req.params
    const { months } = req.query

    const trends = await driverAnalyticsService.getDriverPerformanceTrends(driverId, {
        months: months ? parseInt(months) : 6
    })

    res.json({ trends })
}

export async function getDriverHoursCompliance(req, res) {
    const { driverId } = req.params
    const { days } = req.query

    const compliance = await driverAnalyticsService.getDriverHoursCompliance(driverId, {
        days: days ? parseInt(days) : 7
    })

    res.json(compliance)
}

// ============ SCHEDULING ============

const createScheduleSchema = z.object({
    driverId: z.string(),
    vehicleId: z.string().optional(),
    shiftDate: z.string(),
    shiftStart: z.string(),
    shiftEnd: z.string(),
    assignedZone: z.string().optional(),
    assignedRoutes: z.array(z.string()).optional(),
    notes: z.string().optional()
})

export async function createDriverSchedule(req, res) {
    const data = createScheduleSchema.parse(req.body)
    const schedule = await schedulingService.createDriverSchedule({
        ...data,
        createdBy: req.user._id
    })
    res.status(201).json({ schedule })
}

export async function startShift(req, res) {
    const { scheduleId } = req.params
    const schedule = await schedulingService.startShift(scheduleId, req.user._id)
    res.json({ schedule })
}

const endShiftSchema = z.object({
    shipmentsCompleted: z.number().optional(),
    totalDistanceKm: z.number().optional(),
    notes: z.string().optional()
})

export async function endShift(req, res) {
    const { scheduleId } = req.params
    const data = endShiftSchema.parse(req.body)
    const schedule = await schedulingService.endShift(scheduleId, req.user._id, data)
    res.json({ schedule })
}

const addBreakSchema = z.object({
    type: z.enum(['LUNCH', 'REST', 'FUEL', 'OTHER']).optional(),
    startTime: z.string(),
    endTime: z.string().optional()
})

export async function addBreak(req, res) {
    const { scheduleId } = req.params
    const data = addBreakSchema.parse(req.body)
    const schedule = await schedulingService.addBreak(scheduleId, req.user._id, data)
    res.json({ schedule })
}

export async function getDriverSchedule(req, res) {
    const { driverId } = req.params
    const { startDate, endDate } = req.query

    const schedule = await schedulingService.getDriverSchedule(driverId, {
        startDate,
        endDate
    })

    res.json({ schedule })
}

export async function getFleetScheduleOverview(req, res) {
    const { date } = req.query
    const overview = await schedulingService.getFleetScheduleOverview({ date })
    res.json(overview)
}

export async function suggestOptimalPairing(req, res) {
    const { shiftDate, shiftStart, shiftEnd, requiredVehicleType } = req.query

    const suggestions = await schedulingService.suggestOptimalPairing({
        shiftDate,
        shiftStart,
        shiftEnd,
        requiredVehicleType
    })

    res.json(suggestions)
}

export async function cancelSchedule(req, res) {
    const { scheduleId } = req.params
    const { reason } = req.body

    const schedule = await schedulingService.cancelSchedule(scheduleId, reason)
    res.json({ schedule })
}

export async function markNoShow(req, res) {
    const { scheduleId } = req.params
    const schedule = await schedulingService.markNoShow(scheduleId)
    res.json({ schedule })
}

// ============ GEOFENCING ============

const createGeofenceSchema = z.object({
    name: z.string(),
    type: z.enum(['DEPOT', 'RESTRICTED', 'CUSTOMER', 'FUEL_STATION', 'REST_AREA', 'SPEED_ZONE']),
    shape: z.enum(['CIRCLE', 'POLYGON']).optional(),
    center: z.object({
        lat: z.number(),
        lng: z.number()
    }).optional(),
    radiusMeters: z.number().optional(),
    polygon: z.array(z.object({
        lat: z.number(),
        lng: z.number()
    })).optional(),
    speedLimit: z.number().optional(),
    alertOnEntry: z.boolean().optional(),
    alertOnExit: z.boolean().optional(),
    alertOnSpeedViolation: z.boolean().optional(),
    notifyManagers: z.boolean().optional(),
    notifyDrivers: z.boolean().optional(),
    customRecipients: z.array(z.string()).optional(),
    activeSchedule: z.object({
        allDay: z.boolean().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        daysOfWeek: z.array(z.number()).optional()
    }).optional(),
    description: z.string().optional(),
    color: z.string().optional()
})

export async function createGeofence(req, res) {
    const data = createGeofenceSchema.parse(req.body)
    const geofence = await geofencingService.createGeofence({
        ...data,
        createdBy: req.user._id
    })
    res.status(201).json({ geofence })
}

export async function getAllGeofences(req, res) {
    const { type, isActive } = req.query
    const geofences = await geofencingService.getAllGeofences({
        type,
        isActive: isActive !== undefined ? isActive === 'true' : undefined
    })
    res.json({ geofences })
}

export async function updateGeofence(req, res) {
    const { geofenceId } = req.params
    const geofence = await geofencingService.updateGeofence(geofenceId, req.body)
    res.json({ geofence })
}

export async function deleteGeofence(req, res) {
    const { geofenceId } = req.params
    await geofencingService.deleteGeofence(geofenceId)
    res.json({ message: 'Geofence deleted successfully' })
}

export async function getShipmentGeofenceViolations(req, res) {
    const { shipmentId } = req.params
    const { days } = req.query

    const violations = await geofencingService.getShipmentGeofenceViolations(shipmentId, {
        days: days ? parseInt(days) : 7
    })

    res.json(violations)
}
