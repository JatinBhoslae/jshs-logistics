export type Role = 'MANAGER' | 'DRIVER' | 'CUSTOMER'

export type ShipmentStatus = 'CREATED' | 'ASSIGNED' | 'DISPATCHED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELAYED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CLOSED' | 'CANCELLED'

export type Point = {
  name: string
  lat: number
  lng: number
}

export type Shipment = {
  _id: string
  referenceId: string
  origin: Point
  destination: Point
  shipmentType?: 'KIRANA' | 'DAWAI' | 'KAPDA' | 'DAIRY' | 'AUTO_PARTS' | 'ELECTRONICS'
  status: ShipmentStatus
  assignedVehicleId?: string
  assignedDriverId?: string
  customerId?: string | { _id: string; name: string; email: string; phone: string }
  consignee?: {
    name: string
    contact: string
  }
  eta?: string
  distanceKm?: number
  predictedEta?: string
  predictedEtaUpdatedAt?: string
  distanceRemainingKm?: number
  progressPercentage?: number
  weatherTrafficImpact?: any
  currentLocation?: { lat: number; lng: number; updatedAt: string }
  packageDetails?: { weight: number; dimensions: string }
  deliveryType?: 'standard' | 'express'
  price?: number
  proofOfLoading?: string
  proofOfLoadingVerified?: boolean
  proofOfLoadingVerifiedAt?: string
  proofOfLoadingVerifiedBy?: string
  loadingStatus?: 'PENDING' | 'LOADED' | 'UNLOADED'
  loadedAt?: string
  loadedBy?: string
  unloadedAt?: string
  unloadedBy?: string
  driverEsign?: string
  driverEsignedAt?: string
  consigneeEsign?: string
  consigneeEsignedAt?: string
  lastEventAt?: string
  routeGeoJson?: any
  routeProvider?: string
  routeDistanceKm?: number
  routeDurationMin?: number

  // Customer & Payment Enhancement
  createdBy?: string
  createdByRole?: 'CUSTOMER' | 'MANAGER'
  goodsImages?: string[]
  customGoodsCategory?: string
  aiCategorization?: AICategorization
  approvalStatus?: ApprovalStatus
  paymentStatus?: PaymentStatus
  paymentOption?: 'PAY_NOW' | 'PAY_LATER'
  razorpayOrderId?: string
  razorpayPaymentId?: string
  driverEarnings?: {
    amount: number
    status: 'PENDING' | 'AVAILABLE' | 'WITHDRAWN'
    availableAt?: string
    withdrawnAt?: string
  }

  createdAt: string
  updatedAt: string
}

export type ShipmentEvent = {
  _id: string
  shipmentId: string
  type: string
  description?: string
  location?: Point
  actorId?: { _id: string; name: string; role: string } | string
  metadata?: any
  createdAt: string
}

export type LocationPing = {
  _id: string;
  shipmentId: string;
  vehicleId?: string;
  driverId?: string;
  lat: number;
  lng: number;
  speedKmph?: number;
  heading?: number;
  ts: string;
  createdAt: string;
  updatedAt: string;
}

export type VehicleHealthStatus = {
  status: 'HEALTHY' | 'FAIR' | 'POOR' | 'NO_DATA';
  issues: string[];
  healthScore: number;
  recommendations: string[];
  lastUpdate?: string;
}

export type PredictiveETA = {
  predictedDelivery: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  confidencePercentage: number;
  currentSpeed?: number;
  remainingDistance?: number;
  timeRemainingHours?: number;
  latestPingTime?: string;
}

export type Vehicle = {
  _id: string
  plateNumber: string
  model?: string
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE'
  odometerKm: number
  nextServiceAtKm: number
  fuelEfficiencyKmpl: number
  pucNumber?: string
  rcNumber?: string
  capacityKg: number
  type: 'TRUCK_LG' | 'TRUCK_SM' | 'VAN' | 'BIKE'
  fuelType: 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'CNG'

  vin?: string
  make?: string
  year?: number
  color?: string
  engineCapacityCc?: number
  simNumber?: string
  gpsDeviceId?: string

  lastServiceOdometerKm?: number
  lastServiceDate?: string
  nextServiceDueAtKm?: number
  nextServiceDueDate?: string
  serviceThresholdKm?: number
  serviceHistory?: Array<{
    date: string
    description: string
    odometerKm: number
    cost: number
  }>

  registrationDetails?: {
    registrationDate?: string
    ownerName?: string
  }
  insuranceDetails?: {
    policyNumber?: string
    expiryDate?: string
    provider?: string
  }

  isRefrigerated?: boolean
  operationalTempRange?: {
    min: number
    max: number
  }

  assignedDriverId?: string
  currentShipmentId?: string

  createdAt: string
  updatedAt: string
}

