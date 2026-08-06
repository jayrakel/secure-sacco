# PBAC_MIGRATION_REPORT.md

**Status:** Discovery Complete — Awaiting Review and Approval Before Implementation
**Produced:** 2026-06-05
**Scope:** Full backend + frontend RBAC/PBAC audit

---

## Executive Summary

The system has a **partially completed PBAC foundation**. The role/permission data model is correct (Role → Permission → User), and most staff-facing endpoints correctly use `hasAuthority('PERMISSION_NAME')`. However, **three critical RBAC patterns remain** that violate the PBAC target state, and the frontend has **inconsistent authorization patterns** including raw role name comparisons. No code is being changed by this document — this is the discovery report only.

---

## 1. Current RBAC Usage Inventory

### 1.1 Backend: RBAC Patterns Found

The following are **non-PBAC authorization checks** that must be migrated. They are ordered by severity.

#### 🔴 CRITICAL — `ROLE_SYSTEM_ADMIN` Direct Bypass Pattern

Every module uses `hasAnyAuthority('SOME_PERMISSION', 'ROLE_SYSTEM_ADMIN')` as a fallback. While `SYSTEM_ADMIN` is a valid break-glass role, this pattern hard-codes a role name into every controller, violating the PBAC rule that **no endpoint shall depend directly on role names**.

**Occurrences (42 instances across 12 controllers):**

| Controller | Endpoint | Pattern |
|---|---|---|
| `AccountController` | POST `/accounts` | `'ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `AccountController` | GET `/accounts` | `'ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN'` |
| `AccountController` | PUT `/accounts/{id}` | `'ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `JournalEntryController` | POST `/journals` | `'ACCOUNTING_JOURNAL_POST', 'ROLE_SYSTEM_ADMIN'` |
| `JournalEntryController` | GET `/journals` | `'ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN'` |
| `SavingsController` | POST `/deposits/manual` | `'SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN'` |
| `SavingsController` | POST `/withdrawals/manual` | `'SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN'` |
| `SavingsController` | GET `/members/{id}/statement` | `'SAVINGS_READ', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | POST `/members` | `'MEMBERS_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | GET `/members` | `'MEMBERS_READ', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | GET `/members/{id}` | `'MEMBERS_READ', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | PUT `/members/{id}` | `'MEMBERS_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | PATCH `/members/{id}/status` | `'MEMBERS_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `MemberController` | DELETE `/members/{id}` | `'MEMBERS_WRITE', 'ROLE_SYSTEM_ADMIN'` |
| `UserController` | PATCH `/{id}/email` | `'USER_UPDATE', 'ROLE_SYSTEM_ADMIN'` |
| `LoanApplicationController` | POST `/refinance` | `'LOANS_DISBURSE', 'ROLE_SYSTEM_ADMIN'` |
| `RoleController` | DELETE `/roles/{id}` | `'ROLE_SYSTEM_ADMIN'` only |
| `SaccoSettingsController` | All 7 endpoints | `'ROLE_SYSTEM_ADMIN'` only |
| `LoanProductController` | POST + PUT `/products` | `'ROLE_SYSTEM_ADMIN'` only |
| `ObligationController` | POST `/evaluate` | `'ROLE_SYSTEM_ADMIN'` only |
| `PublicController` | All 18 endpoints | `'MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN'` |
| `PenaltyController` | Waive/adjust endpoints | `'PENALTIES_WAIVE_ADJUST', 'ROLE_SYSTEM_ADMIN'` |
| `PenaltyRuleController` | All 3 endpoints | `'PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN'` |
| `ExpenseClaimController` | Staff endpoints | `'EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN'` |

#### 🔴 CRITICAL — `ROLE_MEMBER` Direct Role Check

Member-facing endpoints use `hasAuthority('ROLE_MEMBER')` which is a direct role name check. In PBAC, member actions should be driven by member-specific permissions.

**Occurrences (13 instances across 6 controllers):**

| Controller | Endpoint | Current |
|---|---|---|
| `LoanApplicationController` | GET `/my` (my loans list) | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | POST `/apply` | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | GET `/{id}/schedule` | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | GET `/{id}/guarantors` | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | POST `/{id}/add-guarantor` | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | POST `/{id}/pay-fee` | `hasAuthority('ROLE_MEMBER')` |
| `LoanApplicationController` | POST `/{id}/repay` | `hasAuthority('ROLE_MEMBER')` |
| `LoanReportingController` | GET `/reports/{id}/summary/member` | `hasAuthority('ROLE_MEMBER')` |
| `PenaltyController` | GET `/my/penalties` | `hasAuthority('ROLE_MEMBER')` |
| `PenaltyController` | GET `/my/penalties/{id}` | `hasAuthority('ROLE_MEMBER')` |
| `ExpenseClaimController` | POST `/my` (submit claim) | `hasAuthority('ROLE_MEMBER')` |
| `ExpenseClaimController` | GET `/my` (my claims) | `hasAuthority('ROLE_MEMBER')` |
| `DashboardController` | GET `/member-metrics` | `hasAuthority('ROLE_MEMBER')` |
| `ReportController` | GET `/members/{id}/financial-overview` | `hasAuthority('ROLE_MEMBER')` |
| `ObligationController` | GET `/my` | `'SAVINGS_OBLIGATIONS_READ', 'ROLE_MEMBER', 'ROLE_SYSTEM_ADMIN'` |
| `ObligationController` | GET `/my/history` | `'SAVINGS_OBLIGATIONS_READ', 'ROLE_MEMBER', 'ROLE_SYSTEM_ADMIN'` |

#### 🟡 MEDIUM — `hasAnyRole()` Pattern (CoopConnect)

`CoopConnectController` uses the deprecated `hasAnyRole()` style instead of `hasAnyAuthority()`:

| Controller | Endpoint | Pattern |
|---|---|---|
| `CoopConnectController` | GET `/coop/mini-statement` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CASHIER','DEPUTY_CASHIER')` |
| `CoopConnectController` | GET `/coop/transactions` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')` |
| `CoopConnectController` | GET `/coop/transaction-status/{ref}` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CASHIER','DEPUTY_CASHIER')` |

