1. 기술 스택
프로젝트는 프론트엔드, 모바일, 백엔드, 데이터베이스/서비스를 아우르는 현대적인 스택으로 구성됩니다.

프론트엔드
Next.js (버전 15.4.3): React 기반의 웹 프레임워크로, 서버 사이드 렌더링(SSR), 정적 사이트 생성(SSG) 등의 기능을 통해 고성능 웹 애플리케이션을 구축합니다.

React (버전 19.1): 선언적이고 컴포넌트 기반 UI 개발을 위한 핵심 라이브러리입니다.

모바일
React Native (버전 0.79): 네이티브 앱 개발을 위한 프레임워크입니다. React 코드로 iOS와 Android 앱을 동시에 만들 수 있습니다.

Expo SDK (버전 53.0.0): React Native 개발 환경을 간소화해주는 도구 및 라이브러리 세트입니다.

백엔드
NestJS CLI (버전 11.0.7): NestJS 프로젝트를 효율적으로 관리하고 개발할 수 있는 커맨드 라인 인터페이스입니다.

Fastify (버전 5.4.0): Node.js 기반의 고성능 웹 프레임워크로, NestJS의 기본 HTTP 서버인 Express 대신 사용해 높은 처리량을 확보합니다.

데이터베이스 / 서비스
Supabase: 오픈 소스 Firebase 대안으로, 데이터베이스, 인증, 스토리지 등 다양한 백엔드 기능을 제공합니다.

Redis: 인메모리 데이터 저장소로, 캐싱, 세션 관리 등에 사용되어 백엔드 성능을 향상시킵니다.

Drizzle ORM: TypeScript 친화적인 ORM(Object-Relational Mapping)으로, 타입 안정성을 높이고 데이터베이스 상호작용을 간결하게 만듭니다.

Supabase Storage: Supabase에서 제공하는 파일 스토리지 서비스입니다.

2. 백엔드 최적화 전략 (NestJS + Fastify)
NestJS와 Fastify를 결합하여 성능을 극대화하는 전략은 다음과 같습니다.

Fastify Adapter 설정: main.ts에서 Fastify 옵션을 최적화하여 NestJS 애플리케이션에 적용합니다.

NestJS 구조 활용: DTO, Pipe, Guard, Interceptor를 통해 비즈니스 로직과 횡단 관심사를 명확하게 분리합니다.

Fastify 네이티브 기능: FastifyReply 객체 직접 제어나 플러그인/훅/데코레이터 등록 등을 통해 저수준에서 성능을 최적화합니다.

성능 저해 요소 최소화: 불필요한 미들웨어를 제거하고, 데이터베이스 쿼리를 최적화하며, Redis를 활용한 캐싱 전략을 도입합니다.

프로덕션 환경 최적화: Gzip과 같은 압축 기능을 사용하고, PM2나 클러스터링을 활용하여 서버의 확장성을 확보합니다.

3. 참고 자료
Next.js: https://nextjs.org/docs/app/getting-started/installation

React: https://ko.react.dev/learn

React Native: https://reactnative.dev/docs/getting-started

Expo: https://docs.expo.dev/versions/latest/

NestJS 강의: https://nomadcoders.co/nestjs-fundamentals/lobby?utm_source=free_course&utm_campaign=nestjs-fundamentals&utm_medium=site

Fastify 강의: https://www.youtube.com/watch?v=R2j9a7y9-5E