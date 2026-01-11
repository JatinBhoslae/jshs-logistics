import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
    {
        shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, trim: true },
        photos: [{ type: String }], // Array of URLs
        isAwardGranted: { type: Boolean, default: false }
    },
    { timestamps: true }
)

export const Review = mongoose.model('Review', reviewSchema)
