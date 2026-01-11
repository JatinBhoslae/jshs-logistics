import { Invoice } from '../models/Invoice.js'

export function computeCharge({ distanceKm, ratePerKm }) {
  const d = typeof distanceKm === 'number' && distanceKm > 0 ? distanceKm : 0
  const r = typeof ratePerKm === 'number' && ratePerKm > 0 ? ratePerKm : 0
  // Round to nearest rupee/unit
  return Math.max(0, Math.round(d * r))
}

export async function ensureIssuedInvoiceForShipment({ shipment, dueAt }) {
  const existing = await Invoice.findOne({ shipmentId: shipment._id })
  if (existing) return existing

  const amount = shipment.price && shipment.price > 0
    ? shipment.price
    : computeCharge({ distanceKm: shipment.distanceKm, ratePerKm: 25 })

  return Invoice.create({
    customerId: shipment.customerId,
    shipmentId: shipment._id,
    amount,
    currency: 'INR',
    status: 'ISSUED',
    dueAt: dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
}
