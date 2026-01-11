import { z } from 'zod'
import { User } from '../models/User.js'
import { Invoice } from '../models/Invoice.js'
import { Shipment } from '../models/Shipment.js'
import { Document } from '../models/Document.js'
import { Dispute } from '../models/Dispute.js'
import { payInvoiceMock, fundInvoiceEscrowMock, releaseEscrowMock, refundEscrowMock } from '../services/paymentService.js'
import { audit } from '../services/auditService.js'
import { createNotification } from '../services/notificationService.js'
import { Payout } from '../models/Payout.js'
import { createPayoutsForInvoice } from '../services/payoutService.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
})

const createInvoiceSchema = z.object({
  shipmentId: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().optional(),
  dueAt: z.string().datetime().optional(),
})

const paySchema = z.object({
  method: z.string().optional(),
})

const disputeSchema = z.object({
  reason: z.string().min(5),
})

const resolveDisputeSchema = z.object({
  outcome: z.enum(['RELEASE', 'REFUND']),
  note: z.string().optional(),
})

export async function listInvoices(req, res) {
  const role = req.user.role

  // DRIVER has no billing UI in MVP
  if (role === 'DRIVER') return res.json({ invoices: [] })

  const q = {}
  if (role === 'CUSTOMER') {
    q.customerId = req.user._id
  }

  const rows = await Invoice.find(q)
    .sort({ createdAt: -1 })
    .populate('shipmentId', 'referenceId status')
    .lean()

  const shipmentIds = rows.map((r) => String(r.shipmentId?._id ?? r.shipmentId))
  const pods = await Document.find({ shipmentId: { $in: shipmentIds }, type: 'POD', verified: true })
    .select('shipmentId')
    .lean()
  const verifiedSet = new Set(pods.map((d) => String(d.shipmentId)))

  const invoiceIds = rows.map((r) => String(r._id))
  const openDisputes = await Dispute.find({ invoiceId: { $in: invoiceIds }, status: 'OPEN' })
    .select('invoiceId')
    .lean()
  const disputeByInvoiceId = new Map(openDisputes.map((d) => [String(d.invoiceId), String(d._id)]))

  const invoices = rows.map((r) => ({
    ...r,
    shipmentRef: typeof r.shipmentId === 'object' ? r.shipmentId.referenceId : undefined,
    shipmentStatus: typeof r.shipmentId === 'object' ? r.shipmentId.status : undefined,
    shipmentId: typeof r.shipmentId === 'object' ? String(r.shipmentId._id) : String(r.shipmentId),
    podVerified: verifiedSet.has(String(r.shipmentId?._id ?? r.shipmentId)),
    openDisputeId: disputeByInvoiceId.get(String(r._id)),
  }))

  res.json({ invoices })
}

export async function createInvoice(req, res) {
  const data = createInvoiceSchema.parse(req.body)

  const shipment = await Shipment.findById(data.shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  // Anyone with access to the shipment can create an invoice (usually manager)

  const invoice = await Invoice.create({
    customerId: shipment.customerId,
    shipmentId: shipment._id,
    amount: data.amount,
    currency: data.currency ?? 'INR',
    dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
  })

  await audit({ actorId: req.user._id, action: 'INVOICE_CREATED', entityType: 'Invoice', entityId: invoice._id })

  res.status(201).json({ invoice })
}

export async function issueInvoice(req, res) {
  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })

  invoice.status = 'ISSUED'
  await invoice.save()

  await audit({ actorId: req.user._id, action: 'INVOICE_ISSUED', entityType: 'Invoice', entityId: invoice._id })

  res.json({ invoice })
}

export async function payInvoice(req, res) {
  const data = paySchema.parse(req.body ?? {})

  const invoice = await Invoice.findById(req.params.id).lean()
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })

  if (req.user.role === 'CUSTOMER') {
    if (String(invoice.customerId ?? '') !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
    }
  } else if (req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }

  const result = await payInvoiceMock({ invoiceId: req.params.id, method: data.method ?? 'MOCK' })

  await audit({ actorId: req.user._id, action: 'INVOICE_PAID', entityType: 'Invoice', entityId: req.params.id, metadata: { method: data.method ?? 'MOCK' } })

  res.json(result)
}

export async function fundInvoice(req, res) {
  const data = paySchema.parse(req.body ?? {})

  const invoice = await Invoice.findById(req.params.id).lean()
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })

  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: { message: 'Forbidden' } })
  if (String(invoice.customerId ?? '') !== String(req.user._id)) return res.status(403).json({ error: { message: 'Forbidden' } })

  const result = await fundInvoiceEscrowMock({ invoiceId: req.params.id, method: data.method ?? 'MOCK' })

  await audit({ actorId: req.user._id, action: 'INVOICE_ESCROW_FUNDED', entityType: 'Invoice', entityId: req.params.id, metadata: { method: data.method ?? 'MOCK' } })

  // Notify manager about funding
  const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean()
  if (manager?._id) {
    await createNotification({
      userId: manager._id,
      type: 'PAYMENT',
      message: `Escrow funded for invoice ${String(invoice._id).slice(-6)}.`,
      metadata: { invoiceId: invoice._id },
    })
  }

  res.json(result)
}

