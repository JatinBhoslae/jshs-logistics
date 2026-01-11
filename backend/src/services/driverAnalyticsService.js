import { DriverEvent } from '../models/DriverEvent.js'
import { User } from '../models/User.js'
import { Shipment } from '../models/Shipment.js'
import { LocationPing } from '../models/LocationPing.js'
import { DriverSchedule } from '../models/DriverSchedule.js'

/**
 * Compute comprehensive driver safety score
 */
function computeScore({ speedingCount, harshTurnCount, idlingCount, severitySum, harshBrakeCount = 0 }) {
  // Enhanced scoring: start 100, subtract weighted incidents
  const score = 100
    - speedingCount * 3
    - harshTurnCount * 6
    - harshBrakeCount * 5
    - idlingCount * 1
    - Math.round(severitySum * 0.5)
  return Math.max(0, Math.min(100, score))
}

/**
 * Get driver leaderboard with enhanced metrics
 */
export async function getDriverLeaderboard({ startDate, endDate, limit = 50 } = {}) {
  const matchStage = {}

  if (startDate || endDate) {
    matchStage.ts = {}
    if (startDate) matchStage.ts.$gte = new Date(startDate)
    if (endDate) matchStage.ts.$lte = new Date(endDate)
  }

  const agg = await DriverEvent.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$driverId',
        speedingCount: { $sum: { $cond: [{ $eq: ['$type', 'SPEEDING'] }, 1, 0] } },
        harshTurnCount: { $sum: { $cond: [{ $eq: ['$type', 'HARSH_TURN'] }, 1, 0] } },
        harshBrakeCount: { $sum: { $cond: [{ $eq: ['$type', 'HARSH_BRAKE'] }, 1, 0] } },
        idlingCount: { $sum: { $cond: [{ $eq: ['$type', 'IDLING'] }, 1, 0] } },
        severitySum: { $sum: '$severity' },
        lastEventAt: { $max: '$ts' },
        totalEvents: { $sum: 1 }
      },
    },
    { $sort: { severitySum: 1 } }, // Lower severity sum is better
    { $limit: limit }
  ])

  const driverIds = agg.map((r) => r._id)
  const users = await User.find({ _id: { $in: driverIds } })
    .select('_id name email performanceRating awards')
    .lean()

  const map = new Map(users.map((u) => [String(u._id), u]))

  return agg.map((r) => {
    const u = map.get(String(r._id))
    const row = {
      driverId: String(r._id),
      name: u?.name ?? 'Driver',
      email: u?.email ?? '',
      performanceRating: u?.performanceRating ?? 5,
      awards: u?.awards ?? [],
      speedingCount: r.speedingCount ?? 0,
      harshTurnCount: r.harshTurnCount ?? 0,
      harshBrakeCount: r.harshBrakeCount ?? 0,
      idlingCount: r.idlingCount ?? 0,
      severitySum: r.severitySum ?? 0,
      totalEvents: r.totalEvents ?? 0,
      lastEventAt: r.lastEventAt ?? null,
    }

    return {
      ...row,
      score: computeScore(row),
    }
  })
}

/**
 * Get detailed driver behavior analytics
 */
export async function getDriverBehaviorAnalytics(driverId, { days = 30 } = {}) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get driver events
  const events = await DriverEvent.find({
    driverId,
    ts: { $gte: startDate }
  }).sort({ ts: -1 }).lean()

  // Calculate metrics
  const speedingCount = events.filter(e => e.type === 'SPEEDING').length
  const harshTurnCount = events.filter(e => e.type === 'HARSH_TURN').length
  const harshBrakeCount = events.filter(e => e.type === 'HARSH_BRAKE').length
  const idlingCount = events.filter(e => e.type === 'IDLING').length
  const severitySum = events.reduce((sum, e) => sum + (e.severity || 0), 0)

  const score = computeScore({
    speedingCount,
    harshTurnCount,
    harshBrakeCount,
    idlingCount,
    severitySum
  })

  // Get completed shipments
  const completedShipments = await Shipment.countDocuments({
    assignedDriverId: driverId,
    status: 'DELIVERED',
    updatedAt: { $gte: startDate }
  })

  // Get total distance driven
  const distanceData = await Shipment.aggregate([
    {
      $match: {
        assignedDriverId: driverId,
        status: { $in: ['DELIVERED', 'CLOSED'] },
        updatedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDistance: { $sum: '$distanceKm' }
      }
    }
  ])

  const totalDistance = distanceData[0]?.totalDistance || 0

  // Event trends by day
  const eventTrends = await DriverEvent.aggregate([
    {
      $match: {
        driverId,
        ts: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } },
          type: '$type'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.date': 1 } }
  ])

  return {
    summary: {
      safetyScore: score,
      speedingCount,
      harshTurnCount,
      harshBrakeCount,
      idlingCount,
      totalEvents: events.length,
      severitySum,
      completedShipments,
      totalDistanceKm: Number(totalDistance.toFixed(2)),
      eventsPerKm: totalDistance > 0 ? Number((events.length / totalDistance).toFixed(3)) : 0
    },
    recentEvents: events.slice(0, 20),
    trends: eventTrends
  }
}

/**
 * Detect driver fatigue based on driving patterns
 */
