# CoinBurrow Zod 적용 계획 (요약/검토/수정본)

작성일: 2026-06-22  
대상: `web`(Vue 3) + `server`(Fastify) 공통 데이터 검증 강화

## 0) 문서 요약

- 목표: Upbit·거래소·외부 API 응답을 신뢰 경계(boundary)에서 검증하고, 런타임 예외보다 **표준 에러 모델**을 우선 운영한다.
- 1차 범위: `REST` 응답(`success/data`), `WebSocket` 메시지(`snapshot/delta`), 내부 전달 DTO 3레벨에서 일관된 파싱/정규화 수행.
- 원칙:
  1. 경계마다 파싱은 중앙화한다.
  2. `safeParse` 결과는 `Parsed<T> = { ok: true; data } | { ok: false; error }`로 통일한다.
  3. 실패는 조용히 swallow하지 않고, `NormalizedError`로 표준화해 상위로 전파한다.
- 최종 상태: 구현 가능한 개발 티켓으로 바로 분할 가능하도록 `Phase`, `P0~P2 우선순위`, `체크리스트` 반영.

## 1) 현재 문서 문제점(검토) 및 수정 방향

### 1-1. 문제점
- 문자 인코딩이 깨져서 문서 가독성이 떨어짐(실행 기준 혼선).
- 일부 섹션에서 문장 단위가 불완전하거나 중복되어 의사결정 속도 저하.
- `strict / passthrough / partial` 사용 근거가 뒤섞여 적용 규칙이 불명확함.
- `server`와 `web`의 책임 분리가 선언적이지만, 실제 산출물(TS 시그니처, 파일 경로)이 일부 불일치.
- Phase별 소요 시간과 산출물이 명시되어 있으나, 완료 조건과 테스트 트리거가 약함.

### 1-2. 수정 원칙
- 용어와 규칙을 분리: **외부 수신 데이터 파싱(관문)**, **내부 DTO 정합성(코어)**, **UI 유효성(렌더링 경계)**.
- 문서 전체를 “고수준 계획 → 실행 가능한 인터페이스 → 검증/운영지표”로 정렬.
- 중복되는 체크를 제거하고, 누락/애매한 항목을 고정값으로 보강(예: 에러 코드, 재시도 규칙, 수용 기준).

## 2) 최종 아키텍처(요약)

- `web`:
  - REST 호출은 `api-client`에서 공통 파싱
  - WS 메시지는 `ws-client`에서 `message schema` 적용 후 채널별 라우팅
  - Pinia는 UI 상태만 유지(원시 원천 데이터(raw) + 검증 결과를 분리 저장)
- `server`:
  - Upbit(및 내부 API) 응답은 라우트 레벨에서 envelope 표준 준수
  - route handler는 `parseWithSchema` 실패 시 4xx/5xx를 일관되게 반환
  - 민감한 계산값은 `normalized dto`로만 내려줌
- 공통:
  - 공통 `zod` 스키마는 `shared/validation`에 배치
  - 에러 코드 집합은 시스템 전체 공통(`NormalizedErrorCode`) 사용

## 3) 핵심 규격(확정)

### 3-1. API Envelope

- `ApiEnvelope<T>`
  - `success: true, data: T, requestId?: string, timestamp?: number`
  - `success: false, code: string, message: string, detail?: unknown, requestId?: string, timestamp?: number`
- 서버는 원칙적으로 `success/data`만 내보내되, `error`는 200 응답 본문 또는 HTTP 실패 코드와 함께 제공 가능.

### 3-2. WS Envelope

- `WsEnvelope<T>`
  - `channel: string`
  - `type: 'snapshot' | 'delta' | 'ping' | 'error' | 'unknown'`
  - `payload: T`
  - `provider: string`
  - `ts?: number`

### 3-3. 정규화 에러

- `source`: `'http' | 'websocket' | 'worker' | 'internal'`
- `code`: `'VALIDATION_ERROR' | 'SCHEMA_MISMATCH' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UPSTREAM_ERROR' | 'RATE_LIMIT'`
- `message`: 사용자/개발자 안내 가능한 메시지
- `detail`: 원시 응답 일부(PII 제거)
- `path`: 검증 실패 경로
- `retryable`: boolean
- `provider`: providerId(optional)

### 3-4. 파싱 규약

