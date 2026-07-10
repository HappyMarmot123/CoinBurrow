import type { SimulatorUser } from './auth.js'

export interface PaperAccount {
  id: string
  cashBalance: string
}

export interface SimulatorAccountRepository {
  findProfile(userId: string): Promise<{ id: string } | null>
  createProfile(user: SimulatorUser): Promise<{ id: string }>
  findPaperAccount(userId: string): Promise<PaperAccount | null>
  createPaperAccount(userId: string, startingCash: string): Promise<PaperAccount>
}

export const STARTING_CASH_KRW = '100000000'

export async function ensurePaperAccount(
  repository: SimulatorAccountRepository,
  user: SimulatorUser,
): Promise<PaperAccount> {
  const profile = await repository.findProfile(user.id)
  if (!profile) {
    await repository.createProfile(user)
  }

  const account = await repository.findPaperAccount(user.id)
  if (account) {
    return account
  }

  return repository.createPaperAccount(user.id, STARTING_CASH_KRW)
}
