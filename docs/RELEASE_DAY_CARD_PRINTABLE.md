# ASZ Nexus ERP Release Day Sheet (Printable A4)

Document ID: RLS-DAY-A4
Version:
Release Date:
Environment:
Prepared By:

---

## 1. Go/No-Go Prerequisites

| Item | Status (Yes/No) | Owner Initials | Notes |
|---|---|---|---|
| Version tag finalized and approved |  |  |  |
| Scope freeze confirmed |  |  |  |
| No open critical defects (or written waiver) |  |  |  |
| Release owner assigned |  |  |  |
| Incident commander assigned |  |  |  |

---

## 2. Build and Security Gate

| Item | Status (Pass/Fail) | Owner Initials | Evidence |
|---|---|---|---|
| Typecheck passed |  |  |  |
| Test suite passed |  |  |  |
| Production build passed |  |  |  |
| Rust check passed |  |  |  |
| npm audit reviewed |  |  |  |
| cargo audit reviewed |  |  |  |

Command set:

```powershell
npm run typecheck
npm run test
npm run build:prod
cargo check --manifest-path .\src-tauri\Cargo.toml
npm audit
cargo audit
```

---

## 3. Functional Smoke Test

| Workflow | Status (Pass/Fail) | Tester Initials | Notes |
|---|---|---|---|
| App launches on clean machine |  |  |  |
| Login and logout |  |  |  |
| Supplier and customer creation |  |  |  |
| Purchase and sales invoice creation |  |  |  |
| Payment posting |  |  |  |
| Reports render and filter |  |  |  |
| Settings persist after restart |  |  |  |

---

## 4. Data Safety and Recovery

| Item | Status (Pass/Fail) | Owner Initials | Notes |
|---|---|---|---|
| Manual backup created |  |  |  |
| Restore test completed |  |  |  |
| Post-restore integrity verified |  |  |  |
| Emergency rollback backup captured |  |  |  |

---

## 5. Artifact and Publishing Gate

| Item | Status (Done/Not Done) | Owner Initials | Notes |
|---|---|---|---|
| MSI/NSIS artifacts generated |  |  |  |
| Checksums generated |  |  |  |
| Release notes published |  |  |  |
| Distribution channel updated |  |  |  |
| Support team notified |  |  |  |

---

## 6. Release Decision

Decision (circle one): GO / NO-GO

Decision Time:

Decision Rationale:



---

## 7. Approval Signatures

Engineering Lead
Name:
Signature:
Date:

QA Lead
Name:
Signature:
Date:

Security Reviewer
Name:
Signature:
Date:

Release Manager
Name:
Signature:
Date:

---

## 8. First 24-Hour Monitoring Log

| Checkpoint Time | Crash Trend | Auth Failures | Backup/Restore Alerts | Performance Alerts | Support Queue Status | Owner |
|---|---|---|---|---|---|---|
| +1h |  |  |  |  |  |  |
| +4h |  |  |  |  |  |  |
| +8h |  |  |  |  |  |  |
| +24h |  |  |  |  |  |  |

Immediate escalation required if any of these occur:

- Data corruption or data loss risk
- Widespread login failure
- Multi-user startup crash
- Restore operation corruption

---

## 9. Audit Archive

Attach or reference:

- Build logs
- Security audit outputs
- Test results
- Backup/restore evidence
- Published artifact checksums

Archive Location:
Ticket/Change ID:
