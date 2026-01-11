import mongoose from 'mongoose'

export const DOC_TYPES = [
  // UNIVERSAL
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'CERTIFICATE_OF_ORIGIN',

  // SEA FREIGHT
  'BILL_OF_LADING',
  'TELEX_RELEASE',
  'SEA_WAYBILL',

  // AIR FREIGHT
  'AIR_WAYBILL',

  // ROAD FREIGHT
  'CMR_ROAD_CONSIGNMENT_NOTE',
  'TRIP_SHEET',

  // CUSTOMS
  'SHIPPING_BILL',
  'BILL_OF_ENTRY',

  // LEGACY/CORE
  'POD',
  'GST_INVOICE',
  'DISPATCH_MANIFEST',
  'VEHICLE_INSPECTION',
  'E_WAY_BILL'
]

const documentSchema = new mongoose.Schema(
  {
    shipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },

    type: { type: String, enum: DOC_TYPES, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verified: { type: Boolean, default: false },
    verifiedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
)

export const Document = mongoose.model('Document', documentSchema)
