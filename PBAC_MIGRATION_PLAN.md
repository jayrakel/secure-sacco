# PBAC_MIGRATION_PLAN.md

**Status:** Approved for implementation after sign-off on all three catalog documents.
**Last Updated:** 2026-06-05
**Prerequisite reads:** `PERMISSION_CATALOG.md`, `AUDIT_EVENT_STANDARD.md`, `PROJECT_CONTEXT.md`

---

## Guiding Principles

1. **Never break production.** Every phase must be independently deployable and independently rollback-able.
2. **Database first.** Add permissions and schema columns before touching any controller or frontend.
3. **One module at a time.** Never change multiple modules in the same PR.
4. **Tests before merge.** Every phase has mandatory tests that must pass before the PR is merged.
5. **Audit changes.** The audit schema migration (Phase A) must land before any service-layer audit enrichment.

---

## Phase Overview

| Phase | Type | Risk | Focus |
|---|---|---|---|
| **A** | DB migration | 🟢 Low | Extend audit schema (add 9 columns) |
| **B** | DB migration | 🟢 Low | Seed 12 new PBAC permissions |
| **1** | Backend | 🟢 Low | CoopConnect `hasAnyRole()` → `hasAnyAuthority()` |
| **2** | Backend | 🟢 Low | Settings & Loan Products `ROLE_SYSTEM_ADMIN`-only endpoints |
| **3** | Backend | 🟡 Medium | Member self-service `ROLE_MEMBER` → named permissions |
| **4** | Backend | 🟡 Medium | Staff-facing `ROLE_SYSTEM_ADMIN` fallback removal (12 controllers) |
| **5** | Backend | 🟡 Medium | Obligations & Reports audit coverage |
| **6** | Backend | 🟡 Medium | Scheduled jobs & event listeners audit coverage |
| **7** | Backend | 🟡 Medium | Audit schema enrichment in existing call sites |
| **8** | Frontend | 🟡 Medium | Remove `ROLE_SYSTEM_ADMIN` bypasses from components |
| **9** | Frontend | 🟡 Medium | Dashboard router decoupling |
| **10** | Frontend | 🟢 Low | Permission guards on ungated routes |
| **11** | Backend | 🔴 High | ReportController inline auth refactor |

---

## Phase A — Extend Audit Schema

**Branch:** `chore/audit-schema-extension`
**Migration:** `V71__extend_audit_log_schema.sql`

### Changes

- Add 9 nullable columns to `security_audit_logs` (see `AUDIT_EVENT_STANDARD.md §1.2`)
- Add `result` column with `DEFAULT 'SUCCESS'`
- Add `chk_audit_result` constraint
- Add missing indexes

### Rollback

```sql
-- If migration must be reverted before any data uses new columns:
ALTER TABLE security_audit_logs
    DROP COLUMN IF EXISTS user_id,
    DROP COLUMN IF EXISTS member_id,
    DROP COLUMN IF EXISTS session_id,
    DROP COLUMN IF EXISTS permission_used,
    DROP COLUMN IF EXISTS result,
    DROP COLUMN IF EXISTS entity_type,
    DROP COLUMN IF EXISTS entity_id,
    DROP COLUMN IF EXISTS user_agent,
    DROP COLUMN IF EXISTS before_state,
    DROP COLUMN IF EXISTS after_state;
```

> **Note:** Once rows with new column data are written, column removal is destructive. Run rollback only if deploying within the same release window.

### Tests

- [ ] Migration runs clean on fresh schema
- [ ] Migration is idempotent (re-run does not error)
- [ ] Existing audit log rows are unaffected (`SELECT COUNT(*) before == after`)
- [ ] Immutability trigger still prevents UPDATE/DELETE after migration

---

## Phase B — Seed New PBAC Permissions

**Branch:** `chore/seed-new-pbac-permissions`
**Migration:** `V72__seed_new_pbac_permissions.sql`

### Changes

