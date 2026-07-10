import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppNav from '../src/components/AppNav.vue'

describe('AppNav mypage link', () => {
  it('shows the three primary menu links', () => {
    const wrapper = mount(AppNav, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('거래소')
    expect(wrapper.text()).toContain('시장 동향')
    expect(wrapper.text()).toContain('마이페이지')
  })
})