# Crypto Simulator Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation for the authenticated single-user crypto simulator: Supabase auth wiring, Drizzle schema, simulator session API, initial paper account service, and the first My Page route shell.

**Architecture:** This is Plan 1 of the simulator work. It creates the shared auth, database, server route, and frontend session boundaries that subsequent named plans use for order execution, exchange game panels, performance, and history. It keeps existing `/market/*`, `/exchange`, and `/insights` behavior intact.

**Tech Stack:** Vue 3, Vite, Pinia, Vue Router, Fastify, Zod, Vitest, Supabase Auth, Supabase Postgres, Drizzle ORM, postgres-js.

---

## Scope

This plan implements only the simulator foundation.

In scope:

- Add Supabase client setup to `web`.
- Add Supabase service client setup to `server`.
- Add Drizzle schema for profile/account baseline tables.
- Add simulator auth middleware utilities.
- Add `/api/simulator/session`.
- Add first account bootstrap service.
- Add `/mypage` shell and third navigation item.

Out of scope:

- Order execution.
- Portfolio position calculation.
- Investment history UI.
- Exchange game panels.
- Performance charting.
- Time acceleration button.

## File Structure

Create:

- `server/src/db/schema.ts`: Drizzle table definitions for simulator foundation.
- `server/src/db/client.ts`: Drizzle/postgres connection factory.
- `server/src/simulator/errors.ts`: shared simulator error codes and HTTP mapping.
- `server/src/simulator/auth.ts`: Bearer token parsing and Supabase user verification.
- `server/src/simulator/accountService.ts`: initial paper account bootstrap logic.
- `server/src/routes/simulator.ts`: `/api/simulator/session` route.
- `server/test/simulator.auth.test.ts`: auth utility tests.
- `server/test/simulator.account-service.test.ts`: account bootstrap tests.
- `server/test/simulator.routes.test.ts`: Fastify route tests.
- `web/src/lib/supabase.ts`: browser Supabase client.
- `web/src/stores/auth.ts`: Pinia auth/session store.
- `web/src/api/simulator.ts`: simulator API client.
- `web/src/features/mypage/MyPage.vue`: My Page route shell.
- `web/test/app-nav-mypage.test.ts`: nav test.
- `web/test/mypage.test.ts`: route shell test.

Modify:

- `server/package.json`: add Supabase, Drizzle, postgres dependencies.
- `web/package.json`: add Supabase browser dependency.
- `server/src/config.ts`: add required Supabase/DB environment variables.
- `server/src/app.ts`: register simulator routes.
- `web/src/router/index.ts`: add `/mypage`.
- `web/src/components/AppNav.vue`: add My Page navigation link.

Do not commit Markdown files while executing this plan.

---

## Task 1: Add Simulator Dependencies And Config

**Files:**

- Modify: `server/package.json`
- Modify: `web/package.json`
- Modify: `server/src/config.ts`

- [ ] **Step 1: Add dependencies**

Run:

```powershell
npm install @supabase/supabase-js drizzle-orm postgres --workspace server
npm install -D drizzle-kit --workspace server
npm install @supabase/supabase-js --workspace web
```

Expected: `package.json` and `package-lock.json` update without install errors.

- [ ] **Step 2: Write config validation test**

Create `server/test/config.simulator.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

describe('simulator config', () => {
  it('exposes simulator env values when configured', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@localhost:5432/postgres')

    vi.resetModules()
    const { config } = await import('../src/config.js')

    expect(config.supabaseUrl).toBe('https://example.supabase.co')
    expect(config.supabaseServiceRoleKey).toBe('service-role')
    expect(config.databaseUrl).toBe('postgres://user:pass@localhost:5432/postgres')
  })
})
```

- [ ] **Step 3: Run config test to verify it fails**

Run:

```powershell
npm run test --workspace server -- config.simulator.test.ts
```

Expected: FAIL because `supabaseUrl`, `supabaseServiceRoleKey`, and `databaseUrl` do not exist yet.

- [ ] **Step 4: Extend server config**

Modify `server/src/config.ts`:

```ts
import { TARGET_COINS, UPBIT_REST_URL } from './upbit/constants.js'

export const config = {
  port: Number(process.env.PORT ?? 4000),
  upbitRestUrl: UPBIT_REST_URL,
  targetCoins: TARGET_COINS,
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  databaseUrl: process.env.DATABASE_URL ?? '',
}
```

- [ ] **Step 5: Run config test to verify it passes**

Run:

```powershell
npm run test --workspace server -- config.simulator.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit code changes only**

Run:

```powershell
git add package-lock.json server/package.json web/package.json server/src/config.ts server/test/config.simulator.test.ts
git commit -m "feat(simulator): add foundation dependencies and config"
```

Do not add or commit Markdown files.

---

## Task 2: Add Drizzle Foundation Schema

**Files:**

- Create: `server/src/db/schema.ts`
- Create: `server/src/db/client.ts`
- Test: `server/test/simulator.schema.test.ts`

- [ ] **Step 1: Write schema test**

Create `server/test/simulator.schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  profiles,
  simAccounts,
  simAuditEvents,
} from '../src/db/schema.js'

describe('simulator schema', () => {
  it('defines profile, account, and audit tables', () => {
    expect(profiles).toBeDefined()
    expect(simAccounts).toBeDefined()
    expect(simAuditEvents).toBeDefined()
  })
})
```

- [ ] **Step 2: Run schema test to verify it fails**

Run:

```powershell
npm run test --workspace server -- simulator.schema.test.ts
```

Expected: FAIL because `server/src/db/schema.ts` does not exist.

- [ ] **Step 3: Create schema**

Create `server/src/db/schema.ts`:

```ts
import {
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  startingCash: numeric('starting_cash', { precision: 20, scale: 8 }).notNull().default('100000000'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const simAccounts = pgTable('sim_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  cashBalance: numeric('cash_balance', { precision: 20, scale: 8 }).notNull().default('100000000'),
  mode: text('mode').notNull().default('paper'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const simAuditEvents = pgTable('sim_audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => profiles.id),
  eventType: text('event_type').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

- [ ] **Step 4: Create DB client**

Create `server/src/db/client.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { config } from '../config.js'
import * as schema from './schema.js'

export function createDb(databaseUrl = config.databaseUrl) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for simulator database access')
  }

  const client = postgres(databaseUrl, { prepare: false })
  return drizzle(client, { schema })
}
```

- [ ] **Step 5: Run schema test**

Run:

```powershell
npm run test --workspace server -- simulator.schema.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit code changes only**

Run:

```powershell
git add server/src/db/schema.ts server/src/db/client.ts server/test/simulator.schema.test.ts
git commit -m "feat(simulator): add drizzle foundation schema"
```

---

## Task 3: Add Simulator Auth Utilities

**Files:**

- Create: `server/src/simulator/errors.ts`
- Create: `server/src/simulator/auth.ts`
- Test: `server/test/simulator.auth.test.ts`

- [ ] **Step 1: Write auth tests**

Create `server/test/simulator.auth.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { extractBearerToken, verifySimulatorUser } from '../src/simulator/auth.js'
import { SimulatorError } from '../src/simulator/errors.js'

describe('simulator auth', () => {
  it('extracts bearer token', () => {
    expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
  })

  it('rejects missing bearer token', () => {
    expect(() => extractBearerToken(undefined)).toThrow(SimulatorError)
  })

  it('verifies user through supplied verifier', async () => {
    const verifier = vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.com' })
    await expect(verifySimulatorUser('Bearer token', verifier)).resolves.toEqual({
      id: 'user-1',
      email: 'a@example.com',
    })
  })
})
```

- [ ] **Step 2: Run auth test to verify it fails**

Run:

```powershell
npm run test --workspace server -- simulator.auth.test.ts
```

Expected: FAIL because simulator auth files do not exist.

- [ ] **Step 3: Create simulator errors**

Create `server/src/simulator/errors.ts`:

```ts
export type SimulatorErrorCode =
  | 'SIM_AUTH_REQUIRED'
  | 'SIM_AUTH_FORBIDDEN'
  | 'SIM_VALIDATION_ERROR'
  | 'SIM_UPSTREAM_FAILURE'

const statusByCode: Record<SimulatorErrorCode, number> = {
  SIM_AUTH_REQUIRED: 401,
  SIM_AUTH_FORBIDDEN: 403,
  SIM_VALIDATION_ERROR: 400,
  SIM_UPSTREAM_FAILURE: 502,
}

export class SimulatorError extends Error {
  constructor(
    public readonly code: SimulatorErrorCode,
    message: string,
  ) {
    super(message)
  }

  get statusCode() {
    return statusByCode[this.code]
  }
}
```

- [ ] **Step 4: Create auth utilities**

Create `server/src/simulator/auth.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

import { config } from '../config.js'
import { SimulatorError } from './errors.js'

export interface SimulatorUser {
  id: string
  email?: string
}

export type SimulatorUserVerifier = (token: string) => Promise<SimulatorUser | null>

export function extractBearerToken(authorization: string | undefined): string {
  if (!authorization?.startsWith('Bearer ')) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Authorization bearer token is required')
  }

  const token = authorization.slice('Bearer '.length).trim()
  if (!token) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Authorization bearer token is required')
  }

  return token
}

export async function verifySimulatorUser(
  authorization: string | undefined,
  verifier = verifySupabaseUser,
): Promise<SimulatorUser> {
  const token = extractBearerToken(authorization)
  const user = await verifier(token)

  if (!user) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Valid Supabase session is required')
  }

  return user
}

export async function verifySupabaseUser(token: string): Promise<SimulatorUser | null> {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new SimulatorError('SIM_AUTH_REQUIRED', 'Supabase server credentials are required')
  }

  const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return null
  }

  return {
    id: data.user.id,
    email: data.user.email,
  }
}
```

- [ ] **Step 5: Run auth test**

Run:

```powershell
npm run test --workspace server -- simulator.auth.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit code changes only**