#### 🟡 MEDIUM — `isAuthenticated()` Without Permission

Some endpoints only require authentication, with no specific permission. This is intentionally permissive and may be acceptable for member self-service, but must be reviewed.

| Controller | Endpoint | Comment |
|---|---|---|
| `SavingsController` | POST `/deposits/mpesa/initiate` | Any authenticated user |
| `SavingsController` | GET `/me/balance` | Any authenticated user |
| `SavingsController` | GET `/me/statement` | Any authenticated user |
| `DashboardController` | GET `/staff-metrics` | `isAuthenticated() && !hasAuthority('ROLE_MEMBER')` — role exclusion |
| `PenaltyRuleController` | GET `/rules` | `isAuthenticated()` |
| `LoanProductController` | GET `/products` | `isAuthenticated()` |
| `LoanProductController` | GET `/products/{id}` | `isAuthenticated()` |
| `CoopConnectController` | POST `/coop/stk/initiate` | `isAuthenticated()` |

#### 🟡 MEDIUM — Inline Role-Based Logic in Service Layer

`ReportController.getMemberStatement()` contains inline Java code checking authorities to enforce data-level access control. This is business logic inside a controller and will not survive a PBAC migration without refactoring.

```java
// RBAC Enforcement: Staff can read any, Member can only read their own!
boolean hasReportsRead = auth.getAuthorities().stream()
    .anyMatch(a -> a.getAuthority().equals("REPORTS_READ"));
```

---

## 2. Permission Coverage Analysis

### 2.1 Endpoints WITH Permission Coverage ✅

| Module | Endpoints Protected | Permission Used |
|---|---|---|
| Users | LIST, GET, CREATE, UPDATE, DELETE, email change | `USER_READ`, `USER_CREATE`, `USER_UPDATE` |
| Roles | LIST, GET, CREATE, UPDATE, DELETE permissions | `ROLE_READ`, `ROLE_CREATE`, `ROLE_UPDATE` |
| Members (staff) | LIST, GET, CREATE, UPDATE, STATUS, DELETE | `MEMBERS_READ`, `MEMBERS_WRITE` |
| Savings (staff) | Manual deposit, withdrawal, statement | `SAVINGS_MANUAL_POST`, `SAVINGS_READ` |
| Loans (staff) | Verify, approve, disburse, refinance | `LOANS_APPROVE`, `LOANS_COMMITTEE_APPROVE`, `LOANS_DISBURSE` |
| Loans (view) | List by status, staff summaries, arrears | `LOANS_READ` |
| Accounting | All GL operations | `ACCOUNTING_READ`, `ACCOUNTING_WRITE`, `ACCOUNTING_JOURNAL_POST`, `GL_TRIAL_BALANCE` |
| Penalties (staff) | Waive, adjust, manage rules | `PENALTIES_WAIVE_ADJUST`, `PENALTIES_MANAGE_RULES` |
| Meetings | All management operations | `MEETINGS_MANAGE`, `MEETINGS_READ` |
| Obligations (staff) | Create, update, compliance, history | `SAVINGS_OBLIGATIONS_MANAGE` |
| Reports (staff) | All report views | `REPORTS_READ` |
| Audit | View logs | `AUDIT_LOG_READ` |
| Expense Claims (staff) | Approve, reject, view all | `EXPENSE_CLAIMS_APPROVE`, `EXPENSE_CLAIMS_READ` |
| Assets | All operations | `ASSET_READ`, `ASSET_WRITE`, `ASSET_DISPOSE` |

