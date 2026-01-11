// Utility functions for the application

// Function to format currency values
export function formatCurrency(amount: number | undefined, currency: string = 'INR'): string {
  if (amount === undefined || amount === null) return '—';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Function to format dates consistently
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    console.warn('Invalid date provided to formatDate:', dateString);
    return 'Invalid Date';
  }
}

// Function to format distance
export function formatDistance(distanceKm: number | undefined): string {
  if (distanceKm === undefined || distanceKm === null) return '—';
  
  return `${distanceKm.toFixed(1)} km`;
}

// Function to get base API URL
export function getBaseApiUrl(): string {
  return import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';
}

// Function to build document URL
export function buildDocumentUrl(filePath: string): string {
  return `${getBaseApiUrl()}${filePath}`;
}

// Function to get status display text
export function getStatusDisplay(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// Function to get status color classes
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Shipment statuses
    'CREATED': 'text-blue-600 dark:text-blue-300',
    'ASSIGNED': 'text-indigo-600 dark:text-indigo-300',
    'DISPATCHED': 'text-amber-600 dark:text-amber-300',
    'IN_TRANSIT': 'text-orange-600 dark:text-orange-300',
    'DELIVERED': 'text-green-600 dark:text-green-300',
    'CANCELLED': 'text-red-600 dark:text-red-300',
    
    // Invoice statuses
    'DRAFT': 'text-gray-600 dark:text-gray-300',
    'ISSUED': 'text-blue-600 dark:text-blue-300',
    'FUNDED': 'text-purple-600 dark:text-purple-300',
    'PAID': 'text-green-600 dark:text-green-300',
    'DISPUTED': 'text-amber-600 dark:text-amber-300',
    'REFUNDED': 'text-red-600 dark:text-red-300',
    
    // Vehicle statuses
    'AVAILABLE': 'text-green-600 dark:text-green-300',
    'IN_USE': 'text-orange-600 dark:text-orange-300',
    'MAINTENANCE': 'text-red-600 dark:text-red-300',
  };
  
  return statusColors[status] || 'text-slate-600 dark:text-slate-300';
}

// Function to calculate distance between two points (in km) using Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}