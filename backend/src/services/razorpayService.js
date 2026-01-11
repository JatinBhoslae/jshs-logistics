import Razorpay from 'razorpay'
import crypto from 'crypto'
import { env } from '../config/env.js'

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET
})

/**
 * Create a Razorpay order for shipment payment
 */
export async function createShipmentOrder({ shipmentId, actualAmount, chargedAmount = 1, customerId }) {
    try {
        const options = {
            amount: chargedAmount * 100, // Amount in paise (₹1 = 100 paise)
            currency: 'INR',
            receipt: `shp_${shipmentId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
            notes: {
                shipmentId: shipmentId.toString(),
                customerId: customerId.toString(),
                actualAmount: actualAmount,
                chargedAmount: chargedAmount,
                type: 'SHIPMENT_PAYMENT'
            }
        }

        const order = await razorpay.orders.create(options)

        return {
            orderId: order.id,
            amount: chargedAmount,
            actualAmount: actualAmount,
            currency: order.currency,
            receipt: order.receipt
        }
    } catch (error) {
        console.error('Razorpay order creation error:', error)
        throw new Error(`Failed to create Razorpay order: ${error.message}`)
    }
}

/**
 * Verify Razorpay payment signature
 */
export function verifyPaymentSignature({ orderId, paymentId, signature }) {
    try {
        const text = `${orderId}|${paymentId}`
        const generated_signature = crypto
            .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
            .update(text)
            .digest('hex')

        return generated_signature === signature
    } catch (error) {
        console.error('Signature verification error:', error)
        return false
    }
}

/**
 * Fetch payment details from Razorpay
 */
export async function fetchPaymentDetails(paymentId) {
    try {
        const payment = await razorpay.payments.fetch(paymentId)
        return {
            id: payment.id,
            orderId: payment.order_id,
            amount: payment.amount / 100, // Convert paise to rupees
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            email: payment.email,
            contact: payment.contact,
            createdAt: new Date(payment.created_at * 1000),
            captured: payment.captured
        }
    } catch (error) {
        console.error('Fetch payment error:', error)
        throw new Error(`Failed to fetch payment details: ${error.message}`)
    }
}

/**
 * Create a payout for driver withdrawal
 */
export async function createDriverPayout({ amount, upiId, driverId, withdrawalId }) {
    try {
        // First, create a contact
        const contact = await razorpay.contacts.create({
            name: `Driver ${driverId}`,
            email: `driver_${driverId}@jshs.com`,
            contact: '9999999999', // Placeholder
            type: 'employee',
            reference_id: driverId.toString(),
            notes: {
                driverId: driverId.toString(),
                withdrawalId: withdrawalId.toString()
            }
        })

        // Create a fund account (UPI)
        const fundAccount = await razorpay.fundAccount.create({
            contact_id: contact.id,
            account_type: 'vpa',
            vpa: {
                address: upiId
            }
        })

        // Create payout
        const payout = await razorpay.payouts.create({
            account_number: env.RAZORPAY_ACCOUNT_NUMBER || '2323230041626980', // Your Razorpay account
            fund_account_id: fundAccount.id,
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            mode: 'UPI',
            purpose: 'payout',
            queue_if_low_balance: true,
            reference_id: withdrawalId.toString(),
            narration: `Driver earnings withdrawal - ${withdrawalId}`,
            notes: {
                driverId: driverId.toString(),
                withdrawalId: withdrawalId.toString(),
                type: 'DRIVER_EARNINGS'
            }
        })

        return {
            payoutId: payout.id,
            contactId: contact.id,
            fundAccountId: fundAccount.id,
            amount: amount,
            status: payout.status,
            utr: payout.utr,
            createdAt: new Date(payout.created_at * 1000)
        }
    } catch (error) {
        console.error('Payout creation error:', error)
        throw new Error(`Failed to create payout: ${error.message}`)
    }
}

/**
 * Fetch payout status
 */
export async function fetchPayoutStatus(payoutId) {
    try {
        const payout = await razorpay.payouts.fetch(payoutId)
        return {
            id: payout.id,
            status: payout.status,
            amount: payout.amount / 100,
            utr: payout.utr,
            mode: payout.mode,
            purpose: payout.purpose,
            createdAt: new Date(payout.created_at * 1000),
            processedAt: payout.processed_at ? new Date(payout.processed_at * 1000) : null,
            failureReason: payout.failure_reason
        }
    } catch (error) {
        console.error('Fetch payout error:', error)
        throw new Error(`Failed to fetch payout status: ${error.message}`)
    }
}

/**
 * Refund a payment
 */
export async function refundPayment({ paymentId, amount, reason }) {
    try {
        const refund = await razorpay.payments.refund(paymentId, {
            amount: amount * 100, // Amount in paise
            notes: {
                reason: reason,
                type: 'SHIPMENT_REFUND'
            }
        })

        return {
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount / 100,
            status: refund.status,
            createdAt: new Date(refund.created_at * 1000)
        }
    } catch (error) {
        console.error('Refund error:', error)
        throw new Error(`Failed to process refund: ${error.message}`)
    }
}

export default {
    createShipmentOrder,
    verifyPaymentSignature,
    fetchPaymentDetails,
    createDriverPayout,
    fetchPayoutStatus,
    refundPayment
}