- `parseWithSchema<T>(schema, input, source)` 반환: `Parsed<T>`
- 내부 DTO는 기본 `strict` 지향.
- 외부 응답 원시 구조는 초기 단계에서 `passthrough`를 허용해 상위 필드 추가분 보존 후 정규화.
- 문자열 수치, 날짜, ID 등은 coercion 또는 preprocess로 정규화(`z.coerce.number`, `z.preprocess`)한 뒤 내부 타입 통일.

## 4) 기능 요구사항 정비

### 4-1. 기능(Functional)
- F-1: `web/server`의 모든 외부 응답은 파싱된 타입으로만 처리.
- F-2: WS와 REST 모두 `safeParse` 기반 실패 처리.
- F-3: 모든 검증 실패는 `NormalizedError`로 변환해 로그+메트릭.
- F-4: UI는 `success/data`와 에러를 분리 렌더링(`ValidationHealth`, `data stale`, `fallback`).
- F-5: 파싱 실패율과 재시도 이벤트를 실시간 모니터링.

### 4-2. 비기능(Non-functional)
- N-1: 기본 응답은 구조 보존 + deep clone 비용 최소화(불필요 변환 지양).
- N-2: 에러 파싱 비용이 핵심 경로 지연을 넘지 않도록 파싱 캐시/재사용 고려.
- N-3: unknown field 허용 정책과 strict 정책은 경계 레이어별로 분리해 운영.
- N-4: 로그에는 원시 페이로드를 통째로 남기지 않고, 정규화된 요약(`sample`) 저장.

## 5) 서버/웹 책임 분리(권장)

### 5-1. server(권장)
- route/request-response는 envelope 유지 및 실패 코드 표준화
- Upbit/외부 API 응답 파싱은 서버에서 1차 필터링
- 비즈니스 규칙 실패와 스키마 실패를 별도 코드로 분리

### 5-2. web(권장)
- 서버가 제공한 envelope를 재확인하고, UI용 DTO로 2차 안전 변환
- WS 이벤트도 동일 스키마 파싱 체인 통과 후 상태 반영
- 실패가 발생해도 화면은 “부분 표시 + stale 표시 + 수동 새로고침” 처리

## 6) 공통 스키마 설계 가이드

### 6-1. `strict` vs `passthrough`
- 외부 응답 수신: 기본 `passthrough` + `.superRefine`으로 최소 필드/타입 보장
- 내부 비즈니스 DTO: `strict` + 선택적 필드 규칙 명확화
- `partial`은 입력 소스가 빈도 높거나 optional 필드가 많은 곳에서만 사용

### 6-2. `unknown` 필드 처리
- 보존이 필요한 원인(디버깅, 호환성)이 있으면 `_raw`에 제한 저장.
- 영구 저장 DTO에 unknown 그대로 주입 금지.

## 7) 구현 템플릿(실제로 붙일 최소 코드)

```ts
export type Parsed<T> =
  | { ok: true; data: T }
  | { ok: false; error: NormalizedError }

export function parseWithSchema<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  source: NormalizedError['source']
): Parsed<T> {
  const result = schema.safeParse(input)
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, error: toNormalizedError({ source, zodError: result.error, input }) }
}
```

```ts
axios.interceptors.response.use(
  (res) => {
    const parsed = parseWithSchema(apiEnvelopeSchema, res.data, 'http')
    if (!parsed.ok) {
      throw new ApiValidationError(parsed.error)
    }
    return parsed.data
  },
  (err) => Promise.reject(normalizeHttpError(err))
)
```

```ts
source$.pipe(
  map((msg) => parseWithSchema(wsMessageSchema, msg, 'websocket')),
  filter((r): r is Extract<Parsed<WsMessage>, { ok: true }> => r.ok),
  map((r) => r.data),
  catchError((err) => handleWsError(err))
)
```

## 8) 폴더/파일 산출물(구현 단위)

```text
web/
  src/
    shared/
      validation/
        schemas/
          api/
          ws/
          domain/
        error/
          code.ts
          normalized-error.ts
        parse.ts
      http/
        api-client.ts
      ws/
        ws-client.ts
        message-router.ts
    stores/
      validation-health.ts
      market.ts
    components/
      DebugValidationPanel.vue

server/
  src/
    shared/
      validation/
        schemas/
          api/
          domain/
        parse.ts
        normalized-error.ts
        code.ts
    modules/
      market/
        service.ts
        schema.ts
        dto.ts
    routes/
      market.ts
```

