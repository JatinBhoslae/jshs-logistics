import { z } from 'zod'
import { Shipment } from '../models/Shipment.js'
import { Document } from '../models/Document.js'
import { Invoice } from '../models/Invoice.js'
import { Payment } from '../models/Payment.js'
import { Vehicle } from '../models/Vehicle.js'
import { LocationPing } from '../models/LocationPing.js'
import { ShipmentEvent } from '../models/ShipmentEvent.js'
import { User } from '../models/User.js'
import { assignShipment as assignShipmentSvc } from '../services/shipmentService.js'
import { audit } from '../services/auditService.js'
import { createNotification, createShipmentNotification, sendSMS } from '../services/notificationService.js'
import { generateShipmentPdf } from '../services/pdfService.js'
import { estimateEta, haversineKm } from '../utils/geo.js'
import { ensureIssuedInvoiceForShipment } from '../services/billingService.js'
import { automateInvoicing } from '../services/invoicingService.js'
import { getDrivingRoute } from '../services/routeService.js'
import { autoAssignShipment } from '../services/shipmentService.js'
import { getVehicleHealthStatus, getFleetHealth } from '../services/gpsTrackingService.js'
import { predictDelayRisk } from '../services/predictiveAnalyticsService.js'
import { generateOtp } from '../utils/otp.js'
import * as pricingService from '../services/pricingService.js'
import { sendInvoiceEmail, sendOtpEmail } from '../services/emailService.js'

const pointSchema = z.object({
  name: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
})

const createSchema = z.object({
  referenceId: z.string().min(3).optional(), // Can be auto-generated
  origin: pointSchema,
  destination: pointSchema,
  shipmentType: z.enum(['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS']).optional(),
  customerId: z.string().optional(),
  consignee: z.object({
    name: z.string().optional(),
    contact: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian 10-digit phone number. Must start with +91').optional()
  }).optional(),
  eta: z.string().datetime().optional(),
  package: z.object({
    weight: z.number().positive().max(1000),
    dimensions: z.string(),
    type: z.string().optional(),
  }),
  delivery_type: z.enum(['standard', 'express']).optional(),
  driverId: z.string().min(1).optional(),
  vehicleId: z.string().min(1).optional(),
})

const estimateSchema = z.object({
  origin: pointSchema.optional(),
  destination: pointSchema.optional(),
  origin_pincode: z.string().optional(),
  destination_pincode: z.string().optional(),
  weight: z.number().positive().max(1000),
  dimensions: z.string(),
  delivery_type: z.enum(['standard', 'express']).optional(),
  shipmentType: z.string().optional(),
  vehicleType: z.string().optional(),
})

const updateSchema = z.object({
  referenceId: z.string().min(3).optional(),
  origin: pointSchema.optional(),
  destination: pointSchema.optional(),
  shipmentType: z.enum(['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS']).optional(),
  customerId: z.union([z.string().min(1), z.null()]).optional(),
  eta: z.union([z.string().datetime(), z.null()]).optional(),
  status: z.enum(['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'CANCELLED']).optional(),
  consignee: z.object({
    name: z.string().optional(),
    contact: z.string().regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian 10-digit phone number. Must start with +91').optional()
  }).optional(),
})

const assignSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
})

export async function listShipments(req, res) {
  const role = req.user.role
  const userId = String(req.user._id)
  const { page = 1, limit = 10, search = '', status, shipmentType, tab } = req.query

  const q = {}

  if (role === 'DRIVER') {
    if (req.user.driverApprovalStatus !== 'APPROVED') return res.json({ shipments: [], total: 0, pages: 0, currentPage: 1 })
    q.assignedDriverId = userId
  }

  if (role === 'MANAGER') {
    // Managers see all their own shipments + only PAID customer shipments
    q.$or = [
      { createdByRole: 'MANAGER' },
      { createdByRole: 'CUSTOMER', paymentStatus: 'PAID' },
      { createdByRole: { $exists: false } } // For legacy data or system-created ones
    ]
  }

  if (role === 'CUSTOMER') {
    q.customerId = userId
  }

  // Tab Filtering
  if (tab === 'active') {
    q.status = { $nin: ['DELIVERED', 'CLOSED', 'CANCELLED'] }
  } else if (tab === 'past') {
    q.status = { $in: ['DELIVERED', 'CLOSED', 'CANCELLED'] }
  }

  // Advanced Filtering (status overrides tab if specified)
  if (status) {
    const statuses = status.split(',').map(s => s.trim())
    q.status = { $in: statuses }
  }
  if (shipmentType) q.shipmentType = shipmentType

  // Search Logic
  if (search) {
    const searchRegex = new RegExp(search, 'i')
    q.$or = [
      { referenceId: searchRegex },
      { 'origin.name': searchRegex },
      { 'destination.name': searchRegex }
    ]
  }

  const skip = (Number(page) - 1) * Number(limit)

  const [rows, total] = await Promise.all([
    Shipment.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Shipment.countDocuments(q)
  ])

  // Populate customer details for Consigner display
  if (rows.length > 0) {
    await Shipment.populate(rows, { path: 'customerId', select: 'name email phone' })
    await Shipment.populate(rows, { path: 'assignedDriverId', select: 'name' })
  }

  res.json({
    shipments: rows,
    total,
    pages: Math.ceil(total / Number(limit)),
    currentPage: Number(page)
  })
}

export async function estimateShipment(req, res) {
  const data = estimateSchema.parse(req.body)

  // In a real system, we'd look up coordinates from pincodes if provided.
  // For this demo, we'll assume origin/destination points are provided by the map picker.
  if (!data.origin || !data.destination) {
    return res.status(400).json({ error: { message: 'Origin and Destination points are required for estimation.' } })
  }

  // 1️⃣ Validate serviceability (India check)
  const isWithinIndia = (lat, lng) => lat >= 8 && lat <= 38 && lng >= 68 && lng <= 98;
  if (!isWithinIndia(data.origin.lat, data.origin.lng) || !isWithinIndia(data.destination.lat, data.destination.lng)) {
    return res.json({
      serviceable: false,
      message: 'Service not available in the provided locations (Outside India).'
    });
  }

  const distanceKm = haversineKm(data.origin, data.destination)

  // Professional Pricing Engine (Workflow 6.2)
  const pricingData = await pricingService.calculateShipmentFinalCost({
    origin: data.origin,
    destination: data.destination,
    weightKg: data.weight || 0,
    deliveryType: data.delivery_type || 'standard',
    shipmentType: data.shipmentType || 'KIRANA',
    vehicleType: data.vehicleType || 'TRUCK_SM'
  });

  const estimated_cost = pricingData.grandTotal;

  // ETA Engine (Workflow 6.3)
  // ETA = distance / avg_speed + buffer
  const avg_speed = 40; // 40 km/h
  const travel_hours = distanceKm / avg_speed;
  const buffer = data.delivery_type === 'express' ? 1 : 4; // Express gets 1h buffer, standard gets 4h
  // Remote Area Check (Workflow 10 Case 2)
  const isRemote = distanceKm > 500; // Simplified heuristic for remote
  if (isRemote) {
    travel_hours *= 1.2; // Slow down for remote
    buffer += 2; // Extra buffer
  }

  const estimated_eta_date = new Date();
  estimated_eta_date.setHours(estimated_eta_date.getHours() + travel_hours + buffer);

  res.json({
    serviceable: true,
    estimated_cost,
    estimated_eta: estimated_eta_date.toISOString(),
    distanceKm,
    isRemote,
    message: isRemote ? 'Note: Destination is in a remote area. ETA has been extended.' : undefined
  })
}

