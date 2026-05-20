# ASZ Nexus ERP Release Checklist

Use this checklist for every production release.

---

## 1. Planning

- [ ] Version number finalized
- [ ] Scope freeze confirmed
- [ ] Changelog drafted
- [ ] Risk review completed

---

## 2. Code Quality Gates

- [ ] npm run typecheck passes
- [ ] npm run test passes
- [ ] npm run build:prod passes
- [ ] cargo check --manifest-path .\src-tauri\Cargo.toml passes
- [ ] No unresolved P0 issues
- [ ] No unresolved P1 issues without explicit waiver

---

## 3. Security Gates

- [ ] npm audit reviewed and high/critical issues addressed
- [ ] cargo audit reviewed and high/critical issues addressed
- [ ] CSP policy unchanged or re-approved
- [ ] No production source maps shipped
- [ ] Console/debug leakage reviewed
- [ ] Token handling model re-validated
- [ ] SQL path escaping and backup safety checks validated

---

## 4. Functional Verification

- [ ] First-time setup works
- [ ] Login and logout work
- [ ] Session refresh works
- [ ] Inactivity lock works
- [ ] Vehicle arrival workflow works
- [ ] Purchase billing workflow works
- [ ] Sales billing workflow works
- [ ] Payment workflow works
- [ ] Reports load and filter correctly
- [ ] Settings save and persist correctly

---

## 5. Data Integrity and Recovery

- [ ] Manual backup works
- [ ] Auto backup works
- [ ] Restore from backup works
- [ ] Post-restore data integrity verified
- [ ] Emergency rollback backup created

---

## 6. Packaging and Distribution

- [ ] npm run tauri:build completes successfully
- [ ] Installer artifacts generated (MSI/NSIS)
- [ ] Installer launch verified on clean machine
- [ ] Version metadata is correct in app and artifacts
- [ ] Checksums generated and stored

---

## 7. Release Documentation

- [ ] Release notes finalized
- [ ] Known issues documented
- [ ] Upgrade and rollback steps documented
- [ ] Deployment runbook reviewed

---

## 8. Go/No-Go

Decision:

- [ ] GO
- [ ] NO-GO

Approvals:

- [ ] Engineering Lead
- [ ] QA Lead
- [ ] Security Reviewer
- [ ] Release Manager

Release date/time:

Post-release monitor owner:
