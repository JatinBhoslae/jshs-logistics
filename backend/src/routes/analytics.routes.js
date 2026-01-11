import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { overview, predictiveInsights } from '../controllers/analyticsController.js'

export const analyticsRouter = Router()

analyticsRouter.use(requireAuth)
analyticsRouter.get('/overview', requireRole('MANAGER'), asyncHandler(overview))
analyticsRouter.get('/predictive-insights', requireRole('MANAGER'), asyncHandler(predictiveInsights))
