import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  enqueueUpbitRequest,
  resetUpbitRequestQueueForTest,
} from '../src/upbit/requestQueue.js'

describe('Upbit request queue', () => {
  beforeEach(() => {
    resetUpbitRequestQueueForTest()
  })

  afterEach(() => {
    resetUpbitRequestQueueForTest()
    vi.useRealTimers()
  })

  it('runs queued higher priority requests before lower priority requests', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const started: string[] = []
    let releaseLow: () => void = () => undefined

    const low = enqueueUpbitRequest(async () => {
      started.push('low')
      await new Promise<void>((resolve) => {
        releaseLow = resolve
      })
      return 'low'
    }, 'low')

    await vi.waitFor(() => {
      expect(started).toEqual(['low'])
    })

    const normal = enqueueUpbitRequest(async () => {
      started.push('normal')
      return 'normal'
    }, 'normal')
    const critical = enqueueUpbitRequest(async () => {
      started.push('critical')
      return 'critical'
    }, 'critical')

    releaseLow()
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(500)

    await expect(Promise.all([low, critical, normal])).resolves.toEqual([
      'low',
      'critical',
      'normal',
    ])
    expect(started).toEqual(['low', 'critical', 'normal'])
  })

  it('waits for the configured interval before starting the next request', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    resetUpbitRequestQueueForTest()

    const startedAt: number[] = []
    await enqueueUpbitRequest(async () => {
      startedAt.push(Date.now())
      return undefined
    })

    const next = enqueueUpbitRequest(async () => {
      startedAt.push(Date.now())
      return undefined
    })

    await vi.advanceTimersByTimeAsync(499)
    expect(startedAt).toEqual([0])

    await vi.advanceTimersByTimeAsync(1)
    await next
    expect(startedAt).toEqual([0, 500])
  })

  it('waits after the previous request completes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    resetUpbitRequestQueueForTest()

    const startedAt: number[] = []
    const first = enqueueUpbitRequest(async () => {
      startedAt.push(Date.now())
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 700)
      })
      return undefined
    })

    await vi.advanceTimersByTimeAsync(700)
    await first

    const next = enqueueUpbitRequest(async () => {
      startedAt.push(Date.now())
      return undefined
    })

    await vi.advanceTimersByTimeAsync(499)
    expect(startedAt).toEqual([0])

    await vi.advanceTimersByTimeAsync(1)
    await next
    expect(startedAt).toEqual([0, 1_200])
  })
})
