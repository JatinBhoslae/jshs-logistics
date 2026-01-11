import { Invoice } from '../models/Invoice.js'
import { Document } from '../models/Document.js'
import { generateShipmentPdf } from './pdfService.js'
import { computeCharge } from './billingService.js'

/**
 * Automates the invoicing lifecycle based on shipment data.
 * Can be called during shipment creation, status updates, or manual triggers.
 */
export async function automateInvoicing(shipment, actor) {
    try {
        const amount = shipment.price || computeCharge({
            distanceKm: shipment.distanceKm,
            ratePerKm: shipment.deliveryType === 'express' ? 35 : 25
        })

        // 1. Ensure Invoice record exists and is synchronised
        let invoice = await Invoice.findOne({ shipmentId: shipment._id })
        if (invoice) {
            invoice.amount = amount
            invoice.customerId = shipment.customerId
            if (shipment.status === 'DELIVERED') {
                invoice.status = 'ISSUED'
            }
            await invoice.save()
        } else {
            invoice = await Invoice.create({
                customerId: shipment.customerId,
                shipmentId: shipment._id,
                amount,
                currency: 'INR',
                status: 'ISSUED',
                dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days due by default
            })
        }

        // 2. Generate/Update PDF Document for the Invoice
        // If it's ready for final billing or if requested
        if (shipment.status === 'DELIVERED' || shipment.status === 'IN_TRANSIT') {
            const docType = 'GST_INVOICE'
            const existingDoc = await Document.findOne({ shipmentId: shipment._id, type: docType })

            const { fileName, relativePath } = await generateShipmentPdf({
                shipment,
                type: docType,
                actor
            })

            if (existingDoc) {
                existingDoc.fileName = fileName
                existingDoc.filePath = relativePath
                existingDoc.verified = true
                await existingDoc.save()
            } else {
                await Document.create({
                    shipmentId: shipment._id,
                    customerId: shipment.customerId,
                    driverId: shipment.assignedDriverId,
                    vehicleId: shipment.assignedVehicleId,
                    type: docType,
                    fileName,
                    filePath: relativePath,
                    uploadedById: actor._id,
                    verified: true,
                    verifiedAt: new Date(),
                    verifiedById: actor._id,
                })
            }
        }

        return invoice
    } catch (error) {
        console.error('Invoicing Automation Error:', error)
        throw error
    }
}
