import { Review } from '../models/Review.js';
import { Shipment } from '../models/Shipment.js';
import { User } from '../models/User.js';
import { audit } from '../services/auditService.js';

export const createReview = async (req, res) => {
    try {
        const { shipmentId, rating, comment, photos } = req.body;
        const customerId = req.user._id;

        // 1. Validate shipment exists and belongs to customer
        const shipment = await Shipment.findById(shipmentId);
        if (!shipment) {
            return res.status(404).json({ message: 'Shipment not found' });
        }

        // Comparison of IDs (handling both object and string)
        if (shipment.customerId.toString() !== customerId.toString()) {
            return res.status(403).json({ message: 'Not authorized to review this shipment' });
        }

        // 2. Ensure shipment is delivered and paid
        if (shipment.status !== 'DELIVERED' && shipment.status !== 'CLOSED') {
            return res.status(400).json({ message: 'Shipment must be delivered before reviewing' });
        }

        if (shipment.paymentStatus !== 'PAID') {
            return res.status(400).json({ message: 'Payment must be completed before reviewing' });
        }

        // 3. Check if review already exists
        const existingReview = await Review.findOne({ shipmentId });
        if (existingReview) {
            return res.status(400).json({ message: 'Review already submitted for this shipment' });
        }

        // 4. Create review
        const review = await Review.create({
            shipmentId,
            customerId,
            driverId: shipment.assignedDriverId,
            rating,
            comment,
            photos: photos || []
        });

        // 5. Update driver rating (average)
        const driver = await User.findById(shipment.assignedDriverId);
        if (driver) {
            const allReviews = await Review.find({ driverId: driver._id });
            const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

            driver.performanceRating = avgRating;

            // Award logic (simplified)
            if (avgRating >= 4.5 && allReviews.length >= 5 && !driver.awards?.includes('Top Rated Driver')) {
                if (!driver.awards) driver.awards = [];
                driver.awards.push('Top Rated Driver');
            }

            await driver.save();
        }

        await audit(req.user._id, 'REVIEW_CREATED', 'Review', review._id, { shipmentId });

        res.status(201).json({ message: 'Review submitted successfully', review });
    } catch (err) {
        console.error('Create Review Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getDriverReviews = async (req, res) => {
    try {
        const { driverId } = req.params;
        const reviews = await Review.find({ driverId }).populate('customerId', 'name email').sort({ createdAt: -1 });
        res.json({ reviews });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getShipmentReview = async (req, res) => {
    try {
        const { shipmentId } = req.params;
        const review = await Review.findOne({ shipmentId });
        res.json({ review });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
