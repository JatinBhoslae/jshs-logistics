/**
 * Pricing & Payout Engineering Service
 * Implements industry-standard logistics cost models and driver compensation algorithms.
 */

import { haversineKm } from '../utils/geo.js';

// Industry standard constants (India-centric values in INR)
const PRICING_CONSTANTS = {
    BASE_BOOKING_FEE: 250,
    KM_RATES: {
        BIKE: 15,
        VAN: 25,
        TRUCK_SM: 40,
        TRUCK_LG: 65
    },
    WEIGHT_SURCHARGE: 2.5, // Per KG
    COMMODITY_MULTIPLIERS: {
        KIRANA: 1.0,
        KAPDA: 1.05,
        DAWAI: 1.25, // Fragile + Special Handling
        ELECTRONICS: 1.3, // High Value
        DAIRY: 1.5, // Refrigerated requirement
        AUTO_PARTS: 1.2
    },
    URGENCY_MULTIPLIER: {
        standard: 1.0,
        express: 1.4 // Priority routing & handling
    },
    TOLL_ESTIMATE_PERCENT: 0.08, // Estimated 8% of cost goes to tolls
    TAX_GST: 0.18 // 18% GST for logistics in India
};

const PAYOUT_CONSTANTS = {
    REVENUE_SHARE_BASE: 0.70, // 70% share for driver
    PERFORMANCE_BONUS: {
        EXCELLENT: 0.10, // 4.5+ Rating
        GOOD: 0.05,    // 4.0+ Rating
        AVERAGE: 0      // Below 4.0
    },
    LONG_HAUL_BONUS_THRESHOLD_KM: 300,
    LONG_HAUL_BONUS_INR: 750,
    FUEL_SURCHARGE_ESTIMATE: 0.15, // 15% extra during high fuel price periods
    PLATFORM_FEE_PERCENT: 0.10 // 10% platform commission
};

/**
 * Calculates the total transport cost for a shipment (Customer Pricing)
 */
export async function calculateShipmentFinalCost({
    origin,
    destination,
    vehicleType = 'TRUCK_SM',
    weightKg = 0,
    shipmentType = 'KIRANA',
    deliveryType = 'standard',
    trafficImpact = 1.0, // Default no impact
    weatherImpact = 1.0  // Default no impact
}) {
    const distance = haversineKm(origin, destination);

    // 1. Base Distance Cost
    const ratePerKm = PRICING_CONSTANTS.KM_RATES[vehicleType] || PRICING_CONSTANTS.KM_RATES.TRUCK_SM;
    const distanceCost = distance * ratePerKm;

    // 2. Weight-based Cost (Bulk surcharge)
    const weightCost = weightKg * PRICING_CONSTANTS.WEIGHT_SURCHARGE;

    // 3. Subtotal before multipliers
    let total = PRICING_CONSTANTS.BASE_BOOKING_FEE + distanceCost + weightCost;

    // 4. Commodity Multiplier
    const commodityMult = PRICING_CONSTANTS.COMMODITY_MULTIPLIERS[shipmentType] || 1.0;
    total *= commodityMult;

    // 5. Urgency Multiplier
    const urgencyMult = PRICING_CONSTANTS.URGENCY_MULTIPLIER[deliveryType] || 1.0;
    total *= urgencyMult;

    // 6. External Factors (Traffic/Weather)
    // Industry standard: Heavy traffic/rain adds 10-25% to cost
    const environmentalFactor = (trafficImpact + weatherImpact) / 2;
    total *= environmentalFactor;

    // 7. Estimated Tolls & Handling
    const tolls = total * PRICING_CONSTANTS.TOLL_ESTIMATE_PERCENT;
    total += tolls;

    // 8. Final Rounding
    const subtotal = Math.ceil(total);
    const tax = Math.ceil(subtotal * PRICING_CONSTANTS.TAX_GST);
    const grandTotal = subtotal + tax;

    return {
        baseFare: PRICING_CONSTANTS.BASE_BOOKING_FEE,
        distanceCost: Math.round(distanceCost),
        weightCost: Math.round(weightCost),
        tollsEstimate: Math.round(tolls),
        subtotal,
        tax,
        grandTotal,
        breakdown: {
            distance,
            ratePerKm,
            commodityMult,
            urgencyMult,
            environmentalFactor
        }
    };
}

/**
 * Calculates the Driver Payout for a completed shipment
 */
export async function calculateDriverShipmentPayout({
    totalRevenue, // The grand total paid by customer
    distanceKm,
    driverRating = 5.0,
    isExtraShift = false
}) {
    // 1. Calculate Base Share (Exclude Tax from revenue calculation)
    const taxableRevenue = totalRevenue / (1 + PRICING_CONSTANTS.TAX_GST);
    let payout = taxableRevenue * PAYOUT_CONSTANTS.REVENUE_SHARE_BASE;

    // 2. Performance Bonus
    let bonusRate = 0;
    if (driverRating >= 4.5) bonusRate = PAYOUT_CONSTANTS.PERFORMANCE_BONUS.EXCELLENT;
    else if (driverRating >= 4.0) bonusRate = PAYOUT_CONSTANTS.PERFORMANCE_BONUS.GOOD;

    const bonus = taxableRevenue * bonusRate;
    payout += bonus;

    // 3. Long Haul Incentive
    let longHaulIncentive = 0;
    if (distanceKm >= PAYOUT_CONSTANTS.LONG_HAUL_BONUS_THRESHOLD_KM) {
        longHaulIncentive = PAYOUT_CONSTANTS.LONG_HAUL_BONUS_INR;
    }
    payout += longHaulIncentive;

    // 4. Night/Extra Shift Incentive (15% boost)
    let shiftIncentive = 0;
    if (isExtraShift) {
        shiftIncentive = payout * 0.15;
        payout += shiftIncentive;
    }

    // 5. Final Platform Deduction (Optional depending on business model)
    const platformFee = taxableRevenue * PAYOUT_CONSTANTS.PLATFORM_FEE_PERCENT;
    const netEarnings = payout - platformFee;

    return {
        baseShare: Math.round(taxableRevenue * PAYOUT_CONSTANTS.REVENUE_SHARE_BASE),
        performanceBonus: Math.round(bonus),
        longHaulIncentive: Math.round(longHaulIncentive),
        shiftIncentive: Math.round(shiftIncentive),
        platformFee: Math.round(platformFee),
        netEarnings: Math.max(0, Math.round(netEarnings)),
        totalPayout: Math.round(payout)
    };
}
