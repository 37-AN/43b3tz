// 43V3R BET AI - Global Error Handling Middleware

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { 
  ApiResponse, 
  errorResponse, 
  ErrorCode, 
  toNextResponse,
  validationErrorResponse 
} from '@/lib/api-response';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error factory functions for common errors
 */
export const Errors = {
  badRequest: (message: string = 'Bad request', details?: Record<string, unknown>) =>
    new AppError(message, ErrorCode.BAD_REQUEST, 400, true, details),

  unauthorized: (message: string = 'Authentication required') =>
    new AppError(message, ErrorCode.UNAUTHORIZED, 401),

  forbidden: (message: string = 'Access denied') =>
    new AppError(message, ErrorCode.FORBIDDEN, 403),

  notFound: (resource: string = 'Resource') =>
    new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, 404),

  conflict: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, ErrorCode.CONFLICT, 409, true, details),

  validationError: (message: string, details?: Record<string, unknown>) =>
    new AppError(message, ErrorCode.VALIDATION_ERROR, 422, true, details),

  insufficientBalance: (required: number, available: number) =>
    new AppError(
      `Insufficient balance. Required: $${required}, Available: $${available}`,
      ErrorCode.INSUFFICIENT_BALANCE,
      400,
      true,
      { required, available }
    ),

  invalidBet: (reason: string) =>
    new AppError(`Invalid bet: ${reason}`, ErrorCode.INVALID_BET, 400),

  matchNotAvailable: (matchId: string) =>
    new AppError(
      `Match ${matchId} is not available for betting`,
      ErrorCode.MATCH_NOT_AVAILABLE,
      400
    ),

  subscriptionExpired: () =>
    new AppError('Your subscription has expired', ErrorCode.SUBSCRIPTION_EXPIRED, 403),

  databaseError: (operation: string) =>
    new AppError(
      `Database error during ${operation}`,
      ErrorCode.DATABASE_ERROR,
      500,
      false
    ),

  externalApiError: (service: string, details?: Record<string, unknown>) =>
    new AppError(
      `External service error: ${service}`,
      ErrorCode.EXTERNAL_API_ERROR,
      502,
      false,
      details
    ),

  serviceUnavailable: (service: string) =>
    new AppError(
      `${service} is currently unavailable`,
      ErrorCode.SERVICE_UNAVAILABLE,
      503
    ),
};

/**
 * Error log entry interface
 */
interface ErrorLogEntry {
  timestamp: string;
  error: string;
  message: string;
  code: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

/**
 * Error logger configuration
 */
const errorLogger = {
  /**
   * Logs error details to console (and could be extended to external services)
   */
  log: (entry: ErrorLogEntry) => {
    // Console logging with formatting
    console.error('\n=== ERROR LOG ===');
    console.error(`Timestamp: ${entry.timestamp}`);
    console.error(`Error Type: ${entry.error}`);
    console.error(`Code: ${entry.code}`);
    console.error(`Message: ${entry.message}`);
    
    if (entry.path) {
      console.error(`Path: ${entry.method} ${entry.path}`);
    }
    
    if (entry.userId) {
      console.error(`User ID: ${entry.userId}`);
    }
    
    if (entry.details) {
      console.error('Details:', JSON.stringify(entry.details, null, 2));
    }
    
    if (entry.stack) {
      console.error('Stack Trace:');
      console.error(entry.stack);
    }
    
    console.error('================\n');

    // In production, you could send to external logging services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - CloudWatch
  },
};

/**
 * Maps error codes to user-friendly messages
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: 'The request could not be processed. Please check your input.',
  [ErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCode.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCode.CONFLICT]: 'A conflict occurred. The resource may have been modified.',
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
  [ErrorCode.EXTERNAL_API_ERROR]: 'An external service error occurred. Please try again.',
  [ErrorCode.INSUFFICIENT_BALANCE]: 'You do not have enough balance for this operation.',
  [ErrorCode.INVALID_BET]: 'This bet cannot be placed. Please check the match details.',
  [ErrorCode.MATCH_NOT_AVAILABLE]: 'This match is no longer available for betting.',
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 'Your subscription has expired. Please renew to continue.',
};

/**
 * Gets a user-friendly message for an error
 */
function getUserFriendlyMessage(error: AppError): string {
  return USER_FRIENDLY_MESSAGES[error.code] || error.message;
}

/**
 * Handles Zod validation errors
 */
function handleZodError(error: ZodError): NextResponse {
  const errors: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'general';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return validationErrorResponse(errors);
}

/**
 * Handles known application errors
 */
function handleAppError(
  error: AppError,
  request?: NextRequest
): NextResponse<ApiResponse<null>> {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    error: error.name,
    message: error.message,
    code: error.code,
    details: error.details,
    stack: error.stack,
  };