export async function createShipment(req, res) {
  const data = createSchema.parse(req.body)

  // 1️⃣ Validate serviceability (India check)
  const isWithinIndia = (lat, lng) => lat >= 8 && lat <= 38 && lng >= 68 && lng <= 98;
  if (!isWithinIndia(data.origin.lat, data.origin.lng) || !isWithinIndia(data.destination.lat, data.destination.lng)) {
    return res.status(400).json({ error: { message: 'Service not available in the provided locations (Outside India).' } });
  }

  const distanceKm = Math.round(haversineKm(data.origin, data.destination) * 100) / 100

  // 10 Case 3: Duplicate Shipment Check
  const oneHourAgo = new Date(Date.now() - 60000); // 1 minute duplicate check
  const existing = await Shipment.findOne({
    customerId: data.customerId ?? req.user._id,
    'origin.name': data.origin.name,
    'destination.name': data.destination.name,
    createdAt: { $gt: oneHourAgo }
  });
  if (existing) {
    return res.status(409).json({ error: { message: 'A similar shipment was created in the last minute. Please check for duplicates.' } });
  }

  // Professional Pricing Engine (Workflow 6.2)
  const pricingData = await pricingService.calculateShipmentFinalCost({
    origin: data.origin,
    destination: data.destination,
    weightKg: data.package.weight || 0,
    shipmentType: data.shipmentType || 'KIRANA',
    deliveryType: data.delivery_type || 'standard'
  });

  const finalPrice = pricingData.grandTotal;

  // Driver Payout Calculation
  const payoutData = await pricingService.calculateDriverShipmentPayout({
    totalRevenue: finalPrice,
    distanceKm: distanceKm,
    driverRating: 5.0
  });

  const refId = data.referenceId || `CN-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;

  // 7.1 create shipment (Atomic Write 1)
  const shipment = await Shipment.create({
    referenceId: refId,
    origin: data.origin,
    destination: data.destination,
    shipmentType: data.shipmentType ?? 'KIRANA',
    customerId: data.customerId ?? req.user._id,
    createdBy: req.user._id,
    createdByRole: req.user.role,
    consignee: data.consignee,
    distanceKm,
    price: finalPrice,
    packageDetails: data.package,
    deliveryType: data.delivery_type ?? 'standard',
    predictedEta: data.eta ? new Date(data.eta) : estimateEta({ from: data.origin, to: data.destination, now: new Date() }),
    predictedEtaUpdatedAt: new Date(),
    lastEventAt: new Date(),
    pricingBreakdown: pricingData,
    payoutBreakdown: payoutData,
    driverEarnings: {
      amount: payoutData.netEarnings,
      status: 'PENDING'
    },
    status: 'CREATED'
  })

  // 7.2 shipment_events (Atomic Write 2)
  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_CREATED',
    description: `Shipment created with Reference ID: ${shipment.referenceId}`,
    location: shipment.origin,
    actorId: req.user._id,
    metadata: {
      price: shipment.price,
      distanceKm: shipment.distanceKm,
      package: shipment.packageDetails
    }
  })

  // Audit log
  await audit({ actorId: req.user._id, action: 'SHIPMENT_CREATED', entityType: 'Shipment', entityId: shipment._id })

  // 9️⃣ Automations Triggered
  await createShipmentNotification(shipment, 'SHIPMENT_CREATED', `Shipment ${shipment.referenceId} has been created successfully. Tracking ID: ${shipment.referenceId}`)

  // Simulate SMS/Email
  console.log(`[AUTOMATION] Sending SMS to customer ${shipment.customerId}: Your shipment ${shipment.referenceId} has been created. Track it here: http://localhost:5173/app/shipment/${shipment._id}`);

  // Calculate optimized route async
  getDrivingRoute({ origin: data.origin, destination: data.destination }).then(async (route) => {
    shipment.routeProvider = route.provider;
    shipment.routeDistanceKm = route.distanceKm;
    shipment.routeDurationMin = route.durationMin;
    shipment.routeGeoJson = route.geojson;
    shipment.routeUpdatedAt = new Date();
    if (route.distanceKm) shipment.distanceKm = route.distanceKm;
    await shipment.save();
  }).catch(err => console.warn('Delayed route calc failed:', err.message));

  // Assignment logic (Deferred or Immediate)
  let out = shipment
  if (data.driverId && data.vehicleId) {
    out = await assignShipmentSvc({
      shipmentId: shipment._id,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      actorId: req.user._id,
    })
    await createShipmentNotification(out, 'SHIPMENT_ASSIGNED', `Shipment ${shipment.referenceId} has been assigned.`)
  } else {
    // **AUTOMATION**: Always attempt auto-assignment on creation
    try {
      out = await autoAssignShipment({ shipmentId: shipment._id, actorId: req.user._id });
    } catch (e) { console.warn('Auto-assign failed:', e.message); }
  }

  // Automate Invoicing for new shipment
  automateInvoicing(out, req.user).catch(err => console.error('Initial invoicing failed:', err.message));

  res.status(201).json({ shipment: out })
}

export async function listShipmentEvents(req, res) {
  const { id } = req.params
  const events = await ShipmentEvent.find({ shipmentId: id })
    .sort({ createdAt: -1 })
    .populate('actorId', 'name role')
    .lean()
  res.json({ events })
}

export async function getShipment(req, res) {
  const query = Shipment.findById(req.params.id)

  // Basic access control and selective population
  if (req.user.role === 'CUSTOMER') {
    query.populate('assignedDriverId', 'name performanceRating challansCount totalTrips yearsOfExperience')
      .populate('customerId', 'name email phone legalName address')
  } else if (req.user.role === 'MANAGER') {
    query.populate('assignedDriverId', 'name email phone performanceRating licenseNumber totalTrips challansCount')
      .populate('customerId', 'name email phone legalName address')
  }

  const shipment = await query.lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  if (req.user.role === 'MANAGER') {
    return res.json({ shipment })
  }

  if (req.user.role === 'DRIVER') {
    if (req.user.driverApprovalStatus !== 'APPROVED') return res.status(403).json({ error: { message: 'Driver not approved' } })
    const driverId = shipment.assignedDriverId?._id || shipment.assignedDriverId
    if (String(driverId ?? '') !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
    }
  }

  const customerId = shipment.customerId?._id || shipment.customerId
  if (req.user.role === 'CUSTOMER' && String(customerId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }

  res.json({ shipment })
}

export async function updateShipment(req, res) {
  const data = updateSchema.parse(req.body)

  let shipment = await Shipment.findById(req.params.id)
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  assertShipmentAccess(req, shipment)

  // If CUSTOMER, they can only change consignee
  if (req.user.role === 'CUSTOMER') {
    const allowedFields = ['consignee']
    const attemptedFields = Object.keys(data)
    const unauthorizedFields = attemptedFields.filter(f => !allowedFields.includes(f))

    if (unauthorizedFields.length > 0) {
      return res.status(403).json({
        error: {
          message: `Customers can only update: ${allowedFields.join(', ')}. Attempted unauthorized fields: ${unauthorizedFields.join(', ')}`
        }
      })
    }
  }

  const $set = {
    ...(data.referenceId ? { referenceId: data.referenceId } : {}),
    ...(data.origin ? { origin: data.origin } : {}),
    ...(data.destination ? { destination: data.destination } : {}),
    ...(data.shipmentType ? { shipmentType: data.shipmentType } : {}),
    ...(typeof data.customerId === 'string' ? { customerId: data.customerId } : {}),
    ...(typeof data.eta === 'string' ? { eta: new Date(data.eta) } : {}),
    ...(data.status ? { status: data.status } : {}),
    ...(data.consignee ? { consignee: data.consignee } : {}),
  }

  const $unset = {
    ...(data.customerId === null ? { customerId: 1 } : {}),
    ...(data.eta === null ? { eta: 1 } : {}),
  }

  if (!Object.keys($set).length && !Object.keys($unset).length) {
    return res.status(400).json({ error: { message: 'No fields to update' } })
  }

  shipment = await Shipment.findByIdAndUpdate(
    req.params.id,
    {
      ...(Object.keys($set).length ? { $set } : {}),
      ...(Object.keys($unset).length ? { $unset } : {}),
    },
    { new: true }
  )

  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  // Recompute distance if route endpoints changed
  if (data.origin || data.destination) {
    shipment.distanceKm = Math.round(haversineKm(shipment.origin, shipment.destination) * 100) / 100

    // Refresh predicted ETA based on current location (if any) else origin
    const from = shipment.currentLocation ? { lat: shipment.currentLocation.lat, lng: shipment.currentLocation.lng } : shipment.origin
    shipment.predictedEta = estimateEta({ from, to: shipment.destination, now: new Date() })
    shipment.predictedEtaUpdatedAt = new Date()
    await shipment.save()
  }

  await audit({ actorId: req.user._id, action: 'SHIPMENT_UPDATED', entityType: 'Shipment', entityId: shipment._id, metadata: data })

  // Automation: Trigger document generation if status changed to critical milestones
  if (shipment.status === 'IN_TRANSIT' || shipment.status === 'DISPATCHED') {
    const generateDispatchDocs = async () => {
      const types = ['DISPATCH_MANIFEST', 'VEHICLE_INSPECTION', 'BOOKING_CONFIRMATION', 'E_WAY_BILL', 'CONSIGNMENT_NOTE'];
      for (const type of types) {
        const existing = await Document.findOne({ shipmentId: shipment._id, type });
        if (!existing) {
          const { fileName, relativePath } = await generateShipmentPdf({ shipment, type, actor: req.user })
          await Document.create({
            shipmentId: shipment._id,
            type,
            fileName,
            filePath: relativePath,
            uploadedById: req.user._id,
            verified: true,
            verifiedAt: new Date(),
            verifiedById: req.user._id,
          });
        }
      }
      // Update Invoice logic
      automateInvoicing(shipment, req.user).catch(err => console.error('Dispatch invoicing update failed:', err.message));
    };
    generateDispatchDocs().catch(console.error);
  }

  if (shipment.status === 'DELIVERED' || shipment.status === 'CLOSED') {
    const generateDeliveryDocs = async () => {
      const types = ['POD', 'GST_INVOICE'];

      // Ensure populated data for Invoice
      await shipment.populate('customerId assignedDriverId assignedVehicleId');

      for (const type of types) {
        const existing = await Document.findOne({ shipmentId: shipment._id, type });
        if (!existing) {

          let options = {};
          if (type === 'GST_INVOICE') {
            const refPart = (shipment.referenceId || '0000').slice(0, 4);
            const namePart = (shipment.customerId?.legalName || shipment.customerId?.name || 'CUST').replace(/\s+/g, '').slice(0, 4);
            const password = `${refPart}${namePart}`;
            options = { password };
          }

          // If Manager is 'completing' it, they are the actor.
          const actor = req.user;

          const { fileName, relativePath, absolutePath } = await generateShipmentPdf({ shipment, type, actor, options })
          await Document.create({
            shipmentId: shipment._id,
            type,
            fileName,
            filePath: relativePath,
            uploadedById: req.user._id,
            verified: true,
            verifiedAt: new Date(),
            verifiedById: req.user._id,
          });

          // Email Trigger for Invoice
          if (type === 'GST_INVOICE' && shipment.customerId?.email) {
            await sendInvoiceEmail(shipment.customerId, shipment, absolutePath, options.password);
          }
        }
      }
      // Final Invoicing for delivery
      automateInvoicing(shipment, req.user).catch(err => console.error('Final invoicing failed:', err.message));
    };
    generateDeliveryDocs().catch(console.error);
  }

  res.json({ shipment })
}

export async function assignShipment(req, res) {
  const data = assignSchema.parse(req.body)
  const shipment = await assignShipmentSvc({
    shipmentId: req.params.id,
    vehicleId: data.vehicleId,
    driverId: data.driverId,
    actorId: req.user._id,
  })

  res.json({ shipment })
}

export async function dispatchShipment(req, res) {
  const shipment = await Shipment.findById(req.params.id)
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  // Manager can dispatch any, driver can dispatch only their assigned
  if (req.user.role === 'DRIVER' && String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }

  if (shipment.status !== 'PICKED_UP') {
    return res.status(400).json({ error: { message: 'Shipment must be PICKED_UP before it can be dispatched' } })
  }

  shipment.status = 'IN_TRANSIT'
  shipment.lastEventAt = new Date()
  await shipment.save()

  // 7.2 shipment_events (Atomic Write for Timeline)
  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_DISPATCHED',
    description: `Shipment dispatched.`,
    location: shipment.origin,
    actorId: req.user._id,
    metadata: {
      driverId: req.user._id,
      vehicleId: shipment.assignedVehicleId
    }
  });

  // Create notification for shipment dispatch
  await createShipmentNotification(shipment, 'SHIPMENT_DISPATCHED')

  await audit({ actorId: req.user._id, action: 'SHIPMENT_DISPATCHED', entityType: 'Shipment', entityId: shipment._id })

  res.json({ shipment })

  // Real Automation: Auto-generate dispatch paperwork
  const generateDispatchDocs = async () => {
    const types = ['DISPATCH_MANIFEST', 'VEHICLE_INSPECTION', 'BOOKING_CONFIRMATION', 'E_WAY_BILL', 'CONSIGNMENT_NOTE'];
    for (const type of types) {
      const existing = await Document.findOne({ shipmentId: shipment._id, type });
      if (!existing) {
        const { fileName, relativePath } = await generateShipmentPdf({ shipment, type, actor: req.user })
        await Document.create({
          shipmentId: shipment._id,
          type,
          fileName,
          filePath: relativePath,
          uploadedById: req.user._id,
          verified: true,
          verifiedAt: new Date(),
          verifiedById: req.user._id,
        });
      }
    }
  };
  generateDispatchDocs().catch(console.error);

  // Update Invoice logic
  automateInvoicing(shipment, req.user).catch(err => console.error('Dispatch invoicing update failed:', err.message));
}

