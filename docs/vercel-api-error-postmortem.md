# Vercel API 배포 오류 회고

작성일: 2026-06-19  
범위: `HEAD~5..HEAD`, Vercel 배포 후 `/exchange` 페이지 API 오류 대응 과정

## 요약

이번 이슈는 단일 버그가 아니라 세 계층이 동시에 바뀌면서 발생한 연쇄 장애였다.

1. 프론트엔드가 `/market/...` API를 호출한다.
2. Vercel rewrite가 `/market/...` 요청을 `/api/...` 함수로 라우팅한다.
3. Vercel 함수가 Fastify 서버 앱을 로드하고, Fastify가 업비트 프록시 라우트를 처리한다.

로컬에서는 Vite dev server가 `/market` 요청을 `localhost:4000`으로 직접 프록시하기 때문에 2번과 3번의 Vercel 전용 동작이 거의 드러나지 않았다. 반면 프로덕션에서는 rewrite, serverless function entry, TypeScript emit, ESM/CommonJS 모듈 로딩, 함수 번들 파일 포함 여부가 모두 맞아야 했다.

결과적으로 에러는 아래처럼 단계적으로 바뀌었다.

| 증상 | 의미 | 실제 문제 |
| --- | --- | --- |
| `Unexpected token '<', "<!doctype "... is not valid JSON` | API가 JSON 대신 HTML을 반환 | Vercel rewrite가 API 함수가 아니라 SPA `index.html`로 빠짐 |
| `status 404` | API 함수 또는 Fastify 라우트 매칭 실패 | `/api/market/:path*` rewrite와 Vercel 함수 엔트리 매칭이 안정적이지 않음 |
| `status 500`, `Cannot find module '/var/task/server/dist/app.js'` | 함수는 실행됐지만 Fastify 앱 로딩 실패 | Vercel 함수 패키지 안에 `server/dist/app.js`가 없음 |
| `status 500`, `Unexpected token 'export'` | 함수 엔트리 JS를 CommonJS로 로드 | API 함수 산출물이 ESM인데 루트 패키지가 ESM으로 선언되어 있지 않음 |

## 관련 Git 흐름

문제가 집중된 범위는 다음 5개 커밋이다.

```text
* 957977f feat: configure project as ESM and add API handler integration tests
* 34be208 feat: implement Vercel API routing layer with path normalization and request handling tests
* 6b0358c feat: implement exchange API layer and core trading dashboard page components
* 64d5aa8 feat: implement exchange dashboard UI with Upbit API integration and request queue management
* 494617d fix(deploy): restore server bridge and runtime deps
```

각 커밋은 독립적으로 보면 합리적인 수정이었지만, Vercel 배포 환경에서는 서로 다른 전제를 가지고 있었다.

## 시간순 분석

### 1. `494617d`: 서버 브리지 복구와 런타임 의존성 정리

이 시점의 목표는 Vercel 함수에서 Fastify 서버 앱을 재사용하는 것이었다.

핵심 구조:

- `api/[...path].ts`가 Vercel catch-all 함수 역할을 한다.
- `vercel.json`이 `/market/:path*`를 `/api?__coinburrow_path=market/:path*`로 rewrite한다.
- API 핸들러 내부에서 `__coinburrow_path`를 다시 `/market/...` 경로로 복원한다.
- 프로덕션에서는 `../server/dist/app.js`를 동적 import한다.

문제는 이 구조가 두 가지 강한 가정을 가지고 있었다는 점이다.

1. `/api?__coinburrow_path=...` 형태의 요청이 `api/[...path].ts` 함수로 안정적으로 들어온다는 가정
2. Vercel 함수 런타임에 `server/dist/app.js`가 포함되어 있다는 가정

이 가정은 로컬 테스트에서는 잘 드러나지 않았다. 로컬 개발 서버는 Vercel rewrite와 serverless bundle을 사용하지 않고, 서버 앱도 `server/src` 또는 dev server로 직접 실행되기 때문이다.

### 2. `64d5aa8`: 업비트 요청 큐와 재시도 로직 추가

이 커밋은 원래 문제였던 업비트 `429 Too Many Requests`를 줄이기 위한 작업이었다.

