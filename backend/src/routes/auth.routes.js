import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { register, login, me, sendOtpHandler, forgotPassword, resetPassword, listUsers } from '../controllers/authController.js'

export const authRouter = Router()

authRouter.post('/register', asyncHandler(register))
authRouter.post('/login', asyncHandler(login))
authRouter.post('/send-otp', asyncHandler(sendOtpHandler))
authRouter.post('/forgot-password', asyncHandler(forgotPassword))
authRouter.post('/reset-password', asyncHandler(resetPassword))
authRouter.get('/me', requireAuth, asyncHandler(me))
authRouter.get('/users', requireAuth, asyncHandler(listUsers))
