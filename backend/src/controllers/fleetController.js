import { z } from 'zod'
import { Vehicle } from '../models/Vehicle.js'
import { User } from '../models/User.js'
import {
  createVehicle as createVehicleSvc,
  updateVehicle as updateVehicleSvc,
  generateDummyVehicle,
  generateDummyDriver
} from '../services/fleetService.js'

const createVehicleSchema = z.object({
  plateNumber: z.string().min(3),
  model: z.string().optional(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE']).optional(),
  odometerKm: z.number().optional(),
  nextServiceAtKm: z.number().optional(),
  fuelEfficiencyKmpl: z.number().optional(),
  pucNumber: z.string().optional(),
  rcNumber: z.string().optional(),
  capacityKg: z.number().positive().optional(),
  fuelType: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG']).optional(),
  type: z.enum(['TRUCK_LG', 'TRUCK_SM', 'VAN', 'BIKE']).optional(),
  vin: z.string().optional(),
  make: z.string().optional(),
  year: z.number().optional(),
  color: z.string().optional(),
  engineCapacityCc: z.number().optional(),
  simNumber: z.string().optional(),
  gpsDeviceId: z.string().optional(),
  insuranceDetails: z.object({
    policyNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    provider: z.string().optional()
  }).optional(),
  isRefrigerated: z.boolean().optional(),
  operationalTempRange: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional()
})

const updateVehicleSchema = createVehicleSchema.partial()

export async function getDummyVehicleData(req, res) {
  res.json(generateDummyVehicle())
}

export async function getDummyDriverData(req, res) {
  res.json(generateDummyDriver())
}

export async function listVehicles(req, res) {
  const { page = 1, limit = 10 } = req.query
  const skip = (Number(page) - 1) * Number(limit)

  const [rows, total, statsData] = await Promise.all([
    Vehicle.find({}).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    Vehicle.countDocuments({}),
    Vehicle.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'IN_USE'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $eq: ['$status', 'MAINTENANCE'] }, 1, 0] } },
          dueSoon: { $sum: { $cond: [{ $lte: [{ $subtract: ['$nextServiceAtKm', '$odometerKm'] }, 500] }, 1, 0] } }
        }
      }
    ])
  ])

  const stats = statsData[0] || { total: 0, active: 0, maintenance: 0, dueSoon: 0 }

  res.json({
    vehicles: rows,
    total,
    pages: Math.ceil(total / Number(limit)),
    currentPage: Number(page),
    stats
  })
}

export async function createVehicle(req, res) {
  const data = req.body
  const vehicle = await createVehicleSvc(data)
  res.status(201).json({ vehicle })
}

export async function updateVehicle(req, res) {
  const data = req.body
  const vehicle = await updateVehicleSvc(req.params.id, data)
  res.json({ vehicle })
}

export async function listDrivers(req, res) {
  const rows = await User.find({
    role: 'DRIVER'
  })
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .lean()

  res.json({ drivers: rows })
}

export async function listPendingDrivers(req, res) {
  const rows = await User.find({
    role: 'DRIVER',
    driverApprovalStatus: 'PENDING',
  })
    .select('_id name email role driverApprovalStatus')
    .lean()

  res.json({ drivers: rows })
}

export async function approveDriver(req, res) {
  const driver = await User.findById(req.params.id)
  if (!driver || driver.role !== 'DRIVER') return res.status(404).json({ error: { message: 'Driver not found' } })

  driver.driverApprovalStatus = 'APPROVED'
  driver.onboardingStatus = 'VERIFIED'
  await driver.save()

  const { createNotification } = await import('../services/notificationService.js')
  await createNotification({
    userId: driver._id,
    type: 'DRIVER_APPROVED',
    message: 'Your driver account has been approved. You can now receive assignments.',
  })

  res.json({ driver })
}

export async function rejectDriver(req, res) {
  const driver = await User.findById(req.params.id)
  if (!driver || driver.role !== 'DRIVER') return res.status(404).json({ error: { message: 'Driver not found' } })

  driver.driverApprovalStatus = 'REJECTED'
  await driver.save()

  const { createNotification } = await import('../services/notificationService.js')
  await createNotification({
    userId: driver._id,
    type: 'DRIVER_REJECTED',
    message: 'Your driver request was rejected by the logistics owner.',
  })

  res.json({ driver })
}

export async function getDriverProfile(req, res) {
  const driver = await User.findById(req.params.id)
    .select('-passwordHash')
    .lean()

  if (!driver || driver.role !== 'DRIVER') {
    return res.status(404).json({ error: { message: 'Driver not found' } })
  }

  res.json({ driver })
}

export async function onboardDriver(req, res) {
  const data = req.body
  const { email, phone } = data

  // Check if driver already exists by email or phone
  let user = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { phone }]
  })

  if (user) {
    if (user.role !== 'DRIVER') {
      return res.status(400).json({ error: { message: 'User already exists with a different role' } })
    }
    // Update existing driver
    Object.assign(user, data)
    user.onboardingStatus = 'COMPLETED'
    user.driverApprovalStatus = 'PENDING'
  } else {
    // Create new driver
    user = new User({
      ...data,
      role: 'DRIVER',
      onboardingStatus: 'COMPLETED',
      driverApprovalStatus: 'PENDING',
      passwordHash: 'AUTOGEN_PLACEHOLDER' // Ideally should be handled via set password link
    })
  }

  await user.save()

  const { createNotification } = await import('../services/notificationService.js')
  await createNotification({
    type: 'DRIVER_ONBOARDED',
    message: `New driver ${user.name} has completed onboarding and is awaiting approval.`,
    severity: 'INFO',
    metadata: { driverId: user._id }
  })

  res.status(201).json({
    message: 'Driver onboarding successful. Awaiting manager approval.',
    driver: user
  })
}