추가된 핵심 동작:

- 업비트 REST 요청을 priority queue로 통과시킨다.
- 요청 완료 후 다음 요청까지 `1_000ms` 간격을 둔다.
- 429 또는 5xx, 네트워크 실패는 최대 2회 재시도한다.
- 초기 재시도는 3초 뒤, 이후는 2초 간격이다.

이 변경은 업비트 요청 폭주 문제를 줄이는 데 필요했다. 그러나 프론트가 반드시 서버 프록시를 통해 업비트에 접근해야 하는 구조를 더 중요하게 만들었다. 즉, Vercel API 프록시가 깨지면 `/exchange` 페이지의 핵심 데이터 로딩 전체가 실패하게 되었다.

### 3. `6b0358c`: 프론트 API 호출 정리와 Vercel 라우팅 보강

이 시점에서 프론트 API 클라이언트는 fallback 요청을 제거하고 단일 프록시 엔드포인트만 호출하도록 단순화되었다.

이전에는 하나의 데이터 로딩 실패가 다른 fallback 경로로 우연히 가려질 수 있었다. 이후에는 `/market/...` 요청이 정확히 Vercel API 함수로 들어가야 했다.

여기서 첫 번째 프로덕션 증상이 나타났다.

```text
Unexpected token '<', "<!doctype "... is not valid JSON
```

이 메시지는 업비트나 Fastify 문제가 아니었다. 브라우저가 `response.json()`을 호출했는데 응답 본문이 JSON이 아니라 Vercel SPA fallback의 `index.html`이었다는 뜻이다.

즉, `/market/exchange/candle?...` 요청이 API 함수로 처리되지 않고 정적 프론트엔드 fallback으로 흘러갔다.

이를 해결하기 위해 rewrite 대상을 더 명확히 하려 했지만, 그 다음에는 404가 발생했다.

```text
failed to load /market/exchange/candle?...; status 404
```

이 404는 요청이 더 이상 HTML fallback으로 빠지지 않는다는 신호이기도 했다. 그러나 `/api/market/:path*` 방식이 Vercel 함수 entry와 Fastify 내부 경로 복원 사이에서 안정적으로 맞지 않았다.

결국 `/market/:path*`를 고정 함수 엔트리인 `/api/market`으로 보내고, 원래 path는 `__coinburrow_path` query로 넘기는 방식이 선택되었다.

현재 rewrite:

```json
{
  "source": "/market/:path*",
  "destination": "/api/market?__coinburrow_path=market/:path*"
}
```

이 구조의 장점은 Vercel 함수 엔트리가 항상 `api/market.ts`로 고정된다는 점이다. 함수 내부에서만 `/market/...` 경로를 복원하면 된다.

### 4. `34be208`: `server/dist` 동적 import 제거와 API bridge 분리

다음 프로덕션 에러는 다음 로그로 확인되었다.

```text
Cannot find module '/var/task/server/dist/app.js' imported from /var/task/api/[...path].js
```

이 로그는 아주 중요한 단서였다. Vercel 함수 자체는 실행되고 있었지만, 함수 안에서 Fastify 앱을 로드하는 단계가 실패했다.

원인은 `api/[...path].ts`가 프로덕션에서 `../server/dist/app.js`를 동적 import하도록 되어 있었기 때문이다. 로컬 `npm run build`는 `server/dist`를 만들 수 있지만, Vercel serverless function package 안에 그 산출물이 실제로 들어간다는 보장은 없었다.

`vercel.json`에 `includeFiles: "server/dist/**"`가 있었지만, 이 방식은 다음 이유로 취약했다.

- Vercel 함수 번들링은 entrypoint 기준 파일 추적에 크게 의존한다.
- 동적 import 문자열은 정적 추적이 어렵다.
- monorepo workspace의 build output과 Vercel function packaging 시점이 항상 직관적으로 일치하지 않는다.
- `server/dist`는 TypeScript build artifact이지 함수 source dependency가 아니다.

따라서 방향을 바꿨다.

- Vercel 함수가 `server/dist`를 런타임에 찾지 않게 한다.
- 함수 bridge가 `server/src/app.js`를 정적으로 import하게 한다.
- `api/[...path].ts`와 `api/market.ts`는 같은 bridge를 재사용한다.
- bridge helper는 `/api` 폴더 밖인 `apiBridge.ts`에 둔다.

