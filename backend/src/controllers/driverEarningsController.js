import { Shipment } from '../models/Shipment.js';
import { DriverWithdrawal } from '../models/DriverWithdrawal.js';
import { createDriverPayout } from '../services/razorpayService.js';
import { audit } from '../services/auditService.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Get driver earnings summary and history
 */
export async function getDriverEarnings(req, res) {
    const driverId = req.user._id;

    // 1. Get all shipments assigned to this driver that are DELIVERED or CLOSED
    const shipments = await Shipment.find({
        assignedDriverId: driverId,
        status: { $in: ['DELIVERED', 'CLOSED'] }
    }).sort({ createdAt: -1 });

    // 2. Calculate totals
    // In a real system, earnings would be calculated when status changes to DELIVERED
    // Here we do it on the fly for the MVP
    const DRIVER_PERCENTAGE = 0.7; // Driver gets 70%

    const totalEarnings = shipments.reduce((sum, s) => {
        const earnings = (s.price || 0) * DRIVER_PERCENTAGE;
        return sum + earnings;
    }, 0);

    // 3. Get pending withdrawals
    const pendingWithdrawals = await DriverWithdrawal.find({
        driverId,
        status: { $in: ['PENDING', 'PROCESSING'] }
    });

    const processingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    // 4. Get completed withdrawals
    const withdrawalHistory = await DriverWithdrawal.find({
        driverId
    }).sort({ createdAt: -1 });

    const successfullyWithdrawn = withdrawalHistory
        .filter(w => w.status === 'SUCCESS')
        .reduce((sum, w) => sum + w.amount, 0);

    const availableBalance = Math.max(0, totalEarnings - successfullyWithdrawn - processingAmount);

    res.json({
        summary: {
            totalLifetimeEarnings: Math.round(totalEarnings),
            successfullyWithdrawn: Math.round(successfullyWithdrawn),
            processingAmount: Math.round(processingAmount),
            availableBalance: Math.round(availableBalance)
        },
        shipments: shipments.map(s => ({
            _id: s._id,
            referenceId: s.referenceId,
            status: s.status,
            totalPrice: s.price,
            driverShare: Math.round((s.price || 0) * DRIVER_PERCENTAGE),
            deliveredAt: s.unloadedAt || s.updatedAt
        })),
        withdrawals: withdrawalHistory
    });
}

/**
 * Handle withdrawal request
 */
export async function requestWithdrawal(req, res) {
    const { amount, upiId } = req.body;
    const driverId = req.user._id;

    // 1. Validate balance (re-calculate on fly)
    const shipments = await Shipment.find({
        assignedDriverId: driverId,
        status: { $in: ['DELIVERED', 'CLOSED'] }
    });
    const DRIVER_PERCENTAGE = 0.7;
    const totalEarnings = shipments.reduce((sum, s) => sum + ((s.price || 0) * DRIVER_PERCENTAGE), 0);

    const existingWithdrawals = await DriverWithdrawal.find({
        driverId,
        status: { $in: ['PENDING', 'PROCESSING', 'SUCCESS'] }
    });
    const totalWithdrawnOrLocked = existingWithdrawals.reduce((sum, w) => sum + w.amount, 0);

    const available = totalEarnings - totalWithdrawnOrLocked;

    if (amount > available) {
        return res.status(400).json({ error: 'Insufficient balance' });
    }

    // 2. Create withdrawal record
    const withdrawal = await DriverWithdrawal.create({
        driverId,
        amount,
        upiId,
        status: 'PENDING'
    });

    // 3. Trigger Razorpay Payout (Demo: mock the start, then update status)
    // In real life, this might be async or manual for first few times
    try {
        // For demo, we'll mark it as PROCESSING immediately
        withdrawal.status = 'PROCESSING';
        await withdrawal.save();

        // Trigger Razorpay Payout Service
        // Note: This requires RazorpayX setup which is sometimes restricted in test accounts
        // So we'll wrap it in try-catch and mock if it fails
        // const payout = await createDriverPayout({ amount, upiId, driverId, withdrawalId: withdrawal._id });
        // withdrawal.razorpayPayoutId = payout.payoutId;
        // withdrawal.status = 'SUCCESS'; // Auto-success for demo if key is live

        // MOCK SUCCESS FOR DEMO (since we don't want to actually spend money from Razorpay balance)
        setTimeout(async () => {
            const w = await DriverWithdrawal.findById(withdrawal._id);
            if (w) {
                w.status = 'SUCCESS';
                w.processedAt = new Date();
                w.completedAt = new Date();
                await w.save();
                await createNotification({
                    userId: driverId,
                    message: `Withdrawal of ₹${amount} was successful!`,
                    type: 'WITHDRAWAL_SUCCESS',
                    severity: 'SUCCESS'
                });
            }
        }, 5000);

    } catch (err) {
        console.error('Withdrawal processing error:', err);
        withdrawal.status = 'FAILED';
        withdrawal.failureReason = err.message;
        await withdrawal.save();
    }

    await audit({
        actorId: driverId,
        action: 'WITHDRAWAL_REQUESTED',
        entityType: 'Withdrawal',
        entityId: withdrawal._id,
        metadata: { amount, upiId }
    });

    res.json({ message: 'Withdrawal request received and is being processed.', withdrawal });
}
