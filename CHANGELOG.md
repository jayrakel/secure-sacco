# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-10-02

### Added
- Implemented historical tracking for Member Expense Reimbursements into the central `sacco_expenses` table via a new `SaccoExpenseRepository` injection, without causing duplicate General Ledger deductions.
- Added time-based Flyway database migration (`V20261001211500__backfill_expense_claims_into_sacco_expenses.sql`) to backfill previously approved expense claims into the expenses dashboard.
- Redesigned the MFA (Multi-Factor Authentication) frontend setup by splitting the 'Security' and 'Sessions' tabs from the `ProfilePage` into a dedicated `/security` page to reduce code duplication and improve user experience.

### Fixed
- Fixed an `Uncaught ReferenceError` on the frontend Dashboard by correctly importing the `ShieldCheck` icon in `DashboardLayout.tsx`.
- Resolved a 500 Internal Server Error when users attempted to configure 2FA; updated the HTTP method mapping in the backend to explicitly support `POST` for MFA setup.
- Implemented a `phoneNumberHash` uniqueness check in the `UserService` to prevent identical phone numbers from creating duplicated user/staff accounts, enforcing data integrity.