  if (request) {
    logEntry.path = request.nextUrl.pathname;
    logEntry.method = request.method;
  }

  // Log operational errors at warn level, unexpected errors at error level
  if (error.isOperational) {
    console.warn('Operational Error:', logEntry);
  } else {
    errorLogger.log(logEntry);
  }

  // Return user-friendly message for operational errors
  const message = error.isOperational 
    ? getUserFriendlyMessage(error)
    : 'An unexpected error occurred. Please try again later.';

  return toNextResponse(errorResponse(message, error.code), error.statusCode);
}

/**
 * Handles unknown/unexpected errors
 */
function handleUnknownError(
  error: unknown,
  request?: NextRequest
): NextResponse<ApiResponse<null>> {
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    error: 'UnknownError',
    message: error instanceof Error ? error.message : 'Unknown error',
    code: ErrorCode.INTERNAL_ERROR,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (request) {
    logEntry.path = request.nextUrl.pathname;
    logEntry.method = request.method;
  }

  errorLogger.log(logEntry);

  return toNextResponse(
    errorResponse('An unexpected error occurred. Please try again later.', ErrorCode.INTERNAL_ERROR),
    500
  );
}

/**
 * Main error handler function
 * Handles all types of errors and returns appropriate responses
 */
export function handleError(
  error: unknown,
  request?: NextRequest
): NextResponse {
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error);
  }

  // Handle known application errors
  if (error instanceof AppError) {
    return handleAppError(error, request);
  }

  // Handle Next.js errors
  if (error instanceof Error && error.name === 'NextBadRequestError') {
    return toNextResponse(
      errorResponse('Bad request', ErrorCode.BAD_REQUEST),
      400
    );
  }

  // Handle unknown errors
  return handleUnknownError(error, request);
}

/**
 * Async wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler<T>(
  handler: (request: NextRequest) => Promise<NextResponse<ApiResponse<T>>>
): (request: NextRequest) => Promise<NextResponse<ApiResponse<T>>> {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

/**
 * Async wrapper with context (e.g., user info from session)
 */
export function withErrorHandlerContext<T, C = unknown>(
  handler: (request: NextRequest, context: C) => Promise<NextResponse<ApiResponse<T>>>,
  getContext?: (request: NextRequest) => Promise<C>
): (request: NextRequest) => Promise<NextResponse<ApiResponse<T>>> {
  return async (request: NextRequest) => {
    try {
      const context = getContext ? await getContext(request) : ({} as C);
      return await handler(request, context);
    } catch (error) {
      return handleError(error, request);
    }
  };
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a ZodError
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Utility to wrap synchronous operations that might throw
 */
export function trySync<T>(fn: () => T): { data: T; error: null } | { data: null; error: Error } {
  try {
    return { data: fn(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Utility to wrap async operations that might throw
 */
export async function tryAsync<T>(
  fn: () => Promise<T>
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    return { data: await fn(), error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Wraps a database operation with error handling
 */
export async function withDatabaseError<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const dbError = Errors.databaseError(operation);
    dbError.details = { 
      originalError: error instanceof Error ? error.message : String(error) 
    };
    throw dbError;
  }
}

/**
 * Wraps an external API call with error handling
 */
export async function withExternalApiError<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const apiError = Errors.externalApiError(service, {
      originalError: error instanceof Error ? error.message : String(error),
    });
    throw apiError;
  }
}

/**
 * Rate limit error (custom for rate limiting scenarios)
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      ErrorCode.BAD_REQUEST,
      429,
      true,
      { retryAfter }
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Creates a rate limit error response with proper headers
 */
export function rateLimitResponse(retryAfter: number = 60): NextResponse<ApiResponse<null>> {
  const response = toNextResponse(
    errorResponse(`Too many requests. Please try again in ${retryAfter} seconds.`, ErrorCode.BAD_REQUEST),
    429
  );
  
  response.headers.set('Retry-After', String(retryAfter));
  response.headers.set('X-RateLimit-Reset', String(Date.now() + retryAfter * 1000));
  
  return response;
}
