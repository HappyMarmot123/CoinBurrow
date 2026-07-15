import { EventEmitter } from 'node:events'
import { existsSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { buildApp, createApp } = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void
  const createApp = () => {
    const listeners = new Map<string, Listener[]>()
    const server = {
      emit(event: string, ...args: unknown[]): boolean {
        const current = [...(listeners.get(event) ?? [])]
        for (const listener of current) listener(...args)
        return current.length > 0
      },
      on(event: string, listener: Listener) {
        listeners.set(event, [...(listeners.get(event) ?? []), listener])
        return this
      },
      once(event: string, listener: Listener) {
        const wrapped: Listener = (...args) => {
          listeners.set(
            event,
            (listeners.get(event) ?? []).filter((entry) => entry !== wrapped),
          )
          listener(...args)
        }
        return this.on(event, wrapped)
      },
      removeAllListeners() {
        listeners.clear()
        return this
      },
    }

    return {
      ready: vi.fn<() => PromiseLike<undefined>>(),
      server,
    }
  }

  return {
    buildApp: vi.fn(),
    createApp,
  }
})

vi.mock('../src/app.js', () => ({
  buildApp,
}))

const apiModulePath = '../../api/[...path].js'
const marketApiModulePath = '../../api/market.js'
const simulatorApiModulePath = '../../api/simulator.js'
let normalizeApiUrl: (url: string | undefined) => string | undefined
let normalizeRequestUrl: (url: string | undefined) => string | undefined

type VercelRewrite = {
  source?: string
  destination?: string
}

type VercelConfig = {
  rewrites?: VercelRewrite[]
}

type PackageJson = {
  type?: string
}

type RootTsConfig = {
  compilerOptions?: {
    module?: string
    moduleResolution?: string
  }
}

class FakeResponse extends EventEmitter {
  destroyed = false
  finished = false
  headersSent = false
  statusCode = 200
  writable = true
  writableEnded = false

  end(body?: string): this {
    this.headersSent = true
    this.finished = true
    this.writableEnded = true
    this.emit('finish')
    if (body !== undefined) this.emit('body', body)
    return this
  }
}

function request(url: string): IncomingMessage {
  return { url } as IncomingMessage
}

function response(): ServerResponse {
  return new FakeResponse() as unknown as ServerResponse
}

function readRootJsonConfig<T>(fileName: string): T {
  const configPath = [
    join(process.cwd(), fileName),
    join(process.cwd(), '..', fileName),
  ].find((candidate) => existsSync(candidate))

  if (!configPath) {
    throw new Error(`Unable to find ${fileName}`)
  }

  return JSON.parse(readFileSync(configPath, 'utf8')) as T
}

function readVercelConfig(): VercelConfig {
  return readRootJsonConfig<VercelConfig>('vercel.json')
}

describe('normalizeApiUrl', () => {
  beforeAll(async () => {
    ;({ normalizeApiUrl, normalizeRequestUrl } = await import(apiModulePath))
  })

  it.each([
    ['/api/market/x?y=1', '/market/x?y=1'],
    ['/api', '/'],
    ['/api?x=1', '/?x=1'],
  ])('normalizes %s to %s', (url, expected) => {
    expect(normalizeApiUrl(url)).toBe(expected)
  })

  it('leaves a direct local URL unchanged', () => {
    expect(normalizeApiUrl('/market/coin-list?details=false')).toBe(
      '/market/coin-list?details=false',
    )
  })

  it('does not strip an api-prefixed path segment', () => {
    expect(normalizeApiUrl('/apiary/status')).toBe('/apiary/status')
  })

  it('expands the Vercel market rewrite query and keeps request query params', () => {
    expect(
      normalizeRequestUrl(
        '/api/market?__coinburrow_path=market/exchange/candle&market=KRW-BTC&timeframe=1m',
      ),
    ).toBe('/market/exchange/candle?market=KRW-BTC&timeframe=1m')
  })

  it('expands the Vercel simulator rewrite query', () => {
    expect(
      normalizeRequestUrl(
        '/api/simulator?__coinburrow_path=simulator/state',
      ),
    ).toBe('/simulator/state')
  })
})

