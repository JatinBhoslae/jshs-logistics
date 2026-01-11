/**
 * mailTemplates.js
 * Standardized HTML templates for emails.
 */

const LOGO_URL = 'https://jshslogistics.com/logo.png'; // Placeholder logo URL
const PRIMARY_COLOR = '#2563eb';
const DARK_BG = '#1e293b';

const wrapTemplate = (content) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
  <div style="background-color: ${DARK_BG}; padding: 30px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">JSHS <span style="color: #38bdf8;">LOGISTICS</span></h1>
  </div>
  <div style="padding: 40px;">
    ${content}
  </div>
  <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
    <p style="margin: 0;">&copy; ${new Date().getFullYear()} JSHS Logistics. All rights reserved.</p>
    <p style="margin: 5px 0 0;">This is an automated message, please do not reply.</p>
  </div>
</div>
`;

export const getOtpTemplate = (code, purpose) => {
    const title = purpose === 'RESET_PASSWORD' ? 'Reset Your Password' : 'Verify Your Email';
    const instruction = purpose === 'RESET_PASSWORD'
        ? 'Use the following code to reset your password. It will expire in 5 minutes.'
        : 'Welcome to JSHS Logistics! Please use the code below to verify your email.';

    return wrapTemplate(`
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">${title}</h2>
    <p>${instruction}</p>
    <div style="background-color: #f1f5f9; padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: ${PRIMARY_COLOR};">${code}</span>
    </div>
    <p style="font-size: 14px; color: #64748b;">If you didn't request this, you can safely ignore this email.</p>
  `);
};

export const getInvoiceTemplate = (customerName, shipmentRef, invoicePassword) => {
    return wrapTemplate(`
    <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Delivery Confirmation</h2>
    <p>Dear <strong>${customerName}</strong>,</p>
    <p>Your shipment <strong>${shipmentRef}</strong> has been successfully delivered! Please find your official invoice attached to this email.</p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid ${PRIMARY_COLOR}; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; font-weight: 700; color: #1e40af;">Password Protected PDF</p>
      <p style="margin: 5px 0 0; font-size: 14px;">To open your invoice, please use the following password:</p>
      <p style="margin: 10px 0 0; font-family: monospace; font-size: 18px; font-weight: 700; background: #ffffff; display: inline-block; padding: 5px 12px; border-radius: 4px; border: 1px solid #bfdbfe;">${invoicePassword}</p>
    </div>
    
    <p>Thank you for trusting JSHS Logistics with your cargo.</p>
    <a href="https://jshslogistics.com/app/tracking/${shipmentRef}" style="display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">View Full Shipment Details</a>
  `);
};

export const getShipmentStatusTemplate = (status, shipment) => {
    const ref = shipment.referenceId;
    const statusInfo = {
        CREATED: { title: 'Order Confirmed', icon: '📦', color: '#10b981' },
        ASSIGNED: { title: 'Driver Assigned', icon: '🤝', color: PRIMARY_COLOR },
        PICKED_UP: { title: 'Shipment Picked Up', icon: '�', color: PRIMARY_COLOR },
        IN_TRANSIT: { title: 'In Transit', icon: '�🚚', color: PRIMARY_COLOR },
        OUT_FOR_DELIVERY: { title: 'Out for Delivery', icon: '🛵', color: '#f59e0b' },
        DELIVERED: { title: 'Shipment Delivered', icon: '✅', color: '#10b981' },
        CANCELLED: { title: 'Shipment Cancelled', icon: '❌', color: '#ef4444' }
    };

    const info = statusInfo[status] || { title: `Update: ${status}`, icon: '🔔', color: PRIMARY_COLOR };

    return wrapTemplate(`
    <div style="text-align: center; font-size: 48px; margin-bottom: 20px;">${info.icon}</div>
    <h2 style="color: #1e293b; margin-top: 0; font-size: 24px; text-align: center;">${info.title}</h2>
    <p style="text-align: center; color: #64748b; font-size: 16px;">Shipment <strong>${ref}</strong> current status: <span style="color: ${info.color}; font-weight: 700;">${status}</span></p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 30px 0;">
      <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em;">Route Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748b;">Origin</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600;">${shipment.origin?.name || shipment.origin?.city || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; border-top: 1px solid #e2e8f0;">Destination</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; border-top: 1px solid #e2e8f0;">${shipment.destination?.name || shipment.destination?.city || 'N/A'}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="https://jshslogistics.com/app/tracking/${shipment._id || ref}" style="display: inline-block; background-color: ${PRIMARY_COLOR}; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Track Journey In Real-time</a>
    </div>
  `);
};

export const getWelcomeTemplate = (userName, role) => {
    return wrapTemplate(`
    <h2 style="color: #1e293b; margin-top: 0; font-size: 24px;">Welcome to JSHS Logistics, ${userName}!</h2>
    <p>We're thrilled to have you on board as a <strong>${role}</strong>. Your account has been successfully created and you can now start exploring the platform.</p>
    
    <div style="margin: 30px 0;">
      <h3 style="font-size: 16px; color: #1e293b;">Getting Started</h3>
      <ul style="padding-left: 20px; color: #64748b;">
        <li>Complete your profile information</li>
        <li>Set up your preferred notification channels</li>
        ${role === 'CUSTOMER' ? '<li>Book your first shipment with AI-powered rates</li>' : '<li>Review available shipments for pickup</li>'}
        <li>Track movements with our real-time IoT console</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin-top: 40px;">
      <a href="https://jshslogistics.com/login" style="display: inline-block; border: 2px solid ${PRIMARY_COLOR}; color: ${PRIMARY_COLOR}; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
    </div>
  `);
};

export const getIotAlertTemplate = (vehiclePlate, alertType, value, threshold) => {
    const isTemp = alertType.includes('TEMP');
    const title = isTemp ? 'Temperature Breach Alert' : 'Low Fuel Alert';
    const icon = isTemp ? '🌡️' : '⛽';
    const unit = isTemp ? '°C' : 'L';

    return wrapTemplate(`
    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 30px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 15px;">${icon}</div>
      <h2 style="color: #991b1b; margin: 0; font-size: 22px;">${title}</h2>
      <p style="color: #b91c1c; margin-top: 5px; font-weight: 600;">Vehicle: ${vehiclePlate}</p>
    </div>
    
    <div style="margin: 30px 0;">
      <p>A critical IoT sensor breach has been detected for your vehicle. Immediate attention may be required.</p>
      
      <table style="width: 100%; margin-top: 20px; border-collapse: collapse; background-color: #f8fafc; border-radius: 8px; overflow: hidden;">
        <tr style="background-color: #f1f5f9;">
          <th style="padding: 12px; text-align: left; font-size: 13px; color: #64748b;">Sensor</th>
          <th style="padding: 12px; text-align: center; font-size: 13px; color: #64748b;">Current Value</th>
          <th style="padding: 12px; text-align: right; font-size: 13px; color: #64748b;">Threshold</th>
        </tr>
        <tr>
          <td style="padding: 15px 12px; font-weight: 600;">${isTemp ? 'Chiller Temperature' : 'Fuel Level'}</td>
          <td style="padding: 15px 12px; text-align: center; font-weight: 700; color: #ef4444;">${value}${unit}</td>
          <td style="padding: 15px 12px; text-align: right; color: #64748b;">${threshold}${unit}</td>
        </tr>
      </table>
    </div>
    
    <div style="text-align: center;">
      <a href="https://jshslogistics.com/app/iot-monitor" style="display: inline-block; background-color: #1e293b; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open IoT Console</a>
    </div>
  `);
};
