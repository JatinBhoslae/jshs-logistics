
/**
 * Utility to generate standardized notification messages based on event types and roles.
 */
export function getNotificationTemplate(eventType, shipment, role = 'CUSTOMER') {
    const ref = shipment.referenceId || 'Unknown';

    // Base templates
    const templates = {
        // Standard Lifecycle
        SHIPMENT_CREATED: {
            default: { title: 'Order Placed', message: `Shipment ${ref} has been created.`, severity: 'INFO' },
            CUSTOMER: { title: 'Order Placed', message: `Your order ${ref} has been placed successfully.`, severity: 'SUCCESS' },
            MANAGER: { title: 'New Shipment', message: `New shipment ${ref} created.`, severity: 'INFO' }
        },
        SHIPMENT_ASSIGNED: {
            default: { title: 'Driver Assigned', message: `Shipment ${ref} has been assigned.`, severity: 'INFO' },
            DRIVER: { title: 'New Assignment', message: `You have been assigned to shipment ${ref}. Please start pickup.`, severity: 'INFO' },
            MANAGER: { title: 'Driver Assigned', message: `Driver assigned to shipment ${ref}.`, severity: 'SUCCESS' }
        },
        SHIPMENT_PICKED_UP: {
            default: { title: 'Picked Up', message: `Shipment ${ref} has been picked up.`, severity: 'INFO' },
            CUSTOMER: { title: 'Picked Up', message: `Driver has picked up your shipment ${ref}.`, severity: 'INFO' }
        },
        SHIPMENT_DISPATCHED: {
            default: { title: 'In Transit', message: `Shipment ${ref} is now in transit.`, severity: 'INFO' },
            CUSTOMER: { title: 'In Transit', message: `Your shipment ${ref} is on its way!`, severity: 'SUCCESS' }
        },
        SHIPMENT_OUT_FOR_DELIVERY: {
            default: { title: 'Out For Delivery', message: `Shipment ${ref} is out for delivery.`, severity: 'INFO' },
            CUSTOMER: { title: 'Out For Delivery', message: `Get ready! Your shipment ${ref} is out for delivery today.`, severity: 'SUCCESS' }
        },
        SHIPMENT_DELIVERED: {
            default: { title: 'Delivered', message: `Shipment ${ref} has been delivered.`, severity: 'SUCCESS' },
            CUSTOMER: { title: 'Delivered', message: `Shipment ${ref} delivered. Thanks for choosing us!`, severity: 'SUCCESS' },
            DRIVER: { title: 'Delivery Confirmed', message: `Delivery for ${ref} confirmed. Good job!`, severity: 'SUCCESS' }
        },

        // Exceptions & Alerts
        SHIPMENT_DELAYED: {
            default: { title: 'Delay Alert', message: `Shipment ${ref} is delayed.`, severity: 'WARNING', importance: 'HIGH' },
            CUSTOMER: { title: 'Delay Notice', message: `Sorry, shipment ${ref} is slightly delayed. We're on it.`, severity: 'WARNING', importance: 'HIGH' },
            MANAGER: { title: 'Critical Delay', message: `Delay alert for ${ref}. Check traffic updates.`, severity: 'ERROR', importance: 'HIGH' }
        },
        PREDICTED_DELAY: {
            default: { title: 'Prediction: Delay', message: `Potential delay detected for ${ref}.`, severity: 'WARNING', importance: 'HIGH' },
            MANAGER: { title: 'Intelligence Alert', message: `AI Prediction: High risk of delay for ${ref}.`, severity: 'WARNING', importance: 'HIGH' }
        },
        MAINTENANCE: {
            default: { title: 'Maintenance Required', message: `Maintenance alert for vehicle attached to ${ref}.`, severity: 'ERROR', importance: 'HIGH' }
        },
        GEOFENCE_EXIT: {
            default: { title: 'Geofence Breach', message: `Shipment ${ref} has left the designated zone.`, severity: 'WARNING', importance: 'HIGH' }
        },
        // Progress Milestones
        SHIPMENT_25_PERCENT: {
            default: { title: '25% Milestone', message: `Shipment ${ref} has reached 25% of its journey.`, severity: 'INFO' },
            CUSTOMER: { title: 'Journey Progress', message: `Your shipment ${ref} is 25% complete.`, severity: 'INFO' },
            DRIVER: { title: 'Milestone Reached', message: `Shipment ${ref} is 25% done. Keep going!`, severity: 'INFO' },
            MANAGER: { title: 'Progress Update', message: `Shipment ${ref} progress at 25%.`, severity: 'INFO' }
        },
        SHIPMENT_50_PERCENT: {
            default: { title: '50% Milestone', message: `Shipment ${ref} is halfway through its route.`, severity: 'INFO' },
            CUSTOMER: { title: 'Journey Progress', message: `Your shipment ${ref} is 50% complete.`, severity: 'INFO' },
            DRIVER: { title: 'Milestone Reached', message: `Halfway there for shipment ${ref}.`, severity: 'INFO' },
            MANAGER: { title: 'Progress Update', message: `Shipment ${ref} progress at 50%.`, severity: 'INFO' }
        },
        SHIPMENT_75_PERCENT: {
            default: { title: '75% Milestone', message: `Shipment ${ref} has covered 75% of its route.`, severity: 'INFO' },
            CUSTOMER: { title: 'Journey Progress', message: `Your shipment ${ref} is 75% complete.`, severity: 'INFO' },
            DRIVER: { title: 'Milestone Reached', message: `Almost done! 75% of shipment ${ref} completed.`, severity: 'INFO' },
            MANAGER: { title: 'Progress Update', message: `Shipment ${ref} progress at 75%.`, severity: 'INFO' }
        },
        ARRIVAL_SOON: {
            default: { title: 'Arriving Soon', message: `Shipment ${ref} is arriving soon.`, severity: 'INFO' },
            CUSTOMER: { title: 'Arriving Soon', message: `Your shipment ${ref} will arrive shortly.`, severity: 'SUCCESS' },
            DRIVER: { title: 'Arrival Pending', message: `Prepare for delivery of ${ref}.`, severity: 'INFO' },
            MANAGER: { title: 'Arrival Notice', message: `Shipment ${ref} nearing destination.`, severity: 'INFO' }
        },
        LOCATION_UPDATE: {
            default: { title: 'Location Ping', message: `Shipment ${ref} location updated.`, severity: 'INFO' },
            CUSTOMER: { title: 'Location Update', message: `Your shipment ${ref} location has been updated.`, severity: 'INFO' },
            DRIVER: { title: 'Tracking Ping', message: `Location ping received for ${ref}.`, severity: 'INFO' },
            MANAGER: { title: 'Tracking Update', message: `Shipment ${ref} location change logged.`, severity: 'INFO' }
        },
        IOT_ALERT_FUEL: {
            default: { title: 'Fuel Alert', message: `Low fuel alert detected.`, severity: 'WARNING', importance: 'HIGH' },
            MANAGER: { title: 'Critical Fuel', message: `CRITICAL: Low fuel detected for vehicle attached to ${ref}.`, severity: 'WARNING', importance: 'HIGH' },
            DRIVER: { title: 'Fuel Warning', message: `ATTENTION: Fuel levels are low. Please refill soon.`, severity: 'WARNING', importance: 'HIGH' }
        },
        IOT_ALERT_TEMP: {
            default: { title: 'Temperature Alert', message: `Temperature breach alert.`, severity: 'ERROR', importance: 'HIGH' },
            MANAGER: { title: 'Critical Temp', message: `CRITICAL: Temperature breach for vehicle attached to ${ref}.`, severity: 'ERROR', importance: 'HIGH' },
            DRIVER: { title: 'Temp Warning', message: `ALERT: Chiller temperature is out of range! Check system immediately.`, severity: 'ERROR', importance: 'HIGH' }
        },
        DRIVER_ONBOARDED: {
            MANAGER: { title: 'New Driver', message: `New driver registered and pending approval.`, severity: 'INFO', importance: 'HIGH' }
        }
    };

    const eventTemplates = templates[eventType] || {};
    const result = eventTemplates[role] || eventTemplates.default || { title: eventType.replace(/_/g, ' '), message: `${eventType}: Shipment ${ref}`, severity: 'INFO' };

    // Auto-determine importance if not explicitly set
    if (!result.importance) {
        result.importance = (result.severity === 'ERROR' || result.severity === 'WARNING') ? 'HIGH' : 'LOW';
    }

    return result;
}
