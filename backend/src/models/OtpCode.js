import mongoose from 'mongoose'

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['REGISTER', 'RESET_PASSWORD'], required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 }, // auto-expire after 5 minutes
  },
  { timestamps: false }
)

export const OtpCode = mongoose.model('OtpCode', otpSchema)