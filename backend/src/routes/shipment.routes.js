import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads'))
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}_${safe}`)
  },
})

const upload = multer({ storage })
import {
  listShipments,
  createShipment,
  getShipment,
  updateShipment,
  assignShipment,
  dispatchShipment,
  deliverShipment,
  listShipmentLocations,
  deleteShipment,
  getShipmentRoute,
  markShipmentLoaded,
  uploadProofOfLoading,
  addDriverEsign,
  verifyProofOfLoading,
  startShipment,
  checkDriverCompliance,
  getVehicleRealtimePosition,
  getShipmentRealtimeTracking,
  getFleetRealtimePositions,
  getVehicleHealthStatusController,
  getFleetHealthController,
  listDrivers,
  listShipmentEvents,
  estimateShipment,
  acceptShipmentAssignment,
  rejectShipmentAssignment,
  cancelShipment,
  requestShipmentOtp,
  automateJourneyPaperwork,
  pickupShipment,
} from '../controllers/shipmentController.js'

export const shipmentRouter = Router()

shipmentRouter.use(requireAuth)

shipmentRouter.get('/', asyncHandler(listShipments))
shipmentRouter.post('/estimate', asyncHandler(estimateShipment))
shipmentRouter.post('/', requireRole(['MANAGER', 'CUSTOMER']), asyncHandler(createShipment))
shipmentRouter.get('/:id', asyncHandler(getShipment))
shipmentRouter.patch('/:id', requireRole(['MANAGER', 'CUSTOMER']), asyncHandler(updateShipment))
shipmentRouter.delete('/:id', requireRole('MANAGER'), asyncHandler(deleteShipment))

shipmentRouter.post('/:id/assign', requireRole('MANAGER'), asyncHandler(assignShipment))
shipmentRouter.post('/:id/dispatch', asyncHandler(dispatchShipment))
shipmentRouter.post('/:id/pickup', asyncHandler(pickupShipment))
shipmentRouter.post('/:id/deliver', requireRole(['DRIVER', 'MANAGER']), asyncHandler(deliverShipment))

// **WORKFLOW 3: Driver accept/reject assignment routes**
shipmentRouter.post('/:id/accept', requireRole('DRIVER'), asyncHandler(acceptShipmentAssignment))
shipmentRouter.post('/:id/reject', requireRole('DRIVER'), asyncHandler(rejectShipmentAssignment))

// **WORKFLOW 1: Cancel shipment route**
shipmentRouter.post('/:id/cancel', asyncHandler(cancelShipment))

// Proof of loading and e-sign routes
shipmentRouter.post('/:id/mark-loaded', asyncHandler(markShipmentLoaded))
shipmentRouter.post('/:id/upload-pod', requireAuth, upload.single('file'), asyncHandler(uploadProofOfLoading))
shipmentRouter.post('/:id/add-driver-esign', requireRole('DRIVER'), asyncHandler(addDriverEsign))
shipmentRouter.post('/:id/verify-pod', requireRole('MANAGER'), asyncHandler(verifyProofOfLoading))

// Driver compliance and shipment start routes
shipmentRouter.post('/:id/start', requireRole(['DRIVER', 'MANAGER']), asyncHandler(startShipment))
shipmentRouter.post('/:id/request-otp', asyncHandler(requestShipmentOtp))
shipmentRouter.get('/driver-compliance', requireRole('DRIVER'), asyncHandler(checkDriverCompliance))

shipmentRouter.get('/:id/locations', asyncHandler(listShipmentLocations))
shipmentRouter.get('/:id/events', asyncHandler(listShipmentEvents))
shipmentRouter.get('/:id/route', asyncHandler(getShipmentRoute))

// Real-time tracking endpoints
shipmentRouter.get('/:id/tracking', asyncHandler(getShipmentRealtimeTracking))
shipmentRouter.get('/vehicles/:vehicleId/position', requireRole('MANAGER'), asyncHandler(getVehicleRealtimePosition))
shipmentRouter.get('/fleet/positions', requireRole('MANAGER'), asyncHandler(getFleetRealtimePositions))

// Driver management routes
shipmentRouter.get('/fleet/drivers', requireRole('MANAGER'), asyncHandler(listDrivers))

// Vehicle health monitoring endpoints
shipmentRouter.get('/vehicles/:vehicleId/health', requireRole(['MANAGER', 'DRIVER']), asyncHandler(getVehicleHealthStatusController))
shipmentRouter.get('/fleet/health', requireRole('MANAGER'), asyncHandler(getFleetHealthController))

// Journey Paperwork Automation
shipmentRouter.post('/:id/automate-paperwork', asyncHandler(automateJourneyPaperwork))

