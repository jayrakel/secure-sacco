# PROJECT_CONTEXT.md

**Status:** Living document — updated as discovery progresses.
**Precedence:** Highest. All other documents defer to this file for factual system context.

---

## 1. System Overview

**Secure SACCO** is a production-grade, enterprise SACCO (Savings and Credit Co-operative Organisation) Management System built for Kenya.

| Attribute | Value |
|---|---|
| Backend | Java 21 + Spring Boot 3 |
| Frontend | React 18 + TypeScript + Vite |
| Database | PostgreSQL with Flyway migrations (current: V70+) |
| Auth Model | Session-based (Spring Session), CSRF-protected SPA |
| Timezone | Africa/Nairobi (EAT, UTC+3) |
| Authorization | Hybrid RBAC → PBAC (migration in progress) |

---

## 2. Module Inventory

### Backend Modules (18 total)

| Module | Package | Controller(s) | Service(s) | Jobs | Listeners |
|---|---|---|---|---|---|
| **Core** | `core` | `AuthController`, `ProfileController`, `SetupController` | `CustomUserDetailsService`, `PasswordResetService`, `ContactVerificationService`, `SessionInvalidationService` | — | — |
| **Users** | `users` | `UserController`, `ActivationController` | `UserService`, `UserActivationService` | — | — |
| **Roles** | `roles` | `RoleController`, `PermissionController` | `RoleService` | — | — |
| **Audit** | `audit` | `AuditController` | `SecurityAuditService` | — | — |
| **Members** | `members` | `MemberController` | `MemberService`, `MemberNumberGeneratorService` | — | — |
| **Savings** | `savings` | `SavingsController` | `SavingsService` | — | `SavingsPaymentListener` |
| **Loans** | `loans` | `LoanApplicationController`, `LoanProductController`, `LoanReportingController` | `LoanApplicationService`, `LoanProductService`, `LoanRepaymentService`, `LoanReportingService`, `LoanScheduleService` | `LoanScheduleJob` | — |
| **Accounting** | `accounting` | `AccountController`, `JournalEntryController`, `TrialBalanceController` | `AccountService`, `JournalEntryService` | — | — |
| **Payments** | `payments` | `CoopConnectController` | `CoopConnectService`, `PaymentService` | `PendingPaymentPollingJob` | `MemberPaymentListener` |
| **Penalties** | `penalties` | `PenaltyController`, `PenaltyRuleController` | `PenaltyService`, `PenaltyRuleService`, `PenaltyRepaymentService` | `PenaltyJob` | `LoanPenaltyEventListener`, `PenaltyPaymentListener` |
| **Meetings** | `meetings` | `MeetingController` | `MeetingService`, `MeetingPenaltyService` | `MeetingAttendanceSeedJob`, `MeetingAutoCompleteJob` | — |
| **Obligations** | `obligations` | `ObligationController` | `ObligationService`, `ObligationPeriodService` | `ObligationEvaluationJob` | — |
| **Reports** | `reports` | `ReportController` | `ReportService` | — | — |
| **Settings** | `settings` | `SaccoSettingsController` | `SaccoSettingsService`, `FeatureFlagService`, `PrefixGeneratorService` | — | — |
| **Dashboard** | `dashboard` | `DashboardController` | — | — | — |
| **Public Content** | `public_content` | `PublicController` | `PublicService`, `CloudinaryUploadService` | — | — |
| **Expense** | `expense` | `ExpenseClaimController` | `ExpenseClaimService` | — | — |
| **Assets** | `assets` | `AssetController` | `AssetService` | — | — |

### Frontend Features (18 total)

| Feature | Pages | Key Components |
|---|---|---|
| `auth` | Login, ChangePassword, ResetPassword, Activation, Profile, SecuritySettings, VerifyContact | `AuthProvider` |
| `dashboard` | AdminDashboard, MemberDashboard, TreasurerDashboard, CashierDashboard, LoanOfficerDashboard, ChairpersonDashboard, SecretaryDashboard, DashboardRouter | `DashboardWidgets` |
| `members` | MemberListPage, MemberDashboardPage | `CreateMemberModal` |
| `savings` | SavingsManagementPage, MemberSavingsPage | `ManualTransactionModal`, `MpesaDepositModal` |
| `loans` | LoanManagementPage, LoanProductsPage, MyLoansPage | `ApplyLoanModal`, `DisburseLoanModal`, `CommitteeApproveModal`, `VerifyLoanModal`, `RepayLoanModal`, `AddGuarantorModal`, `PayLoanFeeModal`, `LoanDetailModal` |
| `accounting` | ChartOfAccountsPage, JournalEntriesPage, TrialBalancePage, ManualGlPostingPage | — |
| `payments` | — | `PaymentModal` |
| `penalties` | StaffPenaltiesPage, MemberPenaltiesPage | — |
| `meetings` | MeetingsManagementPage, MyMeetingsPage, MeetingCheckInPage | `MeetingQrModal`, `MeetingQrScanner` |
| `obligations` | ObligationsCompliancePage | `CreateObligationModal`, `EditObligationModal`, `AdminObligationsSection`, `MemberObligationsSection` |
| `reports` | ReportsHubPage, MemberStatementPage, LoanArrearsPage, DailyCollectionsPage, IncomeReportPage, MemberPersonalReportsPage | `BankStatementPrintable` |
| `audit` | AuditLogPage | — |
| `users` | UserListPage, RolesPermissionsPage, PermissionsRegistryPage | `CreateUserModal` |
| `settings` | SaccoSettingsPage, TimeMachinePage | — |
| `expense` | StaffExpenseClaimsPage, MyExpenseClaimsPage | — |
| `assets` | StaffAssetsPage | — |
| `public` | LandingPage, SecretaryPortalPage | — |
| `migration` | MigrationPage | — |

---

## 3. Roles

All roles are stored in the `roles` table. The `MEMBER` role is created in V6.

| Role Name | Type | Description |
|---|---|---|
| `SYSTEM_ADMIN` | System | Break-glass superuser — bypasses all permission checks |
| `CHAIRPERSON` | Staff | Chairs loan committee |
| `DEPUTY_CHAIRPERSON` | Staff | Deputy chair |
| `SECRETARY` | Staff | Manages member register |
| `DEPUTY_SECRETARY` | Staff | Deputy secretary |
| `TREASURER` | Staff | Primary financial officer |
| `DEPUTY_TREASURER` | Staff | Deputy treasurer |
| `ACCOUNTANT` | Staff | Posts GL entries |
| `DEPUTY_ACCOUNTANT` | Staff | Deputy accountant |
| `CASHIER` | Staff | Handles manual deposits/withdrawals |
| `DEPUTY_CASHIER` | Staff | Deputy cashier |
| `LOAN_OFFICER` | Staff | First-level loan verification |
| `DEPUTY_LOAN_OFFICER` | Staff | Deputy loan officer |
| `MEMBER` | Member | Default role for member portal access |
| `ADMIN` | Operational | General admin (referenced in expense/asset permission seeds) |

---

## 4. Permission Registry

All permissions exist in the `permissions` table. Below is the complete inventory derived from all Flyway migrations.

### User & Role Management

| Permission | Description | Seeded In |
|---|---|---|
| `USER_READ` | View user accounts | V1_1 |
| `USER_CREATE` | Create user accounts | V1_1 |
| `USER_UPDATE` | Update user accounts | V1_1 |
| `ROLE_READ` | View roles and permissions | V1_1 |
| `ROLE_CREATE` | Create roles | V1_1 |
| `ROLE_UPDATE` | Update roles | V1_1 |
| `SESSION_READ` | View active sessions | V1_1 |
| `SESSION_REVOKE` | Revoke active sessions | V1_1 |

### Members

| Permission | Description | Seeded In |
|---|---|---|
| `MEMBER_READ` | View member profiles (legacy) | V1_1 |
| `MEMBER_CREATE` | Create members (legacy) | V1_1 |
| `MEMBER_UPDATE` | Update members (legacy) | V1_1 |
| `MEMBER_STATUS_CHANGE` | Change member status (legacy) | V1_1 |
| `MEMBERS_READ` | View members (used by MemberController) | V5 |
| `MEMBERS_WRITE` | Create/update/delete members (used by MemberController) | V5 |

