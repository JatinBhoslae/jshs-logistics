import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { startSim, stopSim, getStatus } from '../controllers/simulationController.js'

export const simulationRouter = Router()

simulationRouter.use(requireAuth)
simulationRouter.use(requireRole('MANAGER')) // Only managers can control simulation

simulationRouter.post('/start', startSim)
simulationRouter.post('/stop', stopSim)
simulationRouter.get('/status', getStatus)
