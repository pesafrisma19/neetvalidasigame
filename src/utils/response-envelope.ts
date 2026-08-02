export interface ApiResponseEnvelope<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta: Record<string, unknown> | null;
  error: {
    code: string;
    details?: unknown;
  } | null;
}

export function createSuccessResponse<T>(
  data: T,
  message = 'Operation successful',
  meta: Record<string, unknown> | null = null
): ApiResponseEnvelope<T> {
  return {
    success: true,
    message,
    data,
    meta,
    error: null,
  };
}

export function createErrorResponse(
  message: string,
  code: string,
  details?: unknown,
  meta?: Record<string, unknown> | null
): ApiResponseEnvelope<null> {
  return {
    success: false,
    message,
    data: null,
    meta: meta ?? null,
    error: {
      code,
      details: details ?? null,
    },
  };
}
