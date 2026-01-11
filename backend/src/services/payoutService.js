import { Payout } from '../models/Payout.js'
import { Shipment } from '../models/Shipment.js'
import { Invoice } from '../models/Invoice.js'
import { User } from '../models/User.js'
import { audit } from './auditService.js'

import * as pricingService from './pricingService.js'

/**
 * Calculate the payout splits for a given amount using professional algorithms.
 */
export async function calculateSplits(amount, shipmentId) {
  const shipment = await Shipment.findById(shipmentId).lean();

  // Use the industrial payout engine
  const payoutData = await pricingService.calculateDriverShipmentPayout({
    totalRevenue: amount,
    distanceKm: shipment?.distanceKm || 0,
    driverRating: 5.0, // Should find actual rating if available
    isExtraShift: false // Could be dynamic
  });

  return {
    tax: Math.round((amount / 1.18) * 0.18),
    driverShare: payoutData.netEarnings,
    platformShare: payoutData.platformFee,
    breakdown: payoutData
  }
}

/**
 * Generates payout records for a paid invoice.
 * Should be called when an invoice transitions to PAID.
 */
export async function createPayoutsForInvoice(invoiceId, actorId) {
  const invoice = await Invoice.findById(invoiceId)
  if (!invoice) throw new Error('Invoice not found')

  if (invoice.status !== 'PAID') throw new Error('Invoice is not PAID')

  // Check if payouts already exist
  const existing = await Payout.findOne({ invoiceId: invoice._id })
  if (existing) return // Idempotency check

  const shipment = await Shipment.findById(invoice.shipmentId)
  if (!shipment) throw new Error('Shipment not found')

  const splits = await calculateSplits(invoice.amount, shipment._id)

  const payouts = []

  // 1. Driver Payout
  if (shipment.assignedDriverId) {
    const driverPayout = await Payout.create({
      shipmentId: shipment._id,
      invoiceId: invoice._id,
      recipientType: 'DRIVER',
      recipientId: shipment.assignedDriverId,
      amount: splits.driverShare,
      currency: invoice.currency,
      status: 'PENDING', // Pending release/bank transfer
      metadata: {
        splitDetails: 'Industrial Factor-based Earnings',
        breakdown: splits.breakdown,
        taxDeducted: false
      }
    })

    // Auto-approve mock payout for demo
    driverPayout.status = 'SUCCEEDED'
    driverPayout.paidAt = new Date()
    await driverPayout.save()

    payouts.push(driverPayout)

    await audit({
      actorId: actorId || shipment.assignedDriverId,
      action: 'PAYOUT_GENERATED',
      entityType: 'Payout',
      entityId: driverPayout._id,
      metadata: { recipient: 'DRIVER', amount: splits.driverShare }
    })
  }

  // 2. Platform (Logistics Org) Payout - internal tracking
  // We don't necessarily send money to ourselves in Payouts, but we record it
  // Or we find a MANAGER user to attribute it to?
  // For now, let's just log the driver payout as that's the critical external flow.

  return payouts
}
