import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { startSim, stopSim, getStatus } from '../controllers/simulationController.js'

export const simulationRouter = Router()

simulationRouter.use(requireAuth)

simulationRouter.post('/start', requireRole('MANAGER'), startSim)
simulationRouter.post('/stop', requireRole('MANAGER'), stopSim)
simulationRouter.get('/status', getStatus) // Anyone authenticated can check status
