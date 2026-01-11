import { Invoice } from '../models/Invoice.js'
import { Payment } from '../models/Payment.js'
import { Document } from '../models/Document.js'
import { createPayoutsForInvoice } from './payoutService.js'


// Legacy flow kept for demo compatibility: pay only after verified POD.
export async function payInvoiceMock({ invoiceId, method = 'MOCK' }) {
  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) {
    const err = new Error('Invoice not found')
    err.statusCode = 404
    throw err
  }

  if (invoice.status !== 'ISSUED') {
    const err = new Error('Invoice must be ISSUED before payment')
    err.statusCode = 400
    throw err
  }

  const pod = await Document.findOne({ shipmentId: invoice.shipmentId, type: 'POD', verified: true }).lean()
  if (!pod) {
    const err = new Error('Proof of Delivery (verified) required before settlement')
    err.statusCode = 400
    throw err
  }

  const payment = await Payment.create({
    invoiceId: invoice._id,
    kind: 'SETTLEMENT',
    amount: invoice.amount,
    currency: invoice.currency,
    method,
    status: 'SUCCEEDED',
    providerRef: `MOCK_${Date.now()}`,
    paidAt: new Date(),
  })

  invoice.status = 'PAID'
  await invoice.save()

  // Realtime split settlement: pay driver + logistics instantly (mock).
  await createPayoutsForInvoice(invoice._id)

  // **WORKFLOW 2: Auto-close shipment after payment settles**
  const { Shipment } = await import('../models/Shipment.js')
  const shipment = await Shipment.findById(invoice.shipmentId)
  if (shipment && shipment.status === 'DELIVERED') {
    shipment.status = 'CLOSED'
    shipment.lastEventAt = new Date()
    await shipment.save()
    console.log(`[WORKFLOW 2] Shipment ${shipment.referenceId} auto-closed after payment.`)
  }

  return { invoice, payment }
}

export async function fundInvoiceEscrowMock({ invoiceId, method = 'MOCK' }) {
  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) {
    const err = new Error('Invoice not found')
    err.statusCode = 404
    throw err
  }

  if (invoice.status !== 'ISSUED') {
    const err = new Error('Invoice must be ISSUED before escrow funding')
    err.statusCode = 400
    throw err
  }

  const payment = await Payment.create({
    invoiceId: invoice._id,
    kind: 'ESCROW_FUND',
    amount: invoice.amount,
    currency: invoice.currency,
    method,
    status: 'SUCCEEDED',
    providerRef: `ESCROW_FUND_${Date.now()}`,
    paidAt: new Date(),
  })

  invoice.status = 'FUNDED'
  await invoice.save()

  return { invoice, payment }
}

export async function releaseEscrowMock({ invoiceId, method = 'AUTO' }) {
  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) {
    const err = new Error('Invoice not found')
    err.statusCode = 404
    throw err
  }

  if (!['FUNDED', 'DISPUTED'].includes(invoice.status)) {
    const err = new Error('Invoice must be FUNDED (or DISPUTED) before escrow release')
    err.statusCode = 400
    throw err
  }

  const pod = await Document.findOne({ shipmentId: invoice.shipmentId, type: 'POD', verified: true }).lean()
  if (!pod) {
    const err = new Error('Verified POD required before escrow release')
    err.statusCode = 400
    throw err
  }

  const payment = await Payment.create({
    invoiceId: invoice._id,
    kind: 'ESCROW_RELEASE',
    amount: invoice.amount,
    currency: invoice.currency,
    method,
    status: 'SUCCEEDED',
    providerRef: `ESCROW_RELEASE_${Date.now()}`,
    paidAt: new Date(),
  })

  invoice.status = 'PAID'
  await invoice.save()

  // Realtime split settlement: pay driver + logistics instantly (mock).
  await createPayoutsForInvoice(invoice._id)

  return { invoice, payment }
}

export async function refundEscrowMock({ invoiceId, method = 'MOCK_REFUND' }) {
  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) {
    const err = new Error('Invoice not found')
    err.statusCode = 404
    throw err
  }

  if (invoice.status !== 'DISPUTED') {
    const err = new Error('Invoice must be DISPUTED before refund')
    err.statusCode = 400
    throw err
  }

  const payment = await Payment.create({
    invoiceId: invoice._id,
    kind: 'ESCROW_REFUND',
    amount: invoice.amount,
    currency: invoice.currency,
    method,
    status: 'SUCCEEDED',
    providerRef: `ESCROW_REFUND_${Date.now()}`,
    paidAt: new Date(),
  })

  invoice.status = 'REFUNDED'
  await invoice.save()

  return { invoice, payment }
}
