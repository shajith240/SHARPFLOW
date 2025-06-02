// Shared error handling utilities for SharpFlow server
// Provides consistent error responses and logging across API routes

import { Response } from "express";

export interface ApiError {
  message: string;
  statusCode: number;
  details?: any;
}

export function createApiError(message: string, statusCode: number = 500, details?: any): ApiError {
  return {
    message,
    statusCode,
    details
  };
}

export function handleApiError(res: Response, error: unknown, defaultMessage: string = "Internal server error"): void {
  console.error("API Error:", error);
  
  if (error instanceof Error) {
    res.status(500).json({
      message: defaultMessage,
      error: error.message
    });
  } else if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const apiError = error as ApiError;
    res.status(apiError.statusCode).json({
      message: apiError.message,
      error: apiError.details
    });
  } else {
    res.status(500).json({
      message: defaultMessage,
      error: "Unknown error"
    });
  }
}

export function handleValidationError(res: Response, message: string, details?: any): void {
  res.status(400).json({
    message,
    error: details
  });
}

export function handleAuthError(res: Response, message: string = "Authentication required"): void {
  res.status(401).json({
    message,
    error: "Unauthorized"
  });
}

export function handleNotFoundError(res: Response, resource: string = "Resource"): void {
  res.status(404).json({
    message: `${resource} not found`,
    error: "Not found"
  });
}

export function handleSuccessResponse(res: Response, data: any, message?: string): void {
  const response: any = { data };
  if (message) {
    response.message = message;
  }
  res.status(200).json(response);
}

export function handleCreatedResponse(res: Response, data: any, message?: string): void {
  const response: any = { data };
  if (message) {
    response.message = message;
  }
  res.status(201).json(response);
}
