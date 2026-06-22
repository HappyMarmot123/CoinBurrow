export type FreeApiErrorCode =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "SCHEMA_MISMATCH"
  | "TIMEOUT"
  | "UPSTREAM_ERROR"
  | "INVALID_SYMBOL"

export class FreeApiError extends Error {
  readonly code: FreeApiErrorCode
  readonly status?: number
  readonly retryable: boolean

  constructor(
    message: string,
    code: FreeApiErrorCode,
    options: {
      cause?: unknown
      status?: number
      retryable?: boolean
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = "FreeApiError"
    this.code = code
    this.status = options.status
    this.retryable = options.retryable ?? false
  }
}
