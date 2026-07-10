export interface SimulatorSessionView {
  authenticated: boolean
  userId?: string
  email?: string
}

type Fetcher = typeof fetch

export async function getSimulatorSession(
  accessToken: string,
  fetcher: Fetcher = fetch,
): Promise<SimulatorSessionView> {
  const response = await fetcher('/api/simulator/session', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    return { authenticated: false }
  }

  return response.json() as Promise<SimulatorSessionView>
}