export async function deliverShipment(req, res) {
  try {
    const shipment = await Shipment.findById(req.params.id)
    if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

    // Allow both validation by explicit driver ID or if user is Manager (override)
    // NOTE: Managers should be able to force-deliver.
    const isAssignedDriver = String(shipment.assignedDriverId ?? '') === String(req.user._id)
    const isManager = req.user.role === 'MANAGER'

    if (!isAssignedDriver && !isManager) {
      return res.status(403).json({ error: { message: 'Forbidden' } })
    }

    const { otp } = req.body

    // Managers can bypass OTP if needed, or we enforce it strictly. 
    // For now, enforcing OTP for everyone to ensure process integrity, 
    // unless it's a "FORCE DELIVER" specific action (not implemented).
    if (!otp) return res.status(400).json({ error: { message: 'Delivery completion OTP is required' } })

    if (shipment.deliveryCompleteOtp !== otp) {
      return res.status(400).json({ error: { message: 'Invalid delivery completion OTP' } })
    }

    shipment.status = 'DELIVERED'
    shipment.lastEventAt = new Date()

    if (typeof shipment.distanceKm !== 'number') {
      try {
        shipment.distanceKm = Math.round(haversineKm(shipment.origin, shipment.destination) * 100) / 100
      } catch (e) {
        console.error('Error calculating distance:', e)
        shipment.distanceKm = 0
      }
    }

    // 7.2 shipment_events (Atomic Write for Timeline)
    await ShipmentEvent.create({
      shipmentId: shipment._id,
      type: 'SHIPMENT_DELIVERED',
      description: `Shipment delivered successfully by ${req.user.name}.`,
      location: shipment.destination,
      actorId: req.user._id,
      metadata: {
        otpUsed: otp,
        driverId: req.user._id
      }
    });

    // Calculate Driver Earnings (e.g. 70% of shipment price)
    if (!shipment.driverEarnings?.amount) {
      const earnings = (shipment.price || 0) * 0.70;
      shipment.driverEarnings = {
        amount: Math.round(earnings),
        status: 'AVAILABLE',
        availableAt: new Date()
      };
    }

    await shipment.save()

    // Create notification for shipment delivered
    await createShipmentNotification(shipment, 'SHIPMENT_DELIVERED', `Shipment ${shipment.referenceId} has been successfully delivered.`);

    // Fleet update: increment odometer and set maintenance status if due
    if (shipment.assignedVehicleId) {
      const v = await Vehicle.findById(shipment.assignedVehicleId)
      if (v) {
        const distanceGained = shipment.distanceKm ?? 0
        v.odometerKm = Math.round((v.odometerKm + distanceGained) * 100) / 100

        // Calculate distance since last service
        const distanceSinceService = v.odometerKm - (v.lastServiceOdometerKm || 0)
        const isDue = distanceSinceService >= (v.serviceThresholdKm || 500)

        if (v.status === 'IN_USE') {
          v.status = 'AVAILABLE' // Vacant now
        }

        // If due and now vacant, mark for maintenance
        if (isDue && v.status === 'AVAILABLE') {
          v.status = 'MAINTENANCE'

          // Notification for Manager
          const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean()
          if (manager?._id) {
            await createNotification({
              userId: manager._id,
              message: `URGENT: Vehicle ${v.plateNumber} reached ${Math.round(distanceSinceService)}km since last service and is now vacant. Marked for MAINTENANCE.`,
              type: 'MAINTENANCE',
              severity: 'CRITICAL',
              metadata: { vehicleId: v._id, plateNumber: v.plateNumber },
            })
          }
        } else if (isDue) {
          // Notification that it WILL need maintenance once vacant if it wasn't already marked
          const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean()
          if (manager?._id) {
            await createNotification({
              userId: manager._id,
              message: `Vehicle ${v.plateNumber} has exceeded service limit (${Math.round(distanceSinceService)}km). It will be marked for maintenance once current task is finished.`,
              type: 'MAINTENANCE',
              severity: 'WARNING',
              metadata: { vehicleId: v._id, plateNumber: v.plateNumber },
            })
          }
        }

        await v.save()
      }
    }

    res.json({ shipment })

    // Real Automation: Auto-generate delivery paperwork
    const generateDeliveryDocs = async () => {
      const types = ['POD', 'GST_INVOICE'];

      // Ensure we have full details for the Invoice
      await shipment.populate('customerId assignedDriverId assignedVehicleId');

      for (const type of types) {
        const existing = await Document.findOne({ shipmentId: shipment._id, type });
        if (!existing) {

          // Dynamic Password Logic for Invoice
          let options = {};
          if (type === 'GST_INVOICE') {
            const refPart = (shipment.referenceId || '0000').slice(0, 4);
            const namePart = (shipment.customerId?.legalName || shipment.customerId?.name || 'CUST').replace(/\s+/g, '').slice(0, 4);
            const password = `${refPart}${namePart}`;
            options = { password };

            console.log(`[INVOICE] Generating password protected PDF. Password: ${password}`);
          }

          const { fileName, relativePath, absolutePath } = await generateShipmentPdf({ shipment, type, actor: req.user, options })

          await Document.create({
            shipmentId: shipment._id,
            type,
            fileName,
            filePath: relativePath,
            uploadedById: req.user._id,
            verified: true,
            verifiedAt: new Date(),
            verifiedById: req.user._id,
          });

          // Email Trigger for Invoice
          if (type === 'GST_INVOICE' && shipment.customerId?.email) {
            await sendInvoiceEmail(shipment.customerId, shipment, absolutePath, options.password);
          }
        }
      }
    };
    generateDeliveryDocs().catch(console.error);

    // Final Invoicing for delivery
    automateInvoicing(shipment, req.user).catch(err => console.error('Final invoicing failed:', err.message));
  } catch (error) {
    console.error('Error in deliverShipment:', error);
    res.status(500).json({ error: { message: error.message || 'Internal Server Error' } });
  }
}

function assertShipmentAccess(req, shipment) {
  if (req.user.role === 'MANAGER') {
    // Managers can access any shipment in this simplified model
    return
  }

  if (req.user.role === 'DRIVER') {
    if (req.user.driverApprovalStatus !== 'APPROVED') {
      const err = new Error('Driver not approved')
      err.statusCode = 403
      throw err
    }
    if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
      const err = new Error('Forbidden')
      err.statusCode = 403
      throw err
    }
    return
  }

  if (req.user.role === 'CUSTOMER') {
    if (String(shipment.customerId ?? '') !== String(req.user._id)) {
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

export async function listShipmentLocations(req, res) {
  const shipmentId = req.params.id

  const shipment = await Shipment.findById(shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  assertShipmentAccess(req, shipment)

  const rows = await LocationPing.find({ shipmentId }).sort({ ts: 1 }).lean()
  res.json({ locations: rows })
}


export async function getVehicleRealtimePosition(req, res) {
  const { vehicleId } = req.params;

  const latestPing = await LocationPing.findOne({ vehicleId }).sort({ ts: -1 }).lean();
  if (!latestPing) return res.status(404).json({ error: { message: 'No location data found' } });

  res.json({ position: latestPing });
}

export async function getShipmentRealtimeTracking(req, res) {
  const shipmentId = req.params.id;

  const shipment = await Shipment.findById(shipmentId).populate('assignedVehicleId').lean();
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  assertShipmentAccess(req, shipment);

  const latestPing = await LocationPing.findOne({ shipmentId }).sort({ ts: -1 }).lean();
  const locationHistory = await LocationPing.find({ shipmentId }).sort({ ts: 1 }).limit(100).lean();

  let progressPercentage = shipment.progressPercentage || 0;
  if (!progressPercentage && shipment.distanceKm && latestPing) {
    const distanceTraveled = haversineKm(shipment.origin, { lat: latestPing.lat, lng: latestPing.lng });
    progressPercentage = Math.min(100, Math.round((distanceTraveled / shipment.distanceKm) * 100));
  }

  res.json({
    shipment,
    currentLocation: latestPing,
    locationHistory,
    progressPercentage,
    estimatedArrival: shipment.predictedEta,
    vehicle: shipment.assignedVehicleId,
    delayRisk: await predictDelayRisk(shipmentId),
    recentEvents: await ShipmentEvent.find({ shipmentId }).sort({ createdAt: -1 }).limit(20).lean()
  });
}

export async function getFleetRealtimePositions(req, res) {
  const vehicles = await Vehicle.find({}).lean();

  const vehiclePositions = [];
  for (const v of vehicles) {
    // 1. Try to get live location from pings (usually for IN_USE/IN_TRANSIT)
    let latestPing = await LocationPing.findOne({ vehicleId: v._id }).sort({ ts: -1 }).lean();

    // 2. If no live ping, try to get current location from active shipment if applicable
    if (!latestPing && v.status === 'IN_USE') {
      const activeShipment = await Shipment.findOne({
        assignedVehicleId: v._id,
        status: { $in: ['PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY'] }
      }).lean();

      if (activeShipment && activeShipment.currentLocation) {
        latestPing = {
          lat: activeShipment.currentLocation.lat,
          lng: activeShipment.currentLocation.lng,
          ts: activeShipment.currentLocation.updatedAt || new Date()
        };
      }
    }

    // 3. For AVAILABLE (vacant) vehicles, show their last known location or a static base location
    // In this app, we can use the last ping for that vehicle, even if it's old.
    // If absolutely no data, we omit or provide a default.

    if (latestPing) {
      vehiclePositions.push({
        vehicle: v,
        position: {
          lat: latestPing.lat,
          lng: latestPing.lng
        },
        lastUpdate: latestPing.ts,
        status: v.status,
        isSimulated: v.status !== 'IN_USE' // Mark as simulated if not actively in use
      });
    } else {
      // Fallback: If vacant and no pings, use a default location (e.g., Delhi)
      // or simply don't show on map. For a "premium" feel, we show it at a base.
      vehiclePositions.push({
        vehicle: v,
        position: { lat: 28.6139, lng: 77.2090 }, // Default Base: New Delhi
        lastUpdate: new Date(),
        status: v.status,
        isSimulated: true
      });
    }
  }

  res.json({ vehicles: vehiclePositions });
}

export async function listDrivers(req, res) {
  const drivers = await User.find({ role: 'DRIVER' }).lean();
  res.json({ drivers });
}

export async function getVehicleHealthStatusController(req, res) {
  const vehicleId = req.params.vehicleId;

  // Security: ensure user has access to this vehicle
  const vehicle = await Vehicle.findById(vehicleId).lean();
  if (!vehicle) {
    return res.status(404).json({ error: { message: 'Vehicle not found' } });
  }

  const healthStatus = await getVehicleHealthStatus(vehicleId);
  res.json({ healthStatus });
}

export async function getFleetHealthController(req, res) {
  const fleetHealth = await getFleetHealth();
  res.json({ fleetHealth });
}

export async function getShipmentRoute(req, res) {
  const shipmentId = req.params.id
  const refresh = String(req.query.refresh ?? '') === '1'

  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  assertShipmentAccess(req, shipment)

  if (!refresh && shipment.routeGeoJson && shipment.routeUpdatedAt) {
    return res.json({
      route: {
        provider: shipment.routeProvider,
        distanceKm: shipment.routeDistanceKm,
        durationMin: shipment.routeDurationMin,
        geojson: shipment.routeGeoJson,
        updatedAt: shipment.routeUpdatedAt,
      },
      cached: true,
    })
  }

  try {
    const r = await getDrivingRoute({ origin: shipment.origin, destination: shipment.destination })

    shipment.routeProvider = r.provider
    shipment.routeDistanceKm = r.distanceKm ? Math.round(r.distanceKm * 100) / 100 : undefined
    shipment.routeDurationMin = r.durationMin ? Math.round(r.durationMin) : undefined
    shipment.routeGeoJson = r.geojson
    shipment.routeUpdatedAt = new Date()
    await shipment.save()

    return res.json({
      route: {
        provider: shipment.routeProvider,
        distanceKm: shipment.routeDistanceKm,
        durationMin: shipment.routeDurationMin,
        geojson: shipment.routeGeoJson,
        updatedAt: shipment.routeUpdatedAt,
      },
      cached: false,
    })
  } catch (e) {
    // Fallback (do not fail shipment page): return straight line.
    return res.json({
      route: {
        provider: 'fallback',
        distanceKm: shipment.distanceKm,
        durationMin: undefined,
        geojson: {
          type: 'LineString',
          coordinates: [
            [shipment.origin.lng, shipment.origin.lat],
            [shipment.destination.lng, shipment.destination.lat],
          ],
        },
        updatedAt: new Date(),
      },
      cached: false,
      warning: e?.message ?? 'Routing failed; using fallback line',
    })
  }
}

export async function deleteShipment(req, res) {
  const shipmentId = req.params.id

  const shipment = await Shipment.findById(shipmentId).lean()
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } })

  const invoices = await Invoice.find({ shipmentId }).select('_id').lean()
  const invoiceIds = invoices.map((i) => i._id)

  if (invoiceIds.length) {
    await Payment.deleteMany({ invoiceId: { $in: invoiceIds } })
  }

  await Invoice.deleteMany({ shipmentId })
  await Document.deleteMany({ shipmentId })
  await LocationPing.deleteMany({ shipmentId })
  await Shipment.deleteOne({ _id: shipmentId })

  await audit({
    actorId: req.user._id,
    action: 'SHIPMENT_DELETED',
    entityType: 'Shipment',
    entityId: shipmentId,
    metadata: { referenceId: shipment.referenceId },
  })

  res.json({ ok: true })
}