- Insert 12 new permission codes (see `PERMISSION_CATALOG.md §5`)
- Grant `SETTINGS_READ`, `SETTINGS_EDIT` to SYSTEM_ADMIN
- Grant `LOAN_PRODUCTS_MANAGE` to SYSTEM_ADMIN
- Grant `BANKING_READ` to SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, CASHIER, DEPUTY_CASHIER, CHAIRPERSON
- Grant `BANKING_MANAGE` to SYSTEM_ADMIN, TREASURER, CASHIER
- Grant `MEMBER_LOANS_VIEW`, `MEMBER_LOANS_APPLY` to MEMBER role
- Grant `MEMBER_PENALTIES_VIEW` to MEMBER role
- Grant `MEMBER_SAVINGS_VIEW` to MEMBER role
- Grant `MEMBER_EXPENSE_SUBMIT` to MEMBER role
- Grant `MEMBER_OBLIGATIONS_VIEW` to MEMBER role
- Grant `MEMBER_DASHBOARD_VIEW` to MEMBER role

### Rollback

```sql
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE code IN (
        'SETTINGS_READ','SETTINGS_EDIT','LOAN_PRODUCTS_MANAGE',
        'BANKING_READ','BANKING_MANAGE','MEMBER_LOANS_VIEW',
        'MEMBER_LOANS_APPLY','MEMBER_PENALTIES_VIEW','MEMBER_SAVINGS_VIEW',
        'MEMBER_EXPENSE_SUBMIT','MEMBER_OBLIGATIONS_VIEW','MEMBER_DASHBOARD_VIEW'
    )
);
DELETE FROM permissions WHERE code IN (
    'SETTINGS_READ','SETTINGS_EDIT','LOAN_PRODUCTS_MANAGE',
    'BANKING_READ','BANKING_MANAGE','MEMBER_LOANS_VIEW',
    'MEMBER_LOANS_APPLY','MEMBER_PENALTIES_VIEW','MEMBER_SAVINGS_VIEW',
    'MEMBER_EXPENSE_SUBMIT','MEMBER_OBLIGATIONS_VIEW','MEMBER_DASHBOARD_VIEW'
);
```

### Tests

- [ ] All 12 permissions exist in DB after migration
- [ ] SYSTEM_ADMIN session includes new permissions in `/auth/me` response
- [ ] MEMBER session includes new member permissions in `/auth/me` response
- [ ] TREASURER session includes `BANKING_READ` in `/auth/me` response

---

## Phase 1 — CoopConnect: Remove `hasAnyRole()`

**Branch:** `feat/pbac-phase-1-coopconnect`
**Depends on:** Phase B complete and deployed

### Module: `payments/api/controller/CoopConnectController`

**Changes:**

| Endpoint | Old Expression | New Expression |
|---|---|---|
| GET `/coop/balance` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','LOAN_OFFICER')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/mini-statement` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','SECRETARY')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/transactions` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/transaction-status/{ref}` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CASHIER','DEPUTY_CASHIER')` | `hasAuthority('BANKING_READ')` |

No service layer changes. No audit changes.

### Rollback

Revert `@PreAuthorize` annotation back to `hasAnyRole(...)`. No DB changes to undo.

### Tests

- [ ] TREASURER can call all 4 endpoints → HTTP 200
- [ ] CASHIER can call transaction-status → HTTP 200
- [ ] SECRETARY can no longer call transactions (not granted `BANKING_READ`) → HTTP 403 *(confirm this is the intended behavior)*
- [ ] MEMBER cannot call any banking endpoint → HTTP 403
- [ ] SYSTEM_ADMIN can call all endpoints → HTTP 200

---

## Phase 2 — Settings & Loan Products

**Branch:** `feat/pbac-phase-2-settings-loanproducts`
**Depends on:** Phase B complete and deployed

### Module 1: `settings/api/controller/SaccoSettingsController`

| Endpoint Group | Old Expression | New Expression |
|---|---|---|
| GET `/settings/sacco` (public) | already public | no change |
| GET `/settings/*` (staff) | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SETTINGS_READ')` |
| POST/PUT/PATCH `/settings/*` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SETTINGS_EDIT')` |