### 2.2 Endpoints WITHOUT Proper Permission Coverage ❌

| Module | Endpoint | Current State | Required |
|---|---|---|---|
| Settings | All 7 settings endpoints | `ROLE_SYSTEM_ADMIN` only | `SETTINGS_READ`, `SETTINGS_EDIT` permissions |
| Loan Products | Create/Update | `ROLE_SYSTEM_ADMIN` only | `LOAN_PRODUCTS_MANAGE` permission |
| Dashboard (staff) | Staff metrics | `isAuthenticated() && !ROLE_MEMBER` | Proper permission |
| Dashboard (member) | Member metrics | `ROLE_MEMBER` | `MEMBER_DASHBOARD_VIEW` or similar |
| CoopConnect | 3 banking endpoints | `hasAnyRole(...)` | `BANKING_READ`, `BANKING_MANAGE` permissions |
| Obligations | Trigger evaluation | `ROLE_SYSTEM_ADMIN` only | `SAVINGS_OBLIGATIONS_MANAGE` |
| Member self-service | Savings balance, statement, M-Pesa | `isAuthenticated()` | Review — likely acceptable |
| Member loans | All member loan actions | `ROLE_MEMBER` | `LOANS_MEMBER_VIEW`, `LOANS_APPLY`, etc. |
| Member penalties | View own penalties | `ROLE_MEMBER` | `PENALTIES_VIEW` or `ROLE_MEMBER` kept |
| Member expense | Submit/view own claims | `ROLE_MEMBER` | `EXPENSE_CLAIMS_SUBMIT` permission |

---

## 3. Frontend Authorization Coverage Analysis

### 3.1 Frontend Infrastructure

| Component | Location | Purpose |
|---|---|---|
| `AuthProvider` | `auth/context/AuthProvider.tsx` | Fetches `/auth/me`, exposes `user.permissions[]` and `user.roles[]` |
| `ProtectedRoute` | `shared/components/ProtectedRoute.tsx` | Route-level gating by `requiredPermissions[]` |
| `HasPermission` | `shared/components/HasPermission.tsx` | Component-level conditional rendering |

**Key architectural issue:** Both `ProtectedRoute` and `HasPermission` have a special-case bypass for `ROLE_SYSTEM_ADMIN` via `user.roles.includes('ROLE_SYSTEM_ADMIN')`. This is a frontend RBAC check — a direct role name dependency.

### 3.2 Routes WITH Permission Guards ✅

