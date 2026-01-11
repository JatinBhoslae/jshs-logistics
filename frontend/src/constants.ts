// Default coordinates for India region
export const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // Center of India
export const DEFAULT_ZOOM = 5;

// Shipment types
export const SHIPMENT_TYPES = [
  { value: 'KIRANA', label: 'Kirana (Grocery)' },
  { value: 'DAWAI', label: 'Dawai (Medicines)' },
  { value: 'KAPDA', label: 'Kapda (Textiles)' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'AUTO_PARTS', label: 'Auto Parts' },
  { value: 'ELECTRONICS', label: 'Electronics' }
] as const;

export const PACKAGE_DIMENSIONS = [
  { value: '30x20x10', label: 'Small Box (30x20x10 cm)' },
  { value: '50x40x30', label: 'Medium Box (50x40x30 cm)' },
  { value: '100x80x60', label: 'Large Cargo (100x80x60 cm)' },
  { value: '200x150x100', label: 'Pallet (200x150x100 cm)' },
  { value: 'custom', label: 'Custom Dimensions' }
];

// Shipment statuses (full workflow lifecycle)
export const SHIPMENT_STATUSES = [
  { value: 'CREATED', label: 'Created' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELAYED', label: 'Delayed' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' }
] as const;

// Invoice statuses
export const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'FUNDED', label: 'Funded' },
  { value: 'PAID', label: 'Paid' },
  { value: 'DISPUTED', label: 'Disputed' },
  { value: 'REFUNDED', label: 'Refunded' }
] as const;

// Vehicle statuses
export const VEHICLE_STATUSES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'MAINTENANCE', label: 'Maintenance' }
] as const;

// Loading statuses
export const LOADING_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'LOADED', label: 'Loaded' },
  { value: 'UNLOADED', label: 'Unloaded' }
] as const;

// Vehicle health statuses
export const VEHICLE_HEALTH_STATUSES = [
  { value: 'HEALTHY', label: 'Healthy' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'NO_DATA', label: 'No Data' }
] as const;

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_HEIGHT: 420,
  TILE_LAYER_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  ZOOM_LEVEL: 11
};

// API configuration
export const API_CONFIG = {
  REFRESH_INTERVAL: {
    LOCATION_UPDATES: 10000, // 10 seconds
    VEHICLE_HEALTH: 30000,   // 30 seconds
    ENHANCED_TRACKING: 10000 // 10 seconds
  }
};

// UI Configuration
export const UI_CONFIG = {
  GLASS_CARD_CLASSES: "overflow-hidden rounded-2xl ring-1 ring-slate-900/10 bg-white/70 backdrop-blur-xl dark:ring-white/10 dark:bg-white/5",
  INPUT_GLASS_CLASSES: "w-full rounded-xl border-0 bg-white/50 px-3 py-2 text-slate-900 shadow-none ring-1 ring-slate-200/60 placeholder:text-slate-400 focus:ring-[1.5px] focus:ring-slate-900 dark:bg-white/10 dark:text-white dark:ring-white/20 dark:placeholder:text-white/40 dark:focus:ring-cyan-400",
  BUTTON_PRIMARY_CLASSES: "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:focus:ring-cyan-400",
  BUTTON_GHOST_CLASSES: "rounded-xl border border-slate-200/60 bg-transparent px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-900/5 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
};