## 9) 단계별 구현 계획(수정본)

### Phase 0 (0.5주, P0)
- `zod` 의존성 정합성, 공통 타입 파일 기본 구조
- `NormalizedError`, `parseWithSchema`, `ApiEnvelope/WsEnvelope` 스키마 설계
- `docs/zod-guidelines.md` 초안 작성

### Phase 1 (1주, P0)
- web `api-client.ts`에 safeParse 통합
- REST 공통 에러 normalizing
- `success/data` envelope 적용 및 실패 코드 정규화

### Phase 2 (1주, P1)
- REST 도메인 스키마 적용
  - ticker, orderbook, trade, candle, balance/asset(필요시)
- REST endpoint별 파싱 실패 처리(로깅 + fallback)

### Phase 3 (1~2주, P1)
- WS 메시지 라우터에 스키마 체인 적용
- snapshot/delta 핸들링 분리, 채널 재구독 정책 수립
- `validationHealth` 상태스토어 작성

### Phase 4 (1주, P1~P2)
- UI 연동
  - mismatch/invalid 상태 시 컴포넌트 표시
  - 에러 토스트·배너·로그 패널

### Phase 5 (1주, P2)
- 운영 강화
  - mismatch ratio 경보 임계치 적용
  - runbook(장애 대응) 1차 완성
  - SLO/SLA 기준 보고서 양식 적용

## 10) 에러/폴백 정책(구체)

### 10-1. 공통 에러코드 우선순위
- `RATE_LIMIT`: 요청 제한 우선 처리 후 backoff + 1분간 cooldown
- `SCHEMA_MISMATCH`: 즉시 알림 + 해당 채널 fail-open/hold-last-value
- `NETWORK_ERROR`: 3회 retry 후 실패 표기
- `TIMEOUT`: 1회 즉시 재시도, 이후 exponential backoff
- `UPSTREAM_ERROR`: provider 격리 판단 필요 시 fallback provider 전환

### 10-2. 채널별 fallback
- market: primary 실패 시 backup provider → stale cache
- derivatives: primary 실패 시 backup → null + stale flag
- meta: primary 실패 시 backup → 기존 메타 유지

## 11) 테스트/리뷰 포인트(완료 기준)

- REST/WS 핵심 endpoint 100% `parseWithSchema` 적용.
- `schema mismatch`가 없는 경우를 기준으로 통신 성능 저하 없는지 측정.
- WS reconnect:
  - 첫 실패 후 3초 내 1차 재연결
  - 3회 연속 실패 시 REST 보강 모드 전환
- 모니터링:
  - mismatch ratio < 0.5% (7일)
- 회귀:
  - API mock 3종(정상, 필드 누락, 타입 틀림) 통과
  - WS invalid payload 대응 통합 테스트 통과

## 12) 수용 기준(Acceptance)

1. web/server 전 구간에서 `success/data` 또는 `error`가 명시되지 않은 응답이 UI/서비스로 전달되지 않음.
2. 파싱 실패가 발생해도 process crash 없이 `NormalizedError` 경로로 수렴.
3. 재시도/폴백 규칙이 문서에 명시된 대로 자동 수행.
4. mismatch 발생 시 `DebugValidationPanel`에서 실시간 추적 가능.
5. 배포 전 `zod-planning.md`와 구현 코드 간 `체크리스트 90% 이상` 일치.

## 13) 리스크 및 대응

- 과도한 strict: 실제 API 변경에 민감하여 장애 빈도 증가 가능 → `v1`은 `passthrough` 완화 후 모니터링.
- 비용 증가: `safeParse` 오버헤드 → 핵심 payload만 우선 적용하고 점진 확대.
- 팀 운영: schema 변경 협의 지연 → 변경 PR 템플릿에 스키마 diff/영향 API 명시 의무화.

## 14) 2주차 실행용 체크리스트(바로 착수)

- [x] `web`와 `server`의 `zod` 의존성 및 `validation` 공용 타입 추가
- [x] `ApiEnvelope`, `NormalizedError`, `parseWithSchema` 구현
- [x] `web/src/shared/http/api-client.ts`에 공통 파싱 적용
- [x] `web/src/workers/pipeline.ts`에 메시지 파싱 적용
- [x] `server/src/shared/validation/parse.ts` 적용 후 market 라우트에 통합
- [x] mismatch/재시도/폴백 로그 지표 기본 대시보드 등록
- [x] docs: 업데이트된 수용 기준/에러정책/운영 runbook 반영