| Route | Required Permission | Component |
|---|---|---|
| `/meetings` | `MEETINGS_MANAGE` | `ProtectedRoute` |
| `/users` | `USER_READ` | `ProtectedRoute` |
| `/roles` | `ROLE_READ` | `ProtectedRoute` |
| `/members` | `MEMBERS_READ` | `ProtectedRoute` |
| `/accounting` | `ACCOUNTING_READ` | `ProtectedRoute` |
| `/accounting/journals` | `ACCOUNTING_READ` | `ProtectedRoute` |
| `/accounting/trial-balance` | `GL_TRIAL_BALANCE` | `ProtectedRoute` |
| `/accounting/gl-posting` | `ACCOUNTING_JOURNAL_POST` | `ProtectedRoute` |
| `/obligations` | `SAVINGS_OBLIGATIONS_MANAGE` | `ProtectedRoute` |
| `/meetings/management` | `MEETINGS_READ` | `ProtectedRoute` |
| `/loans` | `LOANS_READ` | `ProtectedRoute` |
| `/loans/products` | `LOANS_READ` | `ProtectedRoute` |
| `/reports` | `REPORTS_READ` | `ProtectedRoute` |
| `/reports/arrears` | `REPORTS_READ` | `ProtectedRoute` |
| `/reports/collections` | `REPORTS_READ` | `ProtectedRoute` |
| `/reports/income` | `REPORTS_READ` | `ProtectedRoute` |
| `/staff/penalties` | `PENALTIES_WAIVE_ADJUST` | `ProtectedRoute` |
| `/permissions-registry` | `ROLE_SYSTEM_ADMIN` ⚠️ | `ProtectedRoute` |
| `/audit/logs` | `AUDIT_LOG_READ` | `ProtectedRoute` |
| `/migration` | `DATA_MIGRATION` | `ProtectedRoute` |
| `/expense/claims` | `EXPENSE_CLAIMS_APPROVE` OR `ROLE_SYSTEM_ADMIN` | `HasPermission` |
| `/assets` | `ASSET_READ` OR `ROLE_SYSTEM_ADMIN` | `HasPermission` |
| `/settings` | `ROLE_SYSTEM_ADMIN` OR `PENALTIES_MANAGE_RULES` | `HasPermission` ⚠️ |

### 3.3 Routes WITHOUT Permission Guards ❌

| Route | Current | Risk |
|---|---|---|
| `/dashboard` | `ProtectedRoute` only (no permission) | Any authenticated user accesses |
| `/my-loans` | `ProtectedRoute` only | Any authenticated user |
| `/my-savings` | `ProtectedRoute` only | Any authenticated user |
| `/savings/management` | `ProtectedRoute` only (implicit) | Any authenticated user |
| `/my-meetings` | `ProtectedRoute` only | Any authenticated user |
| `/meeting/check-in` | `ProtectedRoute` only | Any authenticated user |
| `/reports/statements` | `ProtectedRoute` only | Any auth user (backend enforces data isolation) |
| `/my-expense-claims` | `ProtectedRoute` only | Any authenticated user |
| `/profile` | `ProtectedRoute` only | Correct — self-service |
| `/security` | `ProtectedRoute` only | Correct — self-service |

### 3.4 Frontend RBAC Issues

| Location | Issue | Severity |
|---|---|---|
| `ProtectedRoute.tsx:L27` | `user.roles?.includes('ROLE_SYSTEM_ADMIN')` bypass | 🔴 RBAC |
| `HasPermission.tsx:L22` | `user.roles?.includes('ROLE_SYSTEM_ADMIN')` bypass | 🔴 RBAC |
| `ProfilePage.tsx:L108-110` | Renders `user.roles` directly on screen — RBAC display | 🟡 Cosmetic |
| `DashboardRouter.tsx` | Routes by role name to different dashboard components | 🔴 RBAC |
| `App.tsx:L308` | `/permissions-registry` guarded by `'ROLE_SYSTEM_ADMIN'` | 🔴 RBAC |
| `App.tsx:L342` | `/expense/claims` uses `ROLE_SYSTEM_ADMIN` in HasPermission | 🟡 Medium |
| `App.tsx:L361,374` | `/assets`, `/settings` use `ROLE_SYSTEM_ADMIN` in HasPermission | 🟡 Medium |

---

## 4. Gaps and Risks

### 4.1 Missing Permissions (Not Yet Defined)

These permission codes are referenced in code/routes but have **no matching DB record**:

| Code | Where Referenced | Action Required |
|---|---|---|
| `DATA_MIGRATION` | `App.tsx` route guard | Verify if seeded; add migration if missing |
| `SETTINGS_READ` | Settings endpoints only use `ROLE_SYSTEM_ADMIN` | Define and seed `SETTINGS_READ`, `SETTINGS_EDIT` |
| `LOAN_PRODUCTS_MANAGE` | Loan product endpoints only use `ROLE_SYSTEM_ADMIN` | Define and seed |
| `BANKING_READ` | CoopConnect endpoints use `hasAnyRole(...)` | Define and seed |
| `MEMBER_DASHBOARD_VIEW` | Member dashboard uses `ROLE_MEMBER` | Define and seed (or keep ROLE_MEMBER) |
| `LOANS_APPLY` | Member loan application uses `ROLE_MEMBER` | Consider dedicated permission |
| `EXPENSE_CLAIMS_SUBMIT` | Member expense submission uses `ROLE_MEMBER` | Consider dedicated permission |

