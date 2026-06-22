# CoinBurrow Flutter Architecture & Native Setup Guide (통합 문서)

> 최종 수정 기준: 2026-06-22  
> 문서 목적: **CoinBurrow 프로젝트를 네이티브 앱(Flutter)으로 안정적으로 구축하기 위한 설계 + 실행 체크리스트**
> 대상: 기능 개발자, 앱 팀 리드, 인프라/CI 담당자

## 1) 이 문서 하나만 사용한다

이 문서는 CoinBurrow 프로젝트에서 Flutter로 앱을 구성할 때,  
`아키텍처 설계`, `환경 설정`, `의존성`, `개발 순서`, `진행 중 사이드이펙트 점검`을 한 번에 관리하기 위한 단일 가이드입니다.

### 핵심 원칙

- React Native처럼 JS 브릿지 비용은 상대적으로 적지만, **네이티브 의존성·플랫폼 정책·코드 서명·메모리/성능 문제는 반드시 선제 점검**해야 한다.
- Flutter는 기본 생산성은 높지만, 아키텍처가 무너지면 유지보수 비용이 급격히 증가한다.
- CoinBurrow는 **기존 웹 스택의 대응 관계를 잃지 않는 상태관리/반응형/실시간 처리 모델**을 유지한다.

---

## 2) 아키텍처 정합성: 세 가지 계층 + 상태 규격

### 2-1. Presentation Layer (UI/UX)

**책임**

- 화면 렌더링, 사용자 입력 수집, 사용자에게 보여질 상태(`loading/empty/error/success`)만 관리
- 도메인 모델을 UI에 직접 노출하지 않고, 화면에 맞는 뷰모델/상태로 매핑

**구성 예시**

- `page`, `widget`, `controller/notifier`, `state`
- 입력 검증, 포맷팅, 피드백 노출, 라우팅 트리거

### 2-2. Application / Domain Layer

**책임**

- `UseCase` 또는 `Interactor` 중심의 비즈니스 유스케이스(로그인, 주문, 잔고 조회 등) 정의
- 규칙(Validation, Permission Rule, 정책 분기) 적용
- 외부 API를 직접 호출하지 않고 Repository 인터페이스를 통해 데이터 계층에 위임

### 2-3. Data Layer

**책임**

- API, WebSocket, 로컬 캐시, DB 저장, 파일 I/O
- DTO ⇄ Domain 모델 변환
- 장애 시 대체경로(fallback)와 만료 정책(TTL, stale-while-revalidate)

### 2-4. 추천 상태 규약

- `Result<T, Failure>` 또는 유사한 타입으로 성공/실패를 강제
- 실패 유형을 UI에서 가시화:
  - `NetworkFailure`
  - `ValidationFailure`
  - `AuthFailure`
  - `UnknownFailure`

---

## 3) CoinBurrow 환경 스택 매핑 (기존 스택에서 Flutter로)

| 기존 구성 | Flutter 대응 | 이유 |
| --- | --- | --- |
| Pinia | Riverpod + codegen | 상태/DI/유닛테스트 용이성 |
| RxJS | rxdart + Stream 기반 조합 | 비동기 체인 제어와 backpressure 제어 |
| Web Worker | `Isolate.run`, `compute` | CPU 비용 큰 JSON 가공 분리 |
| WebSocket (Upbit) | `web_socket_channel` | 실시간 스트림 안정 수집 |
| Fastify REST | `dio` + interceptor/retry | timeout/retry/token/에러 통합 |
| Highcharts | `syncfusion_flutter_charts` 또는 `k_chart_plus` | 캔들/볼륨/깊이차트 대응 |
| Vue Router | `go_router` | 선언적 라우팅, deep link/권한 가드 |
| Intl.NumberFormat | `intl` (`ko_KR`) | 로컬 통화/숫자 포맷 |

---

## 4) 권장 의존성 (Flutter 3.44 / Dart 3.12 기준)

```yaml
environment:
  sdk: ^3.12.0
  flutter: ">=3.44.0"

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.6.0
  riverpod_annotation: ^2.6.0
  rxdart: ^0.28.0
  web_socket_channel: ^3.0.0
  dio: ^5.7.0
  freezed_annotation: ^3.0.0
  json_annotation: ^4.9.0
  go_router: ^14.0.0
  intl: ^0.20.0
  syncfusion_flutter_charts: ^27.0.0

dev_dependencies:
  build_runner: ^2.4.0
  riverpod_generator: ^2.6.0
  freezed: ^3.0.0
  json_serializable: ^6.8.0
```

> 네이티브 앱 프로젝트는 의존성 충돌이 가장 늦게 드러나는 영역입니다.  
> `flutter pub upgrade --major-versions`은 새 feature 브랜치에서만 수행하고, 메인 브랜치에는 안정 버전만 반영하세요.

---

## 5) 네이티브 앱 사전 체크리스트 (반드시 시작 전 완료)

아래 항목은 개발 시작 전 사용자에게 확인·확인받고 기록해야 합니다.

### 5-1. 공통 개발환경