export type User = {
  _id: string
  name: string
  email: string
  phone: string
  role: Role
  driverApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
  performanceRating?: number
  awards?: string[]
  dob?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  emergencyContact?: {
    name: string
    phone: string
  }
  address?: string
  gstNumber?: string
  legalName?: string
  aadhaarNumber?: string
  panNumber?: string
  employmentId?: string
  joiningDate?: string
  bgVerificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED'
  otpVerified?: boolean
  licenseNumber?: string
  licenseType?: string
  licenseIssueDate?: string
  licenseExpiryDate?: string
  challansCount?: number
  verifiedBadges?: string[]
  totalTrips?: number
  yearsOfExperience?: number
  medicalFitnessCertificateUrl?: string
  insuranceCoverage?: string
  insuranceProvider?: string
  bankDetails?: {
    accountNumber: string
    ifscCode: string
    bankName: string
    holderName: string
  }
  onboardingStatus?: 'INCOMPLETE' | 'DOCUMENT_SUBMITTED' | 'COMPLETED' | 'VERIFIED'
  documents?: {
    aadhaarFront?: string
    aadhaarBack?: string
    licenseFront?: string
    licenseBack?: string
    panCard?: string
    medicalCertificate?: string
  }
}

export type Invoice = {
  _id: string
  shipmentId: string
  shipmentRef?: string
  shipmentStatus?: ShipmentStatus
  podVerified?: boolean
  openDisputeId?: string

  amount: number
  currency: string
  status: 'DRAFT' | 'ISSUED' | 'FUNDED' | 'PAID' | 'DISPUTED' | 'REFUNDED' | 'PENDING'
  dueAt?: string
}

export type Notification = {
  _id: string
  type: string
  message: string
  readAt?: string
  createdAt: string
}

export type Payout = {
  _id: string
  shipmentId: string
  invoiceId: string
  recipientType: 'DRIVER' | 'LOGISTICS_ORG'
  recipientId: string
  amount: number
  currency: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  method?: string
  providerRef?: string
  paidAt?: string
  createdAt: string
}

// ============ FLEET PERFORMANCE TYPES ============

