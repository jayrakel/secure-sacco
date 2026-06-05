# PERMISSION_CATALOG.md

**Status:** Authoritative reference — do not edit without updating the corresponding DB migration.
**Last Updated:** 2026-06-05

---

## 1. Complete Permission Registry

### 1.1 User & Session Management

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `USER_READ` | View user accounts | V1_1 | SYSTEM_ADMIN |
| `USER_CREATE` | Create user accounts | V1_1 | SYSTEM_ADMIN |
| `USER_UPDATE` | Update user accounts | V1_1 | SYSTEM_ADMIN |
| `SESSION_READ` | View active sessions | V1_1 | SYSTEM_ADMIN |
| `SESSION_REVOKE` | Revoke active sessions | V1_1 | SYSTEM_ADMIN |

### 1.2 Role & Permission Management

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `ROLE_READ` | View roles and permissions | V1_1 | SYSTEM_ADMIN |
| `ROLE_CREATE` | Create new roles | V1_1 | SYSTEM_ADMIN |
| `ROLE_UPDATE` | Update roles and their permissions | V1_1 | SYSTEM_ADMIN |

### 1.3 Member Management

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `MEMBERS_READ` | View member list and profiles | V5 | SYSTEM_ADMIN, all staff |
| `MEMBERS_WRITE` | Create, update, or delete member records | V5 | SYSTEM_ADMIN, SECRETARY, DEPUTY_SECRETARY |
| `MEMBER_READ` | ⚠️ Legacy — V1_1 alias, unused by controllers | V1_1 | — |
| `MEMBER_CREATE` | ⚠️ Legacy — V1_1 alias, unused by controllers | V1_1 | — |
| `MEMBER_UPDATE` | ⚠️ Legacy — V1_1 alias, unused by controllers | V1_1 | — |
| `MEMBER_STATUS_CHANGE` | ⚠️ Legacy — V1_1 alias, unused by controllers | V1_1 | — |

### 1.4 Savings

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `SAVINGS_READ` | View savings accounts and transaction history | V32 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, CASHIER, DEPUTY_CASHIER, ACCOUNTANT |
| `SAVINGS_MANUAL_POST` | Post manual deposits and withdrawals | V32 | SYSTEM_ADMIN, CASHIER, DEPUTY_CASHIER |
| `SAVINGS_OBLIGATIONS_MANAGE` | Create, update, pause savings obligations | V41 | SYSTEM_ADMIN, TREASURER |
| `SAVINGS_OBLIGATIONS_READ` | View own savings obligation status | V41 | SYSTEM_ADMIN, MEMBER |

### 1.5 Loans

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `LOANS_READ` | View all loan applications and queues | V21 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, LOAN_OFFICER, DEPUTY_LOAN_OFFICER |
| `LOANS_APPROVE` | First-level loan officer verification | V21 | SYSTEM_ADMIN, LOAN_OFFICER, DEPUTY_LOAN_OFFICER |
| `LOANS_COMMITTEE_APPROVE` | Final committee approval | V21 | SYSTEM_ADMIN, CHAIRPERSON |
| `LOANS_DISBURSE` | Disburse approved loans | V21 | SYSTEM_ADMIN, TREASURER |

### 1.6 Accounting

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `ACCOUNTING_READ` | View chart of accounts and journal entries | V60 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ACCOUNTANT, DEPUTY_ACCOUNTANT |
| `ACCOUNTING_WRITE` | Create and edit GL accounts | V60 | SYSTEM_ADMIN, ACCOUNTANT, DEPUTY_ACCOUNTANT |
| `ACCOUNTING_JOURNAL_POST` | Post manual journal entries | V60 | SYSTEM_ADMIN, ACCOUNTANT, DEPUTY_ACCOUNTANT |
| `GL_TRIAL_BALANCE` | View trial balance report | V38 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ACCOUNTANT, DEPUTY_ACCOUNTANT |

### 1.7 Penalties

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `PENALTIES_WAIVE_ADJUST` | Waive or adjust penalty amounts | V26/V27 | SYSTEM_ADMIN, TREASURER |
| `PENALTIES_MANAGE_RULES` | Create and update penalty rules | V26/V27 | SYSTEM_ADMIN |

### 1.8 Meetings

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `MEETINGS_MANAGE` | Full meeting lifecycle management | V36 | SYSTEM_ADMIN |
| `MEETINGS_READ` | View meeting schedule and attendance | V36 | SYSTEM_ADMIN |

### 1.9 Reports

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `REPORTS_READ` | View and generate financial reports | V32 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, CHAIRPERSON, DEPUTY_CHAIRPERSON, ACCOUNTANT, DEPUTY_ACCOUNTANT |