export async function releaseInvoice(req, res) {
  const data = paySchema.parse(req.body ?? {})

  if (req.user.role !== 'MANAGER') return res.status(403).json({ error: { message: 'Forbidden' } })

  const invoice = await Invoice.findById(req.params.id).lean()
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })

  const result = await releaseEscrowMock({ invoiceId: req.params.id, method: data.method ?? 'MANUAL_RELEASE' })

  await audit({ actorId: req.user._id, action: 'INVOICE_ESCROW_RELEASED', entityType: 'Invoice', entityId: req.params.id, metadata: { method: data.method ?? 'MANUAL_RELEASE' } })

  if (invoice.customerId) {
    await createNotification({
      userId: invoice.customerId,
      type: 'PAYMENT',
      message: `Escrow released for invoice ${String(invoice._id).slice(-6)}.`,
      metadata: { invoiceId: invoice._id },
    })
  }

  res.json(result)
}

export async function openDispute(req, res) {
  const data = disputeSchema.parse(req.body ?? {})

  if (req.user.role !== 'CUSTOMER') return res.status(403).json({ error: { message: 'Forbidden' } })

  const invoice = await Invoice.findById(req.params.id)
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })
  if (String(invoice.customerId ?? '') !== String(req.user._id)) return res.status(403).json({ error: { message: 'Forbidden' } })

  if (invoice.status !== 'FUNDED') {
    return res.status(400).json({ error: { message: 'Only FUNDED invoices can be disputed' } })
  }

  const existing = await Dispute.findOne({ invoiceId: invoice._id, status: 'OPEN' }).lean()
  if (existing) return res.status(400).json({ error: { message: 'A dispute is already open for this invoice' } })

  const dispute = await Dispute.create({
    shipmentId: invoice.shipmentId,
    invoiceId: invoice._id,
    customerId: invoice.customerId,
    reason: data.reason,
  })

  invoice.status = 'DISPUTED'
  await invoice.save()

  await audit({ actorId: req.user._id, action: 'DISPUTE_OPENED', entityType: 'Dispute', entityId: dispute._id, metadata: { invoiceId: invoice._id } })

  res.status(201).json({ dispute, invoice })
}

export async function listDisputes(req, res) {
  const q = {}
  if (req.user.role === 'MANAGER') {
    // Managers see all disputes
  } else if (req.user.role === 'CUSTOMER') {
    q.customerId = req.user._id
  } else {
    return res.json({ disputes: [] })
  }

  const rows = await Dispute.find(q).sort({ createdAt: -1 }).lean()
  res.json({ disputes: rows })
}

export async function resolveDispute(req, res) {
  if (req.user.role !== 'MANAGER') return res.status(403).json({ error: { message: 'Forbidden' } })
  const data = resolveDisputeSchema.parse(req.body ?? {})

  const dispute = await Dispute.findById(req.params.id)
  if (!dispute) return res.status(404).json({ error: { message: 'Dispute not found' } })

  if (dispute.status !== 'OPEN') {
    return res.status(400).json({ error: { message: 'Dispute already resolved' } })
  }

  const invoice = await Invoice.findById(dispute.invoiceId)
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } })

  let paymentResult = null
  if (data.outcome === 'RELEASE') {
    // If POD is verified, release escrow.
    paymentResult = await releaseEscrowMock({ invoiceId: invoice._id, method: 'DISPUTE_RELEASE' })
  } else {
    paymentResult = await refundEscrowMock({ invoiceId: invoice._id, method: 'DISPUTE_REFUND' })
  }

  dispute.status = 'RESOLVED'
  dispute.resolvedAt = new Date()
  dispute.resolvedById = req.user._id
  dispute.outcome = data.outcome
  dispute.resolutionNote = data.note
  await dispute.save()

  await audit({ actorId: req.user._id, action: 'DISPUTE_RESOLVED', entityType: 'Dispute', entityId: dispute._id, metadata: { outcome: data.outcome } })

  if (dispute.customerId) {
    await createNotification({
      userId: dispute.customerId,
      type: 'DISPUTE',
      message: `Dispute resolved (${data.outcome}) for invoice ${String(dispute.invoiceId).slice(-6)}.`,
      metadata: { disputeId: dispute._id, invoiceId: dispute.invoiceId },
    })
  }

  res.json({ dispute, ...paymentResult })
}