export type FuelLog = {
  _id: string
  vehicleId: string
  driverId?: string
  shipmentId?: string
  fuelType: 'DIESEL' | 'PETROL' | 'CNG' | 'ELECTRIC'
  quantityLiters: number
  pricePerLiter: number
  totalCost: number
  odometerAtFill: number
  odometerPrevious?: number
  distanceSinceLastFill?: number
  efficiencyKmpl?: number
  fuelStationName?: string
  location?: { lat: number; lng: number }
  filledAt: string
  receiptImage?: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export type MaintenanceType =
  | 'OIL_CHANGE'
  | 'TIRE_ROTATION'
  | 'BRAKE_SERVICE'
  | 'ENGINE_TUNE'
  | 'TRANSMISSION'
  | 'BATTERY'
  | 'AC_SERVICE'
  | 'GENERAL_SERVICE'
  | 'EMERGENCY_REPAIR'
  | 'PUC_RENEWAL'
  | 'INSURANCE_RENEWAL'
  | 'FITNESS_CERTIFICATE'

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE'

export type MaintenanceRecord = {
  _id: string
  vehicleId: string | { _id: string; plateNumber: string; model: string }
  type: MaintenanceType
  status: MaintenanceStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  scheduledDate: string
  scheduledOdometer?: number
  completedDate?: string
  actualOdometer?: number
  estimatedCost?: number
  actualCost?: number
  laborCost?: number
  partsCost?: number
  partsReplaced?: Array<{
    name: string
    partNumber?: string
    quantity?: number
    cost?: number
    warrantyMonths?: number
  }>
  serviceProvider?: {
    name: string
    contact?: string
    address?: string
  }
  invoiceNumber?: string
  invoiceImage?: string
  nextServiceDate?: string
  nextServiceOdometer?: number
  notes?: string
  isPredicted?: boolean
  predictionConfidence?: number
  predictionReason?: string
  createdBy?: string | { _id: string; name: string }
  completedBy?: string | { _id: string; name: string }
  createdAt: string
  updatedAt: string
}

export type DriverSchedule = {
  _id: string
  driverId: string | { _id: string; name: string; email: string }
  vehicleId?: string | { _id: string; plateNumber: string; model: string }
  shiftDate: string
  shiftStart: string
  shiftEnd: string
  actualStart?: string
  actualEnd?: string
  breaks?: Array<{
    startTime: string
    endTime: string
    duration: number
    type: 'LUNCH' | 'REST' | 'FUEL' | 'OTHER'
  }>
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  shipmentsCompleted?: number
  totalDistanceKm?: number
  totalDrivingHours?: number
  hoursOfService?: {
    drivingHours: number
    onDutyHours: number
    restHours: number
    isCompliant: boolean
    violations?: string[]
  }
  assignedZone?: string
  assignedRoutes?: string[]
  notes?: string
  managerNotes?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export type GeofenceType = 'DEPOT' | 'RESTRICTED' | 'CUSTOMER' | 'FUEL_STATION' | 'REST_AREA' | 'SPEED_ZONE'
export type GeofenceShape = 'CIRCLE' | 'POLYGON'

export type Geofence = {
  _id: string
  name: string
  type: GeofenceType
  shape: GeofenceShape
  center?: { lat: number; lng: number }
  radiusMeters?: number
  polygon?: Array<{ lat: number; lng: number }>
  speedLimit?: number
  alertOnEntry: boolean
  alertOnExit: boolean
  alertOnSpeedViolation: boolean
  notifyManagers: boolean
  notifyDrivers: boolean
  customRecipients?: string[]
  activeSchedule?: {
    allDay: boolean
    startTime?: string
    endTime?: string
    daysOfWeek?: number[]
  }
  isActive: boolean
  description?: string
  color?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export type DriverBehaviorAnalytics = {
  summary: {
    safetyScore: number
    speedingCount: number
    harshTurnCount: number
    harshBrakeCount: number
    idlingCount: number
    totalEvents: number
    severitySum: number
    completedShipments: number
    totalDistanceKm: number
    eventsPerKm: number
  }
  recentEvents: Array<{
    _id: string
    type: string
    severity: number
    ts: string
    metadata?: any
  }>
  trends: Array<{
    _id: { date: string; type: string }
    count: number
  }>
}

export type FatigueDetection = {
  fatigueRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  confidence: number
  reason: string
  continuousDrivingHours: number
  recentHarshEvents?: number
  recommendations: string[]
}

export type FuelAnalytics = {
  summary: {
    totalFuelConsumed: number
    totalCost: number
    totalDistance: number
    fillCount: number
    avgEfficiency: number
  }
  topConsumers: Array<{
    vehicleId: string
    plateNumber: string
    model: string
    totalFuel: number
    totalCost: number
    avgEfficiency: number
    fillCount: number
  }>
}

export type MaintenanceOverview = {
  upcoming: MaintenanceRecord[]
  overdue: MaintenanceRecord[]
  stats: {
    scheduled: number
    inProgress: number
    completed: number
    overdue: number
    totalCostThisMonth: number
  }
  monthlyCosts: Array<{
    month: string
    totalCost: number
    count: number
  }>
}

// ============ CUSTOMER & PAYMENT TYPES ============

export type AICategorization = {
  category: string
  confidence: number
  suggestedBy: 'AI' | 'MANUAL'
  processedAt?: string
  rawResponse?: any
}

export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

export type ShipmentPayment = {
  _id: string
  shipmentId: string
  customerId: string
  actualAmount: number
  chargedAmount: number
  currency: string
  razorpayOrderId: string
  razorpayPaymentId?: string
  status: 'CREATED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'
  paidAt?: string
  paymentMethod?: string
  metadata?: any
  createdAt: string
}

export type DriverEarnings = {
  summary: {
    totalLifetimeEarnings: number
    successfullyWithdrawn: number
    processingAmount: number
    availableBalance: number
  }
  shipments: Array<{
    _id: string
    referenceId: string
    status: ShipmentStatus
    totalPrice: number
    driverShare: number
    deliveredAt?: string
  }>
  withdrawals: DriverWithdrawal[]
}

export type DriverWithdrawal = {
  _id: string
  driverId: string
  amount: number
  upiId: string
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  razorpayPayoutId?: string
  failureReason?: string
  requestedAt: string
  processedAt?: string
  completedAt?: string
}