- [ ] OS: Windows 기준 `git`, `PowerShell`, `터미널 UTF-8`, 관리자 권한 정책 점검
- [ ] Flutter SDK: `flutter --version`이 팀 기준(`>=3.44.0`)인지
- [ ] Dart SDK: 위와 일치 (`3.12.x`)
- [ ] JDK: Android toolchain 요구사항 충족(Gradle와 호환되는 버전)
- [ ] Git hooks(권장): `pre-commit`에 format/analysis 체크 존재 여부
- [ ] 플러그인 설치:
  - `flutter_riverpod`, `freezed`, `json_serializable`
  - `syncfusion_flutter_charts`, `web_socket_channel`, `dio`
- [ ] 저장소 분기 전략: `main`, `develop`, `release` 분기 정책

### 5-2. Android 네이티브 점검

- [ ] Android Studio 설치 및 Android SDK Platform version 최신 안정화 여부
- [ ] Android NDK/Gradle plugin 호환성
- [ ] 테스트 디바이스/에뮬레이터(권장 최소 2종):
  - API 30+ 폰
  - API 34+ 폰(또는 최신)
- [ ] 필요한 권한 선언 계획:
  - 인터넷, 백그라운드 동작 필요 시 `foreground service`
  - 알림, 배터리 최적화 예외(필요 시)
- [ ] 64bit ABI 포함 여부(arm64-v8a 등)
- [ ] 앱 크래시 추적용 로그 수집 경로 결정

### 5-3. iOS 네이티브 점검

- [ ] Xcode/Command Line Tools 설치
- [ ] CocoaPods 설치 및 `pod repo update` 상태
- [ ] `ios/Podfile` 최소 iOS deployment target 설정
- [ ] 앱 ID/Team/Bundle ID 정합성
- [ ] APNs(푸시 필요 시) 키/인증서 준비
- [ ] ATS(HTTP 보안 정책) 검사: 외부 API가 HTTPS인지
- [ ] TestFlight/앱스토어 배포 절차 이해

### 5-4. 보안 및 데이터 점검

- [ ] HTTPS 강제, 토큰 저장 전략(secure storage/암호화 정책) 결정
- [ ] 로그에서 민감 정보 마스킹 규칙 합의
- [ ] API키·시크릿은 `.env`/CI 시크릿 관리(소스 커밋 금지)
- [ ] 법적 동의(개인정보/금융 규정) 처리 책임자 지정

### 5-5. 운영 전 검증 시나리오(사용자 승인 필요)

- [ ] 최초 로그인/세션 만료/재로그인 흐름 수동 QA
- [ ] 실시간 시세 수신 24시간 안정성 점검(자동 끊김 복구 포함)
- [ ] 저전력/네트워크 불안정에서 재접속 동작 확인
- [ ] 앱 전면 종료/백그라운드에서 복귀 시 상태 정합성 확인

---

## 6) 프로젝트 시작 템플릿 (권장 실행 순서)

1. Flutter 앱 생성 및 CI 기본 환경 맞춤
   - `flutter create --org com.coinburrow coinburrow_app`
   - `fvm` 사용 여부 결정(팀 공통 권장)
2. `lib` 폴더 아키텍처 고정
3. 공통 에러/결과 타입(`Failure`, `Result`)부터 정의
4. DI 및 라우팅 루트(`go_router`) 설정
5. API 클라이언트(`dio`)와 인터셉터(헤더/리트라이) 구성
6. 첫 Feature를 1개 택해 End-to-End PoC 구축 (로그인 우선)
7. WebSocket/캐시 정책 적용 후 잔액/시세 페이지 확장

---

## 7) 추천 폴더 구조

```text
lib/
  features/
    auth/
      presentation/   # page/widget/controller
      application/    # usecase/state/notifier
      domain/         # entity/usecase/repository interface/failure
      data/
        datasource/
        dto/
        mapper/
        repository_impl/
  core/
    error/
    network/
    di/
    theme/
    router/
    l10n/
  shared/
    widgets/
    extensions/
    utils/
```

---

## 8) 상태관리 전략(기본값: Riverpod)

### 왜 Riverpod인가?

- DI와 상태를 분리한 구조로 테스트/교체가 쉽다.
- feature별 provider graph를 관리해 대형 화면에서 상태 누수 방지에 유리하다.
- codegen으로 provider 타입 안정성 및 반복 코드를 줄일 수 있다.

### 컨트롤러 작성 패턴(최소 규격)

- 각 기능당 `Notifier` 또는 `AsyncNotifier` 한 개
- 외부 의존은 생성자 주입
- UI 상태는 UI에서 필요한 값만 노출 (Entity 전체 노출 금지)
- 중복 이벤트는 `debounce` 처리

---

## 9) 네이티브 특화 사이드이펙트 가이드 (가장 중요)

### 9-1. 성능/메모리

- [ ] 대용량 JSON/차트 데이터를 UI 스레드에서 직접 파싱하는지 점검
  - 대형 배열은 isolate로 분리
- [ ] WebSocket 수신량이 많은 화면에서 렌더 과도 발생 시 `throttle/debounce` 적용
- [ ] `setState`보다 상태 객체 갱신 최소화(불필요 rebuild 방지)
- [ ] 이미지/차트 캐시 정책 설정 안 한 채 실시간 UI를 돌리지 않기

