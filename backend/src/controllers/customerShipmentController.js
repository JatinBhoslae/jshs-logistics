import { prepareCustomerShipment, createCustomerShipment } from '../services/shipmentService.js';
import { categorizeGoods } from '../services/aiCategorizationService.js';
import { createShipmentOrder } from '../services/razorpayService.js';
import { Shipment } from '../models/Shipment.js';
import { PendingShipment } from '../models/PendingShipment.js';
import { audit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Handle customer shipment creation with AI categorization and Razorpay order
 */
export async function handleCustomerCreateShipment(req, res) {
    const customerId = req.user._id;
    const { origin, destination, packageDetails, deliveryType, goodsImages, paymentOption, pricingMode, customPrice, category, customCategory, consigneeName, consigneeContact } = req.body;

    // Validate consignee contact (Indian phone number)
    const phoneRegex = /^\+91[6-9]\d{9}$/;
    if (!consigneeContact || !phoneRegex.test(consigneeContact)) {
        return res.status(400).json({ error: 'Valid consignee contact number is required (Format: +91XXXXXXXXXX)' });
    }

    // Default to PAY_NOW to preserve existing behaviour if client doesn't send this field
    const selectedPaymentOption = paymentOption === 'PAY_LATER' ? 'PAY_LATER' : 'PAY_NOW';

    try {
        // 1. Prepare the shipment data (includes auto-assignment calculation and price)
        const shipmentData = await prepareCustomerShipment({
            customerId,
            data: {
                origin,
                destination,
                goodsImages: goodsImages || [],
                packageDetails,
                deliveryType,
                pricingMode,
                customPrice,
                category,
                customCategory,
                consigneeName,
                consigneeContact
            }
        });

        // Persist customer's payment choice into shipment draft
        shipmentData.paymentOption = selectedPaymentOption;

        // 2. Trigger AI Categorization
        if (goodsImages && goodsImages.length > 0) {
            const aiResult = await categorizeGoods(goodsImages);
            shipmentData.aiCategorization = {
                category: aiResult.category,
                confidence: aiResult.confidence,
                processedAt: new Date(),
                rawResponse: aiResult.rawResponse
            };
            // Update shipment type if identified
            if (aiResult.category !== 'UNKNOWN') {
                shipmentData.shipmentType = aiResult.category;
            }
        }

        if (selectedPaymentOption === 'PAY_NOW') {
            // 3A. Create Razorpay order (Pay Now flow)
            const order = await createShipmentOrder({
                shipmentId: "PENDING", // Temporary placeholder
                actualAmount: shipmentData.price,
                chargedAmount: 1,
                customerId
            });

            // 4A. Update shipmentData with order ID
            shipmentData.razorpayOrderId = order.orderId;

            // 5A. Save to PendingShipment collection (No record in Shipments yet!)
            await PendingShipment.create({
                razorpayOrderId: order.orderId,
                customerId,
                shipmentData
            });

            return res.status(201).json({
                message: 'Shipment data prepared and awaiting payment',
                shipment: shipmentData,
                razorpayOrder: order,
                paymentOption: selectedPaymentOption,
            });
        }

        // 3B. PAY_LATER flow: directly create shipment with paymentStatus PENDING
        // Import and use the correct function to create the shipment
        const shipment = await createCustomerShipment({
            customerId,
            shipmentData: shipmentData,
        });

        return res.status(201).json({
            message: 'Shipment created with Pay Later option. Manager will review and share payment details.',
            shipment,
            paymentOption: selectedPaymentOption,
        });
    } catch (error) {
        console.error('Error preparing shipment:', error);
        res.status(error.statusCode || 500).json({
            error: error.message || 'Internal Server Error'
        });
    }
}

/**
 * Manager specific actions for customer shipments
 */
export async function getPendingCustomerShipments(req, res) {
    // For PAY_NOW shipments, require paymentStatus PAID. For PAY_LATER, show even if payment is pending.
    const pending = await Shipment.find({
        approvalStatus: 'PENDING_APPROVAL',
        $or: [
            { paymentOption: 'PAY_NOW', paymentStatus: 'PAID' },
            { paymentOption: 'PAY_LATER' },
            // Backward compatibility: older records without paymentOption but PAID should still show
            { paymentOption: { $exists: false }, paymentStatus: 'PAID' },
        ],
    })
        .populate('customerId', 'name email')
        .populate('assignedVehicleId')
        .populate('assignedDriverId')
        .sort({ createdAt: -1 });

    res.json(pending);
}

export async function approveCustomerShipment(req, res) {
    const { id } = req.params;
    const managerId = req.user._id;

    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    // Verify payment is done before approval for PAY_NOW shipments.
    // For PAY_LATER, managers are allowed to approve while paymentStatus is still PENDING.
    if ((shipment.paymentOption === 'PAY_NOW' || !shipment.paymentOption) && shipment.paymentStatus !== 'PAID') {
        return res.status(400).json({ error: 'Cannot approve unpaid shipment' });
    }

    shipment.approvalStatus = 'APPROVED';
    shipment.approvedBy = managerId;
    shipment.approvedAt = new Date();
    shipment.status = 'ASSIGNED'; // Move to active lifecycle
    await shipment.save();

    await audit({
        actorId: managerId,
        action: 'SHIPMENT_APPROVED',
        entityType: 'Shipment',
        entityId: shipment._id
    });

    if (shipment.customerId) {
        await createNotification({
            userId: shipment.customerId,
            message: `Your shipment ${shipment.referenceId} has been approved and assigned!`,
            type: 'SHIPMENT_APPROVED',
            severity: 'SUCCESS'
        });
    }

    if (shipment.assignedDriverId) {
        await createNotification({
            userId: shipment.assignedDriverId,
            message: `New shipment ${shipment.referenceId} assigned to you.`,
            type: 'SHIPMENT_ASSIGNED',
            severity: 'INFO'
        });
    }

    res.json({ message: 'Shipment approved successfully', shipment });
}

export async function rejectCustomerShipment(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    const managerId = req.user._id;

    const shipment = await Shipment.findById(id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

    shipment.approvalStatus = 'REJECTED';
    shipment.rejectionReason = reason;
    shipment.status = 'CANCELLED';
    await shipment.save();

    await audit({
        actorId: managerId,
        action: 'SHIPMENT_REJECTED',
        entityType: 'Shipment',
        entityId: shipment._id,
        metadata: { reason }
    });

    if (shipment.customerId) {
        await createNotification({
            userId: shipment.customerId,
            message: `Your shipment ${shipment.referenceId} was rejected. Reason: ${reason}`,
            type: 'SHIPMENT_REJECTED',
            severity: 'ERROR'
        });
    }

    res.json({ message: 'Shipment rejected', shipment });
}
