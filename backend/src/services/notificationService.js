import { Notification } from '../models/Notification.js'
import { getIO } from '../sockets/io.js'
import { getNotificationTemplate } from '../utils/notificationTemplates.js'
import { sendEmail } from './emailService.js'
import { getShipmentStatusTemplate } from '../utils/mailTemplates.js'


export async function createNotification({ userId, type, severity = 'INFO', importance = 'LOW', title, message, metadata }) {
  if (!userId) {
    console.warn(`[NOTIF] Skipping notification of type ${type} - No userId provided.`);
    return null;
  }
  const doc = await Notification.create({ userId, type, severity, importance, title, message, metadata })

  const io = getIO()
  if (io) {
    console.log(`[NOTIF] Emitting 'notification:new' to room 'user:${userId}'`)
    io.to(`user:${userId}`).emit('notification:new', {
      id: doc._id,
      userId: doc.userId, // Add userId for client-side legacy verification
      type: doc.type,
      severity: doc.severity,
      importance: doc.importance,
      title: doc.title,
      message: doc.message,
      metadata: doc.metadata,
      createdAt: doc.createdAt,
    })
  } else {
    console.warn('[NOTIF] IO not initialized')
  }

  return doc
}

export async function createLoginNotification(user) {
  return await createNotification({
    userId: user._id,
    type: 'LOGIN',
    severity: 'SUCCESS',
    message: `Welcome back, ${user.name}! You are logged in as a ${user.role}.`,
    metadata: { lastLogin: new Date().toISOString() }
  })
}

// Enhanced notification creation for shipment events - Redirects to new stakeholder logic
export async function createShipmentNotification(shipment, eventType, customMessage = null) {
  return notifyAllStakeholders(shipment, eventType, customMessage);
}

// Unified function to notify all relevant stakeholders for a shipment event.
export async function notifyAllStakeholders(shipment, eventType, customMessage = null, excludeRoles = []) {
  const notifications = [];

  // Timeline-related events that managers shouldn't see
  const timelineEvents = [
    'SHIPMENT_25_PERCENT',
    'SHIPMENT_50_PERCENT',
    'SHIPMENT_75_PERCENT',
    'ARRIVAL_SOON',
    'LOCATION_UPDATE'
  ];

  // Define stakeholders to notify
  const stakeholders = [
    { role: 'CUSTOMER', id: shipment.customerId },
    { role: 'DRIVER', id: shipment.assignedDriverId },
    { role: 'MANAGER', id: (!shipment.createdByRole || shipment.createdByRole === 'MANAGER') ? shipment.createdBy : null }
  ];

  for (const { role, id } of stakeholders) {
    if (!id || excludeRoles.includes(role)) continue;

    // Automation: Prevent timeline spam for managers
    if (role === 'MANAGER' && timelineEvents.includes(eventType)) continue;

    const template = getNotificationTemplate(eventType, shipment, role);
    const message = customMessage || template.message;
    const severity = template.severity;
    const importance = template.importance || 'LOW';
    const title = template.title || eventType.replace(/_/g, ' ');

    const notif = await createNotification({
      userId: id,
      type: eventType,
      severity,
      importance,
      title,
      message,
      metadata: {
        shipmentId: shipment._id,
        referenceId: shipment.referenceId,
        roleTargeted: role
      }
    });

    // Proactive Mailing (Eradicating patchwork mailing logic elsewhere)
    if (eventType !== 'LOCATION_UPDATE' && !timelineEvents.includes(eventType)) {
      (async () => {
        try {
          const { User } = await import('../models/User.js');
          const user = await User.findById(id).select('email name').lean();
          if (user && user.email) {
            const html = getShipmentStatusTemplate(eventType, shipment);
            await sendEmail({
              to: user.email,
              subject: `JSHS Update: ${message.split('.')[0]}`,
              html
            });
          }
        } catch (e) {
          console.error('[NOTIF] Email trigger failed:', e.message);
        }
      })();
    }

    notifications.push(notif);
  }

  return notifications;
}

