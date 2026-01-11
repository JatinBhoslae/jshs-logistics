import { z } from 'zod'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Document, DOC_TYPES } from '../models/Document.js'
import { Shipment } from '../models/Shipment.js'
import { Invoice } from '../models/Invoice.js'
import { audit } from '../services/auditService.js'
import { releaseEscrowMock } from '../services/paymentService.js'
import { createNotification } from '../services/notificationService.js'
import { generateShipmentPdf } from '../services/pdfService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsRoot = path.join(__dirname, '..', '..', 'uploads')

const uploadSchema = z.object({
  type: z.enum([...DOC_TYPES, 'E_WAY_BILL', 'CONSIGNMENT_NOTE']),
})

function assertShipmentAccess(user, shipment) {
  if (user.role === 'MANAGER') {
    return
  }

  if (user.role === 'DRIVER') {
    if (user.driverApprovalStatus !== 'APPROVED') {
      const err = new Error('Driver not approved')
      err.statusCode = 403
      throw err
    }
    if (String(shipment.assignedDriverId ?? '') !== String(user._id)) {
      const err = new Error('Forbidden')
      err.statusCode = 403
      throw err
    }
    return
  }

  if (user.role === 'CUSTOMER') {
    if (String(shipment.customerId ?? '') !== String(user._id)) {
      const err = new Error('Forbidden')
      err.statusCode = 403
      throw err
    }
    return
  }

  const err = new Error('Forbidden')
  err.statusCode = 403
  throw err
}

export async function uploadDocToShipment(req, res) {
  const shipmentId = req.params.shipmentId
  const data = uploadSchema.parse(req.body)

  const shipment = await Shipment.findById(shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })
  assertShipmentAccess(req.user, shipment)

  if (!req.file) {
    return res.status(400).json({ error: { message: 'Missing file' } })
  }

  const doc = await Document.create({
    shipmentId,
    customerId: shipment.customerId,
    driverId: shipment.assignedDriverId,
    vehicleId: shipment.assignedVehicleId,
    type: data.type,
    fileName: req.file.originalname,
    filePath: `/uploads/${req.file.filename}`,
    uploadedById: req.user._id,
  })

  await audit({ actorId: req.user._id, action: 'DOCUMENT_UPLOADED', entityType: 'Document', entityId: doc._id, metadata: { shipmentId, type: data.type } })

  res.status(201).json({ document: doc })
}

export async function listDocsForShipment(req, res) {
  const shipmentId = req.params.shipmentId

  const shipment = await Shipment.findById(shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })
  assertShipmentAccess(req.user, shipment)

  const docs = await Document.find({ shipmentId }).sort({ createdAt: -1 }).lean()

  // Backward-compat: some older records used stub paths without real files.
  // If a generated doc (gen_*) has no file on disk, auto-regenerate a fresh PDF.
  await Promise.all(
    docs.map(async (doc) => {
      try {
        if (!doc.filePath || !doc.filePath.startsWith('/uploads/')) return
        if (!(doc.fileName?.startsWith('gen_') || doc.filePath.includes('gen_'))) return
        const absPath = path.join(uploadsRoot, doc.filePath.replace('/uploads/', ''))
        if (fs.existsSync(absPath)) return

        // Only regenerate for known shipment document types
        if (!DOC_TYPES.includes(doc.type)) return

        const fullShipment = await Shipment.findById(shipmentId)
          .populate('customerId', 'name email address')
          .populate('assignedDriverId', 'name licenseNumber phone')
          .populate('assignedVehicleId', 'plateNumber model')
        if (!fullShipment) return

        const { fileName, relativePath } = await generateShipmentPdf({ shipment: fullShipment, type: doc.type, actor: req.user })
        await Document.findByIdAndUpdate(doc._id, { fileName, filePath: relativePath })
        doc.fileName = fileName
        doc.filePath = relativePath
      } catch {
        // Do not block listing if regeneration fails; the doc will simply show as broken until regenerated manually.
      }
    })
  )

  res.json({ documents: docs })
}