### 1.10 Audit

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `AUDIT_LOG_READ` | View security audit logs | V38 | SYSTEM_ADMIN |

### 1.11 Expense Claims

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `EXPENSE_CLAIMS_READ` | View all member expense claims | V68 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ADMIN |
| `EXPENSE_CLAIMS_APPROVE` | Submit, approve, or reject expense claims | V68 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ADMIN |

### 1.12 Assets

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `ASSET_READ` | View the SACCO asset register | V70 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ADMIN |
| `ASSET_WRITE` | Register new SACCO assets | V70 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ADMIN |
| `ASSET_DISPOSE` | Change asset lifecycle status | V70 | SYSTEM_ADMIN, TREASURER, DEPUTY_TREASURER, ADMIN |

### 1.13 System / Admin

| Code | Description | DB Migration | Roles Granted |
|---|---|---|---|
| `DATA_MIGRATION` | Access historical data migration tool | V32+ | SYSTEM_ADMIN |

---

## 2. Permissions To Be Added (Migration Phase 1)

These permissions do not yet exist in the database. They must be created before any controller annotation is changed.

| New Code | Replaces | Controller(s) | Description |
|---|---|---|---|
| `SETTINGS_READ` | `ROLE_SYSTEM_ADMIN` | `SaccoSettingsController` GET | View SACCO settings |
| `SETTINGS_EDIT` | `ROLE_SYSTEM_ADMIN` | `SaccoSettingsController` POST/PUT/PATCH | Modify SACCO settings |
| `LOAN_PRODUCTS_MANAGE` | `ROLE_SYSTEM_ADMIN` | `LoanProductController` POST/PUT | Create and edit loan products |
| `BANKING_READ` | `hasAnyRole(SYSTEM_ADMIN,TREASURER,...)` | `CoopConnectController` | View bank account data |
| `BANKING_MANAGE` | `hasAnyRole(SYSTEM_ADMIN,TREASURER,CASHIER,...)` | `CoopConnectController` | Initiate banking transactions |
| `MEMBER_LOANS_VIEW` | `ROLE_MEMBER` | `LoanApplicationController` GET `/my`, schedule | Member view of own loans |
| `MEMBER_LOANS_APPLY` | `ROLE_MEMBER` | `LoanApplicationController` POST, submit, repay, fee | Member loan actions |
| `MEMBER_PENALTIES_VIEW` | `ROLE_MEMBER` | `PenaltyController` GET member endpoints | Member view of own penalties |
| `MEMBER_SAVINGS_VIEW` | `isAuthenticated()` | `SavingsController` GET `/me/*` | Member view of own savings |
| `MEMBER_EXPENSE_SUBMIT` | `ROLE_MEMBER` | `ExpenseClaimController` POST/GET member | Member expense claim actions |
| `MEMBER_OBLIGATIONS_VIEW` | `ROLE_MEMBER`, `SAVINGS_OBLIGATIONS_READ` | `ObligationController` GET `/my`, `/my/history` | Member obligations view |
| `MEMBER_DASHBOARD_VIEW` | `ROLE_MEMBER` (DashboardController) | `DashboardController` | Member dashboard access |

---

## 3. Role → Permission Matrix (Current State)

