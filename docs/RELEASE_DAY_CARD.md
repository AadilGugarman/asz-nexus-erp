# ASZ Nexus ERP Release Day Card

Purpose: One-page go-live checklist for release coordinators and stakeholders.

Use this on release day with Yes/No status and owner initials.

---

## 1) Go/No-Go Inputs

- [ ] Version tag is final and approved
- [ ] Scope freeze is confirmed
- [ ] Critical defects list is empty or waived in writing
- [ ] Release owner and incident commander are assigned

---

## 2) Build and Security Gate

- [ ] Typecheck passed
- [ ] Test suite passed
- [ ] Production build passed
- [ ] Rust check passed
- [ ] npm audit reviewed
- [ ] cargo audit reviewed

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

## 3) Critical Functional Smoke Test

- [ ] App launches on clean machine
- [ ] Login and logout work
- [ ] Create supplier/customer records works
- [ ] Create purchase and sales invoices works
- [ ] Payment posting works
- [ ] Reports render and filter correctly
- [ ] Settings persist after restart

---

## 4) Data Safety Gate

- [ ] Manual backup created
- [ ] Restore test completed successfully
- [ ] Post-restore data integrity verified
- [ ] Emergency rollback backup captured

---

## 5) Artifact and Publishing Gate

- [ ] MSI/NSIS artifacts generated
- [ ] Artifact checksums generated
- [ ] Release notes published
- [ ] Distribution channel updated
- [ ] Support team notified

---

## 6) Release Decision

- [ ] GO
- [ ] NO-GO

Approved by:

- Engineering Lead:
- QA Lead:
- Security Reviewer:
- Release Manager:

Timestamp:

---

## 7) First 24h Monitoring

- [ ] Crash reports reviewed
- [ ] Auth failures reviewed
- [ ] Backup/restore incidents reviewed
- [ ] Performance regressions reviewed
- [ ] Customer support queue monitored

Escalate immediately if any of the below occurs:

- Data corruption or loss risk
- Widespread login failures
- Startup crash affecting multiple users
- Restore operation corruption
