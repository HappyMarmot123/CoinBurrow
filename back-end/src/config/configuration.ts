export const configuration = () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  clientUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://your-production-url.com' // TODO: 실제 프로덕션 URL로 변경해야 합니다.
      : 'http://localhost:3000',
  UPBIT_ACCESS_KEY: process.env.UPBIT_ACCESS_KEY,
  UPBIT_SECRET_KEY: process.env.UPBIT_SECRET_KEY,
  UPBIT_API_URL: 'https://api.upbit.com/v1',
});
