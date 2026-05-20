# ASZ Nexus ERP - Production Architecture and Reference

Last Updated: May 21, 2026
Audience: Engineering, QA, DevOps, Security Review, Release Management
Scope: End-to-end technical reference for production operations and future delivery

---

## 1) Product and Runtime Overview

ASZ Nexus ERP is a desktop-first ERP application for produce and commission workflows. It uses a hybrid architecture:

- Frontend: React + TypeScript rendered inside a Tauri webview
- Desktop host/runtime: Tauri 2 (Rust)
- Local persistence: SQLite
- Data access layer: Drizzle ORM (TypeScript) + SQLite plugin bridge
- Packaging: Native installers (Windows NSIS/MSI)

Primary goals:

- Offline-first local operations with desktop UX
- Reliable financial and transactional data handling
- Strong security defaults for local business environments
- Fast module-level loading through chunked frontend bundles

---

## 2) Technology Stack (Versioned)

### 2.1 Frontend and Build

- React: 19.2.6
- React DOM: 19.2.6
- React Router DOM: 7.6.1 (HashRouter strategy)
- TypeScript: 5.9.3 (strict mode)
- Vite: 7.3.2
- Vite React plugin: 5.1.1
- Tailwind CSS: 4.1.17
- Tailwind Vite plugin: 4.1.17
- Test runner: Vitest 3.2.4

Reference files:

- package.json
- tsconfig.json
- vite.config.ts

### 2.2 Desktop and Native Layer

- Tauri: 2.x
- Tauri CLI: 2.9.1
- Rust edition: 2021
- Tokio runtime for async/background operations
- Tauri plugins: SQL, FS, Dialog, Shell

Reference files:

- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

### 2.3 Data, Storage, and ORM

- SQLite as local primary data store
- Drizzle ORM: 0.44.2
- Drizzle Kit: 0.31.1
- SQLite runtime in Rust: rusqlite + r2d2 pooling

Reference files:

- drizzle.config.ts
- src/db/client.ts
- src/db/schema.ts
- src-tauri/Cargo.toml

### 2.4 Platform Libraries

- State management: Zustand 5.0.5
- i18n: i18next + react-i18next
- HTTP: axios 1.9.0
- UI utilities: clsx, tailwind-merge
- Icons: lucide-react
- Notifications: sonner

---

## 3) Repository Architecture

Top-level architecture aligns to layered application design:

- src/app, src/components, src/pages, src/layouts
  - Presentation and feature module UI
- src/services, src/providers, src/context, src/ipc
  - Application orchestration and boundary services
- src/store, src/hooks
  - Client state and interaction behavior
- src/db
  - Schema, migrations, query/repository abstractions
- src/config, src/lib, src/utils
  - Cross-cutting platform and utility concerns
- src-tauri/src
  - Native commands/services and platform integration

This structure supports modular growth while keeping UI, domain behavior, and infrastructure boundaries reasonably isolated.

---

## 4) Layered Design and Responsibilities

### 4.1 Presentation Layer

Responsibilities:

- User workflows (arrivals, billing, inventory, parties, payments, reports, settings)
- Visual state, form state, modal workflows
- Route transitions and tab/module rendering

Key implementation:

- React components in src/components
- App shell in src/app/AppShell.tsx
- Router provider in src/router/index.tsx

### 4.2 Application Layer

Responsibilities:

- Startup orchestration and warm-up sequencing
- Cross-module side effects (auth refresh, inactivity lock)
- IPC command facades and runtime capability integration

Key implementation:

- src/services/startup.ts
- src/providers/AuthProvider.tsx
- src/ipc/*

### 4.3 State Layer

Responsibilities:

- Centralized app/session/UI/auth stores
- Persisted local state and appearance settings
- Controlled subscriptions for predictable rerenders

Key implementation:

- src/store/* (Zustand stores)
- src/hooks/* (stateful behavior and reusable logic)

### 4.4 Data Access Layer

Responsibilities:

- Define schema and migrations
- Provide query execution through Drizzle
- Convert runtime SQL plugin interactions into typed data access

Key implementation:

- src/db/schema.ts
- src/db/client.ts
- src/db/migrations/*

### 4.5 Native Platform Layer (Rust + Tauri)

Responsibilities:

- Secure local filesystem and database operations
- Authentication primitives and token/password support
- Native command execution exposed to frontend via IPC

Key implementation:

- src-tauri/src/*
- src-tauri/capabilities/*

---

## 5) Runtime Flow (End-to-End)

### 5.1 Startup Flow

1. Frontend bootstraps from src/main.tsx.
2. Appearance and i18n systems initialize before first paint.
3. Startup service runs background warm-up operations.
4. App root mounts and route/module shell becomes interactive.
5. Tauri window is shown after first paint scheduling.

### 5.2 User Action Flow

1. User triggers action in a module component.
2. UI delegates to store/hook/service.
3. Service performs data read/write through DB layer or IPC boundary.
4. If native capability required, request crosses Tauri IPC to Rust.
5. Data result updates store.
6. React rerenders affected view segments.

### 5.3 Data Flow

- Primary local persistence path:
  React -> Service/Store -> Drizzle client -> Tauri SQL plugin -> SQLite file

- External integration path (if configured):
  React -> axios client -> configured API base URL

---

## 6) Database and Schema Strategy

### 6.1 Current Modeling Pattern

Schema is TypeScript-defined using Drizzle SQLite tables for:

- Fruits
- Suppliers
- Customers
- Vehicle arrivals
- Purchase invoices
- Sales invoices
- Payments
- App settings

Schema file:

- src/db/schema.ts

### 6.2 Migration and Tooling Lifecycle

- Generate migration: npm run db:generate
- Run migration: npm run db:migrate
- Push schema: npm run db:push
- Studio/check/drop available via scripts in package.json

### 6.3 Runtime Notes

- Drizzle tooling uses local sqlite file (dev.db) for migration generation contexts.
- Production runtime DB location is managed by Tauri SQL plugin layer.
- Browser-only dev mode returns null DB client and expects guarded fallback behavior.

---

## 7) Frontend Build and Performance Architecture

### 7.1 Build Strategy

- Vite with production minification by esbuild
- Sourcemaps disabled in production mode
- Console/debugger dropping in production build
- Tauri runtime packages marked external to avoid bundling

### 7.2 Chunking and Lazy Loading

The project uses manual chunk strategy for:

- React core
- Router
- State layer
- UI utility libraries
- Icons
- Drizzle
- Feature modules per ERP domain

This enables:

- Lower first interactive payload
- Better cache behavior
- Module-on-demand download

### 7.3 Current Performance Baseline

- Build transform: about 2000 modules
- Total JS output: about 780 KB uncompressed, about 210 KB gzipped
- Largest identified feature chunk: settings module

Known optimization candidates:

- Split large settings module into tab-level subchunks
- Remove shared billing duplication between sales/purchase paths
- Add virtualization thresholds for large report datasets

---

## 8) Security Architecture and Current Posture

Current posture is production-ready with focused follow-ups.

### 8.1 Implemented Controls

- Argon2id password hashing
- JWT access/refresh token model with rotation behavior
- Role-based access controls
- Session timeout and inactivity handling
- CSP in Tauri app security configuration
- Tauri plugin scope restrictions for filesystem access
- Path validation and traversal protection patterns
- Production console suppression and no source maps

### 8.2 Accepted/Tracked Risks

1) SQL path escaping hardening in backup command paths
- Action: apply defensive quote escaping for VACUUM path interpolation in Rust backup command.

2) Refresh token persistence model
- Current: localStorage persistence on desktop side.
- Action: document physical-access assumptions now; evaluate secure storage plugin in next release.

3) Rate limiting for auth attempts
- Action: add lockout/backoff policy in upcoming release.

### 8.3 Security Checklist Before Every Release

- Run npm audit and resolve high/critical issues.
- Run cargo audit and resolve high/critical issues.
- Verify production build has no source maps and no debug logs.
- Validate login/logout/token refresh flows.
- Validate backup/restore integrity with sample production-scale data.
- Confirm API base URL uses HTTPS for production endpoints.

---

## 9) Configuration and Environment Model

### 9.1 Frontend

- Environment configuration through Vite variables
- App-level settings through src/config and typed config modules
- Runtime detection for Tauri/non-Tauri execution paths

### 9.2 Native

- Tauri window behavior, bundling targets, CSP, and plugin scopes defined in src-tauri/tauri.conf.json
- Rust profiles tuned for dev speed and release optimization in Cargo.toml

### 9.3 Recommended Environment Documentation

Maintain a living deployment note that includes:

- Required environment variables
- Secure defaults
- API endpoint policy (HTTPS only)
- Data directory and backup retention policy

---

## 10) Quality, Testing, and Verification

### 10.1 Static and Build Quality Gates

- Type checking: npm run typecheck
- Production build: npm run build:prod
- Tests: npm run test

### 10.2 Pre-Release Verification Suite

Minimum required test passes:

1. Authentication
- setup/login/logout
- bad credential handling
- token refresh behavior

2. Core workflows
- arrival create/edit
- purchase and sales invoice lifecycle
- payment posting and balance updates
- reports rendering and filtering

3. Data safety
- backup create/restore cycle
- data consistency after restore
- startup recovery after interrupted sessions

4. UX/platform
- tray icon interactions
- window state persistence
- i18n and appearance persistence

### 10.3 Suggested CI Gates

Recommended pipeline stages:

1. install dependencies
2. typecheck
3. unit tests
4. production build
5. npm audit
6. cargo audit
7. package signing/installer build

---

## 11) Release and Deployment Playbook

### 11.1 Build and Package

- Frontend production assets built by Vite
- Tauri bundles installers (NSIS/MSI)
- Release profile optimized for size/perf with strip and thin LTO

### 11.2 Release Checklist

1. Verify all P0/P1 issues are closed or explicitly waived.
2. Execute full verification suite.
3. Validate backup restoration on release candidate build.
4. Publish signed artifacts.
5. Tag release with changelog and rollback instructions.

### 11.3 Rollback Strategy

- Keep previous installer artifacts available.
- Maintain migration compatibility guardrails.
- Restore from last verified backup if data issue detected.
- Document incident timeline and remediation steps.

---

## 12) Operations: Backup, Restore, and Data Safety

### 12.1 Backup Policy (Recommended)

- Frequency: daily automated + on-demand manual before major operations
- Retention: at least 14-30 rolling snapshots depending on data volume
- Storage: encrypted disk or encrypted backup destination
- Validation: quarterly restore drills minimum

### 12.2 Restore Procedure (Recommended)

1. Create emergency backup of current state.
2. Validate selected backup metadata and timestamp.
3. Restore in controlled mode.
4. Run post-restore integrity checks.
5. Resume normal operation after verification.

### 12.3 Disaster Recovery Targets (Recommended)

- RPO target: <= 24 hours (or tighter if business critical)
- RTO target: <= 2 hours for single-site desktop deployments

---

## 13) Observability and Diagnostics Strategy

Current app uses development-focused logging guards. For production maturity, adopt:

- Structured local audit events for key financial and auth operations
- Non-sensitive error event collection (local or remote depending policy)
- Startup health indicators (DB load/auth readiness)
- Backup/restore operation logs with correlation IDs

Do not log:

- Passwords
- Full tokens
- Sensitive financial payloads without masking

---

## 14) Scalability and Evolution Plan

### 14.1 Near-Term (v1.1)

- Split settings module into subcomponents
- Refactor shared billing logic into reusable base module
- Add report virtualization thresholds
- Fix remaining type hygiene and import hygiene items
- Improve token storage hardening
- Add auth rate limiting

### 14.2 Mid-Term

- Introduce stronger domain boundaries (domain services + repository interfaces)
- Add integration tests around critical accounting flows
- Add migration verification tests for schema evolution

### 14.3 Long-Term

- Add compliance-grade audit trail
- Add pluggable sync/replication strategy if multi-node operations are required
- Introduce telemetry pipeline with privacy-preserving controls

---

## 15) Architectural Decision Record (ADR) Template

Use this template for major future decisions:

- Title
- Date
- Status (Proposed/Accepted/Superseded)
- Context
- Decision
- Consequences
- Alternatives considered
- Rollout plan
- Rollback plan

Store ADRs under docs/adr/ with incremental numeric prefixes.

---

## 16) Canonical Reference Files

Core stack and build:

- package.json
- tsconfig.json
- vite.config.ts

Frontend runtime:

- src/main.tsx
- src/router/index.tsx
- src/app/AppShell.tsx
- src/providers/AuthProvider.tsx
- src/i18n/index.ts

State and data:

- src/store/index.ts
- src/db/client.ts
- src/db/schema.ts
- drizzle.config.ts

Native runtime:

- src-tauri/Cargo.toml
- src-tauri/tauri.conf.json

Operational/security reports:

- PRODUCTION_READINESS_REPORT.md
- PRODUCTION_READINESS_SUMMARY.md
- SECURITY_AUDIT_REPORT.md
- SECURITY_AUDIT_SUMMARY.md
- BUNDLE_ANALYSIS.md

---

## 17) Current Production Verdict

Status: APPROVED FOR PRODUCTION, with recommended hardening actions tracked.

Mandatory actions for sustained production confidence:

1. Complete SQL path escaping hardening in Rust backup flow.
2. Run dependency audits at release time (npm + cargo).
3. Keep deployment/security documentation current.
4. Validate backup/restore in recurring drills.

With these controls in place, the architecture is suitable for ongoing production deployment and iterative feature growth.
