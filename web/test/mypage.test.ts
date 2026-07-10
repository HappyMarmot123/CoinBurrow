import { createPinia, setActivePinia } from 'pinia'
import process from 'node:process'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MyPage from '../src/features/mypage/MyPage.vue'
import { useAuthStore } from '../src/stores/auth.js'

function mountMyPage(pinia = createPinia()) {
  return mount(MyPage, {
    global: {
      plugins: [pinia],
      stubs: { AppNav: true },
    },
  })
}

describe('MyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders account shell sections', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.spyOn(useAuthStore(), 'refreshSession').mockResolvedValue()

    const wrapper = mountMyPage(pinia)

    expect(wrapper.text()).toContain('마이페이지')
    expect(wrapper.text()).toContain('로그인 상태')
    expect(wrapper.text()).toContain('가상 계좌')
    expect(wrapper.text()).toContain('투자내역')
  })

  it('refreshes the auth session when mounted', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const refreshSession = vi.spyOn(useAuthStore(), 'refreshSession').mockResolvedValue()

    mountMyPage(pinia)

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('handles a rejected auth session refresh when mounted', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const refreshSession = vi
      .spyOn(useAuthStore(), 'refreshSession')
      .mockRejectedValueOnce(new Error('refresh failed'))
    const unhandledRejections: unknown[] = []
    const recordUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason)
    }

    process.on('unhandledRejection', recordUnhandledRejection)

    try {
      const wrapper = mountMyPage(pinia)
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(refreshSession).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toContain('마이페이지')
      expect(wrapper.text()).toContain('로그인 상태')
      expect(unhandledRejections).toEqual([])
    } finally {
      process.off('unhandledRejection', recordUnhandledRejection)
    }
  })
})
