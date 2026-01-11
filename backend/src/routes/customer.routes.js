import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import {
    handleCustomerCreateShipment,
    getPendingCustomerShipments,
    approveCustomerShipment,
    rejectCustomerShipment
} from '../controllers/customerShipmentController.js'
import { verifyShipmentPayment, handlePaymentFailure } from '../controllers/shipmentPaymentController.js'

export const customerRouter = Router()

customerRouter.use(requireAuth)

// Customer Self-Service Routes
customerRouter.post('/shipments', requireRole('CUSTOMER'), asyncHandler(handleCustomerCreateShipment))
customerRouter.post('/payments/verify', requireRole('CUSTOMER'), asyncHandler(verifyShipmentPayment))
customerRouter.post('/payments/failure', requireRole('CUSTOMER'), asyncHandler(handlePaymentFailure))

// Manager Approval Routes
customerRouter.get('/approvals/pending', requireRole('MANAGER'), asyncHandler(getPendingCustomerShipments))
customerRouter.post('/approvals/:id/approve', requireRole('MANAGER'), asyncHandler(approveCustomerShipment))
customerRouter.post('/approvals/:id/reject', requireRole('MANAGER'), asyncHandler(rejectCustomerShipment))
