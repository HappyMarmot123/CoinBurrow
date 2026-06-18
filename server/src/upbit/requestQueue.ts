type UpbitRequestPriority = 'critical' | 'high' | 'normal' | 'low'

interface QueueItem {
  id: number
  priority: UpbitRequestPriority
  run: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

const priorityWeight: Record<UpbitRequestPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
}

const UPBIT_REQUEST_INTERVAL_MS = 1_000

let nextId = 0
let active = false
let lastCompletedAt: number | null = null
const queue: QueueItem[] = []

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function takeNextItem(): QueueItem | undefined {
  let selectedIndex = -1
  let selectedWeight = -Infinity

  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index]
    const weight = priorityWeight[item.priority]
    if (weight > selectedWeight) {
      selectedWeight = weight
      selectedIndex = index
    }
  }

  if (selectedIndex < 0) return undefined
  return queue.splice(selectedIndex, 1)[0]
}

async function drainQueue(): Promise<void> {
  if (active) return
  active = true

  try {
    while (queue.length > 0) {
      const next = takeNextItem()
      if (!next) return

      const elapsed = lastCompletedAt === null ? 0 : Date.now() - lastCompletedAt
      const waitMs = lastCompletedAt === null
        ? 0
        : Math.max(0, UPBIT_REQUEST_INTERVAL_MS - elapsed)
      if (waitMs > 0) {
        await delay(waitMs)
      }

      try {
        next.resolve(await next.run())
      } catch (error) {
        next.reject(error)
      } finally {
        lastCompletedAt = Date.now()
      }
    }
  } finally {
    active = false
    if (queue.length > 0) {
      void drainQueue()
    }
  }
}

export function enqueueUpbitRequest<T>(
  run: () => Promise<T>,
  priority: UpbitRequestPriority = 'normal',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push({
      id: nextId,
      priority,
      run,
      resolve: (value) => resolve(value as T),
      reject,
    })
    nextId += 1
    void drainQueue()
  })
}

export function resetUpbitRequestQueueForTest(): void {
  queue.length = 0
  active = false
  lastCompletedAt = null
  nextId = 0
}