Run:

```powershell
git add server/src/simulator/errors.ts server/src/simulator/auth.ts server/test/simulator.auth.test.ts
git commit -m "feat(simulator): add auth utilities"
```

---

## Task 4: Add Account Bootstrap Service

**Files:**

- Create: `server/src/simulator/accountService.ts`
- Test: `server/test/simulator.account-service.test.ts`

- [ ] **Step 1: Write account service tests**

Create `server/test/simulator.account-service.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { ensurePaperAccount } from '../src/simulator/accountService.js'

describe('ensurePaperAccount', () => {
  it('returns existing paper account', async () => {
    const repository = {
      findProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      createProfile: vi.fn(),
      findPaperAccount: vi.fn().mockResolvedValue({ id: 'account-1', cashBalance: '100000000' }),
      createPaperAccount: vi.fn(),
    }

    await expect(ensurePaperAccount(repository, { id: 'user-1', email: 'a@example.com' })).resolves.toEqual({
      id: 'account-1',
      cashBalance: '100000000',
    })
    expect(repository.createPaperAccount).not.toHaveBeenCalled()
  })

  it('creates profile and account when missing', async () => {
    const repository = {
      findProfile: vi.fn().mockResolvedValue(null),
      createProfile: vi.fn().mockResolvedValue({ id: 'user-1' }),
      findPaperAccount: vi.fn().mockResolvedValue(null),
      createPaperAccount: vi.fn().mockResolvedValue({ id: 'account-1', cashBalance: '100000000' }),
    }

    await expect(ensurePaperAccount(repository, { id: 'user-1', email: 'a@example.com' })).resolves.toEqual({
      id: 'account-1',
      cashBalance: '100000000',
    })
  })
})
```

- [ ] **Step 2: Run account service test to verify it fails**

Run:

```powershell
npm run test --workspace server -- simulator.account-service.test.ts
```

Expected: FAIL because account service does not exist.

- [ ] **Step 3: Implement account service**

Create `server/src/simulator/accountService.ts`:

```ts
import type { SimulatorUser } from './auth.js'

export interface PaperAccount {
  id: string
  cashBalance: string
}

export interface SimulatorAccountRepository {
  findProfile(userId: string): Promise<{ id: string } | null>
  createProfile(user: SimulatorUser): Promise<{ id: string }>
  findPaperAccount(userId: string): Promise<PaperAccount | null>
  createPaperAccount(userId: string, startingCash: string): Promise<PaperAccount>
}

export const STARTING_CASH_KRW = '100000000'

export async function ensurePaperAccount(
  repository: SimulatorAccountRepository,
  user: SimulatorUser,
): Promise<PaperAccount> {
  const profile = await repository.findProfile(user.id)
  if (!profile) {
    await repository.createProfile(user)
  }

  const account = await repository.findPaperAccount(user.id)
  if (account) {
    return account
  }

  return repository.createPaperAccount(user.id, STARTING_CASH_KRW)
}
```

