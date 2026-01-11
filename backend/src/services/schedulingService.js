import { DriverSchedule, SHIFT_STATUS } from '../models/DriverSchedule.js'
import { User } from '../models/User.js'
import { Vehicle } from '../models/Vehicle.js'
import { Shipment } from '../models/Shipment.js'
import { createNotification } from './notificationService.js'

/**
 * Create a driver schedule/shift
 */
export async function createDriverSchedule({
    driverId,
    vehicleId,
    shiftDate,
    shiftStart,
    shiftEnd,
    assignedZone,
    assignedRoutes = [],
    notes,
    createdBy
}) {
    // Validate driver exists and is approved
    const driver = await User.findOne({
        _id: driverId,
        role: 'DRIVER',
        driverApprovalStatus: 'APPROVED'
    })

    if (!driver) {
        throw new Error('Driver not found or not approved')
    }

    // Check for schedule conflicts
    const conflict = await DriverSchedule.findOne({
        driverId,
        shiftDate: new Date(shiftDate),
        status: { $in: ['SCHEDULED', 'ACTIVE'] },
        $or: [
            {
                shiftStart: { $lte: new Date(shiftEnd) },
                shiftEnd: { $gte: new Date(shiftStart) }
            }
        ]
    })

    if (conflict) {
        throw new Error('Driver already has a shift scheduled during this time')
    }

    // If vehicle is assigned, check vehicle availability
    if (vehicleId) {
        const vehicleConflict = await DriverSchedule.findOne({
            vehicleId,
            shiftDate: new Date(shiftDate),
            status: { $in: ['SCHEDULED', 'ACTIVE'] },
            $or: [
                {
                    shiftStart: { $lte: new Date(shiftEnd) },
                    shiftEnd: { $gte: new Date(shiftStart) }
                }
            ]
        })

        if (vehicleConflict) {
            throw new Error('Vehicle already assigned to another driver during this time')
        }
    }

    const schedule = await DriverSchedule.create({
        driverId,
        vehicleId,
        shiftDate: new Date(shiftDate),
        shiftStart: new Date(shiftStart),
        shiftEnd: new Date(shiftEnd),
        assignedZone,
        assignedRoutes,
        notes,
        createdBy,
        status: 'SCHEDULED'
    })

    // Notify driver
    await createNotification({
        userId: driverId,
        type: 'SHIFT_SCHEDULED',
        message: `Shift scheduled for ${new Date(shiftDate).toLocaleDateString()} from ${new Date(shiftStart).toLocaleTimeString()} to ${new Date(shiftEnd).toLocaleTimeString()}`,
        metadata: { scheduleId: schedule._id }
    })

    return schedule
}

/**
 * Start a shift (driver clocks in)
 */
export async function startShift(scheduleId, driverId) {
    const schedule = await DriverSchedule.findOne({
        _id: scheduleId,
        driverId,
        status: 'SCHEDULED'
    })

    if (!schedule) {
        throw new Error('Schedule not found or already started')
    }

    schedule.status = 'ACTIVE'
    schedule.actualStart = new Date()
    await schedule.save()

    return schedule
}

/**
 * End a shift (driver clocks out)
 */
export async function endShift(scheduleId, driverId, { shipmentsCompleted, totalDistanceKm, notes }) {
    const schedule = await DriverSchedule.findOne({
        _id: scheduleId,
        driverId,
        status: 'ACTIVE'
    })

    if (!schedule) {
        throw new Error('Active schedule not found')
    }

    const actualEnd = new Date()
    const actualStart = schedule.actualStart || schedule.shiftStart

    // Calculate hours
    const totalHours = (actualEnd - actualStart) / (1000 * 60 * 60)
    const scheduledHours = (schedule.shiftEnd - schedule.shiftStart) / (1000 * 60 * 60)

    // Calculate break time
    const totalBreakMinutes = schedule.breaks.reduce((sum, b) => sum + (b.duration || 0), 0)
    const drivingHours = totalHours - (totalBreakMinutes / 60)

    // Check compliance (simplified - max 10 hours driving per day)
    const isCompliant = drivingHours <= 10
    const violations = []
    if (drivingHours > 10) {
        violations.push(`Exceeded maximum driving hours: ${drivingHours.toFixed(2)} hours`)
    }

    schedule.status = 'COMPLETED'
    schedule.actualEnd = actualEnd
    schedule.shipmentsCompleted = shipmentsCompleted || 0
    schedule.totalDistanceKm = totalDistanceKm || 0
    schedule.totalDrivingHours = Number(drivingHours.toFixed(2))
    schedule.hoursOfService = {
        drivingHours: Number(drivingHours.toFixed(2)),
        onDutyHours: Number(totalHours.toFixed(2)),
        restHours: Number((totalBreakMinutes / 60).toFixed(2)),
        isCompliant,
        violations
    }
    if (notes) schedule.notes = notes

    await schedule.save()

    return schedule
}

/**
 * Add a break to an active shift
 */
