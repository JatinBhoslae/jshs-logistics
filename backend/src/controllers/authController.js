import { z } from 'zod'
import { registerUser, loginUser } from '../services/authService.js'
import { createLoginNotification } from '../services/notificationService.js'
import { sendOtp, verifyOtp } from '../services/otpService.js'

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().length(10),
  password: z.string().min(6),
  role: z.enum(['DRIVER', 'CUSTOMER']),
  otp: z.string().min(4).max(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const sendOtpSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['REGISTER', 'RESET_PASSWORD']),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
  newPassword: z.string().min(6),
})

export async function register(req, res) {
  const data = registerSchema.parse(req.body)

  const ok = await verifyOtp({
    email: data.email,
    purpose: 'REGISTER',
    code: data.otp
  })
  if (!ok) {
    return res.status(400).json({ error: { message: 'Invalid or expired OTP' } })
  }

  const { user, token } = await registerUser(data)

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverApprovalStatus: user.driverApprovalStatus,
    },
  })
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body)
  const { user, token } = await loginUser(data)

  // Track automated login notification
  createLoginNotification(user).catch(err => console.error('Failed to create login notification:', err))

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverApprovalStatus: user.driverApprovalStatus,
    },
  })
}

export async function sendOtpHandler(req, res) {
  const { email, purpose } = sendOtpSchema.parse(req.body)

  await sendOtp({ email, purpose })

  res.json({ success: true })
}

export async function forgotPassword(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body)

  // Look up user by email; if not found, return success (do not leak)
  const { User } = await import('../models/User.js')
  const user = await User.findOne({ email: email.trim().toLowerCase() }).lean()

  if (user) {
    await sendOtp({ email: user.email, purpose: 'RESET_PASSWORD' })
  }

  res.json({ success: true })
}

export async function resetPassword(req, res) {
  const { email, otp, newPassword } = resetPasswordSchema.parse(req.body)

  const { User } = await import('../models/User.js')
  const user = await User.findOne({ email: email.trim().toLowerCase() })
  if (!user) {
    return res.status(400).json({ error: { message: 'Invalid request' } })
  }

  const ok = await verifyOtp({
    email: user.email,
    purpose: 'RESET_PASSWORD',
    code: otp
  })
  if (!ok) {
    return res.status(400).json({ error: { message: 'Invalid or expired OTP' } })
  }

  const { hashPassword } = await import('../utils/password.js')
  user.passwordHash = await hashPassword(newPassword)
  await user.save()

  res.json({ success: true })
}

export async function me(req, res) {
  const u = req.user
  res.json({
    user: {
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      driverApprovalStatus: u.driverApprovalStatus,
    },
  })
}

export async function listUsers(req, res) {
  const { User } = await import('../models/User.js')
  const { role } = req.query
  const query = role ? { role } : {}
  const users = await User.find(query).select('name email phone role').lean()
  res.json({ users })
}
