# ADR 0003: Hash Routing and Module-level Chunking

Date: 2026-05-21
Status: Accepted

## Context

The app runs inside desktop webview runtime and should avoid route reload failures. Startup responsiveness is critical because users frequently switch between large ERP modules.

## Decision

Use HashRouter and module-level chunk splitting:

- HashRouter for robust route behavior in desktop packaging context
- React.lazy and Suspense for route/module lazy loading
- Manual Vite chunk strategy for domain modules and shared libraries

## Consequences

Positive:

- Reliable route handling without server rewrite dependence
- Reduced initial payload and faster first interactive state
- Better cache separation for shared and feature-specific chunks

Trade-offs:

- Requires ongoing chunk-size governance
- Potential duplication risks if shared logic is not extracted
- Complexity in preload strategy and tuning

## Alternatives Considered

1. BrowserRouter with server rewrites
- Rejected due to desktop runtime constraints and route reload risks.

2. Monolithic bundle without splitting
- Rejected due to startup performance impact.

3. Fully automatic chunking only
- Rejected in favor of deterministic manual chunk control for ERP modules.

## Rollout Plan

- Keep module chunk map updated as modules evolve.
- Track chunk-size regressions in release review.
- Refactor oversized modules (settings, billing) to improve load profile.

## Rollback Plan

- If chunking introduces regression, revert to last stable chunk config.
- Rebuild and reissue installer with validated bundle map.
