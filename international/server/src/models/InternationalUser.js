import mongoose from 'mongoose';

const internationalUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['CUSTOMER', 'MANAGER'], default: 'CUSTOMER' },
    company: { type: String }, // For business customers
}, { timestamps: true });

export const InternationalUser = mongoose.model('InternationalUser', internationalUserSchema);
