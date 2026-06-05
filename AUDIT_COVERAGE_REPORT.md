# AUDIT_COVERAGE_REPORT.md

**Status:** Discovery Complete — Awaiting Review and Approval Before Implementation
**Produced:** 2026-06-05
**Scope:** System-wide audit coverage vs. PBAC_AND_AUDIT_MIGRATION.md requirements

---

## Executive Summary

The system has an **existing audit infrastructure** (`SecurityAuditService` + `security_audit_logs` table) with immutability enforced at the database level. However, audit coverage is **highly inconsistent**: some modules are well-audited at the service layer, while others have zero audit events. The audit schema itself is **materially non-compliant** with the unified standard required by PBAC_AND_AUDIT_MIGRATION.md — 9 of the 17 required fields are missing.

---

## 1. Current Audit Infrastructure

### 1.1 Audit Entity

```
Table: security_audit_logs
Columns:
  id          UUID        PK
  actor       VARCHAR     User email or "SYSTEM"
  action      VARCHAR(100)
  target      VARCHAR     Module or entity descriptor
  ip_address  VARCHAR(45)
  details     TEXT
  created_at  TIMESTAMP   Auto-set by @CreationTimestamp
```

### 1.2 Audit Service API

```java
// For authenticated requests (reads actor + IP from SecurityContext)
logEvent(String action, String target, String details)

// For unauthenticated or explicitly-specified context (login failures, password reset, etc.)
logEventWithActorAndIp(String actor, String action, String target, String ipAddress, String details)
```

### 1.3 Immutability

✅ PostgreSQL trigger `make_audit_logs_append_only` (V37) blocks all UPDATE and DELETE on `security_audit_logs`. This satisfies the immutability requirement.

---

## 2. Schema Compliance Analysis

### 2.1 Required Fields vs. Current Schema

| Required Field (PBAC_AND_AUDIT_MIGRATION.md) | Current Field | Status |
|---|---|---|
| Event ID | `id` (UUID) | ✅ Present |
| Timestamp | `created_at` (Instant) | ✅ Present |
| User ID | ❌ Not stored (only email) | ❌ **MISSING** |
| Username / Email | `actor` | ✅ Present |
| Member ID | ❌ Not stored | ❌ **MISSING** |
| Module | `target` (mixed use) | ⚠️ Partial (used as module AND entity) |
| Action | `action` | ✅ Present |
| Entity Type | ❌ Not stored | ❌ **MISSING** |
| Entity ID | ❌ Not stored | ❌ **MISSING** |
| Description | `details` | ✅ Present |
| Result | ❌ Not stored (success implied by entry existing) | ❌ **MISSING** |
| IP Address | `ip_address` | ✅ Present |
| User Agent | ❌ Not stored | ❌ **MISSING** |
| Session Identifier | ❌ Not stored | ❌ **MISSING** |
| Permission Used | ❌ Not stored | ❌ **MISSING** |
| Before State | ❌ Not stored | ❌ **MISSING** |
| After State | ❌ Not stored | ❌ **MISSING** |

**Compliance: 5 of 17 fields present. 9 fields missing entirely.**

### 2.2 Schema Migration Required

The following columns must be added to `security_audit_logs`:

```sql
ALTER TABLE security_audit_logs
    ADD COLUMN user_id        UUID,          -- FK to users.id
    ADD COLUMN member_id      UUID,          -- FK to members.id (nullable)
    ADD COLUMN entity_type    VARCHAR(100),  -- e.g. "LoanApplication", "Member"
    ADD COLUMN entity_id      UUID,          -- The specific entity affected
    ADD COLUMN result         VARCHAR(20),   -- "SUCCESS" | "FAILURE" | "DENIED"
    ADD COLUMN user_agent     TEXT,          -- HTTP User-Agent header
    ADD COLUMN session_id     VARCHAR(100),  -- Spring Session ID
    ADD COLUMN permission_used VARCHAR(80),  -- Permission that authorized the action
    ADD COLUMN before_state   JSONB,         -- Snapshot before change (nullable)
    ADD COLUMN after_state    JSONB;         -- Snapshot after change (nullable)
```

