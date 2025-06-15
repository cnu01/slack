import { Request, Response, NextFunction } from 'express';
import { ApiError, handleApiError } from '../utils/ApiError';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const apiError = handleApiError(error);
  
  console.error('Error:', {
    message: apiError.message,
    statusCode: apiError.statusCode,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    url: req.url,
    method: req.method,
    body: req.body
  });

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
