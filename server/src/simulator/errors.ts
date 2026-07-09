export type SimulatorErrorCode =
  | 'SIM_AUTH_REQUIRED'
  | 'SIM_AUTH_FORBIDDEN'
  | 'SIM_VALIDATION_ERROR'
  | 'SIM_UPSTREAM_FAILURE'

const simulatorStatusCodes: Record<SimulatorErrorCode, number> = {
  SIM_AUTH_REQUIRED: 401,
  SIM_AUTH_FORBIDDEN: 403,
  SIM_VALIDATION_ERROR: 400,
  SIM_UPSTREAM_FAILURE: 502,
}

export class SimulatorError extends Error {
  constructor(
    readonly code: SimulatorErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'SimulatorError'
  }

  get statusCode(): number {
    return simulatorStatusCodes[this.code]
  }
}