### Module 2: `loans/api/controller/LoanProductController`

| Endpoint | Old Expression | New Expression |
|---|---|---|
| POST `/products` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('LOAN_PRODUCTS_MANAGE')` |
| PUT `/products/{id}` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('LOAN_PRODUCTS_MANAGE')` |

### Module 3: `obligations/api/controller/ObligationController`

| Endpoint | Old Expression | New Expression |
|---|---|---|
| POST `/evaluate` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_OBLIGATIONS_MANAGE')` |

### Rollback

Revert `@PreAuthorize` annotations. No DB changes needed.

### Tests

- [ ] SYSTEM_ADMIN can access settings (reads and writes) → HTTP 200
- [ ] ACCOUNTANT cannot access settings → HTTP 403
- [ ] SYSTEM_ADMIN can create/update loan products → HTTP 200/201
- [ ] TREASURER cannot create loan products → HTTP 403
- [ ] TREASURER can trigger obligation evaluation → HTTP 200

---

## Phase 3 — Member Self-Service: `ROLE_MEMBER` → Named Permissions

**Branch:** `feat/pbac-phase-3-member-permissions`
**Depends on:** Phase B complete and deployed

### Affected Controllers

| Controller | Endpoints | Old → New |
|---|---|---|
| `LoanApplicationController` | POST `/`, `/{id}/submit`, `/{id}/pay-fee`, `/{id}/repay`, `/{id}/guarantors`, DELETE `/{id}/guarantors/{id}` | `ROLE_MEMBER` → `MEMBER_LOANS_APPLY` |
| `LoanApplicationController` | GET `/my` | `ROLE_MEMBER` → `MEMBER_LOANS_VIEW` |
| `LoanReportingController` | GET `/{id}/summary/member` | `ROLE_MEMBER` → `MEMBER_LOANS_VIEW` |
| `PenaltyController` | GET `/my/penalties`, `/my/penalties/{id}` | `ROLE_MEMBER` → `MEMBER_PENALTIES_VIEW` |
| `ExpenseClaimController` | POST `/my`, GET `/my` | `ROLE_MEMBER` → `MEMBER_EXPENSE_SUBMIT` |
| `ReportController` | GET `/members/{id}/financial-overview` | `ROLE_MEMBER` → `MEMBER_LOANS_VIEW` |
| `DashboardController` | GET `/member-metrics` | `ROLE_MEMBER` → `MEMBER_DASHBOARD_VIEW` |
| `DashboardController` | GET `/staff-metrics` | `isAuthenticated() && !ROLE_MEMBER` → `hasAnyAuthority('MEMBERS_READ','SAVINGS_READ','LOANS_READ','REPORTS_READ')` |
| `ObligationController` | GET `/my`, `/my/history` | `'SAVINGS_OBLIGATIONS_READ','ROLE_MEMBER','ROLE_SYSTEM_ADMIN'` → `MEMBER_OBLIGATIONS_VIEW` |
| `SavingsController` | GET `/me/balance`, `/me/statement`, POST `/deposits/mpesa/initiate` | `isAuthenticated()` → `MEMBER_SAVINGS_VIEW` |

### Rollback

Revert `@PreAuthorize` annotations. No DB changes needed (permissions remain in DB — harmless).

### Tests

- [ ] Member with `MEMBER_LOANS_APPLY` can apply for a loan → HTTP 201
- [ ] Member with `MEMBER_LOANS_VIEW` can view their loan list → HTTP 200
- [ ] Member with `MEMBER_PENALTIES_VIEW` can view their penalties → HTTP 200
- [ ] Staff user (TREASURER) cannot call `/my` member endpoints → HTTP 403
- [ ] Member cannot call staff endpoints → HTTP 403
- [ ] SYSTEM_ADMIN can call all member endpoints (has all permissions) → HTTP 200
- [ ] `/staff-metrics` returns 403 for MEMBER → HTTP 403
- [ ] `/staff-metrics` returns 200 for TREASURER → HTTP 200

