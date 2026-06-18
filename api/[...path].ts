import type { IncomingMessage, ServerResponse } from 'node:http'

import { buildApp } from '../server/src/app.js'

let appPromise: Promise<ReturnType<typeof buildApp>> | null = null

export function normalizeApiUrl(url: string | undefined): string | undefined {
  if (!url?.match(/^\/api(?=\/|\?|$)/)) return url

  const normalized = url.slice('/api'.length)
  return normalized.startsWith('/') ? normalized : `/${normalized}`
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
    if (appPromise === currentAppPromise) appPromise = null
    await sendReadinessError(res, error)
    return
  }

  req.url = normalizeApiUrl(req.url)
  const completion = observeResponse(res)

  try {
    app.server.emit('request', req, res)
  } catch (error) {
    completion.cancel()
    throw error
  }

  await completion.promise
}
