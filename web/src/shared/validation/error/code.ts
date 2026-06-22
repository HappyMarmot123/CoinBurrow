export const normalizedErrorCodes = [
  "VALIDATION_ERROR",
  "SCHEMA_MISMATCH",
  "NETWORK_ERROR",
  "TIMEOUT",
  "UPSTREAM_ERROR",
  "RATE_LIMIT",
] as const;

export type NormalizedErrorCode = (typeof normalizedErrorCodes)[number];

const retryableCodes = new Set<NormalizedErrorCode>([
  "NETWORK_ERROR",
  "TIMEOUT",
  "UPSTREAM_ERROR",
  "RATE_LIMIT",
]);

export function isRetryableCode(code: NormalizedErrorCode): boolean {
  return retryableCodes.has(code);
}