export async function detectDriverFatigue(driverId) {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get recent location pings to analyze driving patterns
  const recentPings = await LocationPing.find({
    driverId,
    ts: { $gte: last24Hours }
  }).sort({ ts: 1 }).lean()

  if (recentPings.length < 10) {
    return {
      fatigueRisk: 'LOW',
      confidence: 50,
      reason: 'Insufficient data',
      continuousDrivingHours: 0,
      recommendations: []
    }
  }

  // Calculate continuous driving time
  let continuousDrivingMinutes = 0
  let lastPingTime = recentPings[0].ts
  let maxContinuousDriving = 0

  for (let i = 1; i < recentPings.length; i++) {
    const timeDiff = (recentPings[i].ts - lastPingTime) / (1000 * 60) // minutes

    if (timeDiff <= 15) { // Consider continuous if pings are within 15 minutes
      continuousDrivingMinutes += timeDiff
    } else {
      maxContinuousDriving = Math.max(maxContinuousDriving, continuousDrivingMinutes)
      continuousDrivingMinutes = 0
    }

    lastPingTime = recentPings[i].ts
  }

  maxContinuousDriving = Math.max(maxContinuousDriving, continuousDrivingMinutes)
  const continuousDrivingHours = maxContinuousDriving / 60

  // Check for recent harsh events (indicator of fatigue)
  const recentHarshEvents = await DriverEvent.countDocuments({
    driverId,
    ts: { $gte: new Date(now.getTime() - 2 * 60 * 60 * 1000) }, // Last 2 hours
    type: { $in: ['HARSH_TURN', 'HARSH_BRAKE', 'SPEEDING'] }
  })

  // Determine fatigue risk
  let fatigueRisk = 'LOW'
  let confidence = 70
  const reasons = []
  const recommendations = []

  if (continuousDrivingHours > 4) {
    fatigueRisk = 'HIGH'
    confidence = 90
    reasons.push(`Continuous driving for ${continuousDrivingHours.toFixed(1)} hours`)
    recommendations.push('Mandatory rest break required')
  } else if (continuousDrivingHours > 3) {
    fatigueRisk = 'MEDIUM'
    confidence = 80
    reasons.push(`Extended driving period: ${continuousDrivingHours.toFixed(1)} hours`)
    recommendations.push('Rest break recommended within 1 hour')
  }

  if (recentHarshEvents > 3) {
    fatigueRisk = fatigueRisk === 'LOW' ? 'MEDIUM' : 'HIGH'
    confidence = Math.min(95, confidence + 10)
    reasons.push(`${recentHarshEvents} harsh events in last 2 hours`)
    recommendations.push('Possible fatigue - monitor closely')
  }

  if (fatigueRisk === 'LOW') {
    reasons.push('Normal driving patterns detected')
    recommendations.push('Continue monitoring')
  }

  return {
    fatigueRisk,
    confidence,
    reason: reasons.join('; '),
    continuousDrivingHours: Number(continuousDrivingHours.toFixed(2)),
    recentHarshEvents,
    recommendations
  }
}

/**
 * Get driver performance trends over time
 */
export async function getDriverPerformanceTrends(driverId, { months = 6 } = {}) {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const trends = await DriverEvent.aggregate([
    {
      $match: {
        driverId,
        ts: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$ts' } }
        },
        speedingCount: { $sum: { $cond: [{ $eq: ['$type', 'SPEEDING'] }, 1, 0] } },
        harshTurnCount: { $sum: { $cond: [{ $eq: ['$type', 'HARSH_TURN'] }, 1, 0] } },
        harshBrakeCount: { $sum: { $cond: [{ $eq: ['$type', 'HARSH_BRAKE'] }, 1, 0] } },
        idlingCount: { $sum: { $cond: [{ $eq: ['$type', 'IDLING'] }, 1, 0] } },
        severitySum: { $sum: '$severity' },
        totalEvents: { $sum: 1 }
      }
    },
    { $sort: { '_id.month': 1 } }
  ])

  // Get shipment completion trends
  const shipmentTrends = await Shipment.aggregate([
    {
      $match: {
        assignedDriverId: driverId,
        status: { $in: ['DELIVERED', 'CLOSED'] },
        updatedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } }
        },
        shipmentsCompleted: { $sum: 1 },
        totalDistance: { $sum: '$distanceKm' }
      }
    },
    { $sort: { '_id.month': 1 } }
  ])

  // Merge trends
  const trendMap = new Map()

  for (const t of trends) {
    trendMap.set(t._id.month, {
      month: t._id.month,
      safetyScore: computeScore(t),
      ...t
    })
  }

  for (const s of shipmentTrends) {
    const existing = trendMap.get(s._id.month) || { month: s._id.month }
    trendMap.set(s._id.month, {
      ...existing,
      shipmentsCompleted: s.shipmentsCompleted,
      totalDistance: Number((s.totalDistance || 0).toFixed(2))
    })
  }

  return Array.from(trendMap.values()).sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Get driver hours of service compliance
 */
export async function getDriverHoursCompliance(driverId, { days = 7 } = {}) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const schedules = await DriverSchedule.find({
    driverId,
    shiftDate: { $gte: startDate },
    status: { $in: ['COMPLETED', 'ACTIVE'] }
  }).sort({ shiftDate: -1 }).lean()

  const violations = []
  let totalDrivingHours = 0
  let totalOnDutyHours = 0

  for (const schedule of schedules) {
    if (schedule.hoursOfService) {
      totalDrivingHours += schedule.hoursOfService.drivingHours || 0
      totalOnDutyHours += schedule.hoursOfService.onDutyHours || 0

      if (!schedule.hoursOfService.isCompliant) {
        violations.push({
          date: schedule.shiftDate,
          violations: schedule.hoursOfService.violations || [],
          drivingHours: schedule.hoursOfService.drivingHours
        })
      }
    }
  }

  return {
    totalDrivingHours: Number(totalDrivingHours.toFixed(2)),
    totalOnDutyHours: Number(totalOnDutyHours.toFixed(2)),
    avgDrivingHoursPerDay: schedules.length > 0 ? Number((totalDrivingHours / schedules.length).toFixed(2)) : 0,
    violationCount: violations.length,
    violations,
    isCompliant: violations.length === 0
  }
}
