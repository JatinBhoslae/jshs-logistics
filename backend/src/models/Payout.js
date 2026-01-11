import mongoose from 'mongoose'

export const PAYOUT_STATUS = ['PENDING', 'SUCCEEDED', 'FAILED']
export const PAYOUT_RECIPIENT_TYPE = ['DRIVER', 'LOGISTICS_ORG']

const payoutSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },

    recipientType: { type: String, enum: PAYOUT_RECIPIENT_TYPE, required: true, index: true },
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },

    status: { type: String, enum: PAYOUT_STATUS, default: 'PENDING', index: true },
    method: { type: String, default: 'MOCK_INSTANT' },
    providerRef: { type: String },
    paidAt: { type: Date },

    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

payoutSchema.index({ invoiceId: 1, recipientType: 1 }, { unique: true })

export const Payout = mongoose.model('Payout', payoutSchema)