### 4.2 Legacy Permissions (Defined but Inconsistently Used)

These V1_1 permissions (`MEMBER_READ`, `MEMBER_CREATE`, etc.) exist in DB but are **not used by any controller**. `MemberController` uses `MEMBERS_READ`/`MEMBERS_WRITE` (seeded in V5). Risk of confusion and stale grants.

### 4.3 SYSTEM_ADMIN Bypass Architecture Risk

The `ROLE_SYSTEM_ADMIN` bypass in `ProtectedRoute` and `HasPermission` means that if the SYSTEM_ADMIN check is ever removed from the `permissions[]` array returned by `/auth/me`, all SYSTEM_ADMIN-only pages will break. The `HasPermission` component checks `user.roles` (a separate array), providing partial decoupling, but this is inconsistent with pure PBAC.

### 4.4 Dashboard Router RBAC Coupling

`DashboardRouter.tsx` routes users to different dashboard pages based on role names. This is entirely RBAC-based and will require a permission-based routing strategy in PBAC.

### 4.5 Inline Authorization Logic in ReportController

The member statement endpoint performs its data-isolation check in Java code using `auth.getAuthorities()`. This will break silently if the permission name changes.

---

## 5. Phased Migration Plan

> **Rule:** No implementation begins until this report is reviewed and approved.

### Phase 1 — Foundation & New Permission Definitions *(Low Risk)*

**Goal:** Define all missing permissions in the database without changing any existing code.

1. Create `V71__seed_missing_pbac_permissions.sql` defining:
   - `SETTINGS_READ`, `SETTINGS_EDIT`
   - `LOAN_PRODUCTS_MANAGE`
   - `BANKING_READ`, `BANKING_MANAGE`
   - `MEMBER_LOANS_VIEW`, `MEMBER_LOANS_APPLY`
   - `MEMBER_PENALTIES_VIEW`
   - `MEMBER_EXPENSE_SUBMIT`
   - `MEMBER_SAVINGS_VIEW`
   - `MEMBER_OBLIGATIONS_VIEW`
   - `MEMBER_DASHBOARD_VIEW`
   - Verify `DATA_MIGRATION` exists

2. Grant new permissions to appropriate roles.
3. **No controller or frontend changes.** Purely additive.

---

### Phase 2 — Backend: Migrate `hasAnyRole()` CoopConnect *(Low Risk)*

**Goal:** Replace the 3 `hasAnyRole()` calls in `CoopConnectController` with `hasAnyAuthority()` using specific permissions.

- `getMiniStatement()` → `hasAnyAuthority('BANKING_READ', 'ROLE_SYSTEM_ADMIN')`
- `getAccountTransactions()` → `hasAnyAuthority('BANKING_READ', 'ROLE_SYSTEM_ADMIN')`
- `getTransactionStatus()` → `hasAnyAuthority('BANKING_READ', 'ROLE_SYSTEM_ADMIN')`

---

### Phase 3 — Backend: Migrate Settings and Loan Products *(Low Risk)*

**Goal:** Replace `ROLE_SYSTEM_ADMIN`-only endpoints with proper permissions.

- `SaccoSettingsController` → `SETTINGS_READ`/`SETTINGS_EDIT`
- `LoanProductController` CREATE/UPDATE → `LOAN_PRODUCTS_MANAGE`
- `ObligationController` trigger eval → `SAVINGS_OBLIGATIONS_MANAGE`

---

### Phase 4 — Backend: Define Member Permission Strategy *(Medium Risk)*

**Decision required:** Should `ROLE_MEMBER` be replaced with individual member permissions, or retained as a special role?

**Option A (Recommended):** Retain `ROLE_MEMBER` as a structural role, document it as the "member portal access role," and use member-specific permissions for sensitive actions (loan application, expense submission). This is simpler and preserves backward compat.

**Option B (Full PBAC):** Replace every `ROLE_MEMBER` check with a named permission. This is fully PBAC-compliant but requires new permissions for all member self-service actions.

**Impact if Option A chosen:**
- `ROLE_MEMBER` checks remain for generic member access
- Add `MEMBER_LOANS_APPLY`, `MEMBER_EXPENSE_SUBMIT` for sensitive write actions
- Migrate `DashboardController` staff check to use permissions not role exclusion