- [ ] **Step 4: Run account service test**

Run:

```powershell
npm run test --workspace server -- simulator.account-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit code changes only**

Run:

```powershell
git add server/src/simulator/accountService.ts server/test/simulator.account-service.test.ts
git commit -m "feat(simulator): add paper account bootstrap service"
```

---

## Task 5: Register Simulator Session Route

**Files:**

- Create: `server/src/routes/simulator.ts`
- Modify: `server/src/app.ts`
- Test: `server/test/simulator.routes.test.ts`

- [ ] **Step 1: Write route tests**

Create `server/test/simulator.routes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { registerSimulatorRoutes } from '../src/routes/simulator.js'

describe('simulator routes', () => {
  it('returns 401 without bearer token', async () => {
    const app = Fastify()
    registerSimulatorRoutes(app, {
      verifyUser: async () => null,
    })

    const response = await app.inject({ method: 'GET', url: '/api/simulator/session' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({
      error: 'SIM_AUTH_REQUIRED',
      message: 'Authorization bearer token is required',
    })
  })

  it('returns session for authenticated user', async () => {
    const app = Fastify()
    registerSimulatorRoutes(app, {
      verifyUser: async () => ({ id: 'user-1', email: 'a@example.com' }),
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/simulator/session',
      headers: { authorization: 'Bearer token' },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      authenticated: true,
      userId: 'user-1',
      email: 'a@example.com',
    })
  })
})
```

- [ ] **Step 2: Run route test to verify it fails**

Run:

```powershell
npm run test --workspace server -- simulator.routes.test.ts
```

Expected: FAIL because simulator route file does not exist.

- [ ] **Step 3: Implement route**

Create `server/src/routes/simulator.ts`:

```ts
import type { FastifyInstance } from 'fastify'

import { verifySimulatorUser, type SimulatorUserVerifier } from '../simulator/auth.js'
import { SimulatorError } from '../simulator/errors.js'

interface SimulatorRouteDeps {
  verifyUser?: SimulatorUserVerifier
}

function toErrorPayload(error: SimulatorError) {
  return {
    error: error.code,
    message: error.message,
  }
}

export function registerSimulatorRoutes(app: FastifyInstance, deps: SimulatorRouteDeps = {}): void {
  app.get('/api/simulator/session', async (request, reply) => {
    try {
      const user = await verifySimulatorUser(request.headers.authorization, deps.verifyUser)
      return {
        authenticated: true,
        userId: user.id,
        email: user.email,
      }
    } catch (error) {
      if (error instanceof SimulatorError) {
        return reply.code(error.statusCode).send(toErrorPayload(error))
      }

      throw error
    }
  })
}
```

- [ ] **Step 4: Register route in app**

Modify `server/src/app.ts`:

```ts
import { registerSimulatorRoutes } from './routes/simulator.js'
```

Add after existing route registrations:

```ts
  registerSimulatorRoutes(app)
```

- [ ] **Step 5: Run route test**

Run:

```powershell
npm run test --workspace server -- simulator.routes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Run health route regression**

Run:

```powershell
npm run test --workspace server -- health.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit code changes only**

Run:

```powershell
git add server/src/routes/simulator.ts server/src/app.ts server/test/simulator.routes.test.ts
git commit -m "feat(simulator): add session route"
```

---

## Task 6: Add Web Supabase And Simulator Session Client

**Files:**

- Create: `web/src/lib/supabase.ts`
- Create: `web/src/api/simulator.ts`
- Create: `web/src/stores/auth.ts`
- Test: `web/test/simulator-api.test.ts`

- [ ] **Step 1: Write simulator API test**

Create `web/test/simulator-api.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { getSimulatorSession } from '../src/api/simulator.js'

describe('simulator api', () => {
  it('sends bearer token to simulator session endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, userId: 'user-1' }),
    })

    const session = await getSimulatorSession('token', fetchMock)

    expect(fetchMock).toHaveBeenCalledWith('/api/simulator/session', {
      headers: { Authorization: 'Bearer token' },
    })
    expect(session).toEqual({ authenticated: true, userId: 'user-1' })
  })
})
```

- [ ] **Step 2: Run web API test to verify it fails**

Run:

```powershell
npm run test --workspace web -- simulator-api.test.ts
```

Expected: FAIL because simulator API file does not exist.

- [ ] **Step 3: Create Supabase client**

Create `web/src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null
```

- [ ] **Step 4: Create simulator API client**

Create `web/src/api/simulator.ts`:

```ts
export interface SimulatorSessionView {
  authenticated: boolean
  userId?: string
  email?: string
}

