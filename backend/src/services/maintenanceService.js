import { MaintenanceRecord, MAINTENANCE_TYPES, MAINTENANCE_STATUS } from '../models/MaintenanceRecord.js'
import { Vehicle } from '../models/Vehicle.js'
import { createNotification } from './notificationService.js'

/**
 * Schedule maintenance for a vehicle
 */
export async function scheduleMaintenance({
    vehicleId,
    type,
    scheduledDate,
    scheduledOdometer,
    priority = 'MEDIUM',
    estimatedCost,
    serviceProvider,
    notes,
    createdBy
}) {
    const maintenance = await MaintenanceRecord.create({
        vehicleId,
        type,
        status: 'SCHEDULED',
        priority,
        scheduledDate,
        scheduledOdometer,
        estimatedCost,
        serviceProvider,
        notes,
        createdBy
    })

    // Send notification
    await createNotification({
        userId: createdBy,
        type: 'MAINTENANCE_SCHEDULED',
        message: `Maintenance scheduled for vehicle (${type}) on ${new Date(scheduledDate).toLocaleDateString()}`,
        metadata: { maintenanceId: maintenance._id, vehicleId }
    })

    return maintenance
}

/**
 * Complete a maintenance record
 */
export async function completeMaintenance({
    maintenanceId,
    completedDate,
    actualOdometer,
    actualCost,
    laborCost,
    partsCost,
    partsReplaced,
    invoiceNumber,
    invoiceImage,
    nextServiceDate,
    nextServiceOdometer,
    notes,
    completedBy
}) {
    const maintenance = await MaintenanceRecord.findByIdAndUpdate(
        maintenanceId,
        {
            status: 'COMPLETED',
            completedDate: completedDate || new Date(),
            actualOdometer,
            actualCost,
            laborCost,
            partsCost,
            partsReplaced,
            invoiceNumber,
            invoiceImage,
            nextServiceDate,
            nextServiceOdometer,
            notes,
            completedBy
        },
        { new: true }
    )

    if (!maintenance) {
        throw new Error('Maintenance record not found')
    }

    // Update vehicle maintenance info
    if (actualOdometer) {
        await Vehicle.findByIdAndUpdate(maintenance.vehicleId, {
            odometerKm: actualOdometer,
            nextServiceAtKm: nextServiceOdometer || actualOdometer + 10000
        })
    }

    // Schedule next maintenance if provided
    if (nextServiceDate && nextServiceOdometer) {
        await scheduleMaintenance({
            vehicleId: maintenance.vehicleId,
            type: maintenance.type,
            scheduledDate: nextServiceDate,
            scheduledOdometer: nextServiceOdometer,
            priority: 'MEDIUM',
            createdBy: completedBy
        })
    }

    return maintenance
}

/**
 * Get maintenance schedule for a vehicle
 */
export async function getVehicleMaintenanceSchedule(vehicleId, { includeCompleted = false } = {}) {
    const query = { vehicleId }

    if (!includeCompleted) {
        query.status = { $in: ['SCHEDULED', 'IN_PROGRESS', 'OVERDUE'] }
    }

    const records = await MaintenanceRecord.find(query)
        .sort({ scheduledDate: 1 })
        .populate('createdBy', 'name email')
        .populate('completedBy', 'name email')
        .lean()

    return records
}

/**
 * Get fleet-wide maintenance overview
 */
export async function getFleetMaintenanceOverview() {
    const now = new Date()

    // Get upcoming maintenance (next 30 days)
    const upcoming = await MaintenanceRecord.find({
        status: 'SCHEDULED',
        scheduledDate: {
            $gte: now,
            $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
    })
        .populate('vehicleId', 'plateNumber model')
        .sort({ scheduledDate: 1 })
        .limit(10)
        .lean()

    // Get overdue maintenance
    const overdue = await MaintenanceRecord.find({
        status: 'SCHEDULED',
        scheduledDate: { $lt: now }
    })
        .populate('vehicleId', 'plateNumber model')
        .sort({ scheduledDate: 1 })
        .lean()

    // Mark overdue items
    for (const record of overdue) {
        await MaintenanceRecord.findByIdAndUpdate(record._id, { status: 'OVERDUE' })
    }

    // Get statistics
    const stats = await MaintenanceRecord.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalCost: { $sum: '$actualCost' }
            }
        }
    ])

    const statsMap = stats.reduce((acc, s) => {
        acc[s._id] = { count: s.count, totalCost: s.totalCost || 0 }
        return acc
    }, {})

    // Get monthly maintenance costs (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyCosts = await MaintenanceRecord.aggregate([
        {
            $match: {
                status: 'COMPLETED',
                completedDate: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m', date: '$completedDate' }
                },
                totalCost: { $sum: '$actualCost' },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ])

    return {
        upcoming,
        overdue,
        stats: {
            scheduled: statsMap.SCHEDULED?.count || 0,
            inProgress: statsMap.IN_PROGRESS?.count || 0,
            completed: statsMap.COMPLETED?.count || 0,
            overdue: overdue.length,
            totalCostThisMonth: statsMap.COMPLETED?.totalCost || 0
        },
        monthlyCosts: monthlyCosts.map(m => ({
            month: m._id,
            totalCost: Number((m.totalCost || 0).toFixed(2)),
            count: m.count
        }))
    }
}

