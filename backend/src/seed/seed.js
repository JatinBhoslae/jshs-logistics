import { connectDb } from '../config/db.js'
import { User } from '../models/User.js'
import { Vehicle } from '../models/Vehicle.js'
import { Shipment } from '../models/Shipment.js'
import { Invoice } from '../models/Invoice.js'
import { Payout } from '../models/Payout.js'
import { hashPassword } from '../utils/password.js'

function randRef() {
  return `CN-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
}

await connectDb()

await Promise.all([
  User.deleteMany({}),
  Vehicle.deleteMany({}),
  Shipment.deleteMany({}),
  Invoice.deleteMany({}),
])


const [managerHash, driverHash, customerHash] = await Promise.all([
  hashPassword('jshs2024'),
  hashPassword('jshs2024'),
  hashPassword('jshs2024'),
])

// 1. Managers
const manager = await User.create({ name: 'Rajesh Malhotra', email: 'manager@jshs.app', passwordHash: managerHash, role: 'MANAGER' })

// 2. Drivers
const driversData = [
  { name: 'Suresh Kumar', email: 'driver@jshs.app' },
  { name: 'Amit Singh', email: 'driver2@jshs.app' },
  { name: 'Vikram Rathore', email: 'driver3@jshs.app' },
  { name: 'Deepak Yadav', email: 'driver4@jshs.app' }
]

const drivers = await Promise.all(driversData.map(d => User.create({
  ...d,
  passwordHash: driverHash,
  role: 'DRIVER',
  driverApprovalStatus: 'APPROVED'
})))

// 3. Customers
const customersData = [
  { name: 'Ananya Iyer', email: 'customer@jshs.app' },
  { name: 'Priya Sharma', email: 'customer2@jshs.app' }
]

const customers = await Promise.all(customersData.map(c => User.create({
  ...c,
  passwordHash: customerHash,
  role: 'CUSTOMER'
})))

// 4. Vehicles
const vehiclesData = [
  { plateNumber: 'DL01AB1234', model: 'Tata Ace', odometerKm: 12000, nextServiceAtKm: 15000, fuelEfficiencyKmpl: 12, capacityKg: 750, type: 'TRUCK_SM', fuelType: 'DIESEL' },
  { plateNumber: 'MH02CD5678', model: 'Mahindra Bolero', odometerKm: 8500, nextServiceAtKm: 12000, fuelEfficiencyKmpl: 10, capacityKg: 1200, type: 'TRUCK_SM', fuelType: 'DIESEL' },
  { plateNumber: 'KA03EF9012', model: 'Ashok Leyland Dost', odometerKm: 25000, nextServiceAtKm: 30000, fuelEfficiencyKmpl: 11, capacityKg: 1500, type: 'TRUCK_LG', fuelType: 'CNG' },
  { plateNumber: 'HR04GH3456', model: 'Eicher Pro 2049', odometerKm: 15000, nextServiceAtKm: 20000, fuelEfficiencyKmpl: 9, capacityKg: 4000, type: 'TRUCK_LG', fuelType: 'DIESEL' }
]

const vehicles = await Promise.all(vehiclesData.map(v => Vehicle.create({
  ...v,
  status: 'AVAILABLE'
})))

// 5. Shipments
const cities = [
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', lat: 19.076, lng: 72.8777 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Hyderabad', lat: 17.385, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 }
]

const shipmentsData = [
  { origin: cities[0], destination: cities[1], type: 'ELECTRONICS', cust: customers[0], driver: drivers[0], veh: vehicles[0], status: 'IN_TRANSIT' },
  { origin: cities[2], destination: cities[3], type: 'KIRANA', cust: customers[1], driver: drivers[1], veh: vehicles[1], status: 'ASSIGNED' },
  { origin: cities[4], destination: cities[5], type: 'DAWAI', cust: customers[0], driver: drivers[2], veh: vehicles[2], status: 'CREATED' },
  { origin: cities[6], destination: cities[7], type: 'AUTO_PARTS', cust: customers[1], driver: drivers[3], veh: vehicles[3], status: 'DELIVERED' }
]

for (const s of shipmentsData) {
  const shipment = await Shipment.create({
    referenceId: randRef(),
    shipmentType: s.type,
    origin: s.origin,
    destination: s.destination,
    customerId: s.cust._id,
    createdBy: s.cust._id,
    createdByRole: 'CUSTOMER',
    assignedDriverId: s.status !== 'CREATED' ? s.driver._id : undefined,
    assignedVehicleId: s.status !== 'CREATED' ? s.veh._id : undefined,
    status: s.status,
    eta: new Date(Date.now() + 48 * 60 * 60 * 1000),
    distanceKm: 500 + Math.random() * 1000,
    price: 5000 + Math.floor(Math.random() * 5000),
    packageDetails: { weight: 15, dimensions: '40x30x20' },
    lastEventAt: new Date()
  })

  await Invoice.create({
    customerId: s.cust._id,
    shipmentId: shipment._id,
    amount: shipment.price,
    currency: 'INR',
    status: s.status === 'DELIVERED' ? 'PAID' : 'ISSUED',
    dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  })

  if (s.status === 'DELIVERED' && shipment.assignedDriverId) {
    const net = shipment.price / 1.18
    await Payout.create({
      shipmentId: shipment._id,
      invoiceId: (await Invoice.findOne({ shipmentId: shipment._id }))._id,
      recipientType: 'DRIVER',
      recipientId: shipment.assignedDriverId,
      amount: Math.round(net * 0.70),
      currency: 'INR',
      status: 'SUCCEEDED',
      paidAt: new Date()
    })
  }
}

// 6. Admin
await User.create({ name: 'System Admin', email: 'admin@jshs.app', passwordHash: managerHash, role: 'ADMIN' })

console.log('Seed updated with real-looking data. Demo users: manager@jshs.app / driver@jshs.app / customer@jshs.app (jshs2024)')
process.exit(0)