type Fetcher = typeof fetch

export async function getSimulatorSession(
  accessToken: string,
  fetcher: Fetcher = fetch,
): Promise<SimulatorSessionView> {
  const response = await fetcher('/api/simulator/session', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    return { authenticated: false }
  }

  return response.json() as Promise<SimulatorSessionView>
}
```

- [ ] **Step 5: Create auth store**

Create `web/src/stores/auth.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'
import { supabase } from '../lib/supabase.js'
import { getSimulatorSession, type SimulatorSessionView } from '../api/simulator.js'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = shallowRef('')
  const session = shallowRef<SimulatorSessionView>({ authenticated: false })
  const loading = shallowRef(false)

  const authenticated = computed(() => session.value.authenticated)

  async function refreshSession() {
    if (!supabase) {
      session.value = { authenticated: false }
      return
    }

    loading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      accessToken.value = data.session?.access_token ?? ''
      session.value = accessToken.value
        ? await getSimulatorSession(accessToken.value)
        : { authenticated: false }
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
    accessToken.value = ''
    session.value = { authenticated: false }
  }

  return {
    accessToken,
    session,
    loading,
    authenticated,
    refreshSession,
    signOut,
  }
})
```

- [ ] **Step 6: Run web API test**

Run:

```powershell
npm run test --workspace web -- simulator-api.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit code changes only**

Run:

```powershell
git add web/src/lib/supabase.ts web/src/api/simulator.ts web/src/stores/auth.ts web/test/simulator-api.test.ts
git commit -m "feat(simulator): add web auth session client"
```

---

## Task 7: Add My Page Route Shell And Third Nav Item

**Files:**

- Create: `web/src/features/mypage/MyPage.vue`
- Modify: `web/src/router/index.ts`
- Modify: `web/src/components/AppNav.vue`
- Test: `web/test/app-nav-mypage.test.ts`
- Test: `web/test/mypage.test.ts`

- [ ] **Step 1: Write nav test**

Create `web/test/app-nav-mypage.test.ts`:

```ts
import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppNav from '../src/components/AppNav.vue'

describe('AppNav mypage link', () => {
  it('shows the three primary menu links', () => {
    const wrapper = mount(AppNav, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    expect(wrapper.text()).toContain('거래소')
    expect(wrapper.text()).toContain('시장 동향')
    expect(wrapper.text()).toContain('마이페이지')
  })
})
```

- [ ] **Step 2: Write My Page shell test**

Create `web/test/mypage.test.ts`:

```ts
import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MyPage from '../src/features/mypage/MyPage.vue'

describe('MyPage', () => {
  it('renders account shell sections', () => {
    const wrapper = mount(MyPage, {
      global: {
        plugins: [createPinia()],
        stubs: { AppNav: true },
      },
    })

    expect(wrapper.text()).toContain('마이페이지')
    expect(wrapper.text()).toContain('로그인 상태')
    expect(wrapper.text()).toContain('가상 계좌')
    expect(wrapper.text()).toContain('투자내역')
  })
})
```

- [ ] **Step 3: Run page tests to verify they fail**

Run:

```powershell
npm run test --workspace web -- app-nav-mypage.test.ts mypage.test.ts
```

Expected: FAIL because My Page does not exist and nav lacks the third link.

- [ ] **Step 4: Add nav link**

Modify `web/src/components/AppNav.vue` inside `.app-nav__links`:

