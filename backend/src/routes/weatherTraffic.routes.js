import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { 
  getShipmentImpact, 
  updateAllShipmentsImpact, 
  getHistoricalImpactController,
  getRouteImpact
} from '../controllers/weatherTrafficController.js';

export const weatherTrafficRouter = Router();

weatherTrafficRouter.use(requireAuth);

// Get impact for a specific shipment
weatherTrafficRouter.get('/shipments/:id/impact', asyncHandler(getShipmentImpact));

// Get impact for a route (origin/destination)
weatherTrafficRouter.post('/route/impact', asyncHandler(getRouteImpact));

// Get historical impact data (manager only)
weatherTrafficRouter.get('/historical', requireRole('MANAGER'), asyncHandler(getHistoricalImpactController));

// Update all active shipments (manager only)
weatherTrafficRouter.post('/update-all', requireRole('MANAGER'), asyncHandler(updateAllShipmentsImpact));