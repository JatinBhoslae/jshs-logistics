import mongoose from 'mongoose'

export const USER_ROLES = ['MANAGER', 'DRIVER', 'CUSTOMER', 'ADMIN']

export const DRIVER_APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED']

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Normalize email so login works even if user typed spaces / different casing.
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },

    driverApprovalStatus: { type: String, enum: DRIVER_APPROVAL_STATUS, default: 'PENDING' },
    performanceRating: { type: Number, default: 5 },
    awards: [{ type: String }],

    // Demographic
    dob: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    emergencyContact: {
      name: { type: String },
      phone: { type: String }
    },

    // Detailed Business Fields
    address: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    legalName: { type: String, trim: true }, // If different from name

    // Driver specific trustworthiness fields
    aadhaarNumber: { type: String },
    panNumber: { type: String },
    employmentId: { type: String, unique: true, sparse: true },
    joiningDate: { type: Date, default: Date.now },
    bgVerificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'FAILED'], default: 'PENDING' },
    otpVerified: { type: Boolean, default: false },

    licenseNumber: { type: String, trim: true },
    licenseType: { type: String }, // LMV, HMV, etc.
    licenseIssueDate: { type: Date },
    licenseExpiryDate: { type: Date },

    challansCount: { type: Number, default: 0 },
    verifiedBadges: [{ type: String }],
    totalTrips: { type: Number, default: 0 },
    yearsOfExperience: { type: Number, default: 0 },

    medicalFitnessCertificateUrl: { type: String },
    insuranceCoverage: { type: String },
    insuranceProvider: { type: String },

    // Financial & Onboarding Info
    bankDetails: {
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      holderName: { type: String }
    },
    onboardingStatus: { type: String, enum: ['INCOMPLETE', 'DOCUMENT_SUBMITTED', 'VERIFIED'], default: 'INCOMPLETE' },
    documents: {
      aadhaarFront: { type: String }, // Store URL/Path
      aadhaarBack: { type: String },
      licenseFront: { type: String },
      licenseBack: { type: String },
      panCard: { type: String },
      medicalCertificate: { type: String }
    }
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