```vue
<router-link to="/exchange" class="app-nav__link">거래소</router-link>
<router-link to="/insights" class="app-nav__link">시장 동향</router-link>
<router-link to="/mypage" class="app-nav__link">마이페이지</router-link>
```

- [ ] **Step 5: Add My Page route**

Modify `web/src/router/index.ts`:

```ts
import MyPage from "../features/mypage/MyPage.vue";
```

Add route:

```ts
{ path: "/mypage", name: "mypage", component: MyPage },
```

- [ ] **Step 6: Create My Page shell**

Create `web/src/features/mypage/MyPage.vue`:

```vue
<script setup lang="ts">
import AppNav from "../../components/AppNav.vue";
import { useAuthStore } from "../../stores/auth.js";

const auth = useAuthStore();
</script>

<template>
  <main class="mypage-page">
    <AppNav class="mypage-nav" />

    <section class="mypage-shell">
      <header class="mypage-head">
        <p class="mypage-eyebrow">Paper account</p>
        <h1 class="mypage-title">마이페이지</h1>
      </header>

      <section class="mypage-grid" aria-label="마이페이지 요약">
        <article class="mypage-panel">
          <h2>로그인 상태</h2>
          <p>{{ auth.authenticated ? "로그인됨" : "로그인이 필요합니다." }}</p>
        </article>

        <article class="mypage-panel">
          <h2>가상 계좌</h2>
          <p>초기 자금과 평가금액은 계좌 API 연동 후 표시됩니다.</p>
        </article>

        <article class="mypage-panel mypage-panel--wide">
          <h2>투자내역</h2>
          <p>전체 주문/체결 이력은 history API 연동 후 표시됩니다.</p>
        </article>
      </section>
    </section>
  </main>
</template>

<style scoped lang="scss">
.mypage-page {
  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text-main);
  padding: clamp(14px, 2vw, 24px);
}

.mypage-nav,
.mypage-shell {
  width: min(1440px, 100%);
  margin: 0 auto;
}

.mypage-shell {
  padding-top: clamp(20px, 4vh, 48px);
}

.mypage-head {
  margin-bottom: 18px;
}

.mypage-eyebrow {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.mypage-title {
  margin: 0;
  font-size: clamp(28px, 5vw, 56px);
  line-height: 1;
}

.mypage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.mypage-panel {
  border: 1px solid var(--panel-border);
  border-radius: var(--radius-md);
  background: var(--panel-bg);
  padding: 16px;
}

.mypage-panel--wide {
  grid-column: 1 / -1;
}

.mypage-panel h2 {
  margin: 0 0 8px;
  font-size: 15px;
}

.mypage-panel p {
  margin: 0;
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .mypage-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

- [ ] **Step 7: Run page tests**

Run:

```powershell
npm run test --workspace web -- app-nav-mypage.test.ts mypage.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit code changes only**

Run:

```powershell
git add web/src/features/mypage/MyPage.vue web/src/router/index.ts web/src/components/AppNav.vue web/test/app-nav-mypage.test.ts web/test/mypage.test.ts
git commit -m "feat(web): add simulator my page shell"
```

---

## Task 8: Foundation Regression

**Files:**

- No new files.

- [ ] **Step 1: Run focused server regression**

Run:

```powershell
npm run test --workspace server -- simulator.auth.test.ts simulator.account-service.test.ts simulator.routes.test.ts config.simulator.test.ts simulator.schema.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused web regression**

Run:

```powershell
npm run test --workspace web -- simulator-api.test.ts app-nav-mypage.test.ts mypage.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run workspace build**

Run:

```powershell
npm run build --workspaces --if-present
```

Expected: PASS.

- [ ] **Step 4: Confirm Markdown files are not staged**

Run:

```powershell
git status --short
```

Expected: no staged `.md` files. Uncommitted plan/spec Markdown files can remain unstaged.

---

## Follow-Up Plans

After this foundation plan passes, create separate implementation plans for:

- `crypto-simulator-order-engine`: order calculation, quote API, positions, transactions.
- `crypto-simulator-exchange-panels`: account summary, order panel, positions panel, sync status panel.
- `crypto-simulator-history-performance`: history, performance, My Page investment history.
- `crypto-simulator-regression`: auth, price sync, order, balance, and UI smoke regression.