export async function verifyDoc(req, res) {
  const doc = await Document.findById(req.params.id)
  if (!doc) return res.status(404).json({ error: { message: 'Document not found' } })

  const shipment = await Shipment.findById(doc.shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })
  assertShipmentAccess(req.user, shipment)

  doc.verified = true
  doc.verifiedById = req.user._id
  doc.verifiedAt = new Date()
  await doc.save()

  await audit({ actorId: req.user._id, action: 'DOCUMENT_VERIFIED', entityType: 'Document', entityId: doc._id })

  // Winning-factor automation: if customer pre-funded escrow, auto-release on verified POD.
  if (doc.type === 'POD') {
    const invoice = await Invoice.findOne({ shipmentId: shipment._id })
    if (invoice && invoice.status === 'FUNDED') {
      try {
        await releaseEscrowMock({ invoiceId: invoice._id, method: 'AUTO_ON_POD' })
        await audit({
          actorId: req.user._id,
          action: 'INVOICE_ESCROW_AUTO_RELEASED',
          entityType: 'Invoice',
          entityId: invoice._id,
          metadata: { shipmentId: shipment._id, docId: doc._id },
        })

        if (invoice.customerId) {
          await createNotification({
            userId: invoice.customerId,
            type: 'PAYMENT',
            message: `POD verified. Escrow auto-released for invoice ${String(invoice._id).slice(-6)}.`,
            metadata: { invoiceId: invoice._id, shipmentId: shipment._id },
          })
        }
      } catch {
        // Don't fail doc verification if payment automation fails.
      }
    }
  }

  res.json({ document: doc })
}

export async function generateDocForShipment(req, res) {
  const shipmentId = req.params.shipmentId
  const { type } = req.body

  if (!DOC_TYPES.includes(type)) {
    return res.status(400).json({ error: { message: 'Invalid document type for generation' } })
  }

  const shipment = await Shipment.findById(shipmentId)
    .populate('customerId', 'name email phone address')
    .populate('assignedDriverId', 'name licenseNumber phone')
    .populate('assignedVehicleId', 'plateNumber model type capacity')
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })
  assertShipmentAccess(req.user, shipment)

  // Emulate generation delay for "Realism"
  await new Promise((resolve) => setTimeout(resolve, 800))

  // Generate a professionally formatted PDF file for this shipment & document type
  const { fileName, relativePath } = await generateShipmentPdf({ shipment, type, actor: req.user })

  const doc = await Document.create({
    shipmentId,
    customerId: shipment.customerId,
    driverId: shipment.assignedDriverId,
    vehicleId: shipment.assignedVehicleId,
    type,
    fileName,
    filePath: relativePath,
    uploadedById: req.user._id,
    verified: true, // System-generated are auto-verified
    verifiedAt: new Date(),
    verifiedById: req.user._id,
  })

  // Documentation Journey Automation Linkage
  if (!shipment.journeyPaperwork) {
    shipment.journeyPaperwork = { preJourney: {}, midJourney: { tollReceipts: [], fuelSlips: [] }, postJourney: {} }
  }

  // Map generated doc to shipment paperwork state
  switch (type) {
    case 'DISPATCH_MANIFEST': shipment.journeyPaperwork.preJourney.manifest = doc.filePath; break;
    case 'VEHICLE_INSPECTION': shipment.journeyPaperwork.preJourney.inspectionReport = doc.filePath; break;
    case 'BOOKING_CONFIRMATION': shipment.journeyPaperwork.preJourney.bookingConfirmation = doc.filePath; break;
    case 'POD':
      shipment.journeyPaperwork.postJourney.pod = doc.filePath;
      shipment.proofOfLoading = doc.filePath;
      shipment.proofOfLoadingVerified = true;
      break;
    case 'GST_INVOICE':
      shipment.journeyPaperwork.postJourney.invoice = doc.filePath;
      shipment.paymentStatus = 'PAID';
      break;
  }

  await shipment.save()

  await audit({
    actorId: req.user._id,
    action: 'DOCUMENT_GENERATED',
    entityType: 'Document',
    entityId: doc._id,
    metadata: { shipmentId, type, automated: true }
  })

  // Logic from verifyDoc if it was a POD
  if (type === 'POD') {
    const invoice = await Invoice.findOne({ shipmentId: shipment._id })
    if (invoice && invoice.status === 'FUNDED') {
      try {
        await releaseEscrowMock({ invoiceId: invoice._id, method: 'AUTO_ON_POD_GENERATION' })
      } catch (e) { /* ignore */ }
    }
  }

  res.status(201).json({ document: doc })
}