> **NOTE:** Adding columns to an immutable table requires careful migration. The trigger blocks UPDATE/DELETE but not ALTER TABLE. The new columns will be nullable for all existing rows.

---

## 3. Current Audit Coverage Inventory

### 3.1 Authentication Module ✅ Partial

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Login (success) | ✅ | `AuthController.login()` | (implicit — needs explicit) |
| Login (failure/wrong password) | ⚠️ | `AuthController` | Needs explicit event |
| Logout | ✅ | `AuthController.logout()` | Implicit |
| Password change | ✅ | `AuthController.changePassword()` | `PASSWORD_CHANGED`, `PASSWORD_CHANGE_FAILED` |
| Password reset request | ✅ | `AuthController.forgotPassword()` | `PASSWORD_RESET_REQUESTED` |
| Password reset completion | ✅ | `AuthController.resetPassword()` | `PASSWORD_RESET_COMPLETED` |
| MFA actions | ❌ | Not audited | — |
| Session creation | ❌ | Not audited | — |
| Session termination | ❌ | Not audited | — |
| Profile update | ✅ | `ProfileController.updateProfile()` | `PROFILE_UPDATED` |

### 3.2 User Management Module ⚠️ Partial

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| User creation | ✅ | `UserService.createUser()` | `USER_CREATED` |
| User modification | ✅ | `UserService.updateUser()` | `USER_UPDATED` |
| User activation | ✅ | `UserService` | `USER_ACTIVATED` |
| User suspension | ✅ | `UserService.updateUserStatus()` | `USER_STATUS_CHANGED` |
| User deletion | ✅ | `UserService.deleteUser()` | `USER_DELETED` |
| Email change | ✅ | `UserService.changeUserEmail()` | `USER_EMAIL_CHANGED` |
| Permission assignment | ✅ | `RoleService.updateRolePermissions()` | `PERMISSIONS_UPDATED` |
| Role assignment | ✅ | `UserService.updateUserRoles()` | `USER_ROLES_UPDATED` |
| Role creation | ✅ | `RoleService.createRole()` | `ROLE_CREATED` |
| Role update | ✅ | `RoleService.updateRole()` | `ROLE_UPDATED` |
| Role deletion | ✅ | `RoleService.deleteRole()` | `ROLE_DELETED` |

### 3.3 Member Module ✅ Good

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Member creation | ✅ | `MemberController.createMember()` | `MEMBER_CREATED` |
| Member modification | ✅ | `MemberController.updateMember()` | `MEMBER_UPDATED` |
| Member status change | ✅ | `MemberController.updateStatus()` | `MEMBER_STATUS_CHANGED` |
| Member deletion (soft) | ✅ | `MemberController.deleteMember()` | `MEMBER_DELETED` |

### 3.4 Savings Module ✅ Good

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Manual deposit | ✅ | `SavingsService.processManualDeposit()` | `SAVINGS_DEPOSIT` |
| Manual withdrawal | ✅ | `SavingsService.processManualWithdrawal()` | `SAVINGS_WITHDRAWAL` |
| M-Pesa deposit initiated | ✅ | `SavingsService.initiateMpesaDeposit()` | `SAVINGS_MPESA_INITIATED` |
| M-Pesa deposit completed | ❌ | `SavingsPaymentListener` — NOT audited | — |
| M-Pesa deposit failed | ❌ | `SavingsPaymentListener` — NOT audited | — |
| Savings adjustment/reversal | ❌ | No reversal mechanism exists yet | — |

