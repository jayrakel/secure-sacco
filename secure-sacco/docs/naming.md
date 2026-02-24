# Naming Standards — Secure SACCO Management System

This document defines the single source of truth for naming across the database, backend (Spring Boot), and frontend (React).

---

## 1) Global Rules (Always)

1. **One concept = one name**
    - Use the same term everywhere (DB, Java, API, UI).
    - Example: `memberNumber` (API/Java) ↔ `member_number` (DB).

2. **Identifiers**
    - Primary keys are **UUID** across the system.
    - Business identifiers (e.g., member number) are separate fields.

3. **Dates and time**
    - Use `timestamptz` (Postgres) and `OffsetDateTime` (Java).

4. **Money**
    - Use `NUMERIC(19,2)` in DB.
    - Use `BigDecimal` in Java.
    - Never use floating types for money.

---

## 2) Database Naming (PostgreSQL)

### 2.1 Tables
- **snake_case**, **plural**
    - `users`, `roles`, `permissions`
    - `members`, `loan_applications`, `savings_transactions`

### 2.2 Columns
- **snake_case**
    - `first_name`, `member_number`, `created_at`, `updated_at`
- Foreign keys:
    - `user_id`, `member_id`, `created_by_user_id`

### 2.3 Primary Keys
- Column name: `id`
- Type: `uuid`
- Default: `gen_random_uuid()`

### 2.4 Indexes
- Format:
    - `idx_<table>_<column>`
    - Example: `idx_members_member_number`

### 2.5 Constraints
- Unique constraints:
    - `uq_<table>_<column>`
    - Example: `uq_users_email`
- Foreign keys:
    - `fk_<table>_<ref_table>_<column>`
    - Example: `fk_members_users_created_by_user_id` (optional)

### 2.6 Enums
- DB enums are allowed only if stable; otherwise prefer VARCHAR + validation at service layer.
- Enum values are **UPPER_SNAKE_CASE**:
    - `ACTIVE`, `DORMANT`, `EXITED`

---

## 3) Backend (Java / Spring Boot)

### 3.1 Packages
- Feature-first packages under:
    - `com.jaytechwave.sacco`
- Modules:
    - `core`, `auth`, `settings`, `members`, `savings`, `loans`, `reports`

Example:
- `com.jaytechwave.sacco.members.api`
- `com.jaytechwave.sacco.members.service`
- `com.jaytechwave.sacco.members.domain`

### 3.2 Classes
- **PascalCase**
    - `MemberEntity`, `MemberService`, `MemberController`
- Interfaces:
    - `MemberRepository`

### 3.3 Fields / variables / methods
- **camelCase**
    - `memberNumber`, `createdAt`, `isActive`

### 3.4 DTOs
- Requests:
    - `CreateMemberRequest`, `UpdateMemberRequest`, `LoginRequest`
- Responses:
    - `MemberResponse`, `AuthResponse`
- Keep DTOs inside the module:
    - `members/api/dto/*`

### 3.5 Entity naming
- Use suffix `Entity`:
    - `UserEntity`, `RoleEntity`, `MemberEntity`

### 3.6 Enums
- **PascalCase** enum type, **UPPER_SNAKE_CASE** values:
    - `MemberStatus { ACTIVE, DORMANT, EXITED }`
- Module-specific enums live in module `domain`.
- Shared enums live in `core/common` only if truly shared.

### 3.7 REST endpoints
- Base prefix:
    - `/api/v1`
- Resource paths: **plural**, **kebab-case**
    - `/api/v1/members`
    - `/api/v1/loans/applications`
- Use nouns for resources, not verbs.

### 3.8 JSON fields
- **camelCase** everywhere
    - `memberNumber`, `firstName`, `createdAt`

### 3.9 Error response format (standard)
All errors must return consistent JSON:

```json
{
  "timestamp": "2026-02-22T00:00:00+03:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/members"
}

4) Frontend (React)
4.1 Folders

Feature-first:

src/features/members/*

src/features/auth/*

src/shared/*

4.2 Files and components

Components: PascalCase

MemberList.tsx, LoginForm.tsx

Folders: kebab-case preferred

loan-approval/, member-profile/

4.3 Variables and functions

camelCase

memberList, fetchMembers()

4.4 API client naming

Use the same field names as backend JSON:

memberNumber (not member_number)

5) Canonical Vocabulary (Glossary Preview)

These terms must stay consistent across the system:

Member: SACCO member record

Member Number: business identifier (BVL/2026/0000001)

Savings Transaction: deposit/withdrawal posting

Loan Application: request before approval

Loan: approved/disbursed facility

Repayment: payment made against a loan

(Full glossary lives in docs/glossary.md.)

6) Member Number Format (Locked)

Format:

{PREFIX}/{YEAR}/{SEQUENCE_PADDED}

Rules:

PREFIX is exactly 3 letters (e.g., BVL)

SEQUENCE_PADDED default length is 7 (e.g., 0000001)

Sequence never resets

Only the YEAR changes with the current year

Prefix generation uses stop-words filtering; manual override is allowed in settings