// 43V3R BET AI - Standardized API Response Utilities

import { NextResponse } from 'next/server';

/**
 * Standard API Response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
    timestamp?: string;
  };
}

/**
 * Pagination metadata interface
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore?: boolean;
}

/**
 * Error codes for API responses
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // Business logic errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_BET = 'INVALID_BET',
  MATCH_NOT_AVAILABLE = 'MATCH_NOT_AVAILABLE',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
}

/**
 * HTTP status code mapping for error codes
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.BAD_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.VALIDATION_ERROR]: 422,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_API_ERROR]: 502,
  [ErrorCode.INSUFFICIENT_BALANCE]: 400,
  [ErrorCode.INVALID_BET]: 400,
  [ErrorCode.MATCH_NOT_AVAILABLE]: 400,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 403,
};

/**
 * Creates a successful API response
 * 
 * @param data - The data to return
 * @param meta - Optional metadata
 * @returns ApiResponse with success status
 */
export function successResponse<T>(
  data: T,
  meta?: Partial<PaginationMeta & { timestamp?: string }>
): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: meta ? {
      ...meta,
      timestamp: meta.timestamp ?? new Date().toISOString(),
    } : undefined,
  };
}

/**
 * Creates an error API response
 * 
 * @param message - Error message
 * @param code - Error code (optional)
 * @returns ApiResponse with error status
 */
export function errorResponse(
  message: string,
  code?: ErrorCode
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: message,
    meta: code ? { timestamp: new Date().toISOString() } : undefined,
  };
}

/**
 * Creates a paginated API response
 * 
 * @param data - Array of items
 * @param page - Current page number (1-based)
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns ApiResponse with pagination metadata
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    success: true,
    data,
    error: null,
    meta: {
      page,
      limit,
      total,
      hasMore,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Creates a Next.js JSON response from an ApiResponse
 * 
 * @param response - ApiResponse object
 * @param statusCode - HTTP status code (optional, defaults based on success)
 * @returns NextResponse object
 */
export function toNextResponse<T>(
  response: ApiResponse<T>,
  statusCode?: number
): NextResponse<ApiResponse<T>> {
  let status = statusCode;
  
  if (!status) {
    if (response.success) {
      status = 200;
    } else {
      // Default to 500 for errors without specific code
      status = 500;
    }
  }

  return NextResponse.json(response, { status });
}

/**
 * Creates a Next.js error response
 * 
 * @param message - Error message
 * @param code - Error code
 * @returns NextResponse with appropriate status code
 */
export function errorNextResponse(
  message: string,
  code: ErrorCode = ErrorCode.INTERNAL_ERROR
): NextResponse<ApiResponse<null>> {
  const status = ERROR_STATUS_MAP[code] ?? 500;
  return NextResponse.json(errorResponse(message, code), { status });
}

/**
 * Creates a 201 Created response
 * 
 * @param data - Created resource data
 * @returns NextResponse with 201 status
 */
export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return NextResponse.json(successResponse(data), { status: 201 });
}

/**
 * Creates a 204 No Content response
 * 
 * @returns NextResponse with 204 status
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Creates a 404 Not Found response
 * 
 * @param resource - Name of the resource not found
 * @returns NextResponse with 404 status
 */
export function notFoundResponse(resource: string = 'Resource'): NextResponse<ApiResponse<null>> {
  return errorNextResponse(`${resource} not found`, ErrorCode.NOT_FOUND);
}

/**
 * Creates a 401 Unauthorized response
 * 
 * @param message - Custom message (optional)
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message: string = 'Authentication required'): NextResponse<ApiResponse<null>> {
  return errorNextResponse(message, ErrorCode.UNAUTHORIZED);
}

/**
 * Creates a 403 Forbidden response
 * 
 * @param message - Custom message (optional)
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(message: string = 'Access denied'): NextResponse<ApiResponse<null>> {
  return errorNextResponse(message, ErrorCode.FORBIDDEN);
}

/**
 * Creates a 422 Validation Error response
 * 
 * @param errors - Validation errors
 * @returns NextResponse with 422 status
 */
export function validationErrorResponse(
  errors: Record<string, string[]>
): NextResponse<ApiResponse<{ errors: Record<string, string[]> }>> {
  return NextResponse.json(
    {
      success: false,
      data: { errors },
      error: 'Validation failed',
      meta: { timestamp: new Date().toISOString() },
    },
    { status: 422 }
  );
}

/**
 * Helper to handle async API operations with automatic error handling
 * 
 * @param fn - Async function to execute
 * @returns NextResponse with result or error
 */
export async function withErrorHandling<T>(
  fn: () => Promise<NextResponse<ApiResponse<T>>>
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    return await fn();
  } catch (error) {
    console.error('API Error:', error);
    
    const message = error instanceof Error 
      ? error.message 
      : 'An unexpected error occurred';
    
    return errorNextResponse(message, ErrorCode.INTERNAL_ERROR);
  }
}
