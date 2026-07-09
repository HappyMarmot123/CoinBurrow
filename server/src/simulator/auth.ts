import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { SimulatorError } from './errors.js'

export interface SimulatorUser {
  id: string
  email?: string
}

export type SimulatorUserVerifier = (token: string) => Promise<SimulatorUser | null>

export function extractBearerToken(authorization: string | undefined): string {
  const match = authorization?.match(/^bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  if (!token) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Authorization bearer token is required')
  }

  return token
}

export async function verifySimulatorUser(
  authorization: string | undefined,
  verifier: SimulatorUserVerifier = verifySupabaseUser,
): Promise<SimulatorUser> {
  const token = extractBearerToken(authorization)
  const user = await verifier(token)

  if (!user) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Valid Supabase session is required')
  }

  return user
}

export async function verifySupabaseUser(token: string): Promise<SimulatorUser | null> {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new SimulatorError('SIM_UPSTREAM_FAILURE', 'Supabase server credentials are required')
  }

  try {
    const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
    const { data, error } = await supabase.auth.getUser(token)

    if (error) {
      const status = getErrorStatus(error)
      if (status === 401 || status === 403 || (status !== undefined && status < 500)) {
        return null
      }

      throw new SimulatorError('SIM_UPSTREAM_FAILURE', 'Supabase auth verification failed')
    }

    if (!data.user) {
      return null
    }

    return {
      id: data.user.id,
      email: data.user.email,
    }
  } catch (error) {
    if (error instanceof SimulatorError) {
      throw error
    }

    throw new SimulatorError('SIM_UPSTREAM_FAILURE', 'Supabase auth verification failed')
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined
  }

  const { status, statusCode } = error as { status?: unknown; statusCode?: unknown }

  if (typeof status === 'number') {
    return status
  }

  if (typeof statusCode === 'number') {
    return statusCode
  }

  if (typeof status === 'string') {
    const parsed = Number(status)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  if (typeof statusCode === 'string') {
    const parsed = Number(statusCode)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}
