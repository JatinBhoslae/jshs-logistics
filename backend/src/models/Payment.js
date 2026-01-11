import mongoose from 'mongoose'

export const PAYMENT_STATUS = ['PENDING', 'SUCCEEDED', 'FAILED']
export const PAYMENT_KIND = ['SETTLEMENT', 'ESCROW_FUND', 'ESCROW_RELEASE', 'ESCROW_REFUND']

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },

    // What this payment represents in our mock rails.
    kind: { type: String, enum: PAYMENT_KIND, default: 'SETTLEMENT', index: true },

    // Stored for easy reporting (optional; derived from invoice otherwise).
    amount: { type: Number },
    currency: { type: String },

    method: { type: String, default: 'MOCK' },
    status: { type: String, enum: PAYMENT_STATUS, default: 'PENDING' },
    providerRef: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
)

export const Payment = mongoose.model('Payment', paymentSchema)
