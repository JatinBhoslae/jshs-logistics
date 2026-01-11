import mongoose from 'mongoose'

const shipmentEventSchema = new mongoose.Schema(
    {
        shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true, index: true },
        type: { type: String, required: true }, // e.g., 'SHIPMENT_CREATED', 'SHIPMENT_ASSIGNED'
        description: { type: String },
        location: {
            name: { type: String },
            lat: { type: Number },
            lng: { type: Number },
        },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: mongoose.Schema.Types.Mixed },
    },
    { timestamps: true, collection: 'shipment_events' }
)

export const ShipmentEvent = mongoose.model('ShipmentEvent', shipmentEventSchema)
