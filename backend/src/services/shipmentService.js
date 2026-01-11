import { Shipment } from '../models/Shipment.js'
import { LocationPing } from '../models/LocationPing.js'
import { Vehicle } from '../models/Vehicle.js'
import { User } from '../models/User.js'
import { DriverEvent } from '../models/DriverEvent.js'
import { DriverSchedule } from '../models/DriverSchedule.js'
import { env } from '../config/env.js'
import { createNotification, createShipmentNotification, createPredictiveNotifications, sendMilestoneNotifications, sendProactiveNotifications } from './notificationService.js'
import { audit } from './auditService.js'
import { estimateEta, haversineKm } from '../utils/geo.js'
import { getDrivingRoute, getRealTimeEta, getRealTimeOptimizedRoute } from './routeService.js'
import { createWeatherTrafficAlerts } from './weatherTrafficService.js'
import { ShipmentEvent } from '../models/ShipmentEvent.js'
import { calculateShipmentProgress, calculateEstimatedArrival, detectRouteDeviation, checkGeofenceViolations } from './gpsTrackingService.js'
import * as pricingService from './pricingService.js'

export async function addLocationPing({ shipmentId, driverId, lat, lng, speedKmph, heading, ts }) {
  if (!shipmentId) {
    const err = new Error('shipmentId is required')
    err.statusCode = 400
    throw err
  }
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    const err = new Error('lat/lng are required')
    err.statusCode = 400
    throw err
  }

  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    const err = new Error('Shipment not found')
    err.statusCode = 404
    throw err
  }

  // Security: only the assigned, approved driver may ping a shipment
  if (!driverId) {
    const err = new Error('driverId is required')
    err.statusCode = 401
    throw err
  }

  const driver = await User.findById(driverId).lean()
  if (!driver || driver.role !== 'DRIVER') {
    const err = new Error('Driver not found')
    err.statusCode = 404
    throw err
  }

  if (driver.driverApprovalStatus !== 'APPROVED') {
    const err = new Error('Driver not approved')
    err.statusCode = 403
    throw err
  }

  if (String(shipment.assignedDriverId ?? '') !== String(driverId)) {
    const err = new Error('Forbidden')
    err.statusCode = 403
    throw err
  }

  const pingTs = ts ?? new Date()

  const prev = await LocationPing.findOne({ shipmentId: shipment._id, driverId }).sort({ ts: -1 }).lean()

  const ping = await LocationPing.create({
    shipmentId: shipment._id,
    vehicleId: shipment.assignedVehicleId,
    driverId,
    lat,
    lng,
    speedKmph,
    heading,
    ts: pingTs,
  })

  // Driver behavior analytics (heuristics)
  const cooldownMs = env.DRIVER_EVENT_COOLDOWN_SEC * 1000

  async function recentlyEmitted(type) {
    const last = await DriverEvent.findOne({ shipmentId: shipment._id, driverId, type }).sort({ ts: -1 }).select('ts').lean()
    if (!last?.ts) return false
    return pingTs.getTime() - new Date(last.ts).getTime() < cooldownMs
  }

  // SPEEDING
  if (typeof speedKmph === 'number' && speedKmph > env.SPEED_LIMIT_KMPH) {
    if (!(await recentlyEmitted('SPEEDING'))) {
      await DriverEvent.create({
        shipmentId: shipment._id,
        driverId,
        vehicleId: shipment.assignedVehicleId,
        type: 'SPEEDING',
        severity: Math.max(1, Math.round((speedKmph - env.SPEED_LIMIT_KMPH) / 5)),
        ts: pingTs,
        metadata: { speedKmph, limitKmph: env.SPEED_LIMIT_KMPH },
      })
    }
  }

  // HARSH_TURN (requires previous ping)
  if (
    prev &&
    typeof prev.heading === 'number' &&
    typeof heading === 'number' &&
    typeof prev.ts !== 'undefined' &&
    typeof speedKmph === 'number' &&
    speedKmph > 10
  ) {
    const dtSec = (pingTs.getTime() - new Date(prev.ts).getTime()) / 1000
    if (dtSec > 0 && dtSec <= env.HARSH_TURN_WINDOW_SEC) {
      const raw = Math.abs(heading - prev.heading)
      const delta = Math.min(raw, 360 - raw)
      if (delta >= env.HARSH_TURN_DEG) {
        if (!(await recentlyEmitted('HARSH_TURN'))) {
          await DriverEvent.create({
            shipmentId: shipment._id,
            driverId,
            vehicleId: shipment.assignedVehicleId,
            type: 'HARSH_TURN',
            severity: Math.max(1, Math.round(delta / 30)),
            ts: pingTs,
            metadata: { deltaDeg: delta, windowSec: dtSec },
          })
        }
      }
    }
  }

  // IDLING: if speed is near zero for a while
  if (prev && typeof prev.ts !== 'undefined') {
    const prevSpeed = typeof prev.speedKmph === 'number' ? prev.speedKmph : null
    const dtSec = (pingTs.getTime() - new Date(prev.ts).getTime()) / 1000
    const nowIdle = typeof speedKmph === 'number' && speedKmph < 2
    const prevIdle = typeof prevSpeed === 'number' && prevSpeed < 2

    if (nowIdle && prevIdle && dtSec >= env.IDLE_WINDOW_SEC) {
      if (!(await recentlyEmitted('IDLING'))) {
        await DriverEvent.create({
          shipmentId: shipment._id,
          driverId,
          vehicleId: shipment.assignedVehicleId,
          type: 'IDLING',
          severity: 1,
          ts: pingTs,
          metadata: { idleForSec: Math.round(dtSec) },
        })
      }
    }
  }

  // Compute distance once (straight-line as a demo heuristic)
  if (typeof shipment.distanceKm !== 'number') {
    shipment.distanceKm = Math.round(haversineKm(shipment.origin, shipment.destination) * 100) / 100
  }

  shipment.currentLocation = { lat, lng, updatedAt: ping.ts }

  // Update predicted ETA based on current location using real-time calculation
  try {
    shipment.predictedEta = await getRealTimeEta({
      shipmentId: shipment._id,
      currentLocation: { lat, lng },
      speedKmph
    });
  } catch (etaErr) {
    // Fallback to original method if real-time calculation fails
    shipment.predictedEta = estimateEta({ from: { lat, lng }, to: shipment.destination, speedKmph, now: ping.ts });
    console.warn('Real-time ETA calculation failed, using fallback:', etaErr.message);
  }

  shipment.predictedEtaUpdatedAt = ping.ts

  // Update distance remaining using optimized route
  let distanceRemaining;
  try {
    const route = await getRealTimeOptimizedRoute({
      shipmentId: shipment._id,
      currentLocation: { lat, lng }
    });
    distanceRemaining = route.distanceKm || haversineKm({ lat, lng }, shipment.destination);
  } catch (routeErr) {
    // Fallback to haversine distance if optimized route fails
    distanceRemaining = haversineKm({ lat, lng }, shipment.destination);
    console.warn('Real-time route optimization failed, using fallback:', routeErr.message);
  }

  shipment.distanceRemainingKm = distanceRemaining;

  // Calculate progress percentage
  if (shipment.distanceKm && shipment.distanceKm > 0) {
    shipment.progressPercentage = Math.min(100, Math.round(((shipment.distanceKm - distanceRemaining) / shipment.distanceKm) * 100));
  }

  // Check if shipment status should be updated to IN_TRANSIT
  if (shipment.status === 'DISPATCHED') {
    shipment.status = 'IN_TRANSIT';

    // Create notification for shipment in transit
    try {
      await createShipmentNotification(shipment, 'SHIPMENT_IN_TRANSIT');
    } catch (err) {
      console.error('Error creating IN_TRANSIT notification:', err.message);
    }
  }

  // **WORKFLOW 1: OUT_FOR_DELIVERY auto-trigger when near destination (< 5km)**
  if (shipment.status === 'IN_TRANSIT' && distanceRemaining < 5) {
    shipment.status = 'OUT_FOR_DELIVERY';
    try {
      await createShipmentNotification(shipment, 'SHIPMENT_NEAR_DESTINATION', `Shipment ${shipment.referenceId} is out for delivery and approaching destination.`);
    } catch (err) {
      console.error('Error creating OUT_FOR_DELIVERY notification:', err.message);
    }
  }

  // **WORKFLOW 1: DELAYED state handling based on significant delay (> 30 min)**
  const delayThresholdMs = 30 * 60 * 1000; // 30 minutes
  const delayCooldownMs = 15 * 60 * 1000;

  if (shipment.eta && shipment.predictedEta && shipment.predictedEta.getTime() > shipment.eta.getTime() + delayThresholdMs) {
    // Mark as DELAYED if currently IN_TRANSIT
    if (shipment.status === 'IN_TRANSIT') {
      shipment.status = 'DELAYED';
    }

    const last = shipment.lastDelayNotifiedAt ? shipment.lastDelayNotifiedAt.getTime() : 0;
    if (!last || ping.ts.getTime() - last > delayCooldownMs) {
      shipment.lastDelayNotifiedAt = ping.ts;
      await createShipmentNotification(shipment, 'SHIPMENT_DELAYED', `Shipment ${shipment.referenceId} is experiencing delays. New ETA: ${shipment.predictedEta.toLocaleString()}`);
    }
  } else if (shipment.status === 'DELAYED' && shipment.eta && shipment.predictedEta && shipment.predictedEta.getTime() <= shipment.eta.getTime() + delayThresholdMs) {
    // **WORKFLOW 1: Recovery from DELAYED back to IN_TRANSIT**
    shipment.status = 'IN_TRANSIT';
    await createShipmentNotification(shipment, 'DELAY_RESOLVED', `Shipment ${shipment.referenceId} is back on schedule.`);
  }

  await shipment.save()

  // Create predictive notifications based on updated shipment data
  try {
    await createPredictiveNotifications(shipment);
  } catch (err) {
    console.error('Error creating predictive notifications:', err.message);
  }

  // Send milestone notifications
  try {
    await sendMilestoneNotifications(shipment);
  } catch (err) {
    console.error('Error sending milestone notifications:', err.message);
  }

  // Send proactive notifications
  try {
    await sendProactiveNotifications(shipment);
  } catch (err) {
    console.error('Error sending proactive notifications:', err.message);
  }

  // Create weather and traffic alerts if needed
  try {
    await createWeatherTrafficAlerts(shipment);
  } catch (err) {
    console.error('Error creating weather/traffic alerts:', err.message);
  }

  // Check geofence violations
  try {
    const { checkGeofenceViolations } = await import('./geofencingService.js')
    await checkGeofenceViolations({
      lat,
      lng,
      shipmentId: shipment._id,
      driverId,
      speedKmph
    })
  } catch (err) {
    console.error('Error checking geofence violations:', err.message);
  }

  return ping
}

