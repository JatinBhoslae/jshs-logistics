import { Geofence, GEOFENCE_TYPES } from '../models/Geofence.js'
import { LocationPing } from '../models/LocationPing.js'
import { Shipment } from '../models/Shipment.js'
import { createNotification } from './notificationService.js'
import { haversineKm } from '../utils/geo.js'

/**
 * Create a geofence
 */
export async function createGeofence({
    name,
    type,
    shape = 'CIRCLE',
    center,
    radiusMeters,
    polygon,
    speedLimit,
    alertOnEntry = true,
    alertOnExit = true,
    alertOnSpeedViolation = true,
    notifyManagers = true,
    notifyDrivers = false,
    customRecipients = [],
    activeSchedule,
    description,
    color,
    createdBy
}) {
    const geofence = await Geofence.create({
        name,
        type,
        shape,
        center,
        radiusMeters,
        polygon,
        speedLimit,
        alertOnEntry,
        alertOnExit,
        alertOnSpeedViolation,
        notifyManagers,
        notifyDrivers,
        customRecipients,
        activeSchedule,
        description,
        color,
        createdBy,
        isActive: true
    })

    return geofence
}

/**
 * Check if a point is inside a geofence
 */
export function isPointInGeofence(lat, lng, geofence) {
    if (geofence.shape === 'CIRCLE') {
        if (!geofence.center || !geofence.radiusMeters) return false

        const distanceKm = haversineKm(
            lat,
            lng,
            geofence.center.lat,
            geofence.center.lng
        )

        return distanceKm * 1000 <= geofence.radiusMeters
    }

    if (geofence.shape === 'POLYGON') {
        if (!geofence.polygon || geofence.polygon.length < 3) return false

        // Ray casting algorithm for point-in-polygon
        let inside = false
        const polygon = geofence.polygon

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat
            const yi = polygon[i].lng
            const xj = polygon[j].lat
            const yj = polygon[j].lng

            const intersect = ((yi > lng) !== (yj > lng)) &&
                (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)

            if (intersect) inside = !inside
        }

        return inside
    }

    return false
}

/**
 * Check geofence violations for a location ping
 */
export async function checkGeofenceViolations({ lat, lng, shipmentId, driverId, speedKmph }) {
    // Get all active geofences
    const geofences = await Geofence.find({ isActive: true }).lean()

    const violations = []
    const entries = []
    const exits = []

    for (const geofence of geofences) {
        // Check if geofence is active based on schedule
        if (!isGeofenceActiveNow(geofence)) continue

        const isInside = isPointInGeofence(lat, lng, geofence)

        // Get previous location to detect entry/exit
        const previousPing = await LocationPing.findOne({
            $or: [
                { shipmentId },
                { driverId }
            ]
        }).sort({ ts: -1 }).skip(1).lean()

        let wasInside = false
        if (previousPing) {
            wasInside = isPointInGeofence(previousPing.lat, previousPing.lng, geofence)
        }

        // Detect entry
        if (isInside && !wasInside && geofence.alertOnEntry) {
            entries.push(geofence)

            await sendGeofenceAlert({
                geofence,
                type: 'ENTRY',
                shipmentId,
                driverId,
                location: { lat, lng }
            })
        }

        // Detect exit
        if (!isInside && wasInside && geofence.alertOnExit) {
            exits.push(geofence)

            await sendGeofenceAlert({
                geofence,
                type: 'EXIT',
                shipmentId,
                driverId,
                location: { lat, lng }
            })
        }

        // Check speed violations in speed zones
        if (isInside && geofence.type === 'SPEED_ZONE' && geofence.speedLimit && speedKmph) {
            if (speedKmph > geofence.speedLimit && geofence.alertOnSpeedViolation) {
                violations.push({
                    geofence,
                    type: 'SPEED_VIOLATION',
                    speedLimit: geofence.speedLimit,
                    actualSpeed: speedKmph,
                    excess: speedKmph - geofence.speedLimit
                })

                await sendGeofenceAlert({
                    geofence,
                    type: 'SPEED_VIOLATION',
                    shipmentId,
                    driverId,
                    location: { lat, lng },
                    metadata: {
                        speedLimit: geofence.speedLimit,
                        actualSpeed: speedKmph,
                        excess: speedKmph - geofence.speedLimit
                    }
                })
            }
        }

        // Check restricted zone violations
        if (isInside && geofence.type === 'RESTRICTED') {
            violations.push({
                geofence,
                type: 'RESTRICTED_ZONE',
                message: `Vehicle entered restricted zone: ${geofence.name}`
            })

            await sendGeofenceAlert({
                geofence,
                type: 'RESTRICTED_ZONE',
                shipmentId,
                driverId,
                location: { lat, lng }
            })
        }
    }

    return {
        entries,
        exits,
        violations
    }
}