## 15) 다음 단계(요청 반영)

이 문서는 다음 단계로 바로 이어집니다.
1. 실행 티켓(CBR 스타일)로 분해
2. provider/기능별 `schema-by-domain` 상세 리스트 작성
3. 스테이징 실패 시나리오 기반 테스트 케이스 20개 이상 도출

## 16) 실행 티켓(CBR 스타일, 즉시 발행용)

- CBR-ZOD-1101 `공통 검증 스켈레톤 구축`
  - 목표: `web`과 `server`에서 공통으로 쓰는 `NormalizedError`, `Parsed<T>`, `parseWithSchema`를 통합
  - 산출물: `web/src/shared/validation/*`, `server/src/shared/validation/*`
  - 수용 기준: 파싱 실패 시 예외 없이 `ok:false` 경로로 종결

- CBR-ZOD-1102 `API Envelope 표준화`
  - 목표: `ApiEnvelope<T>`와 `WsEnvelope<T>`를 단일 규격으로 문서-구현 정합화
  - 산출물: `web/src/shared/validation/schemas/api/api-envelope.ts`, `server/src/shared/validation/schemas/api/api-envelope.ts`
  - 수용 기준: 현재 `success/data` 및 에러 형식에서 서로 다른 응답이 1건도 남지 않음

- CBR-ZOD-1103 `웹 HTTP 파서 통합`
  - 목표: Axios interceptor에서 envelope 검증 및 에러 정규화 통합
  - 산출물: `web/src/shared/http/api-client.ts`
  - 수용 기준: 모든 `GET /api/*` 호출이 `Parsed<T>` 경로만 통과

- CBR-ZOD-1104 `웹 WS 메시지 파싱 도입`
  - 목표: 채널 메시지를 `wsMessageSchema`로 파싱하고 mismatch를 상태 저장소로 전달
  - 산출물: `web/src/shared/ws/ws-client.ts`, `web/src/shared/ws/message-router.ts`
  - 수용 기준: invalid payload가 UI 상태를 직접 오염하지 않음

- CBR-ZOD-1105 `검증 상태 스토어`
  - 목표: `validationHealth`, `stale`, `mismatchRate`를 화면에서 관측 가능한 상태로 노출
  - 산출물: `web/src/stores/validation-health.ts`
  - 수용 기준: 최근 1분 mismatch ratio가 0 이상 표시되고 추적 가능

- CBR-ZOD-1106 `server 라우트 파싱 정책`
  - 목표: route handler에서 response schema를 서버 경계에서 1차 보증
  - 산출물: `server/src/modules/market/service.ts`, `server/src/modules/market/dto.ts`, `server/src/routes/market.ts`
  - 수용 기준: 스키마 불일치 시 4xx 또는 5xx + 표준 에러 반환

- CBR-ZOD-1107 `도메인별 스키마 분해`
  - 목표: market/ws/error/domain schema를 도메인 단위로 분리
  - 산출물: `market.ticker.schema.ts`, `market.orderbook.schema.ts`, `market.candle.schema.ts`, `ws.ticker.schema.ts`, `ws.orderbook.schema.ts`
  - 수용 기준: 각 schema 수정 시 영향도 범위가 파일 단위로 제한

- CBR-ZOD-1108 `에러 코드 정책 반영`
  - 목표: `RATE_LIMIT/NETWORK/SCHEMA_MISMATCH/UPSTREAM` 계열 에러별 action map 고정
  - 산출물: `web/src/shared/validation/error/code.ts`, `server/src/shared/validation/code.ts`
  - 수용 기준: 로그/알람에서 에러 코드 기반 자동 대응 가능

- CBR-ZOD-1109 `서버·웹 파싱 단위 테스트`
  - 목표: 정상/누락/형식오류 3종으로 safeParse 동작 검증
  - 산출물: `web/tests/validation/*`, `server/tests/validation/*`
  - 수용 기준: 실패 케이스에서 throw 대신 정규화 에러 반환 확인