### 3.5 Loan Module ✅ Well Covered

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Loan application | ✅ | `LoanApplicationService.applyForLoan()` | `LOAN_APPLIED` |
| Loan verification (first level) | ✅ | `LoanApplicationService.verifyApplication()` | `LOAN_VERIFIED` |
| Loan approval (committee) | ✅ | `LoanApplicationService.approveApplication()` | `LOAN_APPROVED` |
| Loan rejection | ✅ | `LoanApplicationService.rejectApplication()` | `LOAN_REJECTED` |
| Loan disbursement | ✅ | `LoanApplicationService.disburseApplication()` | `LOAN_DISBURSED` |
| Loan refinancing | ✅ | `LoanApplicationService.refinanceLoan()` | `LOAN_REFINANCED` |
| Guarantor added | ✅ | `LoanApplicationService` | `LOAN_GUARANTOR_ADDED` |
| Repayment initiated | ✅ | `LoanRepaymentService.initiateRepayment()` | `LOAN_REPAYMENT_INITIATED` |
| Repayment completed (via payment) | ✅ | `LoanRepaymentService.processCompletedRepayment()` | `LOAN_REPAYMENT_COMPLETED` |
| Repayment failed | ✅ | `LoanRepaymentService` | `LOAN_REPAYMENT_FAILED` |
| Schedule job (overdue detection) | ❌ | `LoanScheduleJob` — NOT audited | — |

### 3.6 Accounting Module ⚠️ Partial

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Manual journal entry posted | ✅ | `JournalEntryService.postEntry()` | `JOURNAL_ENTRY_POSTED` |
| GL account created | ❌ | `AccountService.createAccount()` — NOT audited | — |
| GL account modified | ❌ | `AccountService.updateAccount()` — NOT audited | — |
| System journal entries (savings, loan, asset, expense) | ⚠️ | Posted programmatically — no dedicated audit event | — |

### 3.7 Payments Module ✅ Well Covered

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| STK push initiated | ✅ | `PaymentService` | `PAYMENT_INITIATED` |
| Payment completed | ✅ | `PaymentService` | `PAYMENT_COMPLETED` |
| Payment failed | ✅ | `PaymentService` | `PAYMENT_FAILED` |
| Co-op IPN received | ✅ | `PaymentService` | Covered |
| Pending payment polling | ❌ | `PendingPaymentPollingJob` — NOT audited | — |

### 3.8 Penalties Module ⚠️ Partial

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Penalty accrual | ✅ | `PenaltyService.applyMissedInstallmentPenalty()` | `PENALTY_APPLIED` |
| Penalty waiver | ✅ | `PenaltyService.waivePenalty()` | `PENALTY_WAIVED` |
| Penalty repayment completed | ✅ | `PenaltyRepaymentService.processCompletedRepayment()` | `PENALTY_REPAID` |
| Penalty repayment failed | ❌ | Not explicitly audited | — |
| Daily penalty interest accrual (job) | ❌ | `PenaltyJob` — NOT audited | — |

### 3.9 Meetings Module ✅ Good

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Meeting created | ✅ | `MeetingService.createMeeting()` | `MEETING_CREATED` |
| Meeting updated | ✅ | `MeetingService.updateMeeting()` | `MEETING_UPDATED` |
| Meeting canceled | ✅ | `MeetingService.cancelMeeting()` | `MEETING_CANCELED` |
| Meeting completed | ✅ | `MeetingService.completeMeeting()` | `MEETING_COMPLETED` |
| Meeting attendance recorded | ✅ | `MeetingService.recordAttendance()` | `MEETING_ATTENDANCE_RECORDED` |
| Meeting penalty applied | ✅ | `MeetingPenaltyService` | `MEETING_PENALTY_APPLIED` |
| Attendance seed job | ❌ | `MeetingAttendanceSeedJob` — NOT audited | — |
| Auto-complete job | ❌ | `MeetingAutoCompleteJob` — NOT audited | — |

### 3.10 Obligations Module ❌ NOT Audited

