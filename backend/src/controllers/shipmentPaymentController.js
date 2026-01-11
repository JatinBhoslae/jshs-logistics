import { Shipment } from '../models/Shipment.js';
import { ShipmentPayment } from '../models/ShipmentPayment.js';
import { PendingShipment } from '../models/PendingShipment.js';
import { createCustomerShipment } from '../services/shipmentService.js';
import { verifyPaymentSignature, fetchPaymentDetails } from '../services/razorpayService.js';
import { audit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';
import { User } from '../models/User.js';

/**
 * Verify Razorpay payment for a customer shipment
 */
export async function verifyShipmentPayment(req, res) {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const customerId = req.user._id;

    try {
        // 1. Verify Signature
        const isValid = verifyPaymentSignature({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            signature: razorpaySignature
        });

        if (!isValid) {
            return res.status(400).json({ error: 'Invalid payment signature' });
        }

        // 2. Fetch payment details from Razorpay to be doubly sure
        const paymentDetails = await fetchPaymentDetails(razorpayPaymentId);

        // 3. Find pending shipment data
        const pending = await PendingShipment.findOne({ razorpayOrderId });
        if (!pending) {
            return res.status(404).json({ error: 'Pending shipment session not found or already processed' });
        }

        const shipmentData = pending.shipmentData;
        shipmentData.paymentStatus = 'PAID';
        shipmentData.razorpayPaymentId = razorpayPaymentId;
        shipmentData.razorpaySignature = razorpaySignature;
        shipmentData.paidAt = new Date();

        // 4. Create the real Shipment document (Finalize creation)
        const shipment = await createCustomerShipment({
            customerId,
            shipmentData
        });

        // 5. Create local ShipmentPayment record
        await ShipmentPayment.create({
            shipmentId: shipment._id,
            customerId,
            actualAmount: shipment.price,
            chargedAmount: paymentDetails.amount,
            currency: paymentDetails.currency,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            status: 'SUCCESS',
            paidAt: new Date(),
            paymentMethod: paymentDetails.method,
            metadata: { razorpayDetails: paymentDetails }
        });

        // 6. Cleanup PendingShipment
        await PendingShipment.deleteOne({ _id: pending._id });

        // 7. Audit & Notifications
        await audit({
            actorId: customerId,
            action: 'SHIPMENT_PAYMENT_SUCCESS',
            entityType: 'ShipmentPayment',
            entityId: shipment._id,
            metadata: { amount: paymentDetails.amount, paymentId: razorpayPaymentId }
        });

        await createNotification({
            userId: customerId,
            message: `Payment of ₹${paymentDetails.amount} for shipment ${shipment.referenceId} successful!`,
            type: 'PAYMENT_SUCCESS',
            severity: 'SUCCESS'
        });

        // Notify all managers that a paid shipment is ready for approval
        const managers = await User.find({ role: 'MANAGER' }).select('_id');
        for (const manager of managers) {
            await createNotification({
                userId: manager._id,
                message: `NEW PAID SHIPMENT: ${shipment.referenceId} is ready for approval.`,
                type: 'SHIPMENT_PENDING_APPROVAL',
                severity: 'INFO',
                metadata: { shipmentId: shipment._id }
            });
        }

        res.json({ message: 'Payment verified and shipment created successfully', shipment });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Failed to verify payment and create shipment. Please contact support.' });
    }
}

/**
 * Handle payment failure
 */
export async function handlePaymentFailure(req, res) {
    const { shipmentId, razorpayOrderId, error } = req.body;
    const customerId = req.user._id;

    // Cleanup PendingShipment if it exists
    if (razorpayOrderId) {
        await PendingShipment.deleteOne({ razorpayOrderId });
    }

    if (shipmentId && shipmentId !== 'PENDING') {
        const shipment = await Shipment.findById(shipmentId);
        if (shipment) {
            shipment.paymentStatus = 'FAILED';
            await shipment.save();
        }
    }

    await ShipmentPayment.create({
        shipmentId: shipmentId === 'PENDING' ? null : shipmentId,
        customerId,
        actualAmount: 0, // Would need to retrieve from metadata if we wanted this
        chargedAmount: 1,
        razorpayOrderId,
        status: 'FAILED',
        failureReason: typeof error === 'string' ? error : JSON.stringify(error)
    });

    res.json({ message: 'Failure recorded' });
}