- CBR-ZOD-11010 `재시도·폴백 관측`
  - 목표: mismatch rate, reconnect, fallback 횟수 지표 수집
  - 산출물: `web/src/stores/validation-health.ts`, 모니터링 대시보드
  - 수용 기준: 장애 임계치 3개 이상의 알람 테스트 통과

- CBR-ZOD-11011 `UI 오류 가시성`
  - 목표: 에러 뱃지, source tag, stale 표시를 화면으로 노출
  - 산출물: `web/src/components/DebugValidationPanel.vue`, 핵심 페이지 연동
  - 수용 기준: mismatch 1건 이상 시 유저가 식별 가능한 표시 제공

- CBR-ZOD-11012 `운영 runbook`
  - 목표: WS 끊김, mismatch 급증, 스키마 drift 대응 문서 완성
  - 산출물: `docs/incident-runbook.md`, `docs/zod-guidelines.md` 업데이트
  - 수용 기준: 장애 재현 3단계 플로우가 문서상으로 완성

## 17) domain별 schema-by-domain 표준 목록

### 17-1. API(domain)
- `api-envelope.schema.ts`
- `ticker.schema.ts`
- `orderbook.schema.ts`
- `trade.schema.ts`
- `candle.schema.ts`
- `asset.schema.ts`
- `portfolio.schema.ts`
- `error.schema.ts`

### 17-2. WS(domain)
- `ws-envelope.schema.ts`
- `ws-ticker.schema.ts`
- `ws-orderbook.schema.ts`
- `ws-trade.schema.ts`
- `ws-candle.schema.ts`
- `ws-ping.schema.ts`

### 17-3. 공통(domain)
- `provider.schema.ts`
- `precision.schema.ts`
- `currency.schema.ts`
- `canonical-symbol.schema.ts`
- `timestamp.schema.ts`

### 17-4. 경계별 배치 위치
- web path: `web/src/shared/validation/schemas/api`, `.../schemas/ws`, `.../schemas/domain`
- server path: `server/src/shared/validation/schemas/api`, `.../schemas/domain`
- 도메인 경로: `market`, `account`, `order`, `meta`

## 18) 테스트 케이스 카탈로그(최소 20건)

### 18-1. API 파싱(1~7)
1. API Envelope success 정합 케이스
2. API Envelope error 형식 정합 케이스
3. 필수 필드 누락 케이스
4. 데이터 타입 불일치 케이스
5. 문자열 수치 coercion 케이스
6. provider raw extra 필드 허용 케이스
7. unknown endpoint 응답 실패 케이스

### 18-2. WS 파싱(8~14)
8. snapshot 타입 정합 케이스
9. delta 타입 정합 케이스
10. 채널 unknown 타입 처리 케이스
11. malformed JSON 처리 케이스
12. 타임스탬프 단위 혼용 케이스(ms/s)
13. payload 누락 케이스
14. payload 추가 필드(pass-through) 케이스

### 18-3. 재시도/폴백(15~20)
15. HTTP 429 시도 횟수 제한 케이스
16. WebSocket 3회 연속 장애 fallback 케이스
17. schema mismatch 연속 발생시 hold-last-value 케이스
18. provider failover 전환 케이스
19. 복구 후 3회 성공 시 primary 복귀 케이스
20. 정상 + 실패 payload 혼재 스트림 처치 케이스

### 18-4. 운영지표(21~24)
21. mismatch ratio 임계치 초과 알람 케이스
22. stale 상태 감지 UI 표시 케이스
23. retryable=false 에러는 즉시 실패 처리 케이스
24. raw 에러 로그 sample 제한 저장 케이스

## 19) 1주차/2주차/3주차 운영 분해

- 1주차
  - CBR-ZOD-1101, 1102, 1103, 1109 수행
- 2주차
  - CBR-ZOD-1104, 1105, 1106, 1107, 1109 수행
- 3주차
  - CBR-ZOD-1108, 11010, 11011, 11012 수행

## 20) 바로 다음 작업 제안(결정 필요)

1. `tickets`만 뽑아 GitHub Issue 템플릿 형태(CSV/Markdown)로 변환할까요?
2. `schema-by-domain` 목록을 기준으로 실제 파일 1차 스캐폴딩을 바로 만들어드릴까요?
3. 실패 시나리오 24건 중 우선순위 8건으로 축소해 E2E 우선 실행 계획만 먼저 만들어드릴까요?
