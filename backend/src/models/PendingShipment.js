import mongoose from 'mongoose'

const pendingShipmentSchema = new mongoose.Schema(
    {
        razorpayOrderId: { type: String, required: true, unique: true, index: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        shipmentData: { type: Object, required: true },
        status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' },
        expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24h
    },
    { timestamps: true }
)

pendingShipmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PendingShipment = mongoose.model('PendingShipment', pendingShipmentSchema)