describe('Vercel rewrites', () => {
  it('uses ESM-compatible API function compilation', () => {
    const packageJson = readRootJsonConfig<PackageJson>('package.json')
    const tsConfig = readRootJsonConfig<RootTsConfig>('tsconfig.json')

    expect(packageJson.type).toBe('module')
    expect(tsConfig.compilerOptions?.module).toBe('ESNext')
    expect(tsConfig.compilerOptions?.moduleResolution).toBe('Bundler')
  })

  it('exposes a stable market API function entry', async () => {
    const [apiModule, marketApiModule, simulatorApiModule] = await Promise.all([
      import(apiModulePath),
      import(marketApiModulePath),
      import(simulatorApiModulePath),
    ])

    expect(marketApiModule.default).toBe(apiModule.default)
    expect(marketApiModule.normalizeApiUrl).toBe(apiModule.normalizeApiUrl)
    expect(marketApiModule.normalizeRequestUrl).toBe(
      apiModule.normalizeRequestUrl,
    )
    expect(simulatorApiModule.default).toBe(apiModule.default)
    expect(simulatorApiModule.normalizeApiUrl).toBe(apiModule.normalizeApiUrl)
    expect(simulatorApiModule.normalizeRequestUrl).toBe(
      apiModule.normalizeRequestUrl,
    )
  })

  it('routes market proxy requests through the stable market API entry', () => {
    const config = readVercelConfig()
    const rewrites = config.rewrites ?? []

    expect(JSON.stringify(config)).not.toContain('server/dist')
    expect(
      rewrites.find((rewrite) => rewrite.source === '/market/:path*')
        ?.destination,
    ).toBe('/api/market?__coinburrow_path=market/:path*')
    expect(
      rewrites.find((rewrite) => rewrite.source === '/api/market/:path*')
        ?.destination,
    ).toBe('/api/market?__coinburrow_path=market/:path*')
  })

  it('routes simulator requests through the stable simulator API entry', () => {
    const config = readVercelConfig()
    const rewrites = config.rewrites ?? []

    expect(
      rewrites.find((rewrite) => rewrite.source === '/api/simulator/:path*')
        ?.destination,
    ).toBe('/api/simulator?__coinburrow_path=simulator/:path*')
  })
})

