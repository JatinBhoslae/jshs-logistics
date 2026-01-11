import { getCombinedImpact, updateActiveShipmentsImpacts, getHistoricalImpact } from '../services/weatherTrafficService.js';
import { Shipment } from '../models/Shipment.js';

export async function getShipmentImpact(req, res) {
  try {
    const shipmentId = req.params.id;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ error: { message: 'Shipment not found' } });
    }

    // Check if user has access to this shipment
    if (req.user.role === 'MANAGER') {
      // Managers have access to all shipments
    } else if (req.user.role === 'DRIVER') {
      if (String(shipment.assignedDriverId ?? '') !== String(req.user._id)) {
        return res.status(403).json({ error: { message: 'Forbidden' } });
      }
    }
    if (req.user.role === 'CUSTOMER' && String(shipment.customerId ?? '') !== String(req.user._id)) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const impact = await getCombinedImpact({
      origin: shipment.origin,
      destination: shipment.destination
    });

    res.json({ impact });
  } catch (error) {
    console.error('Error getting shipment impact:', error);
    res.status(500).json({ error: { message: 'Failed to get weather/traffic impact' } });
  }
}

export async function updateAllShipmentsImpact(req, res) {
  try {
    const results = await updateActiveShipmentsImpacts();
    res.json({ results, message: 'Updated weather/traffic impacts for all active shipments' });
  } catch (error) {
    console.error('Error updating shipment impacts:', error);
    res.status(500).json({ error: { message: 'Failed to update shipment impacts' } });
  }
}

export async function getHistoricalImpactController(req, res) {
  try {
    const impact = await getHistoricalImpact();
    res.json({ impact });
  } catch (error) {
    console.error('Error getting historical impact:', error);
    res.status(500).json({ error: { message: 'Failed to get historical impact' } });
  }
}

export async function getRouteImpact(req, res) {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination || !origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({ error: { message: 'Valid origin and destination required' } });
    }

    const impact = await getCombinedImpact({
      origin,
      destination
    });

    res.json({ impact });
  } catch (error) {
    console.error('Error getting route impact:', error);
    res.status(500).json({ error: { message: 'Failed to get weather/traffic impact' } });
  }
}