| Permission | SA | TR | DT | LO | DLO | CA | DC | CH | DCH | SE | DS | AC | DA | ME |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| USER_READ | ✅ | | | | | | | | | | | | | |
| USER_CREATE | ✅ | | | | | | | | | | | | | |
| USER_UPDATE | ✅ | | | | | | | | | | | | | |
| SESSION_READ | ✅ | | | | | | | | | | | | | |
| SESSION_REVOKE | ✅ | | | | | | | | | | | | | |
| ROLE_READ | ✅ | | | | | | | | | | | | | |
| ROLE_CREATE | ✅ | | | | | | | | | | | | | |
| ROLE_UPDATE | ✅ | | | | | | | | | | | | | |
| MEMBERS_READ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| MEMBERS_WRITE | ✅ | | | | | | | | | ✅ | ✅ | | | |
| SAVINGS_READ | ✅ | ✅ | ✅ | | | ✅ | ✅ | | | | | ✅ | | |
| SAVINGS_MANUAL_POST | ✅ | | | | | ✅ | ✅ | | | | | | | |
| SAVINGS_OBLIGATIONS_MANAGE | ✅ | ✅ | | | | | | | | | | | | |
| SAVINGS_OBLIGATIONS_READ | ✅ | | | | | | | | | | | | | ✅ |
| LOANS_READ | ✅ | ✅ | ✅ | ✅ | ✅ | | | | | | | | | |
| LOANS_APPROVE | ✅ | | | ✅ | ✅ | | | | | | | | | |
| LOANS_COMMITTEE_APPROVE | ✅ | | | | | | | ✅ | | | | | | |
| LOANS_DISBURSE | ✅ | ✅ | | | | | | | | | | | | |
| ACCOUNTING_READ | ✅ | ✅ | ✅ | | | | | | | | | ✅ | ✅ | |
| ACCOUNTING_WRITE | ✅ | | | | | | | | | | | ✅ | ✅ | |
| ACCOUNTING_JOURNAL_POST | ✅ | | | | | | | | | | | ✅ | ✅ | |
| GL_TRIAL_BALANCE | ✅ | ✅ | ✅ | | | | | | | | | ✅ | ✅ | |
| PENALTIES_WAIVE_ADJUST | ✅ | ✅ | | | | | | | | | | | | |
| PENALTIES_MANAGE_RULES | ✅ | | | | | | | | | | | | | |
| MEETINGS_MANAGE | ✅ | | | | | | | | | | | | | |
| MEETINGS_READ | ✅ | | | | | | | | | | | | | |
| REPORTS_READ | ✅ | ✅ | ✅ | | | | | ✅ | ✅ | | | ✅ | ✅ | |
| AUDIT_LOG_READ | ✅ | | | | | | | | | | | | | |
| EXPENSE_CLAIMS_READ | ✅ | ✅ | ✅ | | | | | | | | | | | |
| EXPENSE_CLAIMS_APPROVE | ✅ | ✅ | ✅ | | | | | | | | | | | |
| ASSET_READ | ✅ | ✅ | ✅ | | | | | | | | | | | |
| ASSET_WRITE | ✅ | ✅ | ✅ | | | | | | | | | | | |
| ASSET_DISPOSE | ✅ | ✅ | ✅ | | | | | | | | | | | |
| DATA_MIGRATION | ✅ | | | | | | | | | | | | | |

**Column key:** SA=SYSTEM_ADMIN, TR=TREASURER, DT=DEPUTY_TREASURER, LO=LOAN_OFFICER, DLO=DEPUTY_LOAN_OFFICER, CA=CASHIER, DC=DEPUTY_CASHIER, CH=CHAIRPERSON, DCH=DEPUTY_CHAIRPERSON, SE=SECRETARY, DS=DEPUTY_SECRETARY, AC=ACCOUNTANT, DA=DEPUTY_ACCOUNTANT, ME=MEMBER

---

## 4. Hardcoded Role Check Replacement Mapping

### 4.1 `ROLE_SYSTEM_ADMIN` Fallback Replacements

Every `hasAnyAuthority('SOME_PERMISSION', 'ROLE_SYSTEM_ADMIN')` must become `hasAuthority('SOME_PERMISSION')`. SYSTEM_ADMIN bypass is achieved via the DB — SYSTEM_ADMIN has all permissions granted. No fallback annotation is needed.

