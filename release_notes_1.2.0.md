# Secure Sacco v1.2.0 - Accounting Fixes, Passkeys, and Security Improvements

## What's Changed

### Authentication and Security 🔒
- **Passkeys & WebAuthn Foundation:** Created initial database schema and entities for biometric and passkey authentication (`V20261001183545__create_passkeys_schema.sql`).
- **MFA Setup Fixes:** Resolved a critical 500 Internal Server Error when setting up Two-Factor Authentication by updating HTTP mappings to accept `POST` requests.
- **Enhanced MFA UI:** Added clear UI selection for users to choose between SMS and Email for their MFA delivery methods.
- **Dedicated Security Hub:** Redesigned the frontend by splitting the "Security" and "Sessions" tabs out of the general Profile page into a dedicated `/security` settings hub, improving UX and code maintainability.
- **Strict Data Integrity:** Enforced a `phoneNumberHash` uniqueness check in the `UserService`. This prevents system admins from accidentally creating duplicate staff or member accounts using the same phone number.

### Accounting and Expenses 💰
- **Expense Reimbursement Tracking:** Resolved a severe "Double Deduction" bug where Sacco Expense Reimbursements bypassed the tracking table. Approved member claims now accurately generate tracking records in the central `sacco_expenses` dashboard.
- **Idempotent GL Posts:** Overhauled `ExpenseClaimService` to ensure tracking records link to the exact same `journal_reference` as the member reimbursement, completely preventing duplicate General Ledger deductions.
- **Historical Backfill Migration:** Added a time-based Flyway migration (`V20261001211500__...`) to safely copy all previously approved expense claims into the expenses table so no historical data is lost on the dashboard.

### Infrastructure and Bug Fixes 🛠️
- **Flyway Boot Fix:** Added the explicitly required `spring-boot-flyway` dependency to fix an issue where automatic database migrations were silently failing on boot under Spring Boot 4.1.x.
- **System Alerts Migration:** Added `V124` migration to explicitly force the addition of the system alerts column where it was missing.
- **UI Error Resolution:** Fixed an `Uncaught ReferenceError` crashing the frontend Dashboard by correcting the import for the `ShieldCheck` icon.
- **Docker Optimizations:** Investigated and optimized Docker build layering (note: some experimental jar mode layer tools were temporarily reverted for compatibility).

## Notable Commits & Pull Requests

### Authentication & Core
- Fix duplicate deductions for expense claims & update MFA setups
- Add SMS and Email selection to MFA UI
- Enforce phone number uniqueness to prevent duplicate users
- Create initial passkeys schema for biometric auth

### Infrastructure
- Add spring-boot-flyway dependency to fix automatic migrations on boot
- Add V124 to force add system alerts column

## Upgrade Notes
- **Database Migrations:** Ensure your application connects with a user that has DDL privileges on startup. The time-based migration `V20261001211500` will automatically backfill all past approved expense claims into the `sacco_expenses` table. This is safe and idempotent.
- **MFA Configuration:** The MFA setup flow has been relocated to the `/security` route.
- **Full Changelog:**
[v1.1.0...v1.2.0](https://github.com/jayrakel/secure-sacco/compare/v1.1.0...v1.2.0)