// Function to send milestone notifications
export async function sendMilestoneNotifications(shipment) {
  const notifications = [];

  // Send notification when shipment reaches certain progress milestones
  if (shipment.progressPercentage >= 25 && shipment.progressPercentage < 30) {
    const progress25Notif = await notifyAllStakeholders(
      shipment,
      'SHIPMENT_25_PERCENT',
      `Shipment ${shipment.referenceId} has completed 25% of its journey.`
    );
    notifications.push(...progress25Notif);
  }

  if (shipment.progressPercentage >= 50 && shipment.progressPercentage < 55) {
    const progress50Notif = await notifyAllStakeholders(
      shipment,
      'SHIPMENT_50_PERCENT',
      `Shipment ${shipment.referenceId} has completed 50% of its journey.`
    );
    notifications.push(...progress50Notif);
  }

  if (shipment.progressPercentage >= 75 && shipment.progressPercentage < 80) {
    const progress75Notif = await notifyAllStakeholders(
      shipment,
      'SHIPMENT_75_PERCENT',
      `Shipment ${shipment.referenceId} has completed 75% of its journey.`
    );
    notifications.push(...progress75Notif);
  }

  return notifications;
}

// Function to send proactive notifications
export async function sendProactiveNotifications(shipment) {
  const notifications = [];

  // Send proactive notifications based on various conditions

  // If predicted ETA is significantly different from scheduled ETA
  if (shipment.predictedEta && shipment.eta) {
    const predictedTime = new Date(shipment.predictedEta);
    const scheduledTime = new Date(shipment.eta);
    const timeDiffHours = Math.abs(predictedTime.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);

    if (timeDiffHours > 1) { // More than 1 hour difference
      const delayNotif = await notifyAllStakeholders(
        shipment,
        'ETA_UPDATE',
        `ETA for shipment ${shipment.referenceId} has been updated from ${scheduledTime.toLocaleString()} to ${predictedTime.toLocaleString()}.`
      );
      notifications.push(...delayNotif);
    }
  }

  // If distance remaining is less than threshold, notify customer
  if (shipment.distanceRemainingKm && shipment.distanceRemainingKm < 5) { // Less than 5km to destination
    const arrivalNotif = await notifyAllStakeholders(
      shipment,
      'ARRIVAL_SOON',
      `Shipment ${shipment.referenceId} is arriving at destination soon.`,
      ['DRIVER'] // Don't notify driver about arrival when they're already there
    );
    notifications.push(...arrivalNotif);
  }

  return notifications;
}

// Function to create predictive notifications (AI/ML driven insights)
export async function createPredictiveNotifications(shipment) {
  const notifications = [];

  // Tailored threshold for predictive alerts
  if (shipment.predictedEta && shipment.eta) {
    const predictedTime = new Date(shipment.predictedEta);
    const scheduledTime = new Date(shipment.eta);
    const delayMs = predictedTime.getTime() - scheduledTime.getTime();

    // If predicted delay is substantial (e.g., > 2 hours), trigger a specific warning
    // This complements the standard ETA_UPDATE by escalating it to a PREDICTED_DELAY event
    if (delayMs > 2 * 60 * 60 * 1000) {
      const predNotif = await notifyAllStakeholders(
        shipment,
        'PREDICTED_DELAY'
      );
      notifications.push(...predNotif);
    }
  }

  return notifications;
}

import { sendOtpSms } from './twilioService.js'

export async function sendSMS(to, body) {
  try {
    console.log(`[SMS GATEWAY] Sending SMS to ${to}`);
    await sendOtpSms({ to, body });
    return true;
  } catch (err) {
    console.error('[SMS GATEWAY] Twilio send failed:', err.message);
    // Placeholder log for demo if Twilio fails
    console.log('================================================================');
    console.log(`[SMS FALLBACK] To: ${to}`);
    console.log(`[SMS CONTENT] ${body}`);
    console.log('================================================================');
    return false;
  }
}