### 9-2. 네트워크/실시간

- [ ] 연결 끊김/재연결 백오프 전략 존재 여부
- [ ] WebSocket 채널 재구독 중복 방지(구독 누수 검출)
- [ ] 앱 백그라운드 전환 시 정리(cleanup) 로직 없음 시 메모리 누수 가능
- [ ] 중복 REST 호출 방지 (`distinct`/`memo` 적용)

### 9-3. 인증/보안

- [ ] 토큰 갱신 시점 race-condition 방지(동시 refresh 방지 락)
- [ ] 세션 만료 시 모든 화면에서 일괄 sign-out 처리
- [ ] 안드로이드/아이폰 로그에서 토큰/민감정보 노출 검사

### 9-4. 크로스 플랫폼 차이

- [ ] iOS는 ATS 정책, App Transport Security 위반 여부 점검
- [ ] Android는 배터리 최적화 정책으로 백그라운드 알림이 중단되는지 확인
- [ ] 키보드/입력 포맷, 폰트 크기, 기기별 해상도 동작 확인

### 9-5. UI/UX 위험

- [ ] 네비게이션 중복 호출 금지 (연타/동시 탭)
- [ ] 에러 화면에서 재시도 동작이 중복 실행되지 않도록 debounce
- [ ] 금액/잔액 포맷 규칙 일관성(`intl`) 강제

---

## 10) 실행 중 체크리스트(개발자용, 작업 단위 끝마다)

작업이 끝날 때마다 아래 체크를 수행하면 사이드이펙트 누수를 줄일 수 있다.

- [ ] 변경한 상태가 화면에 필요한 범위만 갱신되는가?
- [ ] 새 API 응답이 Domain Entity로 안전하게 매핑되었는가?
- [ ] 실패 타입이 UI로 올바르게 전달되는가?
- [ ] 로컬 캐시 fallback 동작이 의도대로인지?
- [ ] 네트워크 재시도/타임아웃 규칙이 과도하지 않은가?
- [ ] 로그/분석 이벤트가 민감정보를 출력하지 않는가?
- [ ] 테스트/Manual QA 없이 코드가 merge 되지 않도록 게이트 동의했는가?

---

## 11) 테스트/검증 기준 (권장)

### 단위/도메인

- UseCase, Mapper, Failure 변환, Validator

### Widget

- 화면별 상태 전이(loading/error/success) 테스트

### 통합

- API 모킹 + WebSocket fake + 재연결/타임아웃 시나리오

### E2E(필수)

- 로그인 → 시세 조회 → 주문 등록 → 주문 취소 흐름
- 앱 종료/백그라운드/재시작 복원성

---

## 12) 릴리즈 전 점검

- [ ] `flutter build apk` / `flutter build appbundle` / `flutter build ios --release`
- [ ] Proguard/R8, 코드 난독화 정책 검토(필요 시)
- [ ] 앱 서명 키, key alias, key password, CI 비밀값 관리
- [ ] Crash report 라우팅(공통 태깅: feature/route/state)
- [ ] 알림 클릭, deep link 이동, 권한 정책 재확인
- [ ] 출시 후 24시간 모니터링 플랜(크래시율, 리트라이율, 재접속률)

---

## 13) 사용자에게 진행 전 요청해야 할 항목 (필수 확인 문구)

개발 착수 전에 반드시 사용자에게 아래 질문에 대한 답을 받아야 한다.

- 배포 대상은 **iOS만/Android만/동시** 중 어느 조합인가?
- 실시간 데이터 중단 시 어느 정도 허용 범위를 둘 것인가?
- 푸시/백그라운드 동작(알림 포함)이 필요한가?
- 앱 권한 중 우선 동의해야 할 항목(알림, 위치, 저장소)이 무엇인가?
- 장애 대응 SLA: 주문 실패/시세 지연/로그인 실패 시 사용자 알림 정책은?

이 확인이 끝나지 않으면 다음 단계(인증/차트/주문 플로우)로 넘어가지 않도록 한다.

---

## 14) 초기 구현 예시(권장 Feature 순서)

1. `auth`  
   로그인/토큰/세션 갱신
2. `market`  
   시세 조회(REST) + 실시간(WebSocket)
3. `order`  
   주문/취소/내역 캐시 일관성
4. `wallet/asset`  
   잔고 조회 + 실시간 반영
5. `chart`  
   캔들/호가/거래량 시각화

각 feature는 반드시 `domain -> application -> data -> presentation` 순으로 끝까지 마감해야 한다.

---

## 15) 참고 링크

- [Flutter release notes](https://docs.flutter.dev/release/release-notes)
- [Dart SDK announcement](https://dart.dev/blog/announcing-dart-3-12)
- [Flutter 공식 문서](https://docs.flutter.dev/)

---

## 16) 한 줄 운영 규칙

**문서 → 체크리스트 → 구현 → 재점검 → 배포**  
이 순서를 지키면 네이티브 앱에서 자주 생기는 사이드이펙트를 조기에 걸러낼 수 있다.
