export const UNAUTHORIZED = "unauthorized" as const;
export const BAD_REQUEST = "bad_request" as const;
export const INTERNAL_ERROR = "internal_error" as const;
export const TOKEN_EXPIRED = "token_expired" as const;
export const CIBA_DENIED = "ciba_denied" as const;
export const CIBA_EXPIRED = "ciba_expired" as const;
export const EXECUTION_FAILED = "execution_failed" as const;
export const MISSING_REFRESH_TOKEN = "missing_refresh_token" as const;
export const GOOGLE_CONNECTION_REQUIRED = "google_connection_required" as const;
export const POLICY_DENIED = "policy_denied" as const;

export type ApiErrorCode =
  | typeof UNAUTHORIZED
  | typeof BAD_REQUEST
  | typeof INTERNAL_ERROR
  | typeof TOKEN_EXPIRED
  | typeof CIBA_DENIED
  | typeof CIBA_EXPIRED
  | typeof EXECUTION_FAILED
  | typeof MISSING_REFRESH_TOKEN
  | typeof GOOGLE_CONNECTION_REQUIRED
  | typeof POLICY_DENIED;

export function apiError(code: ApiErrorCode, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}
