import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'
import { SimulatorError } from './errors.js'

export interface SimulatorUser {
  id: string
  email?: string
}

export type SimulatorUserVerifier = (token: string) => Promise<SimulatorUser | null>

export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Authorization bearer token is required')
  }

  const token = authorization.slice('Bearer '.length).trim()
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
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Supabase server credentials are required')
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email,
  }
}
