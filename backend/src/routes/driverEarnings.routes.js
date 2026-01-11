import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import {
    getDriverEarnings,
    requestWithdrawal
} from '../controllers/driverEarningsController.js'

export const driverEarningsRouter = Router()

driverEarningsRouter.use(requireAuth)

driverEarningsRouter.get('/summary', requireRole('DRIVER'), asyncHandler(getDriverEarnings))
driverEarningsRouter.post('/withdraw', requireRole('DRIVER'), asyncHandler(requestWithdrawal))