// **WORKFLOW 3: Enhanced function to find drivers with ACTIVE SCHEDULES, filter by capacity, prioritized by LEAST DISTANCE**
export async function findNearestAvailableResources({ origin, requiredCapacityKg = 0, vehicleType = null, radiusKm = 50, excludeDriverIds = [] }) {
  const now = new Date();
  const excludeSet = new Set(excludeDriverIds.map(id => String(id)));

  // 1. Find Drivers with Active Schedules ("Compliance with Schedule")
  // We look for schedules that are either ACTIVE or SCHEDULED and cover the current time.
  const activeSchedules = await DriverSchedule.find({
    status: { $in: ['ACTIVE', 'SCHEDULED'] },
    shiftStart: { $lte: now },
    shiftEnd: { $gte: now }
  }).populate('driverId').populate('vehicleId').lean();

  let candidatePool = [];

  if (activeSchedules.length > 0) {
    // Transform schedules into candidates
    candidatePool = activeSchedules.map(s => ({
      driver: s.driverId,
      vehicle: s.vehicleId,
      scheduleId: s._id,
      source: 'SCHEDULED'
    }));
  } else {
    // FALLBACK: If no schedules found, check for "Ad-hoc" available drivers (Active status in User model)
    console.log('[AutoAssign] No active driver schedules found. Falling back to ad-hoc availability.');
    const adHocDrivers = await User.find({ role: 'DRIVER', driverApprovalStatus: 'APPROVED' }).lean();

    // Find all available vehicles
    // Find all available vehicles (Relaxed for demo)
    const adHocVehicles = await Vehicle.find({}).lean();

    console.log(`[AutoAssign] Ad-hoc Drivers: ${adHocDrivers.length}, Ad-hoc Vehicles: ${adHocVehicles.length}`);

    // Create candidates by pairing available drivers with ANY available vehicle (for demo)
    // In a real scenario, meaningful assignment would happen.
    // We limit to min(drivers, vehicles) pairs
    const pairs = Math.min(adHocDrivers.length, adHocVehicles.length);

    for (let i = 0; i < pairs; i++) {
      candidatePool.push({
        driver: adHocDrivers[i],
        vehicle: adHocVehicles[i],
        source: 'AD_HOC'
      });
    }
  }



  // 2. Filter Candidates
  const validCandidates = [];

  for (const candidate of candidatePool) {
    const { driver, vehicle } = candidate;

    if (!driver) {
      console.log(`[AutoAssign] Skipped: No driver object`);
      continue;
    }

    if (driver.driverApprovalStatus !== 'APPROVED') {
      console.log(`[AutoAssign] Skipped Driver ${driver._id}: Not APPROVED (Status: ${driver.driverApprovalStatus})`);
      continue;
    }

    if (excludeSet.has(String(driver._id))) {
      console.log(`[AutoAssign] Skipped Driver ${driver._id}: Excluded`);
      continue;
    }

    // Check Driver Availability (Not on active shipment)
    const activeShipment = await Shipment.findOne({
      assignedDriverId: driver._id,
      status: { $in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] }
    }).select('_id').lean();

    if (activeShipment) {
      console.log(`[AutoAssign] Skipped Driver ${driver._id}: Busy on Shipment ${activeShipment._id}`);
      continue; // Driver is busy
    }

    // Check Vehicle Constraints
    let targetVehicle = vehicle;

    // If no vehicle in schedule (or ad-hoc), find one
    if (!targetVehicle) {
      // Find an available vehicle matching criteria
      const vQuery = { status: 'AVAILABLE' };
      if (vehicleType) vQuery.type = vehicleType;
      // if (requiredCapacityKg > 0) vQuery.capacityKg = { $gte: requiredCapacityKg };
      targetVehicle = await Vehicle.findOne(vQuery).lean();
    }

    if (!targetVehicle) {
      console.log(`[AutoAssign] Skipped Driver ${driver._id}: No Vehicle Found`);
      continue;
    }

    // Validate Vehicle Type/Capacity if specified
    if (vehicleType && targetVehicle.type !== vehicleType) {
      console.log(`[AutoAssign] Skipped Vehicle ${targetVehicle._id}: Type Mismatch (${targetVehicle.type} != ${vehicleType})`);
      continue;
    }
    // if (requiredCapacityKg > 0 && targetVehicle.capacityKg < requiredCapacityKg) continue;
    // if (targetVehicle.status !== 'AVAILABLE' && targetVehicle.status !== 'IN_USE') continue; // Allow IN_USE if it's the driver's current vehicle? No, strict availability.
    // if (targetVehicle.status !== 'AVAILABLE') continue;

    // 3. Calculate Distance (Live GPS Tracking)
    const lastPing = await LocationPing.findOne({ driverId: driver._id }).sort({ ts: -1 }).lean();
    let distance = Infinity;
    let location = null;

    if (lastPing) {
      location = { lat: lastPing.lat, lng: lastPing.lng };
      distance = haversineKm(origin, location);
    } else {
      // Demo Mode: If no ping exists, assume driver is at the hub/origin (Available)
      // This ensures we can assign fresh drivers without pings
      distance = 0;
    }

    // Relaxed Check: If distance is 0 (assumed) or within radius
    if (distance <= radiusKm) {
      validCandidates.push({
        driver,
        vehicle: targetVehicle,
        distance,
        location,
        rating: driver.performanceRating || 5
      });
    } else {
      console.log(`[AutoAssign] Skipped Driver ${driver._id}: Out of Range (${distance.toFixed(1)}km > ${radiusKm}km)`);
    }
  }

  // 4. Sort by LEAST DISTANCE (Primary) then Rating (Secondary)
  validCandidates.sort((a, b) => {
    // Prioritize distance
    if (Math.abs(a.distance - b.distance) > 0.5) { // 0.5km difference matters
      return a.distance - b.distance;
    }
    // Tie-break with rating
    return b.rating - a.rating;
  });

  const bestMatch = validCandidates.length > 0 ? validCandidates[0] : null;

  return {
    vehicle: bestMatch?.vehicle || null,
    driver: bestMatch?.driver || null,
    candidates: validCandidates,
    matchedVehicles: validCandidates.map(c => c.vehicle)
  };
}

