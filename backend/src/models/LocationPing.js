import mongoose from 'mongoose'

const locationPingSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speedKmph: { type: Number },
    heading: { type: Number },
    ts: { type: Date, required: true },
  },
  { timestamps: true }
)

export const LocationPing = mongoose.model('LocationPing', locationPingSchema)
