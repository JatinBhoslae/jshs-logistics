import mongoose from 'mongoose'

export const MAINTENANCE_TYPES = [
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
]

export const MAINTENANCE_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE']

const maintenanceRecordSchema = new mongoose.Schema(
    {
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },

        // Maintenance details
        type: { type: String, enum: MAINTENANCE_TYPES, required: true },
        status: { type: String, enum: MAINTENANCE_STATUS, default: 'SCHEDULED' },
        priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },

        // Scheduling
        scheduledDate: { type: Date, required: true, index: true },
        scheduledOdometer: { type: Number }, // Trigger at this odometer reading

        // Completion details
        completedDate: { type: Date },
        actualOdometer: { type: Number },

        // Cost tracking
        estimatedCost: { type: Number },
        actualCost: { type: Number },
        laborCost: { type: Number },
        partsCost: { type: Number },

        // Service provider
        serviceProvider: {
            name: { type: String },
            contact: { type: String },
            address: { type: String }
        },

        // Parts replaced
        partsReplaced: [{
            name: { type: String },
            partNumber: { type: String },
            quantity: { type: Number },
            cost: { type: Number },
            warrantyMonths: { type: Number }
        }],

        // Documentation
        invoiceNumber: { type: String },
        invoiceImage: { type: String },
        notes: { type: String },

        // Next service
        nextServiceDate: { type: Date },
        nextServiceOdometer: { type: Number },

        // Tracking
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

        // Predictive maintenance flag
        isPredicted: { type: Boolean, default: false },
        predictionConfidence: { type: Number }, // 0-100
        predictionReason: { type: String }
    },
    { timestamps: true }
)

// Indexes
maintenanceRecordSchema.index({ vehicleId: 1, scheduledDate: -1 })
maintenanceRecordSchema.index({ status: 1, scheduledDate: 1 })
maintenanceRecordSchema.index({ vehicleId: 1, type: 1 })

export const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema)
