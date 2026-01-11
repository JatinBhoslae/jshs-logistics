import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { simulationApi } from '../services/apiService';
import type { Shipment, LocationPing } from '../types';
import { useAuth } from '../auth/AuthContext';

export const useShipmentData = (id?: string) => {
  const { user } = useAuth();
  const simStatus = useQuery({
    queryKey: ['sim-status'],
    queryFn: () => simulationApi.getStatus(),
    enabled: user?.role === 'MANAGER',
    refetchInterval: (query) => {
      // @ts-ignore
      return query.state.data?.running ? 10000 : false;
    },
    refetchOnWindowFocus: true
  });
  const shipmentQuery = useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      if (!id) throw new Error('Shipment ID is required');
      const res = await api.get(`/shipments/${id}`);
      return res.data.shipment as Shipment;
    },
    enabled: !!id,
    refetchInterval: simStatus.data?.running ? 5000 : false
  });

  const locationPingsQuery = useQuery({
    queryKey: ['shipmentLocations', id],
    queryFn: async () => {
      if (!id) throw new Error('Shipment ID is required');
      const res = await api.get(`/shipments/${id}/locations`);
      return res.data.locations as LocationPing[];
    },
    enabled: !!id,
    refetchInterval: simStatus.data?.running ? 5000 : false
  });

  return {
    shipment: shipmentQuery.data,
    locations: locationPingsQuery.data,
    isSimulating: !!simStatus.data?.running,
    isLoading: shipmentQuery.isLoading || locationPingsQuery.isLoading,
    isError: shipmentQuery.isError || locationPingsQuery.isError,
    refetch: () => {
      shipmentQuery.refetch();
      locationPingsQuery.refetch();
    }
  };
};