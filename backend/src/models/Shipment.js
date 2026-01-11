import mongoose from 'mongoose'

export const SHIPMENT_STATUS = ['CREATED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'CANCELLED']

// Keep values India-centric for hackathon demo.
export const SHIPMENT_TYPES = ['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS']

const pointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
)

const locationSchema = new mongoose.Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
)

const shipmentSchema = new mongoose.Schema(
  {
    referenceId: { type: String, required: true, unique: true, index: true },
    origin: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },

    shipmentType: { type: String, enum: SHIPMENT_TYPES, default: 'KIRANA', index: true },

    // Computed fields (heuristics for hackathon demo)
    distanceKm: { type: Number },
    distanceRemainingKm: { type: Number },
    predictedEta: { type: Date },
    predictedEtaUpdatedAt: { type: Date },
    lastDelayNotifiedAt: { type: Date },
    progressPercentage: { type: Number }, // 0-100 percentage of shipment completion
    weatherTrafficImpact: { type: Object }, // Weather and traffic impact data
    lastWeatherTrafficUpdate: { type: Date }, // Last update time for weather/traffic impact

    // IoT Sensor Data
    sensors: {
      temperature: { type: Number },
      humidity: { type: Number },
      batteryLevel: { type: Number },
      doorStatus: { type: String, enum: ['OPEN', 'CLOSED', 'UNKNOWN'], default: 'UNKNOWN' },
      lastUpdated: { type: Date }
    },

    // Route optimization (optional; cached per shipment)
    routeProvider: { type: String },
    routeDistanceKm: { type: Number },
    routeDurationMin: { type: Number },
    routeGeoJson: { type: Object },
    routeUpdatedAt: { type: Date },
    currentRouteIndex: { type: Number, default: 0 }, // Tracks progress index along routeGeoJson coordinates

    status: { type: String, enum: SHIPMENT_STATUS, default: 'CREATED', index: true },
    assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
    assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    consignee: {
      name: { type: String },
      contact: { type: String }
    },
    eta: { type: Date },
    currentLocation: { type: locationSchema },
    lastEventAt: { type: Date },

    // Proof of loading fields
    proofOfLoading: { type: String }, // Path to POD document
    proofOfLoadingVerified: { type: Boolean, default: false },
    proofOfLoadingVerifiedAt: { type: Date },
    proofOfLoadingVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Shipment loading status
    loadingStatus: { type: String, enum: ['PENDING', 'LOADED', 'UNLOADED'], default: 'PENDING' },
    loadedAt: { type: Date },
    loadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unloadedAt: { type: Date },
    unloadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Workflow 1: Package details
    packageDetails: {
      weight: { type: Number }, // in kg
      dimensions: { type: String }, // e.g., "30x20x10"
    },
    deliveryType: { type: String, enum: ['standard', 'express'], default: 'standard' },
    price: { type: Number }, // in INR

    // E-sign fields
    driverEsign: { type: String }, // Path to driver's e-signature
    driverEsignedAt: { type: Date },
    consigneeEsign: { type: String }, // Path to consignee's e-signature
    consigneeEsignedAt: { type: Date },

    // Customer Self-Service & Payment Fields
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdByRole: { type: String, enum: ['CUSTOMER', 'MANAGER'], default: 'MANAGER' },

    // Goods Images (uploaded by customer)
    goodsImages: [{ type: String }], // Array of image paths/URLs

    // Optional custom category label when default types are not suitable
    customGoodsCategory: { type: String },

    // AI Categorization
    aiCategorization: {
      category: { type: String, enum: [...SHIPMENT_TYPES, 'UNKNOWN'] },
      confidence: { type: Number }, // 0-1
      suggestedBy: { type: String, default: 'AI' }, // 'AI' or 'MANUAL'
      processedAt: { type: Date },
      rawResponse: { type: Object } // Full AI response for debugging
    },

    // Approval Workflow (for customer-created shipments)
    approvalStatus: {
      type: String,
      enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
      default: 'NOT_REQUIRED',
      index: true
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    // Payment Integration
    paymentOption: {
      type: String,
      enum: ['PAY_NOW', 'PAY_LATER'],
      default: 'PAY_NOW',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true
    },
    paymentAmount: { type: Number }, // Actual calculated cost
    paymentAmountCharged: { type: Number, default: 1 }, // Amount charged (₹1 for testing)
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    paidAt: { type: Date },

    // Detailed Breakdowns for industrial auditing
    pricingBreakdown: { type: Object },
    payoutBreakdown: { type: Object },

    // Driver Earnings
    driverEarnings: {
      amount: { type: Number }, // Driver's net share
      status: { type: String, enum: ['PENDING', 'AVAILABLE', 'WITHDRAWN'], default: 'PENDING' },
      availableAt: { type: Date }, // When shipment is delivered
      withdrawnAt: { type: Date }
    },

    // OTP verification fields
    deliveryStartOtp: { type: String },
    deliveryCompleteOtp: { type: String },
    otpGeneratedAt: { type: Date },

    // Journey Paperwork Automation
    journeyPaperwork: {
      preJourney: {
        manifest: { type: String }, // Manager: Dispatch Manifest
        inspectionReport: { type: String }, // Driver: Vehicle Checklist
        bookingConfirmation: { type: String }, // Customer: Confirmation
      },
      midJourney: {
        tollReceipts: [{ type: String }], // Driver: Tolls
        fuelSlips: [{ type: String }], // Driver: Fuel
        statusReports: [{ type: String }], // System/Manager: Updates
      },
      postJourney: {
        pod: { type: String }, // Driver/Customer: Proof of Delivery
        invoice: { type: String }, // Manager: Final Bill
        feedback: { type: String }, // Customer: Experience rating
      }
    },
  },
  { timestamps: true }
)

export const Shipment = mongoose.model('Shipment', shipmentSchema)
