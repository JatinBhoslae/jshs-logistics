import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import {
  listInvoices,
  createInvoice,
  issueInvoice,
  payInvoice,
  fundInvoice,
  releaseInvoice,
  openDispute,
  listDisputes,
  resolveDispute,
  listPayouts,
  createRazorpayOrder,
  verifyRazorpayPayment,
  paymentWebhook,
} from '../controllers/paymentController.js'

export const paymentRouter = Router()

// **WORKFLOW 2: Payment Webhook (no auth required for external providers)**
paymentRouter.post('/webhook', asyncHandler(paymentWebhook))

paymentRouter.use(requireAuth)

paymentRouter.get('/invoices', asyncHandler(listInvoices))
paymentRouter.get('/payouts', asyncHandler(listPayouts))
paymentRouter.post('/invoices', requireRole('MANAGER'), asyncHandler(createInvoice))
paymentRouter.post('/invoices/:id/issue', requireRole('MANAGER'), asyncHandler(issueInvoice))

// Razorpay Integration
paymentRouter.post('/razorpay/order', asyncHandler(createRazorpayOrder))
paymentRouter.post('/razorpay/verify', asyncHandler(verifyRazorpayPayment))

// Legacy (pay-after-POD)
paymentRouter.post('/invoices/:id/pay', asyncHandler(payInvoice))

// New: escrow flow
paymentRouter.post('/invoices/:id/fund', requireRole('CUSTOMER'), asyncHandler(fundInvoice))
paymentRouter.post('/invoices/:id/release', requireRole('MANAGER'), asyncHandler(releaseInvoice))

// New: disputes
paymentRouter.post('/invoices/:id/dispute', requireRole('CUSTOMER'), asyncHandler(openDispute))
paymentRouter.get('/disputes', asyncHandler(listDisputes))
paymentRouter.post('/disputes/:id/resolve', requireRole('MANAGER'), asyncHandler(resolveDispute))

