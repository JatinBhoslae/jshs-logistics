import { Vehicle } from '../models/Vehicle.js'
import { Notification } from '../models/Notification.js'
import { createNotification } from './notificationService.js'
import { User } from '../models/User.js'

/**
 * Checks for IoT alerts and triggers repetitive notifications for low fuel.
 */
export async function checkIotAlerts() {
    const vehicles = await Vehicle.find({}).lean();
    const managers = await User.find({ role: 'MANAGER' }).select('_id').lean();

    for (const vehicle of vehicles) {
        // 1. Low Fuel Check
        if (vehicle.currentFuelLiters < vehicle.fuelThresholdLowLiters) {
            // Check if an unresolved low fuel notification already exists for this vehicle
            const existingAlert = await Notification.findOne({
                type: 'LOW_FUEL',
                'metadata.vehicleId': vehicle._id,
                isResolved: false,
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Within last hour to prevent double spam if checking frequently
            });

            if (!existingAlert) {
                for (const manager of managers) {
                    await createNotification({
                        userId: manager._id,
                        type: 'LOW_FUEL',
                        severity: 'ERROR',
                        message: `CRITICAL: Vehicle ${vehicle.plateNumber} is low on fuel (${vehicle.currentFuelLiters.toFixed(1)}L). Please resolve in IoT Monitor.`,
                        metadata: {
                            vehicleId: vehicle._id,
                            plateNumber: vehicle.plateNumber,
                            fuel: vehicle.currentFuelLiters,
                            redirectTo: '/app/iot-monitor'
                        }
                    });
                }
            }
        }

        // 2. Temperature Breach (for Cold Chain)
        if (vehicle.isRefrigerated && vehicle.currentTemperatureC > vehicle.temperatureThresholdMaxC) {
            const existingTempAlert = await Notification.findOne({
                type: 'TEMP_BREACH',
                'metadata.vehicleId': vehicle._id,
                isResolved: false
            });

            if (!existingTempAlert) {
                for (const manager of managers) {
                    await createNotification({
                        userId: manager._id,
                        type: 'TEMP_BREACH',
                        severity: 'ERROR',
                        message: `ALERT: Temperature breach in ${vehicle.plateNumber}! Current: ${vehicle.currentTemperatureC.toFixed(1)}°C (Limit: ${vehicle.temperatureThresholdMaxC}°C).`,
                        metadata: {
                            vehicleId: vehicle._id,
                            plateNumber: vehicle.plateNumber,
                            temp: vehicle.currentTemperatureC,
                            redirectTo: '/app/iot-monitor'
                        }
                    });
                }
            }
        }
    }
}

/**
 * Resolves an IoT alert for a vehicle
 */
export async function resolveIotAlert(notificationId, actorId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new Error('Notification not found');

    notification.isResolved = true;
    notification.resolvedAt = new Date();
    notification.metadata.resolvedBy = actorId;
    await notification.save();

    // If it was a fuel alert, we might want to "refuel" the vehicle in simulation
    if (notification.type === 'LOW_FUEL' && notification.metadata.vehicleId) {
        await Vehicle.findByIdAndUpdate(notification.metadata.vehicleId, {
            currentFuelLiters: 100 // Reset to full (assuming 100 is max)
        });
    }

    return notification;
}
