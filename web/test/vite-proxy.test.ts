// @vitest-environment node

import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config'

type ProxyOptions = {
  rewrite?: (path: string) => string
}

describe('Vite dev proxy', () => {
  it('keeps simulator API paths intact when proxying to the server', () => {
    const proxy = viteConfig.server?.proxy
    const apiProxy = proxy && typeof proxy === 'object' ? proxy['/api'] : undefined

    expect(apiProxy).toBeTypeOf('object')

    const rewrite = (apiProxy as ProxyOptions).rewrite ?? ((path: string) => path)

    expect(rewrite('/api/simulator/session')).toBe('/api/simulator/session')
  })
})
