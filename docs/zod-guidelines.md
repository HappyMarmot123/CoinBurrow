# CoinBurrow Zod Guidelines

작성일: 2026-06-22

## 경계별 규칙

- 외부 REST/WS 수신 schema는 `passthrough`를 기본으로 사용한다.
- 내부 DTO schema는 `strict`를 기본으로 사용한다.
- route handler와 UI store에는 검증되지 않은 `unknown`을 직접 전달하지 않는다.
- `safeParse` 결과는 `parseWithSchema`를 통해 `Parsed<T>`로 통일한다.
- 실패는 `NormalizedError`로 변환하고, 원시 payload 전체를 detail에 넣지 않는다.

## 파일 배치

- Web REST envelope: `web/src/shared/validation/schemas/api`
- Web WS schema: `web/src/shared/validation/schemas/ws`
- Web domain DTO: `web/src/shared/validation/schemas/domain`
- Server REST envelope: `server/src/shared/validation/schemas/api`
- Server domain DTO: `server/src/shared/validation/schemas/domain`
- 에러 코드와 정규화: `*/src/shared/validation/error`

## Schema 선택 기준

| 상황 | 권장 |
| --- | --- |
| Upbit 원본 payload | `passthrough` |
| 서버가 내려주는 DTO | `strict` |
| 화면 store 상태 | `strict` |
| query string | `z.object(...).safeParse` 또는 `parseWithSchema` |
| 숫자 문자열 허용 | `z.coerce.number()`를 schema에 명시 |
| 선택 필드 다수 | 필요한 필드만 optional, 전체 `partial`은 제한 |

## 에러 코드 사용

- `VALIDATION_ERROR`: 사용자가 보낸 query, command, form 입력 오류
- `SCHEMA_MISMATCH`: payload 구조 또는 타입 불일치
- `NETWORK_ERROR`: fetch/request/WebSocket transport 실패
- `TIMEOUT`: timeout 정책이 명시된 요청 실패
- `UPSTREAM_ERROR`: 5xx, redirect, upstream 비정상 응답
- `RATE_LIMIT`: 429 또는 provider rate-limit 신호

## 테스트 기준

- 정상 payload는 `ok:true` 또는 success envelope로 통과해야 한다.
- 필수 필드 누락은 `SCHEMA_MISMATCH`로 수렴해야 한다.
- 타입 불일치는 throw 대신 `NormalizedError`로 변환해야 한다.
- 서버 route 실패 응답은 `{ success:false, code, message }` 형태여야 한다.
- 웹 REST 클라이언트는 `{ success:true, data }`에서 `data`만 반환해야 한다.
- WS invalid payload는 store를 오염시키지 않고 `validation-error`로 분리해야 한다.