---

### Phase 5 — Backend: Remove `ROLE_SYSTEM_ADMIN` Fallback Pattern *(Medium Risk)*

**Goal:** Remove `'ROLE_SYSTEM_ADMIN'` from every `hasAnyAuthority()` call. SYSTEM_ADMIN bypass should be handled via Spring Security method expression or a custom annotation, not inline in every `@PreAuthorize`.

**Approach:**
- Create a custom Spring Security `PermissionEvaluator` or expression root that transparently grants all permissions to SYSTEM_ADMIN
- Or: Ensure SYSTEM_ADMIN role has all permissions assigned in DB (already done via cross-join in migrations), and remove the explicit `ROLE_SYSTEM_ADMIN` fallback from `@PreAuthorize` annotations

**Risk:** High — touches 42+ annotations across 12 controllers. Must have comprehensive integration tests before execution.

---

### Phase 6 — Frontend: Remove `ROLE_SYSTEM_ADMIN` Role Checks *(Medium Risk)*

**Goal:** Remove `user.roles.includes('ROLE_SYSTEM_ADMIN')` from `ProtectedRoute` and `HasPermission`. SYSTEM_ADMIN should be handled purely by permissions.

**Approach:**
- `/auth/me` endpoint should include all effective permissions for SYSTEM_ADMIN (already done — SYSTEM_ADMIN has all permissions via DB cross-join)
- Remove the role-based bypass in `ProtectedRoute.tsx` and `HasPermission.tsx`
- Replace `App.tsx:L308` (`ROLE_SYSTEM_ADMIN` guard) with `SETTINGS_EDIT` or another specific permission

---

### Phase 7 — Frontend: Dashboard Router Decoupling *(Medium Risk)*

**Goal:** Replace role-name-based routing in `DashboardRouter` with permission-based routing.

**Approach:** Map permission presence to dashboard variant:
- `LOANS_DISBURSE` → Treasurer dashboard
- `LOANS_APPROVE` → Loan Officer dashboard
- `LOANS_COMMITTEE_APPROVE` → Chairperson dashboard
- `MEMBERS_WRITE` → Secretary dashboard
- `ROLE_MEMBER` / no staff perms → Member dashboard

---

### Phase 8 — Frontend: Permission Guard Audit of Remaining Routes *(Low Risk)*

Add permission guards to routes currently only protected by authentication:
- `/savings/management` → `SAVINGS_READ` or `SAVINGS_MANUAL_POST`
- `/my-loans`, `/my-savings`, etc. → `ROLE_MEMBER` or member permissions (after Phase 4 decision)
- Review `/dashboard` permission requirement

---

### Phase 9 — Testing *(Required after each phase)*

For each phase:
- Add `@PreAuthorize` tests verifying permission-based access
- Add frontend `ProtectedRoute` tests with mocked permission sets
- Verify SYSTEM_ADMIN still accesses all endpoints after bypass removal

---

## 6. Migration Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Removing `ROLE_SYSTEM_ADMIN` fallback breaks admin access | 🔴 HIGH | Verify SYSTEM_ADMIN has all permissions in DB before removal; test in staging |
| MEMBER permission changes lock out member portal | 🔴 HIGH | Phase 4 decision must be made carefully; maintain backward compatibility |
| Legacy `MEMBER_READ` permissions still granted to roles | 🟡 MEDIUM | Audit after migration; clean up stale grants |
| Dashboard routing breakage after role-based routing removed | 🟡 MEDIUM | Implement permission-based routing BEFORE removing role checks |
| CoopConnect banking permissions not assigned to correct roles | 🟡 MEDIUM | Assign in Phase 1 SQL before Phase 2 code change |
| `ReportController` inline auth logic broken by rename | 🟡 MEDIUM | Refactor to `@PreAuthorize` in Phase 3 |
| `DATA_MIGRATION` permission may not be seeded | 🟢 LOW | Verify in Phase 1 |

---

## 7. Approval Checklist

Before any implementation begins:

- [ ] PROJECT_CONTEXT.md reviewed and confirmed accurate
- [ ] Role-to-permission matrix confirmed correct
- [ ] Phase 4 (ROLE_MEMBER strategy) decision made
- [ ] Phase 5 (SYSTEM_ADMIN bypass removal) approach agreed
- [ ] Implementation approved by project lead