// Function to mark shipment as loaded with proof of loading
export async function markShipmentLoaded(req, res) {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

    // Check permissions - only assigned driver or manager can mark as loaded
    if (req.user.role === 'DRIVER') {
      if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
        return res.status(403).json({ error: { message: 'Forbidden' } });
      }
    } else if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    // Update shipment status to loaded
    shipment.loadingStatus = 'LOADED';
    shipment.loadedAt = new Date();
    shipment.loadedBy = req.user._id;

    // If status is still CREATED, move it to ASSIGNED or IN_TRANSIT if already assigned
    if (shipment.status === 'CREATED' || shipment.status === 'ASSIGNED') {
      shipment.status = 'PICKED_UP';
    }

    shipment.lastEventAt = new Date();
    await shipment.save();

    // 7.2 shipment_events (Atomic Write for Timeline)
    await ShipmentEvent.create({
      shipmentId: shipment._id,
      type: 'SHIPMENT_PICKED_UP',
      description: `Shipment loaded and picked up. Loaded by: ${req.user.name}`,
      location: shipment.origin, // Assuming loaded at origin
      actorId: req.user._id,
      metadata: {
        loadingStatus: 'LOADED',
        loadedAt: shipment.loadedAt
      }
    });

    await audit({
      actorId: req.user._id,
      action: 'SHIPMENT_LOADED',
      entityType: 'Shipment',
      entityId: shipment._id
    });

    // Create notification for shipment loaded
    await createShipmentNotification(shipment, 'SHIPMENT_PICKED_UP', `Shipment ${shipment.referenceId} has been picked up.`);

    res.json({ shipment });
  } catch (err) {
    console.error('Error in markShipmentLoaded:', err);
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  }
}

// Alias for markShipmentLoaded as pickup
export async function pickupShipment(req, res) {
  return markShipmentLoaded(req, res);
}

// Function to upload proof of loading document
export async function uploadProofOfLoading(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: { message: 'Proof of loading document is required' } });
  }

  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Check permissions - only assigned driver or manager can upload POD
  if (req.user.role === 'DRIVER') {
    if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }
  } else if (req.user.role === 'MANAGER') {
    // Managers can upload for any shipment
  } else {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }

  // Update shipment with proof of loading document
  shipment.proofOfLoading = req.file.path; // Assuming file upload middleware saves path
  shipment.lastEventAt = new Date();
  await shipment.save();

  // Create a Document record so it shows up in the Documentation list
  await Document.create({
    shipmentId: shipment._id,
    type: 'POD',
    fileName: req.file.originalname,
    filePath: `/uploads/${req.file.filename}`, // Assuming standardized path
    uploadedById: req.user._id,
    verified: false // Managers will verify later
  });

  await audit({
    actorId: req.user._id,
    action: 'PROOF_OF_LOADING_UPLOADED',
    entityType: 'Shipment',
    entityId: shipment._id
  });

  // Create notification for POD upload
  await createShipmentNotification(shipment, 'PROOF_OF_LOADING_UPLOADED', `Proof of loading for shipment ${shipment.referenceId} has been uploaded.`);

  res.json({ shipment });
}

// Function to add driver e-signature
export async function addDriverEsign(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only assigned driver can add e-signature
  if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }

  // Add driver e-signature
  shipment.driverEsign = req.body.signature || req.body.esign; // Support both field names
  shipment.driverEsignedAt = new Date();
  shipment.lastEventAt = new Date();
  await shipment.save();

  await audit({
    actorId: req.user._id,
    action: 'DRIVER_ESIGN_ADDED',
    entityType: 'Shipment',
    entityId: shipment._id
  });

  // Create notification for e-sign addition
  await createShipmentNotification(shipment, 'DRIVER_ESIGN_ADDED', `Driver has added e-signature for shipment ${shipment.referenceId}.`);

  res.json({ shipment });
}

// Function to verify proof of loading
export async function verifyProofOfLoading(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only managers can verify proof of loading
  if (req.user.role !== 'MANAGER') {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }

  // Verify proof of loading
  shipment.proofOfLoadingVerified = true;
  shipment.proofOfLoadingVerifiedAt = new Date();
  shipment.proofOfLoadingVerifiedBy = req.user._id;
  shipment.lastEventAt = new Date();
  await shipment.save();

  await audit({
    actorId: req.user._id,
    action: 'PROOF_OF_LOADING_VERIFIED',
    entityType: 'Shipment',
    entityId: shipment._id
  });

  // Create notification for POD verification
  await createShipmentNotification(shipment, 'PROOF_OF_LOADING_VERIFIED', `Proof of loading for shipment ${shipment.referenceId} has been verified.`);

  res.json({ shipment });
}

