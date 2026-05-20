# ASZ Nexus ERP Documentation Hub

Last Updated: May 21, 2026

This is the central index for production, architecture, security, and release documentation.

---

## 1) Core Reference Documents

- [Architecture and Production Reference](../ARCHITECTURE_PRODUCTION_REFERENCE.md)
- [Deployment Runbook](../DEPLOYMENT_RUNBOOK.md)
- [Release Checklist](../RELEASE_CHECKLIST.md)
- [Release Day Card](RELEASE_DAY_CARD.md)
- [Release Day Sheet (Printable A4)](RELEASE_DAY_CARD_PRINTABLE.md)

---

## 2) Readiness and Security Reports

- [Production Readiness Summary](../PRODUCTION_READINESS_SUMMARY.md)
- [Production Readiness Full Report](../PRODUCTION_READINESS_REPORT.md)
- [Security Audit Summary](../SECURITY_AUDIT_SUMMARY.md)
- [Security Audit Full Report](../SECURITY_AUDIT_REPORT.md)
- [Security Audit Fixes](../SECURITY_AUDIT_FIXES.md)
- [Bundle Analysis](../BUNDLE_ANALYSIS.md)

---

## 3) Architecture Decision Records (ADR)

- [ADR Index](adr/README.md)
- [ADR 0001 - Desktop-first Tauri Architecture](adr/0001-desktop-first-tauri-architecture.md)
- [ADR 0002 - Local SQLite with Drizzle](adr/0002-local-sqlite-with-drizzle.md)
- [ADR 0003 - Hash Routing and Module-level Chunking](adr/0003-hash-routing-and-module-chunking.md)

---

## 4) Recommended Reading Order

For new team members:

1. Read [Architecture and Production Reference](../ARCHITECTURE_PRODUCTION_REFERENCE.md)
2. Read [Security Audit Summary](../SECURITY_AUDIT_SUMMARY.md)
3. Read [Deployment Runbook](../DEPLOYMENT_RUNBOOK.md)
4. Use [Release Checklist](../RELEASE_CHECKLIST.md) for every release
5. Review ADRs for historical decision context

For release managers:

1. Start with [Release Checklist](../RELEASE_CHECKLIST.md)
2. Execute [Deployment Runbook](../DEPLOYMENT_RUNBOOK.md)
3. Confirm current risk posture from [Production Readiness Summary](../PRODUCTION_READINESS_SUMMARY.md)
4. Validate security constraints from [Security Audit Summary](../SECURITY_AUDIT_SUMMARY.md)

---

## 5) Documentation Maintenance Rules

- Update this index whenever a new production or architecture doc is added.
- Keep runbook and checklist aligned with current release tooling.
- Add a new ADR for any major architecture change.
- Do not rewrite accepted ADR history; add superseding ADRs when needed.

---

## 6) Change Ownership

Suggested owners:

- Architecture reference: Engineering Lead
- Deployment runbook and release checklist: Release Manager + QA Lead
- Security docs: Security Reviewer
- ADRs: Tech Lead or Architecture Owner
