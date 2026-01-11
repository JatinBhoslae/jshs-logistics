import { api } from '../lib/api';
import type { Shipment, LocationPing, Invoice, ShipmentEvent } from '../types';

// Shipment API service with better typing
export const shipmentApi = {
  getAll: async (params?: Record<string, any>): Promise<{ shipments: Shipment[]; total: number; pages: number; currentPage: number }> => {
    const response = await api.get('/shipments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ shipment: Shipment }> => {
    const response = await api.get(`/shipments/${id}`);
    return response.data;
  },

  getLocations: async (id: string): Promise<{ pings: LocationPing[] }> => {
    const response = await api.get(`/shipments/${id}/locations`);
    return response.data;
  },

  getEvents: async (id: string): Promise<{ events: ShipmentEvent[] }> => {
    const response = await api.get(`/shipments/${id}/events`);
    return response.data;
  },

  create: async (data: {
    referenceId?: string;
    origin: { name: string; lat: number; lng: number };
    destination: { name: string; lat: number; lng: number };
    shipmentType: string;
    eta?: string;
    driverId?: string;
    vehicleId?: string;
    package?: {
      weight: number;
      dimensions: string;
    };
    delivery_type?: string;
    consignee?: {
      name: string;
      contact: string;
    };
  }): Promise<{ shipment: Shipment }> => {
    const response = await api.post('/shipments', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Shipment>): Promise<{ shipment: Shipment }> => {
    const response = await api.patch(`/shipments/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/shipments/${id}`);
  },

  dispatch: async (id: string): Promise<{ shipment: Shipment }> => {
    const response = await api.post(`/shipments/${id}/dispatch`);
    return response.data;
  },

  deliver: async (id: string, otp: string): Promise<{ shipment: Shipment }> => {
    const response = await api.post(`/shipments/${id}/deliver`, { otp });
    return response.data;
  },

  start: async (id: string, otp: string): Promise<{ shipment: Shipment }> => {
    const response = await api.post(`/shipments/${id}/start`, { otp });
    return response.data;
  },

  requestOtp: async (id: string, type: 'START' | 'COMPLETE'): Promise<{ ok: true; message: string }> => {
    const response = await api.post(`/shipments/${id}/request-otp`, { type });
    return response.data;
  },

  assign: async (id: string, data: { driverId: string; vehicleId: string }): Promise<{ shipment: Shipment }> => {
    const response = await api.post(`/shipments/${id}/assign`, data);
    return response.data;
  }
};

// Document API service
export const documentApi = {
  getByShipmentId: async (shipmentId: string): Promise<{ documents: any[] }> => {
    const response = await api.get(`/docs/shipments/${shipmentId}`);
    return response.data;
  },

  upload: async (shipmentId: string, file: File, type: string): Promise<any> => {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('file', file);
    const response = await api.post(`/docs/shipments/${shipmentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  verify: async (docId: string): Promise<void> => {
    await api.patch(`/docs/${docId}/verify`);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/docs/${id}`);
  }
};

// Analytics API service
export const analyticsApi = {
  getOverview: async (): Promise<{ kpis: any }> => {
    const response = await api.get('/analytics/overview');
    return response.data;
  }
};

// Fleet API service
export const fleetApi = {
  getDrivers: async (): Promise<{ drivers: any[] }> => {
    const response = await api.get('/fleet/drivers');
    return response.data;
  },

  getVehicles: async (): Promise<{ vehicles: any[] }> => {
    const response = await api.get('/fleet/vehicles');
    return response.data;
  }
};

// Vehicle health API service
export const vehicleHealthApi = {
  getByVehicleId: async (vehicleId: string): Promise<any> => {
    const response = await api.get(`/shipments/vehicles/${vehicleId}/health`);
    return response.data;
  }
};

// Invoice API service
export const invoiceApi = {
  getByShipmentId: async (shipmentId: string): Promise<{ invoices: Invoice[] }> => {
    const response = await api.get(`/invoices/shipments/${shipmentId}`);
    return response.data;
  }
};

// Simulation API service
export const simulationApi = {
  start: async (): Promise<any> => {
    const response = await api.post('/simulation/start');
    return response.data;
  },
  stop: async (): Promise<any> => {
    const response = await api.post('/simulation/stop');
    return response.data;
  },
  getStatus: async (): Promise<any> => {
    const response = await api.get('/simulation/status');
    return response.data;
  }
};