---

## Phase 4 — Staff Controllers: Remove `ROLE_SYSTEM_ADMIN` Fallback

**Branch:** `feat/pbac-phase-4-remove-admin-fallback`
**Depends on:** Phase B complete and deployed

> This is the highest-volume change — 28+ annotation changes across 9 controllers. Implement as a single PR but review per-controller in code review.

### Modules Affected (in order)

1. `MemberController` (6 endpoints)
2. `SavingsController` (2 endpoints — manual post)
3. `AccountController` (3 endpoints)
4. `JournalEntryController` (2 endpoints)
5. `LoanApplicationController` (3 endpoints — `/all`, `/queue`, `/refinance`)
6. `PenaltyController` (2 endpoints — staff)
7. `PenaltyRuleController` (3 endpoints)
8. `ExpenseClaimController` (2 endpoints — staff)
9. `PublicController` (18 endpoints)
10. `ObligationController` (4 endpoints — staff)
11. `UserController` (1 endpoint — email change)
12. `RoleController` (1 endpoint — delete)

**Pattern applied throughout:** Remove `'ROLE_SYSTEM_ADMIN'` from every `hasAnyAuthority(...)`. See `PERMISSION_CATALOG.md §4.1` for the complete per-endpoint mapping.

### Rollback

Revert `@PreAuthorize` annotations. No DB changes needed.

### Tests

- [ ] For each controller: SYSTEM_ADMIN can access all endpoints → HTTP 200 *(proves DB permission grants work)*
- [ ] For each controller: appropriate staff role can access their permitted endpoints → HTTP 200
- [ ] For each controller: MEMBER cannot access staff endpoints → HTTP 403
- [ ] For each controller: unauthenticated requests return → HTTP 401
- [ ] Session invalidation still works when roles change (RoleService test)

---

## Phase 5 — Audit: Obligations & Reports Modules

**Branch:** `feat/audit-phase-5-obligations-reports`
**Depends on:** Phase A complete and deployed

### Module 1: `ObligationService`

Add `SecurityAuditService` injection and log events for:
- `createObligation()` → `OBLIGATION_CREATED`
- `updateObligation()` → `OBLIGATION_UPDATED`
- `updateStatus()` → `OBLIGATION_STATUS_CHANGED`

### Module 2: `ObligationPeriodService`

- `evaluateAll()` → `OBLIGATION_EVALUATION_RUN` (system event, summary format)
- Per-obligation evaluation failure → `OBLIGATION_PERIOD_EVALUATED` with `result=FAILURE`

### Module 3: `ReportController` / `ReportService`

Add logging at controller level for:
- All `REPORTS_READ`-gated endpoints → `REPORT_ACCESSED`
- Member financial overview → `MEMBER_STATEMENT_ACCESSED` (with `entity_type=Member`, `entity_id=memberId`)

### Module 4: `AuditController`

Add self-audit logging in `getLogs()`:
- → `AUDIT_LOG_SEARCHED` with filter params in `details`

### Rollback

Remove audit calls. No DB changes needed (columns already nullable).

### Tests

- [ ] Creating an obligation produces an `OBLIGATION_CREATED` audit row
- [ ] Audit row has `entity_type = 'SavingsObligation'`, `entity_id` set, `result = 'SUCCESS'`
- [ ] Accessing a report produces a `REPORT_ACCESSED` audit row
- [ ] Accessing audit logs produces an `AUDIT_LOG_SEARCHED` audit row

---

## Phase 6 — Audit: Scheduled Jobs & Event Listeners

**Branch:** `feat/audit-phase-6-jobs-listeners`
**Depends on:** Phase A complete and deployed

### System Actor Pattern

All 10 components use `logSystemEvent(actor="SYSTEM:{ClassName}", ...)`. See `AUDIT_EVENT_STANDARD.md §5`.

### Components

