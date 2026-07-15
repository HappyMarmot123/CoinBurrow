import type { SupabaseClient } from '@supabase/supabase-js'

import { SimulatorAuthError } from './errors.js'

export interface AuthenticatedUser {
  id: string
  email?: string
}

export interface SimulatorAuthenticator {
  authenticate(authorization?: string): Promise<AuthenticatedUser>
}

export function parseBearerToken(authorization?: string): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  if (!token) {
    throw new SimulatorAuthError()
  }
  return token
}

export class SupabaseAuthenticator implements SimulatorAuthenticator {
  constructor(private readonly client: SupabaseClient) {}

  async authenticate(authorization?: string): Promise<AuthenticatedUser> {
    const token = parseBearerToken(authorization)
    const { data, error } = await this.client.auth.getUser(token)

    if (error || !data.user) {
      throw new SimulatorAuthError('세션이 만료되었거나 유효하지 않습니다.')
    }

    return {
      id: data.user.id,
      email: data.user.email,
    }
  }
}

