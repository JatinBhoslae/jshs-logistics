// Error handling utilities

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function handleApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    // Handle Axios errors
    if ('response' in error) {
      const axiosError = error as { response?: { data?: any; status?: number } };
      const message = axiosError.response?.data?.error?.message 
        || axiosError.response?.data?.message 
        || `API Error: ${axiosError.response?.status || 'Unknown'}`;
      
      return {
        message,
        status: axiosError.response?.status,
        code: axiosError.response?.data?.error?.code
      };
    }
    
    // Standard error
    return {
      message: error.message,
      code: 'STANDARD_ERROR'
    };
  }
  
  // Unknown error type
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR'
  };
}

// Type guard to check if a value is an error object
export function isErrorLike(error: unknown): error is Error {
  return typeof error === 'object' && 
         error !== null && 
         'message' in error;
}

// Type guard to check if a value is an API response error
export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && 
         error !== null && 
         'message' in error;
}