| Component | Event Code | Timing |
|---|---|---|
| `LoanScheduleJob` | `LOAN_OVERDUE_DETECTED` per loan, `LOAN_SCHEDULE_JOB_RUN` summary | After run |
| `PenaltyJob` | `PENALTY_ACCRUAL_RUN` summary | After run |
| `PendingPaymentPollingJob` | `PAYMENT_POLLING_RUN` summary | After run |
| `MeetingAttendanceSeedJob` | `MEETING_ATTENDANCE_SEED_RUN` summary | After run |
| `MeetingAutoCompleteJob` | `MEETING_AUTO_COMPLETE_RUN` summary | After run |
| `ObligationEvaluationJob` | `OBLIGATION_EVALUATION_RUN` summary (moved from Phase 5) | After run |
| `SavingsPaymentListener` | `SAVINGS_MPESA_CONFIRMED` / `SAVINGS_MPESA_FAILED` | On event |
| `MemberPaymentListener` | `PAYMENT_COMPLETED` / `PAYMENT_FAILED` | On event |
| `LoanPenaltyEventListener` | `PENALTY_APPLIED` | On event |
| `PenaltyPaymentListener` | `PENALTY_REPAID` / `PENALTY_REPAYMENT_FAILED` | On event |

### Rollback

Remove audit calls. No DB changes needed.

### Tests

- [ ] Each job produces exactly one summary audit row per run
- [ ] Summary row has `actor = 'SYSTEM:{ClassName}'`, `user_id = null`, `ip_address = null`
- [ ] `SavingsPaymentListener` produces `SAVINGS_MPESA_CONFIRMED` with `entity_type = 'SavingsTransaction'`
- [ ] Failed payment in listener produces `result = 'FAILURE'`

---

## Phase 7 — Audit: Enrich Existing Call Sites

**Branch:** `feat/audit-phase-7-enrich-existing`
**Depends on:** Phase A complete and deployed
**Strategy:** Implement in module order — one PR per module.

### Enrichment Priority Order

| Priority | Module | Fields to Add |
|---|---|---|
| 1 | Auth (login, logout) | `user_id`, `session_id`, `user_agent`, `result` |
| 2 | Savings | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 3 | Loans (financial) | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 4 | Payments | `entity_type`, `entity_id`, `result` |
| 5 | Penalties | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 6 | Expense Claims | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 7 | Members | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 8 | Users & Roles | `entity_type`, `entity_id`, `before_state`, `after_state`, `result` |
| 9 | Meetings | `entity_type`, `entity_id`, `result` |
| 10 | Settings | `entity_type`, `before_state`, `after_state`, `result` |

### Tests (per module)

- [ ] Audit row contains `entity_id` matching the affected record's UUID
- [ ] `before_state` and `after_state` are valid JSON and contain expected fields
- [ ] `result = 'FAILURE'` rows exist for error scenarios
- [ ] No PII (passwordHash, raw MSISDN) in state snapshots

---

## Phase 8 — Frontend: Remove SYSTEM_ADMIN Role Bypasses

**Branch:** `feat/pbac-phase-8-frontend-admin-bypass`
**Depends on:** Phase 4 backend complete (SYSTEM_ADMIN must have all permissions in DB)

### Changes

#### `ProtectedRoute.tsx`

Remove the block:
```tsx
// DELETE THIS BLOCK:
if (user.roles?.includes('ROLE_SYSTEM_ADMIN')) {
    return <>{children}</>;
}
```

#### `HasPermission.tsx`

Remove the block:
```tsx
// DELETE THIS BLOCK:
if (user.roles?.includes('ROLE_SYSTEM_ADMIN')) {
    return <>{children}</>;
}
```

#### `App.tsx`

| Line | Old | New |
|---|---|---|
| L308 | `requiredPermissions={['ROLE_SYSTEM_ADMIN']}` | `requiredPermissions={['SETTINGS_EDIT']}` |
| L342 | `permissions={['EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN']}` | `permissions={['EXPENSE_CLAIMS_APPROVE']}` |
| L361 | `permissions={['ASSET_READ', 'ROLE_SYSTEM_ADMIN']}` | `permissions={['ASSET_READ']}` |
| L374 | `permissions={['ROLE_SYSTEM_ADMIN', 'PENALTIES_MANAGE_RULES']}` | `permissions={['SETTINGS_EDIT', 'PENALTIES_MANAGE_RULES']}` |