### Savings

| Permission | Description | Seeded In |
|---|---|---|
| `SAVINGS_READ` | View savings accounts and transactions | V32 |
| `SAVINGS_MANUAL_POST` | Post manual deposits/withdrawals | V32 |
| `SAVINGS_OBLIGATIONS_MANAGE` | Manage savings obligations | V41 |
| `SAVINGS_OBLIGATIONS_READ` | View own savings obligations | V41 |

### Loans

| Permission | Description | Seeded In |
|---|---|---|
| `LOANS_READ` | View loan applications | V21 |
| `LOANS_APPROVE` | First-level loan verification | V21 |
| `LOANS_COMMITTEE_APPROVE` | Final loan committee approval | V21 |
| `LOANS_DISBURSE` | Disburse approved loans | V21 |

### Accounting

| Permission | Description | Seeded In |
|---|---|---|
| `ACCOUNTING_READ` | View chart of accounts and journal entries | V60 |
| `ACCOUNTING_WRITE` | Create and edit GL accounts | V60 |
| `ACCOUNTING_JOURNAL_POST` | Post manual journal entries | V60 |
| `GL_TRIAL_BALANCE` | View trial balance | V38 |

### Penalties

| Permission | Description | Seeded In |
|---|---|---|
| `PENALTIES_WAIVE_ADJUST` | Waive or adjust penalties | V26/V27 |
| `PENALTIES_MANAGE_RULES` | Create and edit penalty rules | V26/V27 |

### Meetings

| Permission | Description | Seeded In |
|---|---|---|
| `MEETINGS_MANAGE` | Full meeting management | V36 |
| `MEETINGS_READ` | View meetings | V36 |

### Reports

| Permission | Description | Seeded In |
|---|---|---|
| `REPORTS_READ` | View and export reports | V32 |

### Audit

| Permission | Description | Seeded In |
|---|---|---|
| `AUDIT_LOG_READ` | View audit logs | V38/V36 |

### Expense Claims

| Permission | Description | Seeded In |
|---|---|---|
| `EXPENSE_CLAIMS_READ` | View all expense claims | V68 |
| `EXPENSE_CLAIMS_APPROVE` | Submit/approve/reject expense claims | V68 |

### Assets

| Permission | Description | Seeded In |
|---|---|---|
| `ASSET_READ` | View asset register | V70 |
| `ASSET_WRITE` | Register new assets | V70 |
| `ASSET_DISPOSE` | Change asset status | V70 |

### System

| Permission | Description | Seeded In |
|---|---|---|
| `DATA_MIGRATION` | Access historical data migration tool | V32 or later |

---

## 5. Role-to-Permission Matrix

| Permission | SYSTEM_ADMIN | TREASURER | DEP_TREASURER | LOAN_OFFICER | DEP_LOAN_OFFICER | CASHIER | DEP_CASHIER | CHAIRPERSON | DEP_CHAIRPERSON | SECRETARY | DEP_SECRETARY | ACCOUNTANT | DEP_ACCOUNTANT | MEMBER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| USER_READ | ✅ | | | | | | | | | | | | | |
| USER_CREATE | ✅ | | | | | | | | | | | | | |
| USER_UPDATE | ✅ | | | | | | | | | | | | | |
| ROLE_READ | ✅ | | | | | | | | | | | | | |
| MEMBERS_READ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | |
| MEMBERS_WRITE | ✅ | | | | | | | | | ✅ | ✅ | | | |
| SAVINGS_READ | ✅ | ✅ | ✅ | | | ✅ | ✅ | | | | | ✅ | | |
| SAVINGS_MANUAL_POST | ✅ | | | | | ✅ | ✅ | | | | | | | |
| SAVINGS_OBLIGATIONS_MANAGE | ✅ | ✅ | | | | | | | | | | | | |
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

