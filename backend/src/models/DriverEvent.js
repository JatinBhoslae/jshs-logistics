import mongoose from 'mongoose'

export const DRIVER_EVENT_TYPES = ['SPEEDING', 'HARSH_TURN', 'IDLING']

const driverEventSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    type: { type: String, enum: DRIVER_EVENT_TYPES, required: true, index: true },
    severity: { type: Number, default: 1 },
    ts: { type: Date, required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const DriverEvent = mongoose.model('DriverEvent', driverEventSchema)