### Rollback

Revert component changes. No DB changes needed.

### Tests

- [ ] SYSTEM_ADMIN user can navigate to `/permissions-registry`, `/settings`, `/expense/claims`, `/assets` after bypass removal
- [ ] MEMBER cannot navigate to any of those routes → redirected to `/dashboard`
- [ ] TREASURER can navigate to `/expense/claims` (has `EXPENSE_CLAIMS_APPROVE`)
- [ ] Frontend unit test: `ProtectedRoute` renders children for user with matching permission
- [ ] Frontend unit test: `ProtectedRoute` redirects for user without permission

---

## Phase 9 — Frontend: Dashboard Router Decoupling

**Branch:** `feat/pbac-phase-9-dashboard-routing`
**Depends on:** Phase 3 backend complete (member permissions exist), Phase 8 complete

### Current State

`DashboardRouter` reads `user.roles` and routes to a role-specific dashboard component.

### Target State

Route by permission presence — highest-privilege match wins:

```tsx
function resolveDashboardVariant(permissions: string[]): DashboardVariant {
    if (permissions.includes('LOANS_DISBURSE'))          return 'TREASURER';
    if (permissions.includes('LOANS_COMMITTEE_APPROVE')) return 'CHAIRPERSON';
    if (permissions.includes('LOANS_APPROVE'))           return 'LOAN_OFFICER';
    if (permissions.includes('SAVINGS_MANUAL_POST'))     return 'CASHIER';
    if (permissions.includes('MEMBERS_WRITE'))           return 'SECRETARY';
    if (permissions.includes('ACCOUNTING_JOURNAL_POST')) return 'ACCOUNTANT';
    if (permissions.includes('MEMBER_DASHBOARD_VIEW'))   return 'MEMBER';
    return 'MEMBER'; // safe default
}
```

### Rollback

Revert `DashboardRouter` to role-based logic. No DB changes needed.

### Tests

- [ ] TREASURER user (has `LOANS_DISBURSE`) sees Treasurer dashboard
- [ ] CHAIRPERSON user sees Chairperson dashboard
- [ ] MEMBER user sees Member dashboard
- [ ] SYSTEM_ADMIN (has all permissions) resolves to `TREASURER` variant (first match)

---

## Phase 10 — Frontend: Permission Guards on Ungated Routes

**Branch:** `feat/pbac-phase-10-route-guards`
**Depends on:** Phase 3 backend complete

### Routes to Guard

| Route | Add Permission | Rationale |
|---|---|---|
| `/my-loans` | `MEMBER_LOANS_VIEW` | Member loan portal |
| `/my-savings` | `MEMBER_SAVINGS_VIEW` | Member savings portal |
| `/my-meetings` | `isAuthenticated()` | Acceptable for all authenticated users |
| `/my-expense-claims` | `MEMBER_EXPENSE_SUBMIT` | Member expense portal |
| `/savings/management` | `SAVINGS_READ` or `SAVINGS_MANUAL_POST` | Staff savings view |

### Rollback

Remove `requiredPermissions` props from `ProtectedRoute` instances. No DB changes.

### Tests

- [ ] MEMBER can access `/my-loans` → renders
- [ ] Staff (TREASURER) cannot access `/my-loans` → redirected
- [ ] Staff can access `/savings/management` with `SAVINGS_READ` → renders

---

## Phase 11 — Backend: `ReportController` Inline Auth Refactor

**Branch:** `feat/pbac-phase-11-report-controller-auth`
**Depends on:** Phase 3 complete

### Current Problem

`getMemberStatement()` contains manual Java authority-checking code:
```java
boolean hasReportsRead = auth.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("REPORTS_READ"));
```

### Target Solution

Move data-isolation logic to a dedicated `@PreAuthorize` expression and service-layer ownership check:

```java
// Option 1: Two endpoint approach (preferred)
@GetMapping("/statements/staff/{memberId}")
@PreAuthorize("hasAuthority('REPORTS_READ')")
public ResponseEntity<?> getMemberStatementStaff(@PathVariable UUID memberId) { ... }

@GetMapping("/statements/me")
@PreAuthorize("hasAuthority('MEMBER_LOANS_VIEW')")
public ResponseEntity<?> getMyStatement(Authentication auth) { ... }
```

### Rollback

Revert to original inline logic. No DB changes.

### Tests

- [ ] Staff endpoint returns any member's statement with `REPORTS_READ` → HTTP 200
- [ ] Member endpoint returns only their own statement → HTTP 200
- [ ] Member cannot call staff endpoint → HTTP 403
- [ ] Staff cannot call member endpoint (no `MEMBER_LOANS_VIEW`) → HTTP 403

---

## Rollback Strategy Summary

| Scope | Rollback Method | Data Loss Risk |
|---|---|---|
| DB Permission Grants | `DELETE FROM role_permissions WHERE ...` | None |
| DB New Permissions | `DELETE FROM permissions WHERE ...` | None if no FK deps |
| Audit Schema Columns (Phase A) | `ALTER TABLE DROP COLUMN` | Loss of enriched audit data written since deploy |
| Backend `@PreAuthorize` changes | Git revert | None |
| Frontend component changes | Git revert | None |
| Full revert (all phases) | Git revert to pre-Phase-A commit + DB rollback scripts | Loss of enriched audit rows only |

**Golden rule:** Phases A and B are the only ones with potential data loss on rollback. All other phases are pure code changes.

---

## Testing Requirements

### For Every Phase

| Requirement | Tool |
|---|---|
| Unit tests for changed service/controller | JUnit 5 + Mockito |
| `@PreAuthorize` integration test per endpoint | `@WithMockUser(authorities=...)` + MockMvc |
| Frontend unit tests for auth/routing changes | Vitest + React Testing Library |
| Manual smoke test in staging | Manual QA checklist |

### Integration Test Template (Backend)

```java
@Test
@WithMockUser(authorities = {"MEMBERS_READ"})
void getMember_withMembersRead_returns200() throws Exception {
    mockMvc.perform(get("/api/v1/members/{id}", memberId))
           .andExpect(status().isOk());
}

@Test
@WithMockUser(authorities = {"ROLE_MEMBER"})
void getMember_withRoleMember_returns403() throws Exception {
    mockMvc.perform(get("/api/v1/members/{id}", memberId))
           .andExpect(status().isForbidden());
}

@Test
@WithMockUser(authorities = {"MEMBERS_READ", "LOANS_READ", "SAVINGS_READ"}) // simulate SYSTEM_ADMIN via permissions
void getMember_withAllPermissions_returns200() throws Exception {
    mockMvc.perform(get("/api/v1/members/{id}", memberId))
           .andExpect(status().isOk());
}
```

### Pre-Deploy Checklist (Each Phase)

- [ ] All unit tests green
- [ ] All `@PreAuthorize` integration tests green
- [ ] Manual test on staging: SYSTEM_ADMIN can access all affected routes
- [ ] Manual test on staging: MEMBER cannot access staff routes
- [ ] Manual test on staging: each affected staff role can access their entitled routes
- [ ] No exceptions in application logs after deploy
- [ ] Audit log contains expected events after test operations

---

## Approval & Sign-Off

Before beginning Phase A:

- [ ] `PERMISSION_CATALOG.md` reviewed and approved
- [ ] `AUDIT_EVENT_STANDARD.md` reviewed and approved
- [ ] `PBAC_MIGRATION_PLAN.md` reviewed and approved
- [ ] Phase 4 decision confirmed: **Option A** — `ROLE_MEMBER` retained as structural role
- [ ] V71 migration number confirmed with DBA (no conflicts with any undeployed migrations)
- [ ] Implementation approved by project lead