// **WORKFLOW 3: Enhanced auto-assign with manager fallback and driver request**
export async function autoAssignShipment({ shipmentId, actorId, requiredCapacityKg = 0, vehicleType = null, excludeDriverIds = [] }) {
  const shipment = await Shipment.findById(shipmentId);
  if (!shipment) {
    const err = new Error('Shipment not found');
    err.statusCode = 404;
    throw err;
  }

  // Find nearest available vehicle and driver within 10km radius
  const { vehicle, driver, candidates, matchedVehicles } = await findNearestAvailableResources({
    origin: shipment.origin,
    requiredCapacityKg: requiredCapacityKg || shipment.packageDetails?.weight || 0,
    vehicleType,
    excludeDriverIds
  });

  // **WORKFLOW 3: If no candidate found, alert manager**
  if (!vehicle || !driver) {
    // Find a manager to notify
    const manager = await User.findOne({ role: 'MANAGER' }).select('_id').lean();
    if (manager?._id) {
      await createNotification({
        userId: manager._id,
        type: 'ASSIGNMENT_FAILED',
        severity: 'WARNING',
        message: `Auto-assignment failed for shipment ${shipment.referenceId}. No available vehicle/driver within range. Manual intervention required.`,
        metadata: { shipmentId: shipment._id, availableVehicles: matchedVehicles.length, availableDrivers: candidates.length }
      });
    }
    const err = new Error('No available vehicle or driver found within service radius (50km). Manager has been notified.');
    err.statusCode = 400;
    throw err;
  }

  // **WORKFLOW 3: Create assignment request for driver (pending acceptance)**
  shipment.assignedVehicleId = vehicle._id;
  shipment.assignedDriverId = driver._id;
  shipment.status = 'ASSIGNED';
  shipment.lastEventAt = new Date();
  await shipment.save();

  // Mark vehicle as in use
  await Vehicle.findByIdAndUpdate(vehicle._id, { status: 'IN_USE' }, { new: true });

  await audit({
    actorId,
    action: 'SHIPMENT_AUTO_ASSIGNED',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { vehicleId: vehicle._id, driverId: driver._id, radiusKm: 50 }
  });

  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_ASSIGNED',
    description: `Auto-assigned to driver ${driver.name} and vehicle ${vehicle.plateNumber}`,
    location: shipment.origin,
    actorId: actorId || driver._id, // If actorId is null (system), use driverId or keep undefined if schema allows
    metadata: {
      vehicleId: vehicle._id,
      driverId: driver._id,
      method: 'AUTO'
    }
  });

  // **WORKFLOW 3: Send request notification to driver**
  await createNotification({
    userId: driver._id,
    type: 'ASSIGNMENT_REQUEST',
    severity: 'INFO',
    message: `New shipment ${shipment.referenceId} assigned to you. Origin: ${shipment.origin.name}, Destination: ${shipment.destination.name}. Please accept or reject.`,
    metadata: { shipmentId: shipment._id, referenceId: shipment.referenceId }
  });

  return shipment;
}