export async function listPayouts(req, res) {
  // DRIVER: see own payouts
  if (req.user.role === 'DRIVER') {
    const payouts = await Payout.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 })
      .lean()
    return res.json({ payouts })
  }

  // MANAGER: see all payouts in this simplified model
  if (req.user.role === 'MANAGER') {
    const payouts = await Payout.find({})
      .sort({ createdAt: -1 })
      .lean()

    return res.json({ payouts })
  }

  // CUSTOMER: no payouts screen in MVP
  return res.json({ payouts: [] })
}

export async function createRazorpayOrder(req, res) {
  const { invoiceId } = req.body;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return res.status(404).json({ error: { message: 'Invoice not found' } });

  // For hackathon: set amount to ₹1 (100 paise) as requested
  const amount = 100;

  const options = {
    amount,
    currency: 'INR',
    receipt: `inv_${invoice._id}`,
    payment_capture: 1
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      invoiceId: invoice._id
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: { message: 'Failed to create payment order' } });
  }
}

export async function verifyRazorpayPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;

  const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder');
  hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // Payment verified
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.status = 'PAID';
      invoice.paidAt = new Date();
      invoice.paymentMethod = 'RAZORPAY';
      invoice.paymentTransactionId = razorpay_payment_id;
      await invoice.save();

      await audit({
        actorId: req.user._id,
        action: 'INVOICE_PAID_RAZORPAY',
        entityType: 'Invoice',
        entityId: invoice._id,
        metadata: { paymentId: razorpay_payment_id }
      });

      await createNotification({
        userId: invoice.customerId,
        type: 'PAYMENT',
        message: `Payment of ₹1 for invoice ${String(invoice._id).slice(-6)} successful.`,
        metadata: { invoiceId: invoice._id }
      });

      // **WORKFLOW 2: Auto-close shipment after payment**
      const shipment = await Shipment.findById(invoice.shipmentId);
      if (shipment && shipment.status === 'DELIVERED') {
        shipment.status = 'CLOSED';
        shipment.lastEventAt = new Date();
        await shipment.save();
        console.log(`[WORKFLOW 2] Shipment ${shipment.referenceId} auto-closed after Razorpay payment.`);
      }

      // Trigger Payout Generation
      try {
        await createPayoutsForInvoice(invoice._id, req.user._id);
      } catch (e) {
        console.error('Payout generation failed:', e.message);
      }
    }
    res.json({ status: 'success' });
  } else {
    res.status(400).json({ status: 'failure' });
  }
}

// **WORKFLOW 2: Payment Webhook Endpoint for Bank/External Payment Providers**
export async function paymentWebhook(req, res) {
  const { event, payload } = req.body;

  console.log(`[PAYMENT WEBHOOK] Received event: ${event}`);

  try {
    if (event === 'payment.captured' || event === 'payment_intent.succeeded') {
      const { invoiceId, transactionId, amount, method } = payload;

      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        console.warn(`[PAYMENT WEBHOOK] Invoice ${invoiceId} not found`);
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'PAID') {
        console.log(`[PAYMENT WEBHOOK] Invoice ${invoiceId} already paid`);
        return res.json({ status: 'already_processed' });
      }

      // Update invoice status
      invoice.status = 'PAID';
      invoice.paidAt = new Date();
      invoice.paymentMethod = method || 'WEBHOOK';
      invoice.paymentTransactionId = transactionId;
      await invoice.save();

      await audit({
        actorId: null,
        action: 'INVOICE_PAID_WEBHOOK',
        entityType: 'Invoice',
        entityId: invoice._id,
        metadata: { transactionId, amount, method, event }
      });

      // Notify customer
      if (invoice.customerId) {
        await createNotification({
          userId: invoice.customerId,
          type: 'PAYMENT',
          severity: 'SUCCESS',
          message: `Payment received for invoice ${String(invoice._id).slice(-6)}.`,
          metadata: { invoiceId: invoice._id }
        });
      }

      // **WORKFLOW 2: Auto-close shipment after payment settles**
      const shipment = await Shipment.findById(invoice.shipmentId);
      if (shipment && shipment.status === 'DELIVERED') {
        shipment.status = 'CLOSED';
        shipment.lastEventAt = new Date();
        await shipment.save();
        console.log(`[WORKFLOW 2] Shipment ${shipment.referenceId} auto-closed via webhook.`);
      }

      // Create payouts
      try {
        await createPayoutsForInvoice(invoice._id);
      } catch (e) {
        console.error('[PAYMENT WEBHOOK] Payout generation failed:', e.message);
      }

      return res.json({ status: 'success', invoiceId: invoice._id });
    }

    // Handle other events if needed
    return res.json({ status: 'ignored', event });
  } catch (error) {
    console.error('[PAYMENT WEBHOOK] Error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

