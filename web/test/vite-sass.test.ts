// @vitest-environment node

import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config'

describe('Vite Sass configuration', () => {
  it('uses the modern Sass compiler API to avoid legacy JS API warnings', () => {
    const scssOptions = viteConfig.css?.preprocessorOptions?.scss

    expect(scssOptions).toMatchObject({ api: 'modern-compiler' })
  })
})
