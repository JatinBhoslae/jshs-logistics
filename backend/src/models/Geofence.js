import mongoose from 'mongoose'

export const GEOFENCE_TYPES = ['DEPOT', 'RESTRICTED', 'CUSTOMER', 'FUEL_STATION', 'REST_AREA', 'SPEED_ZONE']
export const GEOFENCE_SHAPES = ['CIRCLE', 'POLYGON']

const geofenceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        type: { type: String, enum: GEOFENCE_TYPES, required: true },

        // Shape definition
        shape: { type: String, enum: GEOFENCE_SHAPES, default: 'CIRCLE' },

        // For circular geofences
        center: {
            lat: { type: Number },
            lng: { type: Number }
        },
        radiusMeters: { type: Number },

        // For polygon geofences
        polygon: [{
            lat: { type: Number },
            lng: { type: Number }
        }],

        // Speed zone settings
        speedLimit: { type: Number }, // km/h - for SPEED_ZONE type

        // Alert settings
        alertOnEntry: { type: Boolean, default: true },
        alertOnExit: { type: Boolean, default: true },
        alertOnSpeedViolation: { type: Boolean, default: true },

        // Notification recipients
        notifyManagers: { type: Boolean, default: true },
        notifyDrivers: { type: Boolean, default: false },
        customRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

        // Schedule - when geofence is active
        activeSchedule: {
            allDay: { type: Boolean, default: true },
            startTime: { type: String }, // HH:mm format
            endTime: { type: String },
            daysOfWeek: [{ type: Number }] // 0-6, Sunday = 0
        },

        // Status
        isActive: { type: Boolean, default: true },

        // Metadata
        description: { type: String },
        color: { type: String, default: '#3B82F6' }, // For map display

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
)

// Geospatial index for location queries
geofenceSchema.index({ 'center.lat': 1, 'center.lng': 1 })
geofenceSchema.index({ type: 1, isActive: 1 })

export const Geofence = mongoose.model('Geofence', geofenceSchema)