| Event | Covered? | Where |
|---|---|---|
| Obligation created | ❌ | `ObligationService.createObligation()` — no audit call |
| Obligation updated | ❌ | `ObligationService.updateObligation()` — no audit call |
| Obligation status changed | ❌ | `ObligationService.updateStatus()` — no audit call |
| Obligation evaluation job | ❌ | `ObligationEvaluationJob` — no audit call |
| Period compliance recorded | ❌ | `ObligationPeriodService` — no audit call |

### 3.11 Settings Module ✅ Good

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Settings initialized | ✅ | `SaccoSettingsController` | `SETTINGS_INITIALIZED` |
| Settings updated | ✅ | `SaccoSettingsController` | `SETTINGS_UPDATED` |
| Security policy updated | ✅ | `SaccoSettingsController` | `SECURITY_POLICY_UPDATED` |
| Communication settings updated | ✅ | `SaccoSettingsController` | `COMMUNICATION_SETTINGS_UPDATED` |
| Feature flags updated | ✅ | `SaccoSettingsController` | `FEATURE_FLAGS_UPDATED` |

### 3.12 Expense Claims Module ✅ Good

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Claim submitted | ✅ | `ExpenseClaimService.submitClaim()` | `EXPENSE_CLAIM_SUBMITTED` |
| Claim approved | ✅ | `ExpenseClaimService.reviewClaim()` | `EXPENSE_CLAIM_APPROVED` |
| Claim rejected | ✅ | `ExpenseClaimService.reviewClaim()` | `EXPENSE_CLAIM_REJECTED` |
| Claim settled/reimbursed | ✅ | `ExpenseClaimService` | `EXPENSE_CLAIM_REIMBURSED` |

### 3.13 Assets Module ✅ Partial

| Event | Covered? | Where | Event Code |
|---|---|---|---|
| Asset created | ✅ | `AssetService` | `ASSET_CREATED` |
| Asset status changed (dispose/maintenance) | ✅ | `AssetService` | `ASSET_DISPOSED` / `ASSET_STATUS_CHANGED` |
| Asset modification (other fields) | ⚠️ | May not be fully covered | — |

### 3.14 Reports Module ❌ NOT Audited

| Event | Covered? | Where |
|---|---|---|
| Report generation (staff) | ❌ | `ReportController` / `ReportService` — no audit calls |
| Report export | ❌ | No export mechanism yet |
| Member statement accessed | ❌ | `ReportController.getMemberStatement()` — no audit call |

### 3.15 Audit Module — Self-Audit ❌ NOT Audited

| Event | Covered? | Note |
|---|---|---|
| Audit log searched | ❌ | `AuditController.getLogs()` does not log access |
| Audit log exported | ❌ | No export mechanism exists |

---

## 4. Coverage Summary by Module

| Module | Audit Coverage | Status |
|---|---|---|
| Authentication | Login/Logout events partial | ⚠️ Partial |
| User Management | All CRUD + role/permission changes | ✅ Good |
| Members | All CRUD + status changes | ✅ Good |
| Savings | Manual ops covered; payment listener not covered | ⚠️ Partial |
| Loans | All workflow states covered; schedule job not covered | ✅ Good |
| Accounting | Manual journal only; account CRUD not audited | ⚠️ Partial |
| Payments | Most covered; polling job not covered | ⚠️ Partial |
| Penalties | Waiver/accrual covered; daily job not covered | ⚠️ Partial |
| Meetings | Most operations covered; jobs not covered | ✅ Good |
| **Obligations** | **ZERO audit coverage** | ❌ Not Audited |
| Settings | All operations covered | ✅ Good |
| Expense Claims | All lifecycle events covered | ✅ Good |
| Assets | Creation and disposal covered | ✅ Partial |
| **Reports** | **ZERO audit coverage** | ❌ Not Audited |
| **Audit (self)** | **ZERO self-audit** | ❌ Not Audited |

---