| Controller | Method/Endpoint | Current Expression | Target Expression |
|---|---|---|---|
| `AccountController` | POST `/accounts` | `hasAnyAuthority('ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('ACCOUNTING_WRITE')` |
| `AccountController` | GET `/accounts` | `hasAnyAuthority('ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('ACCOUNTING_READ')` |
| `AccountController` | PUT `/accounts/{id}` | `hasAnyAuthority('ACCOUNTING_WRITE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('ACCOUNTING_WRITE')` |
| `JournalEntryController` | POST `/journals` | `hasAnyAuthority('ACCOUNTING_JOURNAL_POST', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('ACCOUNTING_JOURNAL_POST')` |
| `JournalEntryController` | GET `/journals` | `hasAnyAuthority('ACCOUNTING_READ', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('ACCOUNTING_READ')` |
| `SavingsController` | POST `/deposits/manual` | `hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_MANUAL_POST')` |
| `SavingsController` | POST `/withdrawals/manual` | `hasAnyAuthority('SAVINGS_MANUAL_POST', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_MANUAL_POST')` |
| `SavingsController` | GET `/members/{id}/statement` | `hasAnyAuthority('SAVINGS_READ', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_READ')` |
| `MemberController` | POST `/members` | `hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_WRITE')` |
| `MemberController` | GET `/members` | `hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_READ')` |
| `MemberController` | GET `/members/{id}` | `hasAuthority('MEMBERS_READ') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_READ')` |
| `MemberController` | PUT `/members/{id}` | `hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_WRITE')` |
| `MemberController` | PATCH `/members/{id}/status` | `hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_WRITE')` |
| `MemberController` | DELETE `/members/{id}` | `hasAuthority('MEMBERS_WRITE') or hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBERS_WRITE')` |
| `UserController` | PATCH `/{id}/email` | `hasAnyAuthority('USER_UPDATE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('USER_UPDATE')` |
| `LoanApplicationController` | POST `/refinance` | `hasAnyAuthority('LOANS_DISBURSE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('LOANS_DISBURSE')` |
| `LoanApplicationController` | GET `/all` | `hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'LOANS_READ', ...)` | `hasAnyAuthority('LOANS_READ', 'LOANS_APPROVE', 'LOANS_COMMITTEE_APPROVE', 'LOANS_DISBURSE')` |
| `LoanApplicationController` | GET `/queue/{status}` | `hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'LOANS_READ', ...)` | `hasAnyAuthority('LOANS_READ', 'LOANS_APPROVE', 'LOANS_COMMITTEE_APPROVE', 'LOANS_DISBURSE')` |
| `RoleController` | DELETE `/roles/{id}` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('ROLE_UPDATE')` (or new `ROLE_DELETE`) |
| `SaccoSettingsController` | GET (all) | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SETTINGS_READ')` |
| `SaccoSettingsController` | POST/PUT/PATCH | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SETTINGS_EDIT')` |
| `LoanProductController` | POST `/products` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('LOAN_PRODUCTS_MANAGE')` |
| `LoanProductController` | PUT `/products/{id}` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('LOAN_PRODUCTS_MANAGE')` |
| `ObligationController` | POST `/evaluate` | `hasAuthority('ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_OBLIGATIONS_MANAGE')` |
| `PenaltyController` | PATCH waive | `hasAnyAuthority('PENALTIES_WAIVE_ADJUST', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('PENALTIES_WAIVE_ADJUST')` |
| `PenaltyController` | PATCH adjust | `hasAnyAuthority('PENALTIES_WAIVE_ADJUST', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('PENALTIES_WAIVE_ADJUST')` |
| `PenaltyRuleController` | POST `/rules` | `hasAnyAuthority('PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('PENALTIES_MANAGE_RULES')` |
| `PenaltyRuleController` | PUT `/rules/{id}` | `hasAnyAuthority('PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('PENALTIES_MANAGE_RULES')` |
| `PenaltyRuleController` | DELETE `/rules/{id}` | `hasAnyAuthority('PENALTIES_MANAGE_RULES', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('PENALTIES_MANAGE_RULES')` |
| `ExpenseClaimController` | Staff approve/list | `hasAnyAuthority('EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('EXPENSE_CLAIMS_APPROVE')` |
| `PublicController` | All 18 endpoints | `hasAnyAuthority('MEETINGS_MANAGE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEETINGS_MANAGE')` |
| `ObligationController` | GET `/compliance`, `/member/*` | `hasAnyAuthority('SAVINGS_OBLIGATIONS_MANAGE', 'ROLE_SYSTEM_ADMIN')` | `hasAuthority('SAVINGS_OBLIGATIONS_MANAGE')` |

### 4.2 `ROLE_MEMBER` Direct Role Check Replacements

Decision: **Option A chosen** — `ROLE_MEMBER` is retained as a structural role indicating portal access. Sensitive write actions gain dedicated permissions. Read/view-only self-service uses `ROLE_MEMBER`.

| Controller | Endpoint | Current | Target | Notes |
|---|---|---|---|---|
| `LoanApplicationController` | POST `/` (apply) | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | POST `/{id}/submit` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | POST `/{id}/pay-fee` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | POST `/{id}/repay` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | POST `/{id}/guarantors` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | DELETE `/{id}/guarantors/{gId}` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_APPLY')` | Write action |
| `LoanApplicationController` | GET `/my` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_VIEW')` | View only |
| `LoanReportingController` | GET `/{id}/summary/member` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_VIEW')` | View only |
| `PenaltyController` | GET `/my/penalties` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_PENALTIES_VIEW')` | View only |
| `PenaltyController` | GET `/my/penalties/{id}` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_PENALTIES_VIEW')` | View only |
| `ExpenseClaimController` | POST `/my` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_EXPENSE_SUBMIT')` | Write action |
| `ExpenseClaimController` | GET `/my` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_EXPENSE_SUBMIT')` | View own |
| `ReportController` | GET `/members/{id}/financial-overview` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_LOANS_VIEW')` | View only |
| `DashboardController` | GET `/member-metrics` | `hasAuthority('ROLE_MEMBER')` | `hasAuthority('MEMBER_DASHBOARD_VIEW')` | View only |
| `DashboardController` | GET `/staff-metrics` | `isAuthenticated() && !hasAuthority('ROLE_MEMBER')` | `hasAnyAuthority('MEMBERS_READ','SAVINGS_READ','LOANS_READ','REPORTS_READ')` | Refactor to permission inclusion |
| `ObligationController` | GET `/my`, `/my/history` | `hasAnyAuthority('SAVINGS_OBLIGATIONS_READ','ROLE_MEMBER','ROLE_SYSTEM_ADMIN')` | `hasAuthority('MEMBER_OBLIGATIONS_VIEW')` | View only |
| `SavingsController` | GET `/me/balance` | `isAuthenticated()` | `hasAuthority('MEMBER_SAVINGS_VIEW')` | View only |
| `SavingsController` | GET `/me/statement` | `isAuthenticated()` | `hasAuthority('MEMBER_SAVINGS_VIEW')` | View only |
| `SavingsController` | POST `/deposits/mpesa/initiate` | `isAuthenticated()` | `hasAuthority('MEMBER_SAVINGS_VIEW')` | Self-service |

