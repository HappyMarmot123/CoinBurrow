import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
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
})
