import { connectDb } from './src/config/db.js'
import { User } from './src/models/User.js'
import { LogisticsOrg } from './src/models/LogisticsOrg.js'
import { Vehicle } from './src/models/Vehicle.js'
import { Shipment } from './src/models/Shipment.js'
import { LocationPing } from './src/models/LocationPing.js'
import { Notification } from './src/models/Notification.js'
import { Invoice } from './src/models/Invoice.js'
import { hashPassword } from './src/utils/password.js'

function randRef() {
  // India-style consignment reference
  return `CN-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
}

// Function to calculate distance between two points (in km) using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

// Function to generate random Indian locations
function getRandomIndianLocation() {
  const indianCities = [
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { name: 'Surat', lat: 21.1702, lng: 72.8311 },
    { name: 'Pune', lat: 18.5204, lng: 73.8567 },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
    { name: 'Kanpur', lat: 26.4499, lng: 80.3319 },
    { name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
    { name: 'Indore', lat: 22.7196, lng: 75.8577 },
    { name: 'Thane', lat: 19.2183, lng: 72.9781 },
    { name: 'Bhopal', lat: 23.2599, lng: 77.4126 },
    { name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
    { name: 'Pimpri-Chinchwad', lat: 18.6212, lng: 73.8020 },
    { name: 'Patna', lat: 25.5941, lng: 85.1376 },
    { name: 'Vadodara', lat: 22.3072, lng: 73.1812 }
  ];
  
  return indianCities[Math.floor(Math.random() * indianCities.length)];
}

// Function to generate realistic shipment data
function generateShipmentData(orgId, customerId, driverId, vehicleId) {
  const origin = getRandomIndianLocation();
  let destination;
  do {
    destination = getRandomIndianLocation();
  } while (destination.name === origin.name); // Ensure different origin and destination

  const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const durationHours = distance / 40; // Assuming average speed of 40 km/h
  const eta = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const shipmentTypes = ['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS'];
  const shipmentStatuses = ['CREATED', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

  return {
    logisticsOrgId: orgId,
    referenceId: randRef(),
    origin: origin,
    destination: destination,
    shipmentType: shipmentTypes[Math.floor(Math.random() * shipmentTypes.length)],
    distanceKm: Math.round(distance * 100) / 100,
    distanceRemainingKm: Math.random() > 0.5 ? Math.round(distance * Math.random() * 100) / 100 : 0,
    predictedEta: eta,
    predictedEtaUpdatedAt: new Date(),
    status: shipmentStatuses[Math.floor(Math.random() * shipmentStatuses.length)],
    assignedVehicleId: vehicleId,
    assignedDriverId: driverId,
    customerId: customerId,
    eta: eta,
    progressPercentage: Math.random() > 0.7 ? 100 : Math.floor(Math.random() * 100),
    loadingStatus: ['PENDING', 'LOADED', 'UNLOADED'][Math.floor(Math.random() * 3)],
    lastEventAt: new Date()
  };
}

// Function to generate location pings for tracking
function generateLocationPings(shipmentId, vehicleId, driverId, origin, destination, numPings = 10) {
  const pings = [];
  const totalDistance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  
  for (let i = 0; i < numPings; i++) {
    // Calculate position between origin and destination based on progress
    const progress = i / (numPings - 1); // 0 to 1
    const currentLat = origin.lat + (destination.lat - origin.lat) * progress;
    const currentLng = origin.lng + (destination.lng - origin.lng) * progress;
    
    pings.push({
      shipmentId: shipmentId,
      vehicleId: vehicleId,
      driverId: driverId,
      lat: currentLat,
      lng: currentLng,
      speedKmph: Math.floor(Math.random() * 80) + 10, // 10-90 km/h
      heading: Math.floor(Math.random() * 360), // 0-359 degrees
      ts: new Date(Date.now() - (numPings - i) * 10 * 60 * 1000) // 10 min intervals
    });
  }
  
  return pings;
}

async function populateDatabase() {
  try {
    await connectDb()
    
    console.log('Connected to database, fetching existing users...')
    
    // Find the existing users (should be 3 as per requirements)
    const existingUsers = await User.find({}).sort({ createdAt: 1 }).limit(3);
    
    if (existingUsers.length < 3) {
      console.error('Error: Expected 3 users but found', existingUsers.length);
      console.error('Please run the seed script first to create the initial users');
      process.exit(1);
    }
    
    const manager = existingUsers.find(user => user.role === 'MANAGER');
    const driver = existingUsers.find(user => user.role === 'DRIVER');
    const customer = existingUsers.find(user => user.role === 'CUSTOMER');
    
    if (!manager || !driver || !customer) {
      console.error('Error: Could not find all required user types');
      console.error('Manager:', !!manager, 'Driver:', !!driver, 'Customer:', !!customer);
      process.exit(1);
    }
    
    // Get the logistics org associated with the manager
    const org = await LogisticsOrg.findById(manager.logisticsOrgId);
    if (!org) {
      console.error('Error: Could not find logistics org for manager');
      process.exit(1);
    }
    
    // Get the vehicle associated with the logistics org
    const vehicle = await Vehicle.findOne({ logisticsOrgId: org._id });
    if (!vehicle) {
      console.error('Error: Could not find vehicle for logistics org');
      process.exit(1);
    }
    
    console.log('Found existing users and org. Proceeding with data population...');
    
    // Clear existing shipments, location pings, notifications, and invoices
    await Promise.all([
      Shipment.deleteMany({ logisticsOrgId: org._id, referenceId: { $not: { $regex: /^CN-/ } } }), // Keep the seeded shipment
      LocationPing.deleteMany({}),
      Notification.deleteMany({}),
      Invoice.deleteMany({ logisticsOrgId: org._id, amount: { $ne: 2500 } }) // Keep the seeded invoice
    ]);
    
    console.log('Cleared existing data. Creating new entries...')
    
    // Create 5 new shipments with realistic data
    const newShipments = [];
    for (let i = 0; i < 5; i++) {
      const shipmentData = generateShipmentData(org._id, customer._id, driver._id, vehicle._id);
      const newShipment = await Shipment.create(shipmentData);
      newShipments.push(newShipment);
      
      // Create location pings for each shipment to simulate real-time tracking
      const pings = generateLocationPings(
        newShipment._id, 
        vehicle._id, 
        driver._id, 
        shipmentData.origin, 
        shipmentData.destination,
        Math.floor(Math.random() * 8) + 5 // 5-12 pings per shipment
      );
      
      if (pings.length > 0) {
        await LocationPing.insertMany(pings);
      }
      
      // Create a notification for each shipment
      await Notification.create({
        userId: customer._id,
        type: 'SHIPMENT_UPDATE',
        message: `Shipment ${newShipment.referenceId} status updated to ${newShipment.status}`,
        metadata: { shipmentId: newShipment._id, status: newShipment.status }
      });
      
      // Create an invoice for each shipment
      await Invoice.create({
        logisticsOrgId: org._id,
        customerId: customer._id,
        shipmentId: newShipment._id,
        amount: Math.floor(Math.random() * 5000) + 1000, // Random amount between 1000-6000
        currency: 'INR',
        status: ['DRAFT', 'ISSUED', 'FUNDED', 'PAID', 'DISPUTED', 'REFUNDED'][Math.floor(Math.random() * 6)],
        dueAt: new Date(Date.now() + (Math.floor(Math.random() * 10) + 1) * 24 * 60 * 60 * 1000) // 1-10 days from now
      });
      
      console.log(`Created shipment ${i+1}: ${newShipment.referenceId} from ${shipmentData.origin.name} to ${shipmentData.destination.name}`);
    }
    
    console.log('\nDatabase populated successfully with real-time data!');
    console.log(`Created ${newShipments.length} new shipments`);
    console.log(`Created ${newShipments.length} notifications`);
    console.log(`Created ${newShipments.length} invoices`);
    
    // Count total location pings created
    const totalPings = await LocationPing.countDocuments();
    console.log(`Created total ${totalPings} location pings for real-time tracking`);
    
    console.log('\nSample shipment created:');
    console.log({
      referenceId: newShipments[0].referenceId,
      origin: newShipments[0].origin.name,
      destination: newShipments[0].destination.name,
      status: newShipments[0].status,
      progress: newShipments[0].progressPercentage + '%'
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
}

populateDatabase()