export async function assignShipment({ shipmentId, vehicleId, driverId, actorId }) {
  const shipment = await Shipment.findById(shipmentId)
  if (!shipment) {
    const err = new Error('Shipment not found')
    err.statusCode = 404
    throw err
  }

  const vehicle = await Vehicle.findById(vehicleId)
  if (!vehicle) {
    const err = new Error('Vehicle not found')
    err.statusCode = 404
    throw err
  }

  const actor = await User.findById(actorId).lean()
  if (!actor || actor.role !== 'MANAGER') {
    const err = new Error('Invalid actor')
    err.statusCode = 403
    throw err
  }

  const driver = await User.findById(driverId)
  if (!driver || driver.role !== 'DRIVER') {
    const err = new Error('Driver not found')
    err.statusCode = 404
    throw err
  }

  if (driver.driverApprovalStatus !== 'APPROVED') {
    const err = new Error('Driver not approved')
    err.statusCode = 403
    throw err
  }

  shipment.assignedVehicleId = vehicle._id
  shipment.assignedDriverId = driver._id
  shipment.status = 'ASSIGNED'
  shipment.lastEventAt = new Date()
  await shipment.save()

  // Mark vehicle in use (simple heuristic)
  if (vehicle.status !== 'IN_USE') {
    vehicle.status = 'IN_USE'
    await vehicle.save()
  }

  await audit({ actorId, action: 'SHIPMENT_ASSIGNED', entityType: 'Shipment', entityId: shipment._id, metadata: { vehicleId, driverId } })

  await ShipmentEvent.create({
    shipmentId: shipment._id,
    type: 'SHIPMENT_ASSIGNED',
    description: `Assigned to driver ${driver.name} and vehicle ${vehicle.plateNumber} by manager`,
    location: shipment.origin,
    actorId,
    metadata: {
      vehicleId: vehicle._id,
      driverId: driver._id,
      method: 'MANUAL'
    }
  });

  if (driverId) {
    await createNotification({
      userId: driverId,
      type: 'ASSIGNMENT',
      message: `You have been assigned shipment ${shipment.referenceId}.`,
    })
  }

  return shipment
}

