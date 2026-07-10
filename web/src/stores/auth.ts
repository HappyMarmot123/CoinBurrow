import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { supabase } from '../lib/supabase.js'
import { getSimulatorSession, type SimulatorSessionView } from '../api/simulator.js'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = shallowRef('')
  const session = shallowRef<SimulatorSessionView>({ authenticated: false })
  const loading = shallowRef(false)

  const authenticated = computed(() => session.value.authenticated)

  async function refreshSession() {
    if (!supabase) {
      session.value = { authenticated: false }
      return
    }

    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      accessToken.value = data.session?.access_token ?? ''
      session.value = accessToken.value
        ? await getSimulatorSession(accessToken.value)
        : { authenticated: false }
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    accessToken.value = ''
    session.value = { authenticated: false }
  }

  return {
    accessToken,
    session,
    loading,
    authenticated,
    refreshSession,
    signOut,
  }
})
