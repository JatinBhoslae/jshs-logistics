import mongoose from 'mongoose'

export const SHIFT_STATUS = ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW']

const driverScheduleSchema = new mongoose.Schema(
    {
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },

        // Shift timing
        shiftDate: { type: Date, required: true, index: true },
        shiftStart: { type: Date, required: true },
        shiftEnd: { type: Date, required: true },

        // Actual timing
        actualStart: { type: Date },
        actualEnd: { type: Date },

        // Break tracking
        breaks: [{
            startTime: { type: Date },
            endTime: { type: Date },
            duration: { type: Number }, // minutes
            type: { type: String, enum: ['LUNCH', 'REST', 'FUEL', 'OTHER'] }
        }],

        // Status
        status: { type: String, enum: SHIFT_STATUS, default: 'SCHEDULED' },

        // Performance metrics for the shift
        shipmentsCompleted: { type: Number, default: 0 },
        totalDistanceKm: { type: Number, default: 0 },
        totalDrivingHours: { type: Number, default: 0 },

        // Safety compliance
        hoursOfService: {
            drivingHours: { type: Number, default: 0 },
            onDutyHours: { type: Number, default: 0 },
            restHours: { type: Number, default: 0 },
            isCompliant: { type: Boolean, default: true },
            violations: [{ type: String }]
        },

        // Assigned route/zone
        assignedZone: { type: String },
        assignedRoutes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' }],

        // Notes
        notes: { type: String },
        managerNotes: { type: String },

        // Created by
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    { timestamps: true }
)

// Compound indexes
driverScheduleSchema.index({ driverId: 1, shiftDate: -1 })
driverScheduleSchema.index({ vehicleId: 1, shiftDate: -1 })
driverScheduleSchema.index({ status: 1, shiftDate: 1 })

export const DriverSchedule = mongoose.model('DriverSchedule', driverScheduleSchema)
