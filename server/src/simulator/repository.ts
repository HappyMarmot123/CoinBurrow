import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

import { SimulatorDependencyError, SimulatorError } from './errors.js'
import type { AccountSnapshot, ExecuteOrderInput, SimulatorSymbol } from './types.js'

const numericSchema = z.union([z.number(), z.string()]).transform((value, context) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid numeric value' })
    return z.NEVER
  }
  return parsed
})

const accountRowSchema = z.object({
  account_id: z.string().uuid(),
  starting_cash: numericSchema,
  cash_balance: numericSchema,
})

const positionRowsSchema = z.array(z.object({
  symbol: z.enum(['BTC', 'ETH']),
  quantity: numericSchema,
  avg_price: numericSchema,
}))
const purchasedSymbolRowsSchema = z.array(z.object({
  symbol: z.enum(['BTC', 'ETH']),
}))

export interface SimulatorRepository {
  getSnapshot(userId: string): Promise<AccountSnapshot>
  executeOrder(input: ExecuteOrderInput): Promise<void>
  reset(userId: string): Promise<void>
}

function dependencyFailure(message: string, cause: unknown): SimulatorDependencyError {
  return new SimulatorDependencyError(message, { cause })
}

function toDomainRpcError(message: string): SimulatorError | null {
  if (message.includes('BUY_LIMIT_REACHED')) {
    return new SimulatorError(
      'BUY_LIMIT_REACHED',
      'MVP에서는 종목별로 한 번만 매수할 수 있습니다. 계좌 초기화 후 다시 매수해 주세요.',
      409,
    )
  }
  if (message.includes('INSUFFICIENT_CASH')) {
    return new SimulatorError('INSUFFICIENT_CASH', '주문 가능한 현금이 부족합니다.', 409)
  }
  if (message.includes('INSUFFICIENT_POSITION')) {
    return new SimulatorError('INSUFFICIENT_POSITION', '매도 가능한 보유 수량이 부족합니다.', 409)
  }
  if (message.includes('INVALID_SYMBOL')) {
    return new SimulatorError('INVALID_SYMBOL', '지원하지 않는 자산입니다.', 400)
  }
  if (message.includes('INVALID_SIDE') || message.includes('INVALID_QUANTITY')) {
    return new SimulatorError('INVALID_ORDER', '주문 입력값이 유효하지 않습니다.', 400)
  }
  return null
}

export class SupabaseSimulatorRepository implements SimulatorRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSnapshot(userId: string): Promise<AccountSnapshot> {
    const accountResult = await this.client.rpc('ensure_sim_account', { p_user_id: userId })
    if (accountResult.error) {
      throw dependencyFailure('모의 계좌를 불러오지 못했습니다.', accountResult.error)
    }

    const accountRows = z.array(accountRowSchema).safeParse(accountResult.data)
    if (!accountRows.success || accountRows.data.length !== 1) {
      throw dependencyFailure('모의 계좌 응답 형식이 올바르지 않습니다.', accountRows.error)
    }

    const account = accountRows.data[0]
    const [positionsResult, purchasedSymbolsResult] = await Promise.all([
      this.client
        .from('sim_positions')
        .select('symbol,quantity,avg_price')
        .eq('account_id', account.account_id)
        .order('symbol'),
      this.client
        .from('sim_orders')
        .select('symbol')
        .eq('account_id', account.account_id)
        .eq('side', 'buy')
        .order('symbol'),
    ])

    if (positionsResult.error) {
      throw dependencyFailure('보유 자산을 불러오지 못했습니다.', positionsResult.error)
    }
    if (purchasedSymbolsResult.error) {
      throw dependencyFailure('매수 이력을 불러오지 못했습니다.', purchasedSymbolsResult.error)
    }

    const positions = positionRowsSchema.safeParse(positionsResult.data)
    if (!positions.success) {
      throw dependencyFailure('보유 자산 응답 형식이 올바르지 않습니다.', positions.error)
    }
    const purchasedSymbols = purchasedSymbolRowsSchema.safeParse(purchasedSymbolsResult.data)
    if (!purchasedSymbols.success) {
      throw dependencyFailure('매수 이력 응답 형식이 올바르지 않습니다.', purchasedSymbols.error)
    }

    return {
      accountId: account.account_id,
      startingCash: account.starting_cash,
      cashBalance: account.cash_balance,
      positions: positions.data.map((position) => ({
        symbol: position.symbol as SimulatorSymbol,
        quantity: position.quantity,
        avgPrice: position.avg_price,
      })),
      purchasedSymbols: [...new Set(purchasedSymbols.data.map(({ symbol }) => symbol))],
    }
  }

  async executeOrder(input: ExecuteOrderInput): Promise<void> {
    const result = await this.client.rpc('execute_sim_order', {
      p_user_id: input.userId,
      p_symbol: input.symbol,
      p_side: input.side,
      p_quantity: input.quantity,
      p_price: input.price,
    })

    if (!result.error) return

    const domainError = toDomainRpcError(result.error.message)
    if (domainError) throw domainError
    throw dependencyFailure('주문을 처리하지 못했습니다.', result.error)
  }

  async reset(userId: string): Promise<void> {
    const result = await this.client.rpc('reset_simulator', { p_user_id: userId })
    if (result.error) {
      throw dependencyFailure('모의 계좌를 초기화하지 못했습니다.', result.error)
    }
  }
}
