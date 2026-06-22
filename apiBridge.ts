import type { IncomingMessage, ServerResponse } from 'node:http'

import { buildApp } from './server/src/app.js'

const APP_MODULE_PATH = './server/src/app.js'

let appPromise: Promise<ReturnType<typeof buildApp>> | null = null

function nowStamp() {
  return new Date().toISOString()
}

function getRequestLabel(req: IncomingMessage) {
  const headers = req.headers ?? {}
  const host = headers.host ?? 'unknown-host'
  const method = req.method ?? 'UNKNOWN'
  const pathname = req.url ?? 'unknown-path'
  const requestId =
    (headers['x-vercel-id'] as string | undefined) ??
    (headers['x-request-id'] as string | undefined) ??
    'no-request-id'
  return `[${nowStamp()}][${method} ${pathname}] host=${host} requestId=${requestId}`
}

function withCoinburrowPath(url: string | undefined): string | undefined {
  if (!url) return url
  const searchIndex = url.indexOf('?')
  if (searchIndex < 0) return url

  const query = url.slice(searchIndex + 1)
  const params = new URLSearchParams(query)
  const coinburrowPath = params.get('__coinburrow_path')
  if (!coinburrowPath) return url

  params.delete('__coinburrow_path')
  const rebuiltQuery = params.toString()
  const normalizedPath = coinburrowPath.startsWith('/')
    ? coinburrowPath
    : `/${coinburrowPath}`
  return `${normalizedPath}${rebuiltQuery ? `?${rebuiltQuery}` : ''}`
}

function reportLoadFailure(stage: string, error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  console.error(`[deploy-bootstrap] ${stage}: ${message}`)
}

export function normalizeApiUrl(url: string | undefined): string | undefined {
  if (!url?.match(/^\/api(?=\/|\?|$)/)) return url

  const normalized = url.slice('/api'.length)
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

export function normalizeRequestUrl(url: string | undefined): string | undefined {
  return normalizeApiUrl(withCoinburrowPath(url))
}

function responseIsComplete(res: ServerResponse): boolean {
  return res.finished || res.writableEnded || res.destroyed
}

function observeResponse(res: ServerResponse): {
  cancel: () => void
  promise: Promise<void>
} {
  if (responseIsComplete(res)) {
    return { cancel: () => undefined, promise: Promise.resolve() }
  }

  let cancel: () => void = () => undefined
  const promise = new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      res.off('finish', onComplete)
      res.off('close', onComplete)
      res.off('error', onError)
    }
    const onComplete = () => {
      cleanup()
      resolve()
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    cancel = cleanup
    res.once('finish', onComplete)
    res.once('close', onComplete)
    res.once('error', onError)

    if (responseIsComplete(res)) onComplete()
  })

  return { cancel, promise }
}

async function sendReadinessError(
  res: ServerResponse,
  error: unknown,
): Promise<void> {
  if (
    res.headersSent ||
    res.finished ||
    res.writable === false ||
    res.writableEnded ||
    res.destroyed
  ) {
    throw error
  }

  reportLoadFailure('readiness-failed', error)
  const completion = observeResponse(res)
  res.statusCode = 500
  res.end('Internal Server Error')
  await completion.promise
}

function getReadyApp(): Promise<ReturnType<typeof buildApp>> {
  if (appPromise) return appPromise

  const currentAppPromise = (async () => {
    const app = buildApp()
    await app.ready()
    console.log(`[deploy-bootstrap] fastify-app-loaded path=${APP_MODULE_PATH}`)
    return app
  })()
  appPromise = currentAppPromise
  return currentAppPromise
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const currentAppPromise = getReadyApp()
  let app: Awaited<typeof currentAppPromise>

  try {
    app = await currentAppPromise
  } catch (error) {
    if (appPromise === currentAppPromise) {
      appPromise = null
    }
    await sendReadinessError(res, error)
    return
  }

  req.url = normalizeRequestUrl(req.url)
  console.log(
    `[deploy-bootstrap] request=${getRequestLabel(req)} normalizedUrl=${req.url} appLoadedFrom=${APP_MODULE_PATH}`,
  )
  const completion = observeResponse(res)

  try {
    app.server.emit('request', req, res)
  } catch (error) {
    completion.cancel()
    reportLoadFailure('app-server-dispatch', error)
    throw error
  }

  await completion.promise
}
