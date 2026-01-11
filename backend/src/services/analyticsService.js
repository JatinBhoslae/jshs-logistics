import { Shipment } from '../models/Shipment.js'
import { Vehicle } from '../models/Vehicle.js'
import { Invoice } from '../models/Invoice.js'
import { LocationPing } from '../models/LocationPing.js'
import { DriverEvent } from '../models/DriverEvent.js'
import { haversineKm } from '../utils/geo.js'

export async function getOverviewKPIs() {
  const q = {}

  const activeStatuses = ['CREATED', 'ASSIGNED', 'PICKED_UP', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'OUT_FOR_DELIVERY'];
  const pastStatuses = ['DELIVERED', 'CLOSED', 'CANCELLED'];

  const [shipmentsTotal, activeCount, pastCount, vehiclesTotal, invoicesPaidCount] = await Promise.all([
    Shipment.countDocuments(q),
    Shipment.countDocuments({ ...q, status: { $in: activeStatuses } }),
    Shipment.countDocuments({ ...q, status: { $in: pastStatuses } }),
    Vehicle.countDocuments(q),
    Invoice.countDocuments({ ...q, status: 'PAID' }),
  ])

  // Simple demand trend: shipments created in last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const shipmentsLast7d = await Shipment.countDocuments({ ...q, createdAt: { $gte: since } })

  // Maintenance heuristics: due in next 500km OR already in MAINTENANCE status
  const maintenanceDueSoon = await Vehicle.countDocuments({
    ...q,
    $or: [{ status: 'MAINTENANCE' }, { $expr: { $lte: [{ $subtract: ['$nextServiceAtKm', '$odometerKm'] }, 500] } }],
  })

  // Financial Metrics
  const revenuePaidAgg = await Invoice.aggregate([
    { $match: { status: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const revenuePaid = revenuePaidAgg?.[0]?.total ?? 0

  const driverPayoutsAgg = await Shipment.aggregate([
    { $match: { 'driverEarnings.status': 'AVAILABLE' } },
    { $group: { _id: null, total: { $sum: '$driverEarnings.amount' } } },
  ])
  const driverPayoutsPending = driverPayoutsAgg?.[0]?.total ?? 0

  const invoicesOpenAgg = await Invoice.aggregate([
    { $match: { status: 'ISSUED' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const revenuePending = invoicesOpenAgg?.[0]?.total ?? 0

  // Calculate predictive analytics
  const predictiveKpis = await calculatePredictiveKPIs();

  return {
    shipmentsTotal,
    shipmentsInTransit: activeCount,
    shipmentsDelivered: pastCount,
    vehiclesTotal,
    invoicesPaid: invoicesPaidCount,
    revenuePaid,
    revenuePending,
    driverPayoutsPending,
    shipmentsLast7d,
    maintenanceDueSoon,
    ...predictiveKpis,
  }
}

// Function to calculate predictive KPIs
async function calculatePredictiveKPIs() {
  const q = {};

  // Calculate on-time delivery rate
  const deliveredShipments = await Shipment.find({
    ...q,
    status: 'DELIVERED',
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  });

  let onTimeCount = 0;
  let totalCount = deliveredShipments.length;

  for (const shipment of deliveredShipments) {
    if (shipment.eta && shipment.predictedEta) {
      const actualDeliveryTime = shipment.updatedAt;
      const scheduledEta = new Date(shipment.eta);

      // Consider on-time if delivered before or within 1 hour of ETA
      if (actualDeliveryTime <= new Date(scheduledEta.getTime() + 60 * 60 * 1000)) {
        onTimeCount++;
      }
    }
  }

  const onTimeRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 100;

  // Predicted delays
  const inTransitShipments = await Shipment.find({
    ...q,
    status: 'IN_TRANSIT'
  });

  let predictedDelayCount = 0;
  for (const shipment of inTransitShipments) {
    if (shipment.predictedEta && shipment.eta) {
      const predictedEta = new Date(shipment.predictedEta);
      const scheduledEta = new Date(shipment.eta);

      // Predict delay if predicted ETA is more than 1 hour after scheduled ETA
      if (predictedEta > new Date(scheduledEta.getTime() + 60 * 60 * 1000)) {
        predictedDelayCount++;
      }
    }
  }

  // Driver performance impact
  const avgDriverScore = await calculateAverageDriverPerformance();

  // Weather and traffic impact (simulated for demo)
  const weatherImpact = calculateWeatherImpact();

  // Calculate delivery accuracy based on historical data
  const deliveryAccuracy = calculateDeliveryAccuracy(deliveredShipments);

  return {
    onTimeRate,
    predictedDelays: predictedDelayCount,
    avgDriverScore,
    weatherImpact,
    deliveryAccuracy,
    avgDeliveryTime: calculateAvgDeliveryTime(inTransitShipments)
  };
}

// Helper function to calculate average driver performance
async function calculateAverageDriverPerformance() {
  const events = await DriverEvent.find({});

  // Calculate average based on events
  if (events.length === 0) return 85; // Default if no events

  // Simplified calculation: fewer events = better score
  const speedingEvents = events.filter(e => e.type === 'SPEEDING').length;
  const harshTurnEvents = events.filter(e => e.type === 'HARSH_TURN').length;
  const idlingEvents = events.filter(e => e.type === 'IDLING').length;

  // Calculate score based on events (lower is better)
  const totalPenalty = (speedingEvents * 3) + (harshTurnEvents * 2) + idlingEvents;
  const score = Math.max(0, 100 - totalPenalty);

  return Math.min(100, Math.max(0, score));
}

// Helper function to calculate weather impact (simulated)
function calculateWeatherImpact() {
  // In a real system, this would connect to a weather API
  // For demo purposes, return a random value
  const weatherConditions = ['clear', 'rain', 'storm', 'fog'];
  const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

  switch (randomCondition) {
    case 'clear':
      return { risk: 'low', description: 'No weather impact expected' };
    case 'rain':
      return { risk: 'medium', description: 'Rain may cause minor delays' };
    case 'storm':
      return { risk: 'high', description: 'Storm may cause significant delays' };
    case 'fog':
      return { risk: 'medium', description: 'Reduced visibility may impact delivery' };
    default:
      return { risk: 'low', description: 'No weather impact expected' };
  }
}

// Helper function to calculate delivery accuracy
function calculateDeliveryAccuracy(shipments) {
  if (shipments.length === 0) return 90; // Default accuracy

  let accurateCount = 0;

  for (const shipment of shipments) {
    if (shipment.predictedEta && shipment.eta) {
      const predicted = new Date(shipment.predictedEta);
      const scheduled = new Date(shipment.eta);
      const actual = shipment.updatedAt;

      // Accuracy is how close the predicted ETA was to actual delivery time
      const predictedVsActual = Math.abs(predicted - actual);
      const scheduledVsActual = Math.abs(scheduled - actual);

      // If predicted was closer to actual than scheduled, consider it accurate
      if (predictedVsActual <= scheduledVsActual) {
        accurateCount++;
      }
    }
  }

  return Math.round((accurateCount / shipments.length) * 100);
}

// Helper function to calculate average delivery time
function calculateAvgDeliveryTime(shipments) {
  if (shipments.length === 0) return '24-48 hours'; // Default

  // For demo purposes, return a range
  return '12-24 hours';
}

