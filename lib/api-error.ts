export const UNAUTHORIZED = "unauthorized" as const;
export const BAD_REQUEST = "bad_request" as const;
export const INTERNAL_ERROR = "internal_error" as const;
export const TOKEN_EXPIRED = "token_expired" as const;
export const CIBA_DENIED = "ciba_denied" as const;
export const CIBA_EXPIRED = "ciba_expired" as const;
export const EXECUTION_FAILED = "execution_failed" as const;

export function apiError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}