`apiBridge.ts`를 `/api` 밖에 둔 이유도 중요하다. Vercel은 `/api` 디렉터리의 파일을 함수 엔트리로 취급할 수 있기 때문에, helper 파일을 `/api/bridge.ts`로 두면 의도하지 않은 API route가 생길 수 있다.

### 5. `957977f`: 루트 ESM 설정 추가

마지막 프로덕션 에러는 다음과 같았다.

```text
Warning: Failed to load the ES module: /var/task/api/market.js.
Make sure to set "type": "module" in the nearest package.json file or use the .mjs extension.

SyntaxError: Unexpected token 'export'
```

이 에러는 Vercel이 `api/market.ts`를 JavaScript로 컴파일한 결과가 ESM 문법을 포함한다는 뜻이다.

```js
export { default, normalizeApiUrl } from '../apiBridge.js'
```

그런데 루트 `package.json`에는 `"type": "module"`이 없었다. Node.js는 `.js` 파일을 기본적으로 CommonJS로 해석한다. 그래서 `export` 토큰을 만나자 syntax error가 발생했다.

서버와 웹 workspace의 `package.json`은 이미 `"type": "module"`을 사용하고 있었다. 그러나 Vercel 함수 엔트리는 루트 `/api` 아래에 있으므로 가장 가까운 package boundary는 루트 `package.json`이었다.

따라서 루트 `package.json`에도 다음 설정을 추가했다.

```json
{
  "type": "module"
}
```

그리고 테스트에서 이 전제가 깨지지 않도록 `server/test/api-handler.test.ts`에 다음 검증을 추가했다.

- 루트 `package.json`의 `type`이 `module`인지
- 루트 `tsconfig.json`이 `module: ESNext`, `moduleResolution: Bundler`인지
- Vercel rewrite에 `server/dist` 의존성이 남아 있지 않은지
- `/api/market?__coinburrow_path=...`가 Fastify 내부에서는 `/market/...`로 복원되는지

## 왜 로컬에서는 문제가 없었나

로컬 개발 경로와 프로덕션 경로가 달랐다.

로컬:

```text
browser
  -> Vite dev server /market proxy
  -> localhost:4000 Fastify server
  -> Upbit REST API
```

프로덕션:

```text
browser
  -> Vercel CDN/router
  -> vercel.json rewrites
  -> /api/market Vercel Function
  -> apiBridge.ts
  -> Fastify app emitted through Node http server
  -> Upbit REST API
```

로컬에서는 다음 요소가 빠져 있었다.

- Vercel rewrite matching
- Vercel `/api` function entry matching
- serverless function bundle packaging
- `/var/task` 런타임 파일 경로
- 루트 package boundary의 ESM/CommonJS 해석
- SPA fallback이 API 요청을 `index.html`로 응답하는 경로

그래서 `npm test`, `npm run build`, Vite dev server가 정상이어도 Vercel 프로덕션에서만 깨질 수 있었다.

## 왜 해결이 어려웠나

### 1. 같은 요청이 매번 다른 계층에서 실패했다

처음에는 JSON parse error였다. 그 다음에는 404였다. 그 다음에는 500이었다. 마지막에는 ESM syntax error였다.

이것은 한 문제가 계속 변한 것이 아니라, 바깥 계층부터 하나씩 통과하면서 다음 계층의 문제가 드러난 것이다.

```text
SPA fallback 문제 해결
  -> Vercel function entry 문제 노출
  -> Fastify app bundle 문제 노출
  -> Node ESM/CJS 문제 노출
```

겉으로는 "계속 API가 안 된다"였지만, 실제로는 실패 지점이 매번 달랐다.

### 2. `Unexpected token '<'`는 API 문제가 아니라 routing 문제였다

브라우저 콘솔에서 보면 "캔들 로딩 실패"처럼 보이지만, 응답 본문은 JSON이 아니라 `<!doctype html>`이었다.

프론트 API 클라이언트 입장에서는 단순 JSON parse 실패지만, 실제 원인은 Vercel rewrite와 SPA fallback이었다. 이처럼 증상과 원인 계층이 달라서 초기에 방향을 잡기 어려웠다.

