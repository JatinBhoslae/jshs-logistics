import mongoose from 'mongoose'

const fuelLogSchema = new mongoose.Schema(
    {
        vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
        shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', index: true },

        // Fuel transaction details
        fuelType: { type: String, enum: ['DIESEL', 'PETROL', 'CNG', 'ELECTRIC'], required: true },
        quantityLiters: { type: Number, required: true },
        pricePerLiter: { type: Number, required: true },
        totalCost: { type: Number, required: true },

        // Odometer readings for efficiency calculation
        odometerAtFill: { type: Number, required: true },
        odometerPrevious: { type: Number }, // Previous fill odometer
        distanceSinceLastFill: { type: Number }, // Calculated
        efficiencyKmpl: { type: Number }, // Calculated km per liter

        // Location and timestamp
        fuelStationName: { type: String },
        location: {
            lat: { type: Number },
            lng: { type: Number }
        },
        filledAt: { type: Date, default: Date.now },

        // Receipt/verification
        receiptImage: { type: String }, // Path to receipt image
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verifiedAt: { type: Date },

        notes: { type: String }
    },
    { timestamps: true }
)

// Pre-save hook to calculate efficiency
fuelLogSchema.pre('save', function (next) {
    if (this.odometerPrevious && this.odometerAtFill > this.odometerPrevious) {
        this.distanceSinceLastFill = this.odometerAtFill - this.odometerPrevious
        if (this.quantityLiters > 0) {
            this.efficiencyKmpl = Number((this.distanceSinceLastFill / this.quantityLiters).toFixed(2))
        }
    }
    next()
})

// Indexes for efficient queries
fuelLogSchema.index({ vehicleId: 1, filledAt: -1 })
fuelLogSchema.index({ driverId: 1, filledAt: -1 })

export const FuelLog = mongoose.model('FuelLog', fuelLogSchema)