## 5. Audit Coverage Gaps Summary

### 5.1 Modules with Zero Coverage

1. **Obligations Module** — `ObligationService` and `ObligationPeriodService` have 0 `securityAuditService` calls.
2. **Reports Module** — `ReportService` and `ReportController` have 0 audit calls. Every report access is invisible.
3. **Audit Module (self)** — `AuditController.getLogs()` does not log that audit data was accessed — a significant gap for forensic completeness.

### 5.2 Scheduled Jobs (ALL Unaudited)

None of the 6 scheduled jobs generate audit events:

| Job | Risk |
|---|---|
| `LoanScheduleJob` | Silent overdue detection and status changes |
| `PenaltyJob` | Silent daily penalty interest accrual |
| `PendingPaymentPollingJob` | Silent payment status polling and status mutations |
| `MeetingAttendanceSeedJob` | Silent attendance record creation |
| `MeetingAutoCompleteJob` | Silent meeting status changes |
| `ObligationEvaluationJob` | Silent obligation period evaluation |

### 5.3 Event Listeners (ALL Unaudited)

None of the 4 event listeners generate audit events:

| Listener | Risk |
|---|---|
| `SavingsPaymentListener` | Silent savings transaction status changes (PENDING→POSTED/FAILED) |
| `MemberPaymentListener` | Silent member payment processing |
| `LoanPenaltyEventListener` | Silent penalty application from loan events |
| `PenaltyPaymentListener` | Silent penalty repayment completion/failure |

### 5.4 Accounting Gaps

- `AccountService.createAccount()` — no audit
- `AccountService.updateAccount()` — no audit
- System-generated journal entries (from savings, loan, penalty, expense, asset flows) are posted without dedicated audit events. They are traceable via the journal entries table itself, but not via the audit log.

### 5.5 Schema Gaps (Critical for Standard Compliance)

The audit schema is missing 9 required fields. Most impactful missing fields:
- `user_id` — makes it impossible to join audit records to user records if emails change
- `entity_id` + `entity_type` — makes structured queries by entity impossible
- `permission_used` — required by PBAC standard to show what permission authorized each action
- `before_state` / `after_state` — required for complete change tracking (financial compliance)
- `result` — failure events currently require inferential analysis; an explicit field is needed

---

## 6. Audit System Risks

| Risk | Severity | Description |
|---|---|---|
| Schema non-compliance | 🔴 HIGH | 9 of 17 required fields missing. Structural schema migration needed. |
| Obligations not audited | 🔴 HIGH | Financial compliance obligation changes are invisible |
| Report access not audited | 🔴 HIGH | Staff viewing member financial data is not recorded |
| All scheduled jobs unaudited | 🔴 HIGH | System-initiated financial state changes are invisible |
| All event listeners unaudited | 🔴 HIGH | Payment-driven state changes are invisible |
| Audit access not self-audited | 🟡 MEDIUM | Who searches the audit log is not recorded |
| Actor stored as email | 🟡 MEDIUM | Email changes would break actor-based queries |
| Login/logout not explicitly audited | 🟡 MEDIUM | Authentication events not consistently recorded |
| Accounting CRUD not audited | 🟡 MEDIUM | GL account creation and modification invisible |

---

## 7. Phased Audit Remediation Plan

> **Rule:** No implementation begins until this report is reviewed and approved.

### Phase A — Schema Migration *(High Impact, Foundational)*

**Goal:** Add the 9 missing columns to `security_audit_logs`.

- Create `V71__extend_audit_log_schema.sql` (or coordinate with PBAC Phase 1 migration number)
- All new columns nullable for backward compatibility
- Update `SecurityAuditLog` entity and `SecurityAuditService` to accept optional new fields
- Update `AuditLogDTO` with new fields
- **Do NOT change existing callers yet** — new fields simply remain null until callers are updated

### Phase B — Obligations Module Audit *(Medium Risk)*

