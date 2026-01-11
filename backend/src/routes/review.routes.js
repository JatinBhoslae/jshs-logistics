import { Router } from 'express';
import * as reviewController from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/auth.js';

export const reviewRouter = Router();

reviewRouter.post('/', requireAuth, reviewController.createReview);
reviewRouter.get('/driver/:driverId', requireAuth, reviewController.getDriverReviews);
reviewRouter.get('/shipment/:shipmentId', requireAuth, reviewController.getShipmentReview);
