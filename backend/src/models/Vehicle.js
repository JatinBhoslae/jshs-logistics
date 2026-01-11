import mongoose from 'mongoose'

export const VEHICLE_STATUS = ['AVAILABLE', 'IN_USE', 'MAINTENANCE']

const vehicleSchema = new mongoose.Schema(
  {
    plateNumber: { type: String, required: true, unique: true, index: true },
    model: { type: String },
    status: { type: String, enum: VEHICLE_STATUS, default: 'AVAILABLE' },
    odometerKm: { type: Number, default: 0 },
    nextServiceAtKm: { type: Number, default: 10000 },
    fuelEfficiencyKmpl: { type: Number, default: 10 },
    pucNumber: { type: String, sparse: true },
    rcNumber: { type: String, sparse: true },
    capacityKg: { type: Number, required: true, default: 1000 },
    type: { type: String, enum: ['TRUCK_LG', 'TRUCK_SM', 'VAN', 'BIKE'], default: 'TRUCK_SM' },
    fuelType: { type: String, enum: ['DIESEL', 'PETROL', 'ELECTRIC', 'CNG'], default: 'DIESEL' },
    gpsDeviceId: { type: String, unique: true, sparse: true }, // IMEI or Device ID
    simNumber: { type: String }, // SIM used for telemetry
    vin: { type: String, unique: true, sparse: true }, // Vehicle Identification Number
    make: { type: String },
    year: { type: Number },
    color: { type: String },
    engineCapacityCc: { type: Number },

    currentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    // IoT Sensor Data
    fuelCapacityLiters: { type: Number, default: 100 },
    currentFuelLiters: { type: Number, default: 100 },
    fuelThresholdLowLiters: { type: Number, default: 15 },

    lastServiceOdometerKm: { type: Number, default: 0 },
    lastServiceDate: { type: Date },
    nextServiceDueAtKm: { type: Number, default: 10000 },
    nextServiceDueDate: { type: Date },
    serviceThresholdKm: { type: Number, default: 500 }, // Service every 500km
    serviceHistory: [{
      date: { type: Date },
      description: { type: String },
      odometerKm: { type: Number },
      cost: { type: Number }
    }],

    insuranceDetails: {
      policyNumber: { type: String },
      expiryDate: { type: Date },
      provider: { type: String }
    },
    registrationDetails: {
      registrationDate: { type: Date },
      ownerName: { type: String }
    },

    isRefrigerated: { type: Boolean, default: false },
    operationalTempRange: {
      min: { type: Number, default: -25 },
      max: { type: Number, default: -15 }
    },
    currentTemperatureC: { type: Number },
    temperatureThresholdMaxC: { type: Number, default: -15 }, // Set Alert if above this
    temperatureThresholdMinC: { type: Number, default: -25 }, // Set Alert if below this

    // Assignments
    assignedDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentShipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },

    // Advanced Health Metrics
    batteryVoltage: { type: Number, default: 12.6 }, // 12.0 to 14.0
    batteryHealthPercent: { type: Number, default: 95 },
    engineStatus: { type: String, enum: ['OFF', 'IDLE', 'RUNNING', 'WARNING'], default: 'OFF' },
    engineLoadPercent: { type: Number, default: 0 },
    oilLifeRemainingPercent: { type: Number, default: 100 },
    tirePressurePsi: {
      frontLeft: { type: Number, default: 35 },
      frontRight: { type: Number, default: 35 },
      rearLeft: { type: Number, default: 35 },
      rearRight: { type: Number, default: 35 }
    },
    coolantTempC: { type: Number, default: 85 },
  },
  { timestamps: true }
)

export const Vehicle = mongoose.model('Vehicle', vehicleSchema)
