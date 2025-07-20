NestJS 실행 흐름과 기본 개념
NestJS는 요청이 들어오면 정해진 순서대로 처리를 진행합니다.

실행 플로우: Middleware → Guard → Pipe → Interceptor → Route Handler


Guard: 인증(Authentication) 및 권한(Authorization) 관리에 특화되어 있습니다. @UseGuards() 데코레이터로 적용합니다.
Pipe: @UsePipes()와 ValidationPipe를 사용해 요청 데이터를 검증하거나 변환하는 역할을 합니다. class-validator 라이브러리를 활용해 DTO(Data Transfer Object) 유효성 검사를 데코레이터로 손쉽게 처리할 수 있습니다.
Interceptor: 요청-응답 주기 동안 로직을 가로채서 실행합니다. @UseInterceptors() 데코레이터로 적용합니다.

주요 데코레이터 및 기능
NestJS는 Express 프레임워크 기반의 HTTP 객체를 다루기 위한 다양한 데코레이터를 제공합니다.

요청 관련 데코레이터
@Request(), @Response(), @Next(): HTTP 요청, 응답, 다음 미들웨어 함수에 접근합니다.
@Session(): 세션 객체에 접근합니다.
@Param('id'), @Body('email'), @Query('sort'), @Headers('Auth'): URL 파라미터, 요청 바디, 쿼리 스트링, 헤더 등 특정 요청 데이터를 편리하게 가져옵니다.

응답 관련 데코레이터
@HttpCode(): 응답 HTTP 상태 코드를 설정합니다.
@Header(): 응답 헤더를 설정합니다.
@Redirect(): 리다이렉션을 처리합니다.

기능 적용 데코레이터
@UseFilters(): 예외 필터(Exception Filter)를 적용합니다.

데이터 직렬화 (Serialization)
class-transformer와 같은 라이브러리를 사용해 객체의 직렬화를 제어할 수 있습니다. 주로 DTO에 적용됩니다.
@Exclude(): 특정 속성을 직렬화 대상에서 제외합니다.
@Expose(): 계산된 속성 등 특정 속성을 노출시킵니다.
@Transform(): 커스텀 변환 로직을 적용합니다.

내장 미들웨어 및 모듈
CacheModule: GET 요청과 웹소켓에 캐시 기능을 적용할 수 있으며, Redis와 연동하여 사용 가능합니다.
로깅: logger를 통해 로그를 지원합니다.

보안 미들웨어:
helmet: 12개의 미들웨어로 구성된 HTTP 헤더 보안 설정.
enableCors: CORS(Cross-Origin Resource Sharing)를 활성화합니다.
csurf: CSRF(Cross-Site Request Forgery) 공격을 방지합니다.
express-rate-limit: 요청 횟수를 제한하여 DDoS 공격 등을 방지합니다.

NestJS와 Fastify
NestJS는 기본적으로 Express를 사용하지만, 더 높은 성능을 위해 Fastify로 HTTP 서버를 교체할 수 있습니다.
fastify: 고성능 HTTP 서버를 제공합니다.
주의사항: fastify를 사용하면 NestJS의 HTTP 프로바이더가 변경되므로, Express 전용 미들웨어나 예제 코드는 작동하지 않습니다.
Fastify 기반 설정 예시로는 point-of-view(템플릿 렌더링), handlebars(템플릿 엔진), fastify-formbody(폼 데이터 파싱) 등을 사용할 수 있습니다. 또한 app.useStaticAssets와 app.setViewEngine를 이용해 정적 파일과 뷰 템플릿 설정을 할 수 있습니다.

Fastify는 강력한 플러그인 생태계를 가지고 있습니다. 보안, 성능, 편의 기능 관련 플러그인을 main.ts에서 등록하여 전역적으로 적용할 수 있습니다.

보안 헤더 설정: fastify-helmet
요청 압축: @fastify/compress (Gzip, Brotli 압축으로 응답 속도 개선)
CORS (교차 출처 리소스 공유): @fastify/cors
요청 속도 제한 (Rate Limiting): @fastify/rate-limit (API 남용 방지)
쿠키 처리: @fastify/cookie
파일 업로드: @fastify/multipart


아키텍처: 모듈 기반 + 레이어드 패턴

src/
├── main.ts             # 애플리케이션의 진입점
├── app.module.ts       # 최상위 루트 모듈 (다른 모듈들을 import)
│
├── modules/
│   ├── users/
│   │   ├── dto/                # 데이터 전송 객체 (Data Transfer Object)
│   │   ├── entities/           # 데이터베이스 엔티티
│   │   ├── controllers/           # 요청 처리 (Controller Layer)
│   │   ├── services/           # 비즈니스 로직 (Service Layer)
│   │   ├── repositories/           # DB 접근 (Data Layer)
│   │   └── users.module.ts     # Users 모듈 정의
│   │
│   └── auth/                   # 다른 기능 모듈
│       ├── ...
│
└── shared/                 # 공통으로 사용되는 기능 모듈 (선택 사항)
    ├── shared.module.ts
    └── ...