/**
 * Check if geofence is active based on schedule
 */
function isGeofenceActiveNow(geofence) {
    if (!geofence.activeSchedule || geofence.activeSchedule.allDay) {
        return true
    }

    const now = new Date()
    const currentDay = now.getDay() // 0-6, Sunday = 0
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Check day of week
    if (geofence.activeSchedule.daysOfWeek && geofence.activeSchedule.daysOfWeek.length > 0) {
        if (!geofence.activeSchedule.daysOfWeek.includes(currentDay)) {
            return false
        }
    }

    // Check time range
    if (geofence.activeSchedule.startTime && geofence.activeSchedule.endTime) {
        const start = geofence.activeSchedule.startTime
        const end = geofence.activeSchedule.endTime

        if (currentTime < start || currentTime > end) {
            return false
        }
    }

    return true
}

/**
 * Send geofence alert notifications
 */
async function sendGeofenceAlert({ geofence, type, shipmentId, driverId, location, metadata = {} }) {
    const recipients = []

    // Get shipment and driver details
    let shipment = null
    let driver = null

    if (shipmentId) {
        shipment = await Shipment.findById(shipmentId)
            .populate('customerId', 'name email')
            .populate('assignedDriverId', 'name email')
            .lean()
    }

    if (driverId) {
        const { User } = await import('../models/User.js')
        driver = await User.findById(driverId).select('name email').lean()
    }

    // Build message
    let message = ''
    switch (type) {
        case 'ENTRY':
            message = `Vehicle entered geofence: ${geofence.name}`
            break
        case 'EXIT':
            message = `Vehicle exited geofence: ${geofence.name}`
            break
        case 'SPEED_VIOLATION':
            message = `Speed violation in ${geofence.name}: ${metadata.actualSpeed}km/h (limit: ${metadata.speedLimit}km/h)`
            break
        case 'RESTRICTED_ZONE':
            message = `Unauthorized entry into restricted zone: ${geofence.name}`
            break
    }

    // Add shipment reference if available
    if (shipment) {
        message += ` | Shipment: ${shipment.referenceId}`
    }

    // Determine recipients
    if (geofence.notifyManagers) {
        const { User } = await import('../models/User.js')
        const managers = await User.find({ role: 'MANAGER' }).select('_id').lean()
        recipients.push(...managers.map(m => m._id))
    }

    if (geofence.notifyDrivers && driverId) {
        recipients.push(driverId)
    }

    if (geofence.customRecipients && geofence.customRecipients.length > 0) {
        recipients.push(...geofence.customRecipients)
    }

    // Send notifications
    for (const userId of recipients) {
        await createNotification({
            userId,
            type: 'GEOFENCE_ALERT',
            message,
            metadata: {
                geofenceId: geofence._id,
                geofenceName: geofence.name,
                alertType: type,
                shipmentId,
                driverId,
                location,
                ...metadata
            }
        })
    }
}

/**
 * Get all geofences
 */
export async function getAllGeofences({ type, isActive } = {}) {
    const query = {}

    if (type) query.type = type
    if (isActive !== undefined) query.isActive = isActive

    const geofences = await Geofence.find(query)
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .lean()

    return geofences
}

/**
 * Update a geofence
 */
export async function updateGeofence(geofenceId, updates) {
    const geofence = await Geofence.findByIdAndUpdate(
        geofenceId,
        updates,
        { new: true, runValidators: true }
    )

    if (!geofence) {
        throw new Error('Geofence not found')
    }

    return geofence
}

/**
 * Delete a geofence
 */
export async function deleteGeofence(geofenceId) {
    const geofence = await Geofence.findByIdAndDelete(geofenceId)

    if (!geofence) {
        throw new Error('Geofence not found')
    }

    return geofence
}

/**
 * Get geofence violations for a shipment
 */
export async function getShipmentGeofenceViolations(shipmentId, { days = 7 } = {}) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // This would typically be stored in a separate violations collection
    // For now, we'll return a placeholder
    return {
        shipmentId,
        violations: [],
        message: 'Geofence violations are tracked in real-time via location pings'
    }
}
