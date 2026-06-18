export const config = {
  port: Number(process.env.PORT ?? 4000),
  upbitRestUrl: 'https://api.upbit.com/v1',
  targetCoins: [
    'KRW-BTC',
    'KRW-ETH',
    'KRW-XRP',
    'KRW-SOL',
    'KRW-ADA',
    'KRW-DOGE',
    'KRW-DOT',
    'KRW-TRX',
  ] as const,
}