export async function listAllDocs(req, res) {
  const { category } = req.query
  const query = {}

  // "Opaque" filtering: Ensure users only see what they own.
  if (req.user.role === 'DRIVER') {
    query.driverId = req.user._id
  } else if (req.user.role === 'CUSTOMER') {
    query.customerId = req.user._id
  } else if (req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }

  // Categorisation logic
  if (category === 'SHIPMENT') {
    // All documents are visible shipment-wise (if owned by user)
    query.shipmentId = { $exists: true }
  } else if (category === 'DRIVER') {
    // Documents relevant to drivers
    query.type = { $in: ['CMR_ROAD_CONSIGNMENT_NOTE', 'POD', 'TRIP_SHEET', 'VEHICLE_INSPECTION', 'DISPATCH_MANIFEST'] }
  } else if (category === 'VEHICLE') {
    query.type = { $in: ['PACKING_LIST', 'CMR_ROAD_CONSIGNMENT_NOTE', 'VEHICLE_INSPECTION', 'MAINTENANCE_RECORD', 'VEHICLE_DOCS'] }
  } else if (category === 'CUSTOMER') {
    query.type = { $in: ['COMMERCIAL_INVOICE', 'CERTIFICATE_OF_ORIGIN', 'BILL_OF_LADING', 'AIR_WAYBILL', 'TELEX_RELEASE', 'SEA_WAYBILL', 'GST_INVOICE', 'POD'] }
  } else if (category === 'CONSIGNOR') {
    query.customerId = { $exists: true }
  } else if (category === 'UNIVERSAL') {
    // Standard transport & billing docs
    query.type = { $in: ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'POD', 'GST_INVOICE', 'DISPATCH_MANIFEST'] }
  } else if (category === 'SEA') {
    query.type = { $in: ['BILL_OF_LADING', 'TELEX_RELEASE', 'SEA_WAYBILL'] }
  } else if (category === 'AIR') {
    query.type = { $in: ['AIR_WAYBILL'] }
  } else if (category === 'ROAD') {
    query.type = { $in: ['CMR_ROAD_CONSIGNMENT_NOTE', 'TRIP_SHEET', 'DISPATCH_MANIFEST'] }
  } else if (category === 'CUSTOMS') {
    query.type = { $in: ['SHIPPING_BILL', 'BILL_OF_ENTRY'] }
  }

  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const skip = (page - 1) * limit

  const totalDocs = await Document.countDocuments(query)
  const totalPages = Math.ceil(totalDocs / limit)

  const docs = await Document.find(query)
    .populate('shipmentId', 'referenceId status')
    .populate('customerId', 'name email')
    .populate('driverId', 'name email')
    .populate('vehicleId', 'plateNumber model')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  res.json({
    documents: docs,
    pagination: {
      total: totalDocs,
      page,
      limit,
      totalPages
    }
  })
}

export async function deleteDoc(req, res) {
  const doc = await Document.findById(req.params.id)
  if (!doc) return res.status(404).json({ error: { message: 'Doc not found' } })

  if (req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: { message: 'Only managers can delete documents' } })
  }

  await Document.findByIdAndDelete(req.params.id)
  res.json({ ok: true })
}
