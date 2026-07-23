# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`lta-btds-gui` is an Angular 21 SSR application (the "BTDS GUI") for Singapore LTA bus telematics. A single codebase serves **two runtime products** selected at startup, not at build time:

- **MDCS** — the full back-office console (dashboard, monitoring, bus management, reports, parameter management/trial, maintenance).
- **DAGW** — a reduced depot-gateway console exposing a subset of the same views.

The mode is decided at runtime by [src/app/services/app-config.service.ts](src/app/services/app-config.service.ts), which fetches `/assets/app-config.json` (`APP_MODE` = `mdcs` | `dagw`, plus `DAGW_DEPOT`, `version`) and mutates `environment.dagw`. Everything mode-aware keys off this. Both modes share components and services; they differ mainly in which routes/menus are mounted.

## Commands

```bash
npm start                 # ng serve at http://localhost:8035 (proxy.config.json active)
npm run start:dummy       # serve against local mock servers (environment.dummy)
npm run build             # production build -> dist/lta-btds-gui
npm run build:dummy       # build with mock-data environment
npm run build:uat         # AOT UAT build
npm test                  # Karma + Jasmine (auto-detects a Chromium binary via CHROME_BIN)
npm run lint              # ESLint (TS + HTML templates); `ng lint --fix` to autofix
```

Run a **single test file**: `ng test --include='**/auth.service.spec.ts'` (Karma watches by default; add `--watch=false` for one shot).

### Mock backend (dummy mode)

`npm run start:dummy` expects local Express mock servers to be running. They live in [node/](node/) — one tree per product, each an Express app with `routes/` + `data/*.json`:

```bash
npm run server:mdcs       # node/mdcs/index.js
npm run server:dagw       # node/dagw/index.js
```

Both listen on **port 3000**, so run only one at a time. The dummy environment (`environment.dummy.ts`) points the gateway at `http://localhost:3000/api/` and sets `useDummyData: true`. When `useDummyData` is on, [AuthService](src/app/services/auth.service.ts) bypasses SSO and signs in with bundled fixtures (`@data/db.json`, `@data/access-rights.json`).

## Architecture

### Configuration & environments
- Standalone bootstrap (no NgModule). Providers are in [src/app/app.config.ts](src/app/app.config.ts); SSR entry is [server.ts](server.ts) / `main.server.ts`.
- `src/environments/` is layered: `environment.common.ts` holds shared OAuth/WS constants; per-target files (`environment.ts`, `.dummy.ts`, `.uat.ts`, `.prod.ts`) spread `commonEnv` and override flags. The active file is swapped via `fileReplacements` in [angular.json](angular.json) per build configuration (`dummy`, `uat`, `prod`). **Note** `environment.dagw.ts` / `environment.mdcs.ts` exist but mode is normally chosen at runtime via `app-config.json`, not these files.
- Key flags: `useDummyData`, `useDevSign` (dev login shortcut), `useDynamicEndpoint`, `webSocketEnabled`, `enableSSO`.

### Routing & access control
- Routes are built in [src/app/app.routes.ts](src/app/app.routes.ts) from path constants in [src/app/app.routes.config.ts](src/app/app.routes.config.ts) (`mdcsRoutes` / `dagwRoutes`). The `mdcs` and `dagw` route trees are siblings under `LayoutComponent`.
- Three guard layers stack on routes (see [src/app/guards/](src/app/guards/)): `AuthGuard` (authenticated), `MdcsGuard`/`DagwGuard` (correct product — they redirect to `/` on mismatch, driven by `AuthService.isDagw()`), and `RoleGuard` (per-route `data.roles`).
- Authorization is **role-based**, centralized in [src/app/services/role-access.config.ts](src/app/services/role-access.config.ts) (`MENU_ACCESS`). Each feature declares `view` and `manage` role arrays (roles: `adm`, `sup`, `ope`, `mai`). Route `data.roles` references `MENU_ACCESS.<product>.<feature>.view`. When adding a view, wire its roles here — don't invent ad-hoc checks.

### HTTP layer
- Three functional interceptors registered in order in `app.config.ts`: `headerInterceptor`, `sessionExpiryInterceptor`, `requestLogInterceptor` (all in [src/app/services/](src/app/services/)).
- Auth is OAuth2/OIDC via `angular-oauth2-oidc` (ADFS SSO), with a dev-login bypass for local/dummy work.
- [DynamicEndpoint](src/app/services/dynamic-endpoint.ts) rewrites service URIs at runtime when `useDynamicEndpoint` is set: in dummy mode it targets `localhost:3000/<module>/…`; otherwise it derives host/port from `window.location`. Services pass their gateway URI through this rather than hardcoding hosts.

### State
- NgRx `@ngrx/store` (classic actions/reducers) — root store assembled in [src/app/store/app.state.ts](src/app/store/app.state.ts), feature slices `bus` and `snackbar`. `@ngrx/signals` is also a dependency for newer signal-store usage. Snackbars are dispatched through the store, not called imperatively.

### Realtime
- [WebSocketService](src/app/services/web-socket.service.ts) is a single STOMP-over-SockJS client (`@stomp/stompjs` + `sockjs-client`) multiplexing many `/ws/topic/*` topics. `refreshTrigger()` provides a websocket-push-or-polling-fallback stream so live views (master bus list, bus operation status, EOD, parameter trial, import/export progress) update without per-view socket setup. Connection is gated by `webSocketEnabled` + `wsUrl`.

### Data grids & charts
- Tables use **AG Grid** (`ag-grid-angular`); wrapper components live under [src/app/components/wrapper-table/](src/app/components/wrapper-table/) and `data-list`. Charts use Chart.js via `ng2-charts` (registered globally in `app.config.ts`).

### Conventions
- Path aliases (tsconfig + must be mirrored in any tooling): `@app/*`, `@env/*`, `@data/*`, `@models/*`, `@components/*`, `@views/*`, `@services/*`, `@store/*`, `@assets/*`, `@directives/*`. Prefer these over deep relative imports.
- Feature folders under `src/app/views/<feature>/` typically split into a `search/` (filter/list entry) component plus detail/page components.
- TypeScript is `strict` with extra checks (`noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`) and strict Angular templates. `@typescript-eslint/no-explicit-any` is **disabled**, so `any` is tolerated.
- Components are `kebab-case` element selectors, directives `camelCase` attribute selectors, both with the `app` prefix. SCSS styling; Angular Material (`indigo-pink` theme) + CDK.
- Prettier: single quotes, 2-space, `printWidth` 80, `arrowParens: avoid`, `trailingComma: es5`.

## Git workflow

Default branch is `dev`. Feature branches → `dev` (developers may self-merge). `dev` → `sit` → `uat` promotions are admin-approved MRs. GitLab CI ([.gitlab-ci.yml](.gitlab-ci.yml)) handles build/deploy and Trivy security scanning; this is a GitLab repo (use MRs, not GitHub PRs).
