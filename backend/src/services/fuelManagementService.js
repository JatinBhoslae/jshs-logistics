import { FuelLog } from '../models/FuelLog.js'
import { Vehicle } from '../models/Vehicle.js'
import { Shipment } from '../models/Shipment.js'

/**
 * Log a fuel transaction
 */
export async function logFuelTransaction({
    vehicleId,
    driverId,
    shipmentId,
    fuelType,
    quantityLiters,
    pricePerLiter,
    odometerAtFill,
    fuelStationName,
    location,
    receiptImage,
    notes
}) {
    // Get previous fuel log to calculate efficiency
    const previousLog = await FuelLog.findOne({ vehicleId })
        .sort({ filledAt: -1 })
        .lean()

    const totalCost = quantityLiters * pricePerLiter

    const fuelLog = await FuelLog.create({
        vehicleId,
        driverId,
        shipmentId,
        fuelType,
        quantityLiters,
        pricePerLiter,
        totalCost,
        odometerAtFill,
        odometerPrevious: previousLog?.odometerAtFill,
        fuelStationName,
        location,
        receiptImage,
        notes,
        filledAt: new Date()
    })

    // Update vehicle odometer
    await Vehicle.findByIdAndUpdate(vehicleId, {
        odometerKm: odometerAtFill
    })

    return fuelLog
}

/**
 * Get fuel efficiency statistics for a vehicle
 */
export async function getVehicleFuelStats(vehicleId, { startDate, endDate } = {}) {
    const query = { vehicleId, efficiencyKmpl: { $exists: true, $ne: null } }

    if (startDate || endDate) {
        query.filledAt = {}
        if (startDate) query.filledAt.$gte = new Date(startDate)
        if (endDate) query.filledAt.$lte = new Date(endDate)
    }

    const logs = await FuelLog.find(query).sort({ filledAt: -1 }).lean()

    if (logs.length === 0) {
        return {
            averageEfficiency: 0,
            totalFuelConsumed: 0,
            totalCost: 0,
            totalDistance: 0,
            fillCount: 0,
            logs: []
        }
    }

    const totalFuelConsumed = logs.reduce((sum, log) => sum + log.quantityLiters, 0)
    const totalCost = logs.reduce((sum, log) => sum + log.totalCost, 0)
    const totalDistance = logs.reduce((sum, log) => sum + (log.distanceSinceLastFill || 0), 0)
    const validEfficiencies = logs.filter(log => log.efficiencyKmpl > 0)
    const averageEfficiency = validEfficiencies.length > 0
        ? validEfficiencies.reduce((sum, log) => sum + log.efficiencyKmpl, 0) / validEfficiencies.length
        : 0

    return {
        averageEfficiency: Number(averageEfficiency.toFixed(2)),
        totalFuelConsumed: Number(totalFuelConsumed.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        totalDistance: Number(totalDistance.toFixed(2)),
        fillCount: logs.length,
        logs: logs.slice(0, 10) // Return last 10 logs
    }
}

/**
 * Get fleet-wide fuel analytics
 */
export async function getFleetFuelAnalytics({ startDate, endDate } = {}) {
    const matchStage = {}

    if (startDate || endDate) {
        matchStage.filledAt = {}
        if (startDate) matchStage.filledAt.$gte = new Date(startDate)
        if (endDate) matchStage.filledAt.$lte = new Date(endDate)
    }

    const analytics = await FuelLog.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalFuelConsumed: { $sum: '$quantityLiters' },
                totalCost: { $sum: '$totalCost' },
                totalDistance: { $sum: '$distanceSinceLastFill' },
                fillCount: { $sum: 1 },
                avgEfficiency: {
                    $avg: {
                        $cond: [
                            { $and: [{ $gt: ['$efficiencyKmpl', 0] }, { $ne: ['$efficiencyKmpl', null] }] },
                            '$efficiencyKmpl',
                            null
                        ]
                    }
                }
            }
        }
    ])

    const result = analytics[0] || {
        totalFuelConsumed: 0,
        totalCost: 0,
        totalDistance: 0,
        fillCount: 0,
        avgEfficiency: 0
    }

    // Get fuel consumption by vehicle
    const byVehicle = await FuelLog.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$vehicleId',
                totalFuel: { $sum: '$quantityLiters' },
                totalCost: { $sum: '$totalCost' },
                avgEfficiency: { $avg: '$efficiencyKmpl' },
                fillCount: { $sum: 1 }
            }
        },
        { $sort: { totalCost: -1 } },
        { $limit: 10 }
    ])

    // Populate vehicle details
    const vehicleIds = byVehicle.map(v => v._id)
    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
        .select('plateNumber model type')
        .lean()

    const vehicleMap = new Map(vehicles.map(v => [String(v._id), v]))

    const topConsumers = byVehicle.map(v => ({
        vehicleId: v._id,
        plateNumber: vehicleMap.get(String(v._id))?.plateNumber || 'Unknown',
        model: vehicleMap.get(String(v._id))?.model || '',
        totalFuel: Number(v.totalFuel.toFixed(2)),
        totalCost: Number(v.totalCost.toFixed(2)),
        avgEfficiency: Number((v.avgEfficiency || 0).toFixed(2)),
        fillCount: v.fillCount
    }))

    return {
        summary: {
            totalFuelConsumed: Number((result.totalFuelConsumed || 0).toFixed(2)),
            totalCost: Number((result.totalCost || 0).toFixed(2)),
            totalDistance: Number((result.totalDistance || 0).toFixed(2)),
            fillCount: result.fillCount || 0,
            avgEfficiency: Number((result.avgEfficiency || 0).toFixed(2))
        },
        topConsumers
    }
}

