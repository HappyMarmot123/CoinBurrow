export class SimulatorError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'SimulatorError'
  }
}

export class SimulatorAuthError extends SimulatorError {
  constructor(message = '로그인이 필요합니다.') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'SimulatorAuthError'
  }
}

export class SimulatorConfigurationError extends SimulatorError {
  constructor() {
    super('SIMULATOR_NOT_CONFIGURED', 'Supabase 서버 설정이 필요합니다.', 503)
    this.name = 'SimulatorConfigurationError'
  }
}

export class SimulatorDependencyError extends SimulatorError {
  constructor(message = '시뮬레이터 저장소를 사용할 수 없습니다.', options?: ErrorOptions) {
    super('SIMULATOR_UNAVAILABLE', message, 503, options)
    this.name = 'SimulatorDependencyError'
  }
}

