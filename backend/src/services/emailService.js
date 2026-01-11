import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { getOtpTemplate, getInvoiceTemplate } from '../utils/mailTemplates.js';

// Create transporter lazily to ensure env is loaded
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!env.SMTP_USER || !env.SMTP_PASS) {
        console.warn('[EMAIL] SMTP credentials missing in .env. Emailing will be disabled.');
        return null;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
        },
    });
    return transporter;
}

/**
 * Send an email with an attachment (Invoice)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 * @param {Array} attachments - Array of attachment objects { filename, path }
 */
export async function sendEmail({ to, subject, html, attachments = [] }) {
    try {
        const client = getTransporter();
        if (!client) return null;

        const info = await client.sendMail({
            from: env.SMTP_FROM,
            to,
            subject,
            html,
            attachments,
        });

        console.log(`[EMAIL] Message sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('[EMAIL] Error sending email:', error);
        // don't throw, just log to avoid breaking the main flow if email fails
        return null;
    }
}

export async function sendInvoiceEmail(customer, shipment, invoicePath, invoicePassword) {
    const subject = `Your Invoice for Shipment ${shipment.referenceId}`;
    const html = getInvoiceTemplate(customer.name, shipment.referenceId, invoicePassword);

    await sendEmail({
        to: customer.email,
        subject,
        html,
        attachments: [
            {
                filename: `Invoice_${shipment.referenceId}.pdf`,
                path: invoicePath,
            },
        ],
    });
}

export async function sendOtpEmail(email, code, purpose) {
    const subject = purpose === 'RESET_PASSWORD' ? 'Reset Your Password' : 'Verify Your Email';
    const html = getOtpTemplate(code, purpose);

    await sendEmail({
        to: email,
        subject,
        html,
    });
}