/**
 * Get fuel cost trends over time
 */
export async function getFuelCostTrends({ vehicleId, days = 30 }) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = { filledAt: { $gte: startDate } }
    if (vehicleId) query.vehicleId = vehicleId

    const trends = await FuelLog.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$filledAt' }
                },
                totalCost: { $sum: '$totalCost' },
                totalLiters: { $sum: '$quantityLiters' },
                avgPricePerLiter: { $avg: '$pricePerLiter' },
                fillCount: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ])

    return trends.map(t => ({
        date: t._id,
        totalCost: Number(t.totalCost.toFixed(2)),
        totalLiters: Number(t.totalLiters.toFixed(2)),
        avgPricePerLiter: Number(t.avgPricePerLiter.toFixed(2)),
        fillCount: t.fillCount
    }))
}

/**
 * Verify a fuel log entry
 */
export async function verifyFuelLog(logId, verifiedBy) {
    const log = await FuelLog.findByIdAndUpdate(
        logId,
        {
            verified: true,
            verifiedBy,
            verifiedAt: new Date()
        },
        { new: true }
    )

    return log
}

/**
 * Get fuel alerts (low efficiency, high costs, etc.)
 */
export async function getFuelAlerts() {
    const alerts = []

    // Get vehicles with recent low efficiency
    const recentLogs = await FuelLog.aggregate([
        {
            $match: {
                filledAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
                efficiencyKmpl: { $exists: true, $ne: null }
            }
        },
        {
            $group: {
                _id: '$vehicleId',
                avgEfficiency: { $avg: '$efficiencyKmpl' },
                expectedEfficiency: { $first: '$expectedEfficiency' }
            }
        }
    ])

    const vehicleIds = recentLogs.map(l => l._id)
    const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } })
        .select('plateNumber fuelEfficiencyKmpl')
        .lean()

    const vehicleMap = new Map(vehicles.map(v => [String(v._id), v]))

    for (const log of recentLogs) {
        const vehicle = vehicleMap.get(String(log._id))
        if (!vehicle) continue

        const expected = vehicle.fuelEfficiencyKmpl || 10
        const actual = log.avgEfficiency

        // Alert if efficiency is 20% below expected
        if (actual < expected * 0.8) {
            alerts.push({
                type: 'LOW_EFFICIENCY',
                severity: 'HIGH',
                vehicleId: log._id,
                plateNumber: vehicle.plateNumber,
                message: `Low fuel efficiency: ${actual.toFixed(2)} kmpl (expected: ${expected} kmpl)`,
                expectedEfficiency: expected,
                actualEfficiency: Number(actual.toFixed(2)),
                deviation: Number(((expected - actual) / expected * 100).toFixed(1))
            })
        }
    }

    return alerts
}
