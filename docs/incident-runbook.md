# CoinBurrow Incident Runbook

작성일: 2026-06-22

## 적용 범위

- REST envelope 검증 실패
- Upbit REST/WS schema mismatch
- WebSocket 재연결 반복
- stale 데이터 또는 fallback 상태 지속

## 공통 원칙

- 원시 payload 전체를 로그나 UI에 노출하지 않는다.
- 외부 API 실패는 `NormalizedError`로 수렴시킨다.
- 화면은 마지막 정상값을 유지하되 `stale` 상태를 표시한다.
- 복구 전까지 schema를 완화할 때는 외부 수신 schema만 `passthrough`로 조정한다.

## 장애 분류

| Code | 주요 원인 | 즉시 조치 |
| --- | --- | --- |
| `SCHEMA_MISMATCH` | Upbit 필드 변경, 타입 변경, malformed frame | 최근 배포와 upstream 변경 여부 확인, 해당 채널 hold-last-value |
| `RATE_LIMIT` | Upbit 요청 제한 | 호출 빈도 확인, 1분 cooldown, WS 우선 사용 |
| `NETWORK_ERROR` | 네트워크/Mock dispatch/연결 실패 | 재시도 횟수 확인, provider 상태 확인 |
| `TIMEOUT` | upstream 지연 | 1회 즉시 재시도 후 backoff |
| `UPSTREAM_ERROR` | 5xx, redirect, 비정상 upstream 응답 | provider 상태 확인, fallback 가능 여부 판단 |
| `VALIDATION_ERROR` | 잘못된 query 또는 내부 입력 | 요청 파라미터와 UI action 확인 |

## 대응 절차

1. `DebugValidationPanel`에서 `Mismatch`, `Rate`, `Retry`, `Fallback`, `Stale` 상태를 확인한다.
2. `SCHEMA_MISMATCH`가 증가하면 최신 이벤트의 `source`, `code`, `path`를 확인한다.
3. REST 문제이면 서버 route와 Upbit REST schema를 확인한다.
4. WS 문제이면 `web/src/workers/pipeline.ts`와 `web/src/shared/validation/schemas/ws/upbit.ts`를 확인한다.
5. 정상 payload 샘플 1건과 실패 payload 요약을 비교한다.
6. 외부 필드 추가만 원인인 경우 외부 수신 schema는 `passthrough`를 유지하고 내부 DTO schema는 변경하지 않는다.
7. 필수 필드명 또는 타입 변경이면 domain DTO schema와 normalize mapping을 함께 수정한다.
8. 복구 후 `npm test`와 `npm run build`를 통과시킨다.

## WebSocket 3회 장애 플로우

1. 첫 disconnect: worker가 3초 후 재연결한다.
2. `validationHealth.reconnectCount`가 증가하면 화면은 `stale`로 전환된다.
3. 3회 이상 반복되면 REST snapshot으로 화면을 보강한다.
4. 정상 frame이 다시 들어오면 stale 여부를 수동으로 해제하거나 다음 정상 동기화에서 해제한다.

## Schema Drift 재현

1. `web/test/pipeline.test.ts`에 invalid known payload 케이스를 추가한다.
2. `server/test/upbit-rest.test.ts`에 malformed Upbit 200 응답 케이스를 추가한다.
3. 실패가 throw로 새지 않고 `SCHEMA_MISMATCH` envelope 또는 `validation-error`로 수렴하는지 확인한다.

## 배포 전 체크

- `npm test`
- `npm run build`
- `docs/zod-planning.md` 체크리스트 확인
- 신규 schema가 외부 수신 schema인지 내부 DTO schema인지 명시
- 응답 body에 upstream path, raw error message, 원시 payload 전체가 포함되지 않는지 확인