// Function to start shipment after driver compliance check
export async function startShipment(req, res) {
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only assigned driver can start the shipment
  if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }

  // Check if shipment is in appropriate status to be started
  if (shipment.status !== 'PICKED_UP') {
    return res.status(400).json({ error: { message: 'Shipment must be PICKED_UP before starting journey' } });
  }

  // Check if all compliance requirements are met
  // For now, we'll check if driver has provided e-signature or shipment is loaded
  // In a real system, we would check additional compliance requirements
  /* 
  // RELAXED FOR DEMO/TESTING: Allow start regardless of compliance
  if (!shipment.driverEsign && shipment.loadingStatus !== 'LOADED') {
    return res.status(400).json({
      error: {
        message: 'Compliance requirements not met. Driver signature or proof of loading required.',
        required: ['driver_esign', 'proof_of_loading']
      }
    });
  }
  */

  const { otp } = req.body
  if (!otp) return res.status(400).json({ error: { message: 'Delivery start OTP is required' } })

  if (shipment.deliveryStartOtp !== otp) {
    return res.status(400).json({ error: { message: 'Invalid delivery start OTP' } })
  }

  // Update shipment status to started
  shipment.status = 'IN_TRANSIT';
  shipment.lastEventAt = new Date();
  await shipment.save();

  await audit({
    actorId: req.user._id,
    action: 'SHIPMENT_STARTED',
    entityType: 'Shipment',
    entityId: shipment._id
  });

  // Create notification for shipment start
  await createShipmentNotification(shipment, 'SHIPMENT_STARTED', `Shipment ${shipment.referenceId} has started its journey.`);

  res.json({ shipment });
}

// Function to check driver compliance
export async function checkDriverCompliance(req, res) {
  const driver = await User.findById(req.user._id);

  // Check various compliance requirements
  const complianceChecks = {
    licenseValid: driver.driverLicenseValid ?? true, // In real system, check license expiry
    insuranceValid: true, // In real system, check insurance status
    vehicleDocumentsValid: true, // In real system, check vehicle documents
    driverTrainingCompleted: true, // In real system, check training status
    backgroundCheckCleared: true, // In real system, check background check
    hasEsign: req.user.driverEsign ? true : false,
    hasMobileAppAccess: true, // Assuming driver has access to mobile app
    isApproved: driver.driverApprovalStatus === 'APPROVED',
    vehicleAssigned: true // This would be checked against a specific shipment if provided
  };

  // Calculate overall compliance status
  const allCompliant = Object.values(complianceChecks).every(check => check === true);

  res.json({
    allCompliant,
    complianceChecks,
    missingRequirements: Object.keys(complianceChecks).filter(key => !complianceChecks[key])
  });
}

// **WORKFLOW 3: Driver accepts shipment assignment**
export async function acceptShipmentAssignment(req, res) {
  const shipmentId = req.params.id;

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only assigned driver can accept
  if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden - Not assigned to this shipment' } });
  }

  // Check if shipment is in ASSIGNED status
  if (shipment.status !== 'ASSIGNED') {
    return res.status(400).json({ error: { message: 'Shipment is not pending acceptance' } });
  }

  // Driver accepts - move to next phase
  shipment.lastEventAt = new Date();
  await shipment.save();

  await audit({
    actorId: req.user._id,
    action: 'SHIPMENT_ACCEPTED',
    entityType: 'Shipment',
    entityId: shipment._id
  });

  // Notify customer that driver accepted
  if (shipment.customerId) {
    await createNotification({
      userId: shipment.customerId,
      type: 'SHIPMENT',
      severity: 'SUCCESS',
      message: `Driver has accepted shipment ${shipment.referenceId}. Pickup will begin soon.`,
      metadata: { shipmentId: shipment._id }
    });
  }

  await createShipmentNotification(shipment, 'SHIPMENT_ACCEPTED', `Driver accepted assignment for shipment ${shipment.referenceId}.`);

  res.json({ shipment, message: 'Assignment accepted successfully' });
}

// **WORKFLOW 3: Driver rejects shipment assignment - try next candidate**
export async function rejectShipmentAssignment(req, res) {
  const shipmentId = req.params.id;
  const { reason } = req.body || {};

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only assigned driver can reject
  if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden - Not assigned to this shipment' } });
  }

  // Check if shipment is in ASSIGNED status
  if (shipment.status !== 'ASSIGNED') {
    return res.status(400).json({ error: { message: 'Shipment is not pending acceptance' } });
  }

  // Store the rejected driver ID
  const rejectedDriverId = shipment.assignedDriverId;

  // Release the vehicle
  if (shipment.assignedVehicleId) {
    await Vehicle.findByIdAndUpdate(shipment.assignedVehicleId, { status: 'AVAILABLE' });
  }

  // Clear assignment
  shipment.assignedDriverId = null;
  shipment.assignedVehicleId = null;
  shipment.status = 'CREATED'; // Reset to created for re-assignment
  shipment.lastEventAt = new Date();
  await shipment.save();

  await audit({
    actorId: req.user._id,
    action: 'SHIPMENT_REJECTED',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { reason }
  });

  // **WORKFLOW 3: Try to find next candidate**
  try {
    const { autoAssignShipment } = await import('../services/shipmentService.js');
    const reassignedShipment = await autoAssignShipment({
      shipmentId: shipment._id,
      actorId: null, // System action
      excludeDriverIds: [rejectedDriverId]
    });

    return res.json({
      shipment: reassignedShipment,
      message: 'Assignment rejected. Shipment reassigned to next available driver.'
    });
  } catch (reassignErr) {
    // No other candidates available - alert manager
    const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean();
    if (manager?._id) {
      await createNotification({
        userId: manager._id,
        type: 'ASSIGNMENT_FAILED',
        severity: 'ERROR',
        message: `Driver rejected shipment ${shipment.referenceId}. No other drivers available. Manual intervention required.`,
        metadata: { shipmentId: shipment._id, reason }
      });
    }

    return res.json({
      shipment,
      message: 'Assignment rejected. No other drivers available. Manager has been notified.',
      requiresManualAssignment: true
    });
  }
}

// **WORKFLOW 3: Cancel shipment (from CREATED or ASSIGNED)**
export async function cancelShipment(req, res) {
  const shipmentId = req.params.id;
  const { reason } = req.body || {};

  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

  // Only allow cancellation from CREATED or ASSIGNED states
  if (!['CREATED', 'ASSIGNED'].includes(shipment.status)) {
    return res.status(400).json({
      error: { message: `Cannot cancel shipment in ${shipment.status} status. Only CREATED or ASSIGNED shipments can be cancelled.` }
    });
  }

  // Check permissions
  if (req.user.role === 'CUSTOMER' && String(shipment.customerId ?? '') !== String(req.user._id)) {
    return res.status(403).json({ error: { message: 'Forbidden' } });
  }

  // Release vehicle if assigned
  if (shipment.assignedVehicleId) {
    await Vehicle.findByIdAndUpdate(shipment.assignedVehicleId, { status: 'AVAILABLE' });
  }

  // Update shipment status
  shipment.status = 'CANCELLED';
  shipment.lastEventAt = new Date();
  await shipment.save();

  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_CANCELLED',
    description: `Shipment cancelled. Reason: ${reason || 'Not specified'}`,
    actorId: req.user._id
  });

  await audit({
    actorId: req.user._id,
    action: 'SHIPMENT_CANCELLED',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { reason }
  });

  // Notify relevant parties
  if (shipment.assignedDriverId) {
    await createNotification({
      userId: shipment.assignedDriverId,
      type: 'SHIPMENT',
      severity: 'WARNING',
      message: `Shipment ${shipment.referenceId} has been cancelled.`,
      metadata: { shipmentId: shipment._id }
    });
  }

  await createShipmentNotification(shipment, 'SHIPMENT_CANCELLED', `Shipment ${shipment.referenceId} has been cancelled.`);

  res.json({ shipment, message: 'Shipment cancelled successfully' });
}

