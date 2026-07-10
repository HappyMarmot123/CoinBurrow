import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MyPage from '../src/features/mypage/MyPage.vue'

describe('MyPage', () => {
  it('renders account shell sections', () => {
    const wrapper = mount(MyPage, {
      global: {
        plugins: [createPinia()],
        stubs: { AppNav: true },
      },
    })

    expect(wrapper.text()).toContain('마이페이지')
    expect(wrapper.text()).toContain('로그인 상태')
    expect(wrapper.text()).toContain('가상 계좌')
    expect(wrapper.text()).toContain('투자내역')
  })
})