export async function addBreak(scheduleId, driverId, { type, startTime, endTime }) {
    const schedule = await DriverSchedule.findOne({
        _id: scheduleId,
        driverId,
        status: 'ACTIVE'
    })

    if (!schedule) {
        throw new Error('Active schedule not found')
    }

    const start = new Date(startTime)
    const end = endTime ? new Date(endTime) : new Date()
    const duration = Math.round((end - start) / (1000 * 60)) // minutes

    schedule.breaks.push({
        type: type || 'REST',
        startTime: start,
        endTime: end,
        duration
    })

    await schedule.save()

    return schedule
}

/**
 * Get driver schedule for a date range
 */
export async function getDriverSchedule(driverId, { startDate, endDate }) {
    const query = { driverId }

    if (startDate || endDate) {
        query.shiftDate = {}
        if (startDate) query.shiftDate.$gte = new Date(startDate)
        if (endDate) query.shiftDate.$lte = new Date(endDate)
    }

    const schedules = await DriverSchedule.find(query)
        .populate('vehicleId', 'plateNumber model')
        .populate('createdBy', 'name email')
        .sort({ shiftDate: -1 })
        .lean()

    return schedules
}

/**
 * Get fleet-wide schedule overview
 */
export async function getFleetScheduleOverview({ date }) {
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    const schedules = await DriverSchedule.find({
        shiftDate: { $gte: startOfDay, $lte: endOfDay }
    })
        .populate('driverId', 'name email')
        .populate('vehicleId', 'plateNumber model')
        .sort({ shiftStart: 1 })
        .lean()

    // Get statistics
    const stats = {
        total: schedules.length,
        scheduled: schedules.filter(s => s.status === 'SCHEDULED').length,
        active: schedules.filter(s => s.status === 'ACTIVE').length,
        completed: schedules.filter(s => s.status === 'COMPLETED').length,
        cancelled: schedules.filter(s => s.status === 'CANCELLED').length,
        noShow: schedules.filter(s => s.status === 'NO_SHOW').length
    }

    return {
        schedules,
        stats
    }
}

/**
 * Suggest optimal driver-vehicle pairing for a shift
 */
export async function suggestOptimalPairing({ shiftDate, shiftStart, shiftEnd, requiredVehicleType }) {
    const startOfDay = new Date(shiftDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(shiftDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get available drivers (approved, no conflicting shifts)
    const busyDriverIds = await DriverSchedule.find({
        shiftDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['SCHEDULED', 'ACTIVE'] },
        $or: [
            {
                shiftStart: { $lte: new Date(shiftEnd) },
                shiftEnd: { $gte: new Date(shiftStart) }
            }
        ]
    }).distinct('driverId')

    const availableDrivers = await User.find({
        role: 'DRIVER',
        driverApprovalStatus: 'APPROVED',
        _id: { $nin: busyDriverIds }
    })
        .select('_id name email performanceRating')
        .sort({ performanceRating: -1 })
        .limit(10)
        .lean()

    // Get available vehicles
    const busyVehicleIds = await DriverSchedule.find({
        shiftDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['SCHEDULED', 'ACTIVE'] },
        $or: [
            {
                shiftStart: { $lte: new Date(shiftEnd) },
                shiftEnd: { $gte: new Date(shiftStart) }
            }
        ]
    }).distinct('vehicleId')

    const vehicleQuery = {
        status: 'AVAILABLE',
        _id: { $nin: busyVehicleIds }
    }

    if (requiredVehicleType) {
        vehicleQuery.type = requiredVehicleType
    }

    const availableVehicles = await Vehicle.find(vehicleQuery)
        .select('_id plateNumber model type capacityKg fuelEfficiencyKmpl')
        .lean()

    return {
        drivers: availableDrivers,
        vehicles: availableVehicles,
        suggestions: availableDrivers.slice(0, 3).map((driver, idx) => ({
            driver,
            vehicle: availableVehicles[idx] || null,
            score: driver.performanceRating || 5,
            reason: `Top performer with ${driver.performanceRating}/5 rating`
        }))
    }
}

/**
 * Cancel a scheduled shift
 */
export async function cancelSchedule(scheduleId, reason) {
    const schedule = await DriverSchedule.findById(scheduleId)

    if (!schedule) {
        throw new Error('Schedule not found')
    }

    if (schedule.status !== 'SCHEDULED') {
        throw new Error('Can only cancel scheduled shifts')
    }

    schedule.status = 'CANCELLED'
    schedule.managerNotes = reason

    await schedule.save()

    // Notify driver
    await createNotification({
        userId: schedule.driverId,
        type: 'SHIFT_CANCELLED',
        message: `Your shift on ${schedule.shiftDate.toLocaleDateString()} has been cancelled. Reason: ${reason}`,
        metadata: { scheduleId: schedule._id }
    })

    return schedule
}

/**
 * Mark driver as no-show
 */
export async function markNoShow(scheduleId) {
    const schedule = await DriverSchedule.findById(scheduleId)

    if (!schedule) {
        throw new Error('Schedule not found')
    }

    schedule.status = 'NO_SHOW'
    await schedule.save()

    return schedule
}
