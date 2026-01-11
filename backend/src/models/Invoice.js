import mongoose from 'mongoose'

// Invoice lifecycle for hackathon MVP:
// DRAFT -> ISSUED -> FUNDED (escrow) -> PAID (released)
// Optional: DISPUTED / REFUNDED
export const INVOICE_STATUS = ['DRAFT', 'ISSUED', 'FUNDED', 'PAID', 'DISPUTED', 'REFUNDED']

const invoiceSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },

    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: INVOICE_STATUS, default: 'DRAFT' },
    dueAt: { type: Date },
  },
  { timestamps: true }
)

export const Invoice = mongoose.model('Invoice', invoiceSchema)