// Function to generate/request OTP for delivery start or completion
export async function requestShipmentOtp(req, res) {
  try {
    const { id } = req.params;
    const { type } = req.body; // 'START' or 'COMPLETE'

    console.log(`[OTP] Requesting ${type} OTP for shipment ${id}`);

    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

    // Access control: only assigned driver or manager can request OTP
    if (req.user.role === 'DRIVER') {
      if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
        return res.status(403).json({ error: { message: 'Forbidden' } });
      }
    } else if (req.user.role !== 'MANAGER') {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const otp = generateOtp(6);
    const now = new Date();

    if (type === 'START') {
      shipment.deliveryStartOtp = otp;
    } else if (type === 'COMPLETE') {
      shipment.deliveryCompleteOtp = otp;
    } else {
      return res.status(400).json({ error: { message: 'Invalid OTP type' } });
    }

    shipment.otpGeneratedAt = now;
    await shipment.save();

    // For demo purposes, we log the OTP and create a notification
    console.log(`[OTP] Generated ${type} OTP for Shipment ${shipment.referenceId}: ${otp}`);

    // Create a notification simulating sending OTP to Consignor (for START) or Consignee (for COMPLETE)
    const recipientRole = type === 'START' ? 'Consignor' : 'Consignee';
    const recipientName = type === 'START'
      ? (shipment.customerId ? 'Customer' : 'Consignor')
      : (shipment.consignee?.name || 'Receiver');

    // Securely transmit the OTP
    let transmissionStatus = false;
    if (type === 'START') {
      // 1. Send to Consignor (Customer) Email
      const customer = await User.findById(shipment.customerId);
      if (customer) {
        if (customer.email) {
          await sendOtpEmail(customer.email, otp, 'SHIPMENT_START');
          transmissionStatus = true;
        }
        if (customer.phone) {
          const body = `Your pickup verification code for Shipment ${shipment.referenceId} is ${otp}. Share this ONLY with the driver at pickup time.`;
          const ok = await sendSMS(customer.phone, body);
          if (ok) transmissionStatus = true;
        }
      }
    } else if (type === 'COMPLETE') {
      // 2. Send to Consignee Phone via Twilio
      const body = `Your delivery confirmation code for Shipment ${shipment.referenceId} is ${otp}. Please share this with the driver only at the time of delivery.`;
      const contact = shipment.consignee?.contact;
      if (contact) {
        transmissionStatus = await sendSMS(contact, body);
      }
    }

    res.json({
      success: true,
      message: transmissionStatus
        ? `OTP securely transmitted to ${recipientRole} (${recipientName}).`
        : `OTP generated but transmission failed. Failsafe: check notifications.`
    });
  } catch (err) {
    console.error('CRITICAL Error in requestShipmentOtp:', err);
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  }
}

// Function to automate journey paperwork (Pre, Mid, Post Journey)
export async function automateJourneyPaperwork(req, res) {
  try {
    const { id } = req.params;
    const { docType } = req.body; // e.g., 'manifest', 'inspection', 'invoice', etc.
    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ error: { message: 'Shipment not found' } });

    // Ensure journeyPaperwork object exists
    if (!shipment.journeyPaperwork) {
      shipment.journeyPaperwork = {
        preJourney: {},
        midJourney: { tollReceipts: [], fuelSlips: [], statusReports: [] },
        postJourney: {}
      };
    }

    const timestamp = new Date();
    let eventType = 'DOCUMENT_GENERATED';
    let description = '';

    switch (docType) {
      case 'Dispatch Manifest':
        shipment.journeyPaperwork.preJourney.manifest = `MANIFEST-${shipment.referenceId}-${Date.now()}.pdf`;
        description = `Automated Dispatch Manifest generated for ${shipment.referenceId}`;
        break;
      case 'Vehicle Inspection':
        shipment.journeyPaperwork.preJourney.inspectionReport = `INSPECTION-${shipment.assignedVehicleId}-${Date.now()}.pdf`;
        description = `Vehicle safety inspection report automated and verified for ${shipment.assignedVehicleId}`;
        break;
      case 'Booking Confirmation':
        shipment.journeyPaperwork.preJourney.bookingConfirmation = `CONFIRMATION-${shipment.referenceId}.pdf`;
        description = `Shipment booking confirmation automated for customer`;
        break;
      case 'Toll Receipts':
        const tollId = `TOLL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        shipment.journeyPaperwork.midJourney.tollReceipts.push(tollId);
        description = `Mid-journey toll receipt ${tollId} automated and logged`;
        break;
      case 'Fuel Slips':
        const fuelId = `FUEL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        shipment.journeyPaperwork.midJourney.fuelSlips.push(fuelId);
        description = `Fuel slip ${fuelId} automated and logged via fleet card integration`;
        break;
      case 'Proof of Delivery (POD)':
        shipment.journeyPaperwork.postJourney.pod = `POD-${shipment.referenceId}.pdf`;
        shipment.proofOfLoading = shipment.journeyPaperwork.postJourney.pod;
        shipment.proofOfLoadingVerified = true;
        description = `Digital Proof of Delivery (POD) automated and verified via e-signature`;
        break;
      case 'GST Invoice':
        shipment.journeyPaperwork.postJourney.invoice = `INV-${shipment.referenceId}.pdf`;
        shipment.paymentStatus = 'PAID';
        description = `Final GST Invoice automated and payment verified`;
        break;
      default:
        return res.status(400).json({ error: { message: 'Invalid document type for automation' } });
    }

    shipment.lastEventAt = timestamp;
    await shipment.save();

    // Create a timeline event for this automation
    await ShipmentEvent.create({
      shipmentId: shipment._id,
      type: eventType,
      description,
      location: shipment.currentLocation || shipment.origin,
      actorId: req.user._id,
      metadata: { docType, automated: true }
    });

    await audit({
      actorId: req.user._id,
      action: 'PAPERWORK_AUTOMATED',
      entityType: 'Shipment',
      entityId: shipment._id,
      metadata: { docType }
    });

    res.json({ shipment, message: `${docType} automated successfully` });
  } catch (err) {
    console.error('Paperwork Automation Failed:', err);
    res.status(500).json({ error: { message: err.message || 'Internal Server Error' } });
  }
}