describe('Vercel API handler', () => {
  let app: ReturnType<typeof createApp>
  let handler: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<void>

  beforeEach(async () => {
    app = createApp()
    app.ready.mockResolvedValue(undefined)
    buildApp.mockReset()
    buildApp.mockReturnValue(app)
    vi.resetModules()
    ;({ default: handler } = await import(apiModulePath))
  })

  it('normalizes the URL and waits for the response to finish', async () => {
    const req = request('/api/health')
    const res = response()
    let settled = false
    let dispatched: () => void = () => undefined
    const requestDispatched = new Promise<void>((resolve) => {
      dispatched = resolve
    })

    app.server.on('request', () => {
      expect(req.url).toBe('/health')
      dispatched()
    })

    const pending = handler(req, res).then(() => {
      settled = true
    })

    await requestDispatched
    expect(settled).toBe(false)

    res.emit('finish')
    await pending
    expect(settled).toBe(true)
  })

  it('expands the production market rewrite before dispatch', async () => {
    const req = request(
      '/api/market?__coinburrow_path=market/exchange/candle&market=KRW-BTC&timeframe=1m',
    )
    const res = response()
    let dispatched: () => void = () => undefined
    const requestDispatched = new Promise<void>((resolve) => {
      dispatched = resolve
    })

    app.server.on('request', () => {
      expect(req.url).toBe(
        '/market/exchange/candle?market=KRW-BTC&timeframe=1m',
      )
      dispatched()
    })

    const pending = handler(req, res)

    await requestDispatched
    res.emit('finish')
    await expect(pending).resolves.toBeUndefined()
  })

  it('does not hang when the response is already finished', async () => {
    const res = response()
    Object.assign(res, { finished: true, writableEnded: true })

    await expect(handler(request('/health'), res)).resolves.toBeUndefined()
  })

  it('resolves when the response closes', async () => {
    const res = response()
    let dispatched: () => void = () => undefined
    const requestDispatched = new Promise<void>((resolve) => {
      dispatched = resolve
    })
    app.server.once('request', dispatched)

    const pending = handler(request('/health'), res)
    await requestDispatched
    res.emit('close')

    await expect(pending).resolves.toBeUndefined()
  })

  it('rejects when dispatch throws synchronously', async () => {
    app.server.on('request', () => {
      throw new Error('dispatch failed')
    })

    await expect(handler(request('/health'), response())).rejects.toThrow(
      'dispatch failed',
    )
  })

  it('clears failed readiness, sends a generic 500, and retries later', async () => {
    const replacementApp = createApp()
    replacementApp.ready.mockResolvedValue(undefined)
    app.ready.mockRejectedValueOnce(new Error('secret readiness detail'))
    buildApp.mockReturnValueOnce(app).mockReturnValueOnce(replacementApp)

    const firstResponse = response()
    const bodies: string[] = []
    firstResponse.on('body', (body) => bodies.push(String(body)))

    await expect(
      handler(request('/api/health'), firstResponse),
    ).resolves.toBeUndefined()

    expect(firstResponse.statusCode).toBe(500)
    expect(bodies.join('')).toBe('Internal Server Error')
    expect(bodies.join('')).not.toContain('secret readiness detail')

    const secondResponse = response()
    const oldDispatch = vi.fn((_req: unknown, res: unknown) => {
      ;(res as ServerResponse).emit('finish')
    })
    app.server.once('request', oldDispatch)
    const replacementDispatch = vi.fn((_req: unknown, res: unknown) => {
      ;(res as ServerResponse).emit('finish')
    })
    replacementApp.server.once('request', (_req, res) => {
      replacementDispatch(_req, res)
    })

    await expect(
      handler(request('/api/health'), secondResponse),
    ).resolves.toBeUndefined()
    expect(buildApp).toHaveBeenCalledTimes(2)
    expect(app.ready).toHaveBeenCalledTimes(1)
    expect(replacementApp.ready).toHaveBeenCalledTimes(1)
    expect(oldDispatch).not.toHaveBeenCalled()
    expect(replacementDispatch).toHaveBeenCalledTimes(1)
  })

  it('rethrows a readiness error when the response is not writable', async () => {
    const readinessError = new Error('readiness failed')
    app.ready.mockRejectedValueOnce(readinessError)
    const res = response()
    Object.assign(res, { writable: false })

    await expect(handler(request('/health'), res)).rejects.toBe(readinessError)
    expect(res.statusCode).toBe(200)
  })

  it('shares one in-flight readiness promise across concurrent requests', async () => {
    let resolveReady: (value: undefined) => void = () => undefined
    app.ready.mockReturnValueOnce(
      new Promise<undefined>((resolve) => {
        resolveReady = resolve
      }),
    )
    app.server.on('request', (_req, res) => {
      ;(res as ServerResponse).emit('finish')
    })

    const first = handler(request('/health'), response())
    const second = handler(request('/health'), response())

    await vi.waitFor(() => {
      expect(buildApp).toHaveBeenCalledTimes(1)
      expect(app.ready).toHaveBeenCalledTimes(1)
    })
    resolveReady(undefined)

    await expect(Promise.all([first, second])).resolves.toEqual([
      undefined,
      undefined,
    ])
  })

  it('rejects response errors while waiting for completion', async () => {
    const res = response()
    let dispatched: () => void = () => undefined
    const requestDispatched = new Promise<void>((resolve) => {
      dispatched = resolve
    })
    app.server.once('request', dispatched)

    const pending = handler(request('/health'), res)

    await requestDispatched
    res.emit('error', new Error('response failed'))

    await expect(pending).rejects.toThrow('response failed')
  })
})