### 4.3 `hasAnyRole()` → `hasAnyAuthority()` Replacements (CoopConnect)

| Endpoint | Current | Target |
|---|---|---|
| GET `/coop/balance` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','LOAN_OFFICER')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/mini-statement` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON','SECRETARY')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/transactions` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CHAIRPERSON')` | `hasAuthority('BANKING_READ')` |
| GET `/coop/transaction-status/{ref}` | `hasAnyRole('SYSTEM_ADMIN','TREASURER','CASHIER','DEPUTY_CASHIER')` | `hasAuthority('BANKING_READ')` |
| POST `/stk-push` | `isAuthenticated()` | `hasAuthority('MEMBER_SAVINGS_VIEW')` *(member-initiated STK)* |

### 4.4 Frontend Component Replacements

| Component | Current Pattern | Target Pattern |
|---|---|---|
| `ProtectedRoute.tsx` | `user.roles?.includes('ROLE_SYSTEM_ADMIN')` bypass | Remove — SYSTEM_ADMIN has all permissions in `user.permissions[]` |
| `HasPermission.tsx` | `user.roles?.includes('ROLE_SYSTEM_ADMIN')` bypass | Remove — same reason |
| `App.tsx:L308` | `requiredPermissions={['ROLE_SYSTEM_ADMIN']}` | `requiredPermissions={['SETTINGS_EDIT']}` |
| `App.tsx:L342` | `permissions={['EXPENSE_CLAIMS_APPROVE', 'ROLE_SYSTEM_ADMIN']}` | `permissions={['EXPENSE_CLAIMS_APPROVE']}` |
| `App.tsx:L361` | `permissions={['ASSET_READ', 'ROLE_SYSTEM_ADMIN']}` | `permissions={['ASSET_READ']}` |
| `App.tsx:L374` | `permissions={['ROLE_SYSTEM_ADMIN', 'PENALTIES_MANAGE_RULES']}` | `permissions={['SETTINGS_EDIT', 'PENALTIES_MANAGE_RULES']}` |
| `DashboardRouter` | Role-name-based routing | Permission-based routing (see PBAC_MIGRATION_PLAN.md Phase 7) |

---

## 5. Permissions Requiring New DB Migrations

All new permissions must be created **before** any controller annotation is changed.

```sql
-- V71__seed_new_pbac_permissions.sql (planned)
INSERT INTO permissions (code, description) VALUES
  ('SETTINGS_READ',            'View SACCO global settings'),
  ('SETTINGS_EDIT',            'Modify SACCO global settings'),
  ('LOAN_PRODUCTS_MANAGE',     'Create and edit loan products'),
  ('BANKING_READ',             'View Co-op bank account data and transactions'),
  ('BANKING_MANAGE',           'Initiate banking operations via Co-op Connect'),
  ('MEMBER_LOANS_VIEW',        'View own loan applications and schedule'),
  ('MEMBER_LOANS_APPLY',       'Apply for and manage own loan applications'),
  ('MEMBER_PENALTIES_VIEW',    'View own penalty records'),
  ('MEMBER_SAVINGS_VIEW',      'View own savings balance and statement'),
  ('MEMBER_EXPENSE_SUBMIT',    'Submit and view own expense claims'),
  ('MEMBER_OBLIGATIONS_VIEW',  'View own savings obligation status'),
  ('MEMBER_DASHBOARD_VIEW',    'Access the member portal dashboard')
ON CONFLICT (code) DO NOTHING;
```
