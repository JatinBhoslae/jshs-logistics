import { Vehicle } from '../models/Vehicle.js'
import { User } from '../models/User.js'
import crypto from 'crypto'

export async function createVehicle(data) {
  return Vehicle.create(data)
}

export async function updateVehicle(id, data) {
  const vehicle = await Vehicle.findByIdAndUpdate(id, data, { new: true })
  if (!vehicle) {
    const err = new Error('Vehicle not found')
    err.statusCode = 404
    throw err
  }
  return vehicle
}

export function generateDummyVehicle() {
  const makes = ['Tata', 'Ashok Leyland', 'Eicher', 'Mahindra', 'BharatBenz'];
  const models = ['Ultra T.7', 'Dost+', 'Pro 2049', 'Blazo X', '1615 HE'];
  const colors = ['White', 'Silver', 'Yellow', 'Blue', 'Red'];
  const fuelTypes = ['DIESEL', 'CNG', 'ELECTRIC'];

  const make = makes[Math.floor(Math.random() * makes.length)];
  const model = models[Math.floor(Math.random() * models.length)];

  return {
    plateNumber: `HR-${Math.floor(10 + Math.random() * 89)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 8999)}`,
    vin: crypto.randomBytes(8).toString('hex').toUpperCase(),
    make,
    model,
    year: 2020 + Math.floor(Math.random() * 5),
    color: colors[Math.floor(Math.random() * colors.length)],
    fuelType: fuelTypes[Math.floor(Math.random() * fuelTypes.length)],
    fuelCapacityLiters: 60 + Math.floor(Math.random() * 100),
    isRefrigerated: Math.random() > 0.7,
    odometerKm: Math.floor(Math.random() * 50000),
    engineCapacityCc: 2500 + Math.floor(Math.random() * 3000),
    capacityKg: 1000 + Math.floor(Math.random() * 9000),
    gpsDeviceId: `IOT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    simNumber: `91-${Math.floor(7000000000 + Math.random() * 2999999999)}`,
    insuranceDetails: {
      policyNumber: `INS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      provider: 'HDFC ERGO General Insurance'
    }
  }
}

export function generateDummyDriver() {
  const names = ['Rajesh Kumar', 'Amit Singh', 'Suresh Raina', 'Vikram Rathore', 'Manish Pandey'];
  const licenseTypes = ['LMV', 'HMV', 'HGMV', 'TRANS'];

  return {
    name: names[Math.floor(Math.random() * names.length)],
    dob: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
    gender: 'MALE',
    phone: `91${Math.floor(7000000000 + Math.random() * 2999999999)}`,
    email: `driver.${crypto.randomBytes(3).toString('hex')}@jshslogistics.com`,
    address: 'Sector 45, Gurgaon, Haryana, 122003',
    aadhaarNumber: `${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)} ${Math.floor(1000 + Math.random() * 8999)}`,
    panNumber: `ABCDE${Math.floor(1000 + Math.random() * 8999)}F`,
    emergencyContact: {
      name: 'Sunita Devi',
      phone: '91-9988776655'
    },
    licenseNumber: `DL-${Math.floor(10 + Math.random() * 89)}-${new Date().getFullYear()}${Math.floor(1000000 + Math.random() * 8999999)}`,
    licenseType: licenseTypes[Math.floor(Math.random() * licenseTypes.length)],
    licenseExpiryDate: new Date(Date.now() + 1000 * 24 * 60 * 60 * 1000),
    employmentId: `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    joiningDate: new Date(),
    yearsOfExperience: 5 + Math.floor(Math.random() * 10),
    bankDetails: {
      accountNumber: `${Math.floor(1000000000 + Math.random() * 8999999999)}`,
      ifscCode: 'HDFC0001234',
      bankName: 'HDFC Bank',
      holderName: 'Auto-Gen Driver'
    }
  }
}
