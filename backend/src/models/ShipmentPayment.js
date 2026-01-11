import mongoose from 'mongoose'

const shipmentPaymentSchema = new mongoose.Schema(
    {
        shipmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shipment',
            index: true
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        // Amounts
        actualAmount: { type: Number, required: true }, // Calculated shipment cost
        chargedAmount: { type: Number, required: true, default: 1 }, // Amount actually charged (₹1 for testing)
        currency: { type: String, default: 'INR' },

        // Razorpay Details
        razorpayOrderId: { type: String, required: true, unique: true, index: true },
        razorpayPaymentId: { type: String, index: true },
        razorpaySignature: { type: String },

        // Payment Status
        status: {
            type: String,
            enum: ['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
            default: 'CREATED',
            index: true
        },

        // Timestamps
        paidAt: { type: Date },
        failedAt: { type: Date },
        refundedAt: { type: Date },

        // Additional Info
        paymentMethod: { type: String }, // card, netbanking, upi, wallet
        failureReason: { type: String },
        refundReason: { type: String },
        refundAmount: { type: Number },

        // Metadata
        metadata: { type: Object }
    },
    { timestamps: true }
)

// Indexes for efficient queries
shipmentPaymentSchema.index({ customerId: 1, status: 1 })
shipmentPaymentSchema.index({ shipmentId: 1, status: 1 })
shipmentPaymentSchema.index({ createdAt: -1 })

export const ShipmentPayment = mongoose.model('ShipmentPayment', shipmentPaymentSchema)
