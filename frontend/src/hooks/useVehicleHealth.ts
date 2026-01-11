import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Shipment } from '../types';

export const useVehicleHealth = (shipment?: Shipment) => {
  return useQuery({
    queryKey: ['vehicleHealth', shipment?.assignedVehicleId],
    queryFn: async () => {
      if (!shipment?.assignedVehicleId) return null;
      const res = await api.get(`/shipments/vehicles/${shipment.assignedVehicleId}/health`);
      return res.data;
    },
    enabled: !!shipment?.assignedVehicleId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};