import mongoose from 'mongoose';

const internationalQuoteSchema = new mongoose.Schema({
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    weight: { type: Number, required: true },
    commodity: { type: String, default: 'General Cargo' },
    type: { type: String, enum: ['AIR', 'OCEAN', 'ROAD'], default: 'AIR' },
    status: { type: String, enum: ['PENDING', 'QUOTED', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    estimatedPrice: { type: Number },
}, { timestamps: true });

export const InternationalQuote = mongoose.model('InternationalQuote', internationalQuoteSchema);