/**
 * Automatically assign the best available driver and vehicle for a customer shipment
 */
export async function autoAssignCustomerShipment({ origin, weightKg }) {
  const { vehicle, driver } = await findNearestAvailableResources({
    origin,
    requiredCapacityKg: weightKg,
    radiusKm: 50 // Extended radius for customer self-service
  });

  if (!vehicle || !driver) {
    const err = new Error('No available vehicles or drivers found within service range.');
    err.statusCode = 400;
    throw err;
  }

  return { vehicleId: vehicle._id, driverId: driver._id };
}

/**
 * Prepare shipment data without saving to DB
 */
export async function prepareCustomerShipment({ customerId, data }) {
  const { origin, destination, goodsImages, packageDetails, deliveryType, pricingMode, customPrice, category, customCategory, consigneeName, consigneeContact } = data;

  // 1. Calculate distance
  const distance = haversineKm(origin, destination);

  // Derive category (fallback to KIRANA if not provided)
  const selectedCategory = category && ['KIRANA', 'DAWAI', 'KAPDA', 'DAIRY', 'AUTO_PARTS', 'ELECTRONICS'].includes(category)
    ? category
    : 'KIRANA';

  // 2. Comprehensive Industrial Pricing Engine
  const pricingData = await pricingService.calculateShipmentFinalCost({
    origin,
    destination,
    weightKg: packageDetails?.weight || 0,
    shipmentType: selectedCategory,
    deliveryType: deliveryType || 'standard'
  });

  let finalPrice = pricingData.grandTotal;
  if (pricingMode === 'CUSTOM' && typeof customPrice === 'number' && customPrice > 0) {
    finalPrice = Math.round(customPrice);
  }

  // 3. Preliminary Driver Payout Calculation
  const payoutData = await pricingService.calculateDriverShipmentPayout({
    totalRevenue: finalPrice,
    distanceKm: distance,
    driverRating: 5.0 // Default for new assignments
  });

  // 3. Auto-assign resources (Dry run to check availability)
  let vehicleId, driverId;
  try {
    const assignment = await autoAssignCustomerShipment({
      origin,
      weightKg: packageDetails?.weight || 0
    });
    vehicleId = assignment.vehicleId;
    driverId = assignment.driverId;
  } catch (err) {
    console.warn('Auto-assign failed during preparation (non-fatal):', err.message);
    // Continue without pre-assignment. Manager will assign later.
  }

  // 4. Generate unique reference ID
  const referenceId = `JSHS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // 5. Predict ETA
  const eta = estimateEta({ from: origin, to: destination });

  return {
    referenceId,
    origin,
    destination,
    createdBy: customerId,
    createdByRole: 'CUSTOMER',
    customerId,
    goodsImages,
    packageDetails,
    deliveryType,
    distanceKm: distance,
    // Pricing fields
    price: finalPrice,
    paymentAmount: finalPrice,
    paymentAmountCharged: 1,
    pricingBreakdown: pricingData,
    payoutBreakdown: payoutData,
    driverEarnings: {
      amount: payoutData.netEarnings,
      status: 'PENDING'
    },
    // Category selection (manual)
    shipmentType: selectedCategory,
    // Custom category name (if provided)
    customGoodsCategory: customCategory,
    assignedVehicleId: vehicleId,
    assignedDriverId: driverId,
    consignee: {
      name: consigneeName,
      contact: consigneeContact
    },
    status: 'CREATED',
    approvalStatus: 'PENDING_APPROVAL',
    paymentStatus: 'PENDING',
    eta
  };
}

/**
 * Create a new shipment from a customer self-service request (Finalize)
 */
export async function createCustomerShipment({ customerId, shipmentData }) {
  // 1. Create the shipment document
  const shipment = await Shipment.create(shipmentData);

  // 2. Audit and Notifications
  await audit({
    actorId: customerId,
    action: 'SHIPMENT_CREATED_BY_CUSTOMER',
    entityType: 'Shipment',
    entityId: shipment._id,
    metadata: { referenceId: shipment.referenceId, actualPrice: shipment.price }
  });

  await createShipmentNotification(shipment, 'SHIPMENT_CREATED', 'A new customer shipment is awaiting your approval.');

  return shipment;
}

