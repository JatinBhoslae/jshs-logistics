import { OtpCode } from '../models/OtpCode.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { sendOtpEmail } from './emailService.js'

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function sendOtp({ email, purpose }) {
  const code = generateOtp()
  const codeHash = await hashPassword(code)

  await OtpCode.create({ email, codeHash, purpose })

  if (email) {
    await sendOtpEmail(email, code, purpose)
  }
}

export async function verifyOtp({ email, purpose, code }) {
  const record = await OtpCode.findOne({ email, purpose }).sort({ createdAt: -1 })
  if (!record) return false
  const ok = await verifyPassword(code, record.codeHash)
  if (!ok) return false

  // Delete after successful verification
  await OtpCode.deleteMany({ email, purpose })
  return true
}