### 3. Vercel의 `/api` 디렉터리 규칙과 rewrite 규칙이 함께 얽혔다

Vercel은 `/api/*.ts` 파일을 함수 entry로 본다. 동시에 `vercel.json` rewrite는 요청 path를 다른 destination으로 보낸다.

아래 두 형태는 비슷해 보이지만 동작 리스크가 다르다.

```json
{ "destination": "/api?__coinburrow_path=market/:path*" }
```

```json
{ "destination": "/api/market?__coinburrow_path=market/:path*" }
```

첫 번째는 query-only 방식이라 catch-all 함수로 안정적으로 들어간다는 보장이 약했다. 두 번째는 고정 function entry를 쓰므로 더 명확하다.

### 4. `server/dist`는 로컬 build 결과이지 Vercel 함수 런타임 계약이 아니었다

`server/dist/app.js`는 로컬에서는 존재할 수 있다. 그러나 Vercel 함수가 배포될 때 그 파일이 `/var/task/server/dist/app.js`에 존재한다는 것은 별개의 문제다.

특히 동적 import는 Vercel의 파일 추적이 놓치기 쉽다.

```ts
await import('../server/dist/app.js')
```

이 방식은 테스트 runner에서는 잘 동작할 수 있지만, serverless function package에서는 missing module이 될 수 있었다.

### 5. TypeScript emit과 Node 런타임 모듈 형식이 어긋났다

Vercel은 TypeScript API route를 JavaScript로 컴파일한다. 산출물이 ESM이면 Node가 해당 `.js`를 ESM으로 해석해야 한다.

그러나 루트 `package.json`에 `"type": "module"`이 없으면 Node는 `.js`를 CommonJS로 본다.

그래서 다음 로그가 발생했다.

```text
SyntaxError: Unexpected token 'export'
```

서버 workspace와 웹 workspace는 ESM이었지만, API 함수는 루트 `/api` 아래에 있어 루트 package 설정을 따른다는 점이 핵심이었다.

### 6. 테스트가 계층별 배포 전제를 충분히 고정하지 못했다

초기 테스트는 Fastify route와 REST client 로직에는 강했지만, 다음 전제는 나중에야 테스트로 고정되었다.

- Vercel rewrite가 어떤 function entry로 향하는지
- `__coinburrow_path`가 실제 Fastify path로 복원되는지
- `server/dist` 의존이 남아 있지 않은지
- 루트 package가 ESM인지
- API function entry가 정상 import 가능한지

배포 장애가 발생한 뒤에야 이 부분들이 회귀 테스트로 추가되었다.

## 현재 최종 구조

현재 구조는 다음과 같다.

```text
vercel.json
  /market/:path*
    -> /api/market?__coinburrow_path=market/:path*

api/market.ts
  -> ../apiBridge.js

api/[...path].ts
  -> ../apiBridge.js

apiBridge.ts
  -> ./server/src/app.js
  -> Fastify app.ready()
  -> req.url path normalization
  -> app.server.emit('request', req, res)
```

핵심 결정:

- `/market`는 프론트의 단일 API prefix로 유지한다.
- Vercel 함수 entry는 `/api/market`으로 고정한다.
- 원래 market path는 `__coinburrow_path` query로 넘긴다.
- 함수 내부에서 `/market/...`로 복원한다.
- `server/dist` 런타임 의존은 제거한다.
- API bridge는 `/api` 밖에 둔다.
- 루트 package를 ESM으로 선언한다.

## 재발 방지 체크리스트

### Vercel rewrite/API route 변경 시

- `/market/...` 요청이 SPA fallback으로 빠지지 않는지 확인한다.
- rewrite destination이 실제 `/api` 함수 파일과 1:1로 대응되는지 확인한다.
- helper 파일을 `/api` 디렉터리 안에 두지 않는다.
- `vercel.json`에 `server/dist` 같은 build artifact 의존을 추가하지 않는다.
- query로 path를 전달한다면 handler test에서 실제 복원 결과를 검증한다.

### API bridge 변경 시

- Fastify app import는 정적 import로 유지한다.
- 동적 import로 `server/dist`를 로드하지 않는다.
- `app.ready()` 실패 시 generic 500만 응답하고 상세는 로그로 남긴다.
- response `finish`, `close`, `error`를 모두 관찰해서 serverless function이 중간에 종료되지 않게 한다.

### TypeScript/Node module 설정 변경 시

- 루트 `package.json`의 `"type": "module"`을 유지한다.
- 루트 `tsconfig.json`의 `module: ESNext`, `moduleResolution: Bundler`를 유지한다.
- 임시 emit 후 `node import('./.../api/market.js')`로 API entry가 로드되는지 확인한다.
- workspace package 설정과 루트 package 설정을 혼동하지 않는다.

### 프론트 API client 변경 시

- API 응답이 non-2xx이면 JSON parse보다 먼저 status error를 던진다.
- HTML 응답이 온 경우 rewrite/fallback 문제로 의심한다.
- 로컬 Vite proxy 성공을 Vercel rewrite 성공으로 간주하지 않는다.

## 추천 검증 명령

배포 전 최소 검증:

```bash
npx tsc --noEmit -p tsconfig.json
npm test
npm run build
```

Vercel API entry의 ESM 로딩 확인:

```bash
npx tsc -p tsconfig.json --outDir .tmp/vercel-esm --declaration false
node -e "import('./.tmp/vercel-esm/api/market.js').then((m)=>console.log(typeof m.default, typeof m.normalizeApiUrl))"
```

기대 출력:

```text
function function
```

검증 후 `.tmp/vercel-esm`은 삭제한다.

## 배포 로그에서 기대할 정상 신호

정상이라면 다음 로그가 보여야 한다.

```text
[deploy-bootstrap] fastify-app-loaded path=./server/src/app.js
[deploy-bootstrap] request=[... /market/exchange/candle?...]
normalizedUrl=/market/exchange/candle?...
appLoadedFrom=./server/src/app.js
```

더 이상 나오면 안 되는 로그:

```text
Cannot find module '/var/task/server/dist/app.js'
Unexpected token 'export'
Failed to load the ES module: /var/task/api/market.js
```

## 남은 리스크

현재 구조가 해결한 것은 Vercel 라우팅과 함수 로딩 문제다. 업비트 자체 제한은 별도의 런타임 리스크로 남아 있다.

- 업비트가 계속 429를 반환하면 서버는 최종적으로 502를 반환한다.
- request queue가 1초 간격으로 처리되므로 동시에 많은 사용자가 몰리면 응답 지연이 발생할 수 있다.
- serverless function timeout과 queue 지연이 충돌할 가능성이 있다.
- market overview처럼 ticker, orderbook, status를 묶는 API는 내부적으로 여러 업비트 요청을 발생시킨다.

따라서 향후에는 다음 개선을 고려할 만하다.

- market status, market details, quote summary 캐시 TTL 점검
- candle API의 per-market cache 또는 short TTL cache
- `/exchange` 초기 로딩 단계별 progressive fetch
- serverless timeout 대비 요청 fan-out 제한
- Vercel preview 배포에서 `/market/exchange/candle`, `/market/exchange/market-status` smoke check 자동화

## 결론

이번 장애가 어려웠던 이유는 업비트 API 로직 자체보다 배포 계층의 숨은 계약이 연속으로 깨졌기 때문이다.

처음 문제는 "API가 JSON을 주지 않는다"였지만 실제로는 SPA fallback이었다. 그 다음은 route entry 문제였고, 그 다음은 serverless bundle 파일 포함 문제였으며, 마지막은 Node ESM package boundary 문제였다.

현재 구조는 이 전제를 코드와 테스트로 명시한다.

- Vercel route는 고정 함수 entry로 들어간다.
- 함수는 build artifact가 아니라 source app을 정적으로 import한다.
- API 함수 산출물은 루트 ESM package로 실행된다.
- 프로덕션 path 복원은 테스트로 검증한다.

이제 같은 문제가 재발하면 브라우저 에러 메시지만 보지 말고, 응답 본문 종류, Vercel rewrite destination, 함수 entry 로딩 로그, module format 로그 순서로 확인하는 것이 가장 빠르다.