> **Note:** MEMBER role has no named permissions. All member-accessible endpoints use `hasAuthority('ROLE_MEMBER')` — a RBAC check, not a PBAC check. This is the primary migration target.

---

## 6. Audit Infrastructure

### Current Audit Entity: `SecurityAuditLog`

```
Table: security_audit_logs
Fields: id, actor, action, target, ip_address, details, created_at
```

### Gaps vs. PBAC_AND_AUDIT_MIGRATION.md Requirements

The required unified audit standard mandates these additional fields that are **not currently present**:

| Required Field | Present? |
|---|---|
| Event ID | ✅ (id) |
| Timestamp | ✅ (created_at) |
| User ID | ❌ (actor = email, not UUID) |
| Username | ✅ (actor) |
| Member ID | ❌ |
| Module | ✅ (target) |
| Action | ✅ (action) |
| Entity Type | ❌ |
| Entity ID | ❌ |
| Description | ✅ (details) |
| Result | ❌ |
| IP Address | ✅ |
| User Agent | ❌ |
| Session Identifier | ❌ |
| Permission Used | ❌ |
| Before State | ❌ |
| After State | ❌ |

---

## 7. Scheduled Jobs

| Job | Module | Schedule | Audited? |
|---|---|---|---|
| `LoanScheduleJob` | loans | Cron (daily) | ❌ |
| `PenaltyJob` | penalties | 00:30 EAT daily | ❌ |
| `PendingPaymentPollingJob` | payments | Cron | ❌ |
| `MeetingAttendanceSeedJob` | meetings | Cron | ❌ |
| `MeetingAutoCompleteJob` | meetings | Cron | ❌ |
| `ObligationEvaluationJob` | obligations | Cron | ❌ |

---

## 8. Event Listeners

| Listener | Module | Events Handled | Audited? |
|---|---|---|---|
| `SavingsPaymentListener` | savings | `PaymentCompletedEvent`, `PaymentFailedEvent` | ❌ |
| `MemberPaymentListener` | payments | Payment events | ❌ |
| `LoanPenaltyEventListener` | penalties | `LoanInstallmentOverdueEvent` | ❌ |
| `PenaltyPaymentListener` | penalties | `PaymentCompletedEvent`, `PaymentFailedEvent` | ❌ |

---

## 9. Security Infrastructure

- **Authentication:** Session cookie (`SESSION`) + CSRF (`XSRF-TOKEN`)
- **Session:** Spring Session (max 5 concurrent)
- **Filters:** `SecurityHeadersFilter`, `MustChangePasswordFilter`, `ContactVerificationFilter`, `MpesaIpWhitelistFilter`, `ApiRateLimitFilter`, `CsrfCookieFilter`
- **Audit immutability:** PostgreSQL trigger `make_audit_logs_append_only` (V37) — blocks UPDATE/DELETE on `security_audit_logs`
- **Method security:** `@EnableMethodSecurity` active — `@PreAuthorize` used on all controllers

---

## 10. Public / Unauthenticated Endpoints

| Endpoint | Reason |
|---|---|
| `POST /api/v1/auth/login` | Login |
| `POST /api/v1/auth/login/mfa` | MFA step |
| `GET /api/v1/auth/csrf` | CSRF cookie fetch |
| `POST /api/v1/auth/forgot-password` | Password reset request |
| `POST /api/v1/auth/reset-password` | Password reset completion |
| `POST /api/v1/auth/activation/**` | Account activation |
| `GET /api/v1/settings/sacco` | SACCO name for login page |
| `GET /api/v1/setup/**` | Setup wizard status |
| `GET /api/v1/public/landing` | Public landing page |
| `GET /api/v1/meetings/qr/**` | Meeting QR check-in (no auth) |
| `POST /api/v1/payments/coop/stk-callback` | Co-op STK callback |
| `POST /api/v1/payments/coop/ipn` | Co-op IPN callback |
| `POST /api/v1/payments/mpesa/**` | Safaricom callbacks |
| `/actuator/health` | Load balancer probe |
| `/api-docs/**`, `/swagger-ui/**` | Dev only |
