import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { getAuditLogs } from '../controllers/auditController.js'

export const auditRouter = Router()

auditRouter.use(requireAuth)
auditRouter.get('/', requireRole('MANAGER'), asyncHandler(getAuditLogs))
