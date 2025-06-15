export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleApiError = (error: any) => {
  if (error instanceof ApiError) {
    return error;
  }
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return new ApiError('Validation failed', 400);
  }
  
  if (error.name === 'CastError') {
    return new ApiError('Invalid ID format', 400);
  }
  
  // Default server error
  return new ApiError('Internal server error', 500);
};
