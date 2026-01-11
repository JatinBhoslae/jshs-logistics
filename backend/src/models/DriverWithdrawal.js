import mongoose from 'mongoose'

const driverWithdrawalSchema = new mongoose.Schema(
    {
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },

        // Withdrawal Details
        amount: { type: Number, required: true },
        currency: { type: String, default: 'INR' },

        // UPI Details
        upiId: { type: String, required: true },

        // Razorpay Payout Details
        razorpayPayoutId: { type: String, unique: true, sparse: true, index: true },
        razorpayFundAccountId: { type: String },
        razorpayContactId: { type: String },

        // Status
        status: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED'],
            default: 'PENDING',
            index: true
        },

        // Shipments included in this withdrawal
        shipmentIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shipment'
        }],

        // Breakdown
        earningsBreakdown: [{
            shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
            amount: { type: Number },
            shipmentRef: { type: String }
        }],

        // Timestamps
        requestedAt: { type: Date, default: Date.now },
        processedAt: { type: Date },
        completedAt: { type: Date },
        failedAt: { type: Date },

        // Failure Info
        failureReason: { type: String },

        // Metadata
        metadata: { type: Object }
    },
    { timestamps: true }
)

// Indexes for efficient queries
driverWithdrawalSchema.index({ driverId: 1, status: 1 })
driverWithdrawalSchema.index({ driverId: 1, createdAt: -1 })
driverWithdrawalSchema.index({ status: 1, requestedAt: 1 })

export const DriverWithdrawal = mongoose.model('DriverWithdrawal', driverWithdrawalSchema)
