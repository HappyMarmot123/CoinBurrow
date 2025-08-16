export const configuration = () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  clientUrl:
    process.env.NODE_ENV === 'production'
      ? 'https://your-production-url.com' // TODO: 실제 프로덕션 URL로 변경해야 합니다.
      : 'http://localhost:4000',
});