**Goal:** Add audit logging to `ObligationService` and `ObligationPeriodService`.

Events to add:
- `OBLIGATION_CREATED`, `OBLIGATION_UPDATED`, `OBLIGATION_STATUS_CHANGED`
- `OBLIGATION_PERIOD_EVALUATED`

### Phase C — Reports Module Audit *(Low Risk)*

**Goal:** Add audit logging to `ReportController` or `ReportService`.

Events to add:
- `REPORT_ACCESSED` (staff)
- `MEMBER_STATEMENT_ACCESSED`
- `LOAN_ARREARS_REPORT_ACCESSED`

### Phase D — Audit Self-Logging *(Low Risk)*

**Goal:** Log audit log access in `AuditController`.

Events to add:
- `AUDIT_LOG_SEARCHED` (actor, filter params, result count)

### Phase E — Scheduled Job Audit *(Medium Risk)*

**Goal:** Add system-level audit events to all 6 scheduled jobs.

**Approach:** Use `actor = "SYSTEM"`, `result = "SUCCESS"/"FAILURE"`, and record entity count affected.

Events to add per job:
- `LoanScheduleJob` → `LOAN_SCHEDULE_JOB_RUN`
- `PenaltyJob` → `PENALTY_ACCRUAL_JOB_RUN`
- `PendingPaymentPollingJob` → `PAYMENT_POLLING_JOB_RUN`
- `MeetingAttendanceSeedJob` → `MEETING_ATTENDANCE_SEED_RUN`
- `MeetingAutoCompleteJob` → `MEETING_AUTO_COMPLETE_RUN`
- `ObligationEvaluationJob` → `OBLIGATION_EVALUATION_RUN`

### Phase F — Event Listener Audit *(Medium Risk)*

**Goal:** Add audit events in all 4 event listeners for state-changing operations.

Events to add:
- `SavingsPaymentListener` → `SAVINGS_MPESA_DEPOSIT_CONFIRMED`, `SAVINGS_MPESA_DEPOSIT_FAILED`
- `LoanPenaltyEventListener` → `LOAN_PENALTY_APPLIED_VIA_EVENT`
- `PenaltyPaymentListener` → `PENALTY_REPAYMENT_CONFIRMED`, `PENALTY_REPAYMENT_FAILED`

### Phase G — Accounting CRUD Audit *(Low Risk)*

**Goal:** Add audit logging to `AccountService`.

Events to add:
- `GL_ACCOUNT_CREATED`, `GL_ACCOUNT_UPDATED`

### Phase H — Enrich Existing Events *(Medium Risk)*

**Goal:** Populate the new schema fields in existing audit call sites.

Priority order:
1. Add `user_id` to all existing `logEvent()` calls
2. Add `entity_type` + `entity_id` to financial events (savings, loans, payments)
3. Add `permission_used` to events where the permission is known
4. Add `result` field to all events
5. Add `before_state`/`after_state` to high-value financial mutations (savings transactions, loan disbursements, penalty waivers, expense approvals)

### Phase I — Login/Logout Explicit Audit *(Low Risk)*

**Goal:** Add explicit, structured audit events for authentication lifecycle.

Events to add:
- `LOGIN_SUCCESS` (with user_id, session_id, ip, user_agent)
- `LOGIN_FAILURE` (with actor/email, ip, user_agent)
- `LOGOUT` (with user_id, session_id)
- `SESSION_EXPIRED` (if detectable)
- `MFA_VERIFIED`, `MFA_FAILED`

---

## 8. Approval Checklist

Before any audit implementation begins:

- [ ] Schema migration approach agreed (nullable columns, impact on immutability trigger)
- [ ] Unified `SecurityAuditService` API extension approved
- [ ] Phase ordering confirmed
- [ ] `before_state`/`after_state` storage strategy agreed (JSONB vs. text serialization)
- [ ] Implementation approved by project lead
