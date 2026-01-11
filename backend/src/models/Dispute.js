import mongoose from 'mongoose'

export const DISPUTE_STATUS = ['OPEN', 'RESOLVED']
export const DISPUTE_OUTCOME = ['RELEASE', 'REFUND']

const disputeSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    reason: { type: String, required: true },
    status: { type: String, enum: DISPUTE_STATUS, default: 'OPEN', index: true },

    resolvedAt: { type: Date },
    resolvedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    outcome: { type: String, enum: DISPUTE_OUTCOME },
    resolutionNote: { type: String },
  },
  { timestamps: true }
)

export const Dispute = mongoose.model('Dispute', disputeSchema)