/**
 * Get maintenance history for a vehicle
 */
export async function getVehicleMaintenanceHistory(vehicleId, { limit = 20 } = {}) {
    const history = await MaintenanceRecord.find({
        vehicleId,
        status: 'COMPLETED'
    })
        .sort({ completedDate: -1 })
        .limit(limit)
        .populate('completedBy', 'name email')
        .lean()

    return history
}

/**
 * Predictive maintenance - identify vehicles needing service
 */
export async function predictMaintenanceNeeds() {
    const vehicles = await Vehicle.find({}).lean()
    const predictions = []

    for (const vehicle of vehicles) {
        const kmToService = (vehicle.nextServiceAtKm || 10000) - (vehicle.odometerKm || 0)

        // Predict if service is due within 500km
        if (kmToService <= 500 && kmToService > 0) {
            predictions.push({
                vehicleId: vehicle._id,
                plateNumber: vehicle.plateNumber,
                type: 'GENERAL_SERVICE',
                reason: `Service due in ${kmToService}km`,
                priority: kmToService <= 100 ? 'CRITICAL' : kmToService <= 300 ? 'HIGH' : 'MEDIUM',
                confidence: 95,
                recommendedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                estimatedOdometer: vehicle.nextServiceAtKm
            })
        }

        // Check for overdue service
        if (kmToService <= 0) {
            predictions.push({
                vehicleId: vehicle._id,
                plateNumber: vehicle.plateNumber,
                type: 'GENERAL_SERVICE',
                reason: `Service overdue by ${Math.abs(kmToService)}km`,
                priority: 'CRITICAL',
                confidence: 100,
                recommendedDate: new Date(), // Immediate
                estimatedOdometer: vehicle.odometerKm
            })
        }
    }

    return predictions
}

/**
 * Get maintenance alerts
 */
export async function getMaintenanceAlerts() {
    const alerts = []
    const now = new Date()

    // Overdue maintenance
    const overdue = await MaintenanceRecord.find({
        status: { $in: ['SCHEDULED', 'OVERDUE'] },
        scheduledDate: { $lt: now }
    })
        .populate('vehicleId', 'plateNumber')
        .lean()

    for (const record of overdue) {
        const daysOverdue = Math.floor((now - new Date(record.scheduledDate)) / (1000 * 60 * 60 * 24))
        alerts.push({
            type: 'OVERDUE_MAINTENANCE',
            severity: daysOverdue > 7 ? 'CRITICAL' : 'HIGH',
            vehicleId: record.vehicleId._id,
            plateNumber: record.vehicleId.plateNumber,
            maintenanceType: record.type,
            message: `Maintenance overdue by ${daysOverdue} days`,
            scheduledDate: record.scheduledDate,
            daysOverdue
        })
    }

    // Upcoming critical maintenance (within 3 days)
    const upcoming = await MaintenanceRecord.find({
        status: 'SCHEDULED',
        priority: { $in: ['HIGH', 'CRITICAL'] },
        scheduledDate: {
            $gte: now,
            $lte: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
        }
    })
        .populate('vehicleId', 'plateNumber')
        .lean()

    for (const record of upcoming) {
        const daysUntil = Math.ceil((new Date(record.scheduledDate) - now) / (1000 * 60 * 60 * 24))
        alerts.push({
            type: 'UPCOMING_CRITICAL_MAINTENANCE',
            severity: 'MEDIUM',
            vehicleId: record.vehicleId._id,
            plateNumber: record.vehicleId.plateNumber,
            maintenanceType: record.type,
            message: `Critical maintenance in ${daysUntil} days`,
            scheduledDate: record.scheduledDate,
            daysUntil
        })
    }

    return alerts
}

/**
 * Cancel maintenance
 */
export async function cancelMaintenance(maintenanceId, reason) {
    const maintenance = await MaintenanceRecord.findByIdAndUpdate(
        maintenanceId,
        {
            status: 'CANCELLED',
            notes: reason
        },
        { new: true }
    )

    return maintenance
}
