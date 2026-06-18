export interface MarketDto {
  market: string
  koreanName: string
  englishName: string
}

export interface TickerDto {
  market: string
  tradePrice: number
  signedChangeRate: number
  accTradePrice24h: number
}

export interface CandleDto {
  market: string
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderbookUnit {
  askPrice: number
  bidPrice: number
  askSize: number
  bidSize: number
}

export interface OrderbookDto {
  market: string
  timestamp: number
  units: OrderbookUnit[]
}

export interface TradeDto {
  market: string
  price: number
  volume: number
  side: 'ASK' | 'BID'
  timestamp: number
}
