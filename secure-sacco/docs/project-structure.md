```md id="jv6y3n"
# Project Structure — Secure SACCO Management System

This document defines the official monorepo structure and the standard module layout for the backend and frontend.
It prevents folder drift and keeps the system scalable without refactoring.

---

## 1) Monorepo Layout (Repo Root)

```

secure-sacco/
backend/
frontend/
docs/
infra/
.gitignore
README.md

```

### Purpose of each directory
- `backend/` — Single Spring Boot application (feature-modular packages)
- `frontend/` — React application (feature-based folders)
- `docs/` — Standards: naming, structure, glossary, decisions
- `infra/` — Dev infra (docker-compose), env templates, scripts

---

## 2) Backend Structure (Single Spring Boot App)

### 2.1 Base Package
All backend code lives under:

- `com.jaytechwave.sacco`

### 2.2 Module List (Feature-First)
Modules are **features/domains**, not technical layers:

- `core` — shared infrastructure (security, exceptions, audit, common utilities)
- `auth` — users, roles, permissions, login/refresh/logout
- `settings` — SACCO settings (singleton), feature flags, prefix rules
- `members` — member management + member number generation
- `savings` — savings accounts, deposits/withdrawals, statements (future)
- `loans` — loan workflow, schedules, repayments (future)
- `reports` — reporting endpoints (future)

### 2.3 Standard Module Layout
Every module follows the same internal structure:

```

<module>/
api/
dto/
domain/
repository/
service/

```

#### Responsibilities
- `api/` — REST controllers + request handling
- `api/dto/` — request/response DTOs (module-owned only)
- `domain/` — entities + module-specific enums + domain rules
- `repository/` — Spring Data repositories
- `service/` — business logic / orchestration

### 2.4 Example: Members Module
```

members/
api/
MemberController.java
dto/
CreateMemberRequest.java
UpdateMemberRequest.java
MemberResponse.java
domain/
MemberEntity.java
MemberStatus.java
repository/
MemberRepository.java
service/
MemberService.java
MemberNumberGenerator.java

```

---

## 3) Backend Rules (Non-Negotiables)

### 3.1 No cross-module repository access
- A module must **not** use another module’s repository directly.
- If module A needs something from module B, it calls module B’s **service** (or uses a domain event later).

✅ Allowed:
- `loans.service.LoanService` calls `members.service.MemberService` to validate member exists.

❌ Not allowed:
- `loans.repository.LoanRepository` directly using `members.repository.MemberRepository`.

### 3.2 DTOs are not shared across modules
- Do not reuse `members.api.dto.*` inside `loans`.
- If needed, create a new DTO in the target module.

### 3.3 Entities are module-owned
- Modules should reference other modules by **ID** (UUID) rather than JPA relationships.
  - Example: `LoanEntity` has `memberId` (UUID) instead of `@ManyToOne MemberEntity`.

### 3.4 Shared code lives only in `core`
Examples of what can live in `core`:
- security filters/config
- global exception handling and error responses
- audit logging helper
- pagination helpers
- shared value objects (e.g., Money wrapper) if truly needed

### 3.5 Enums placement
- Module-specific enums: `module/domain/`
  - `members/domain/MemberStatus.java`
- Shared enums (only if truly shared): `core/common/`

Avoid creating `enums/` folders unless there are many enums and clutter becomes real.

---

## 4) Frontend Structure (React)

Frontend is feature-based to match backend modules:

```

frontend/src/
app/
routes/
layout/
features/
auth/
members/
settings/
savings/     (future)
loans/       (future)
reports/     (future)
shared/
api/
ui/
utils/

```

### Folder responsibilities
- `app/` — router setup, layouts, providers
- `features/<feature>/` — pages/components/hooks for one domain
- `shared/api/` — API client setup (axios/fetch), typed endpoints
- `shared/ui/` — reusable UI components (buttons, inputs)
- `shared/utils/` — helpers (formatting, dates, etc.)

---

## 5) Infra Structure

```

infra/
docker-compose.yml
env/
example.env
scripts/
reset-db.sh   (optional)

```

- Keep infra files separate from app code.
- Dev secrets should not be committed; use `.env` locally.

---

## 6) Expansion Strategy (No Refactor Later)

When you add a new module:
1. Create the module folder in the base package (e.g., `savings/`)
2. Add the standard internal structure (`api/domain/repository/service`)
3. Add Flyway migrations for that module (new migration file)
4. Add feature flag entry in settings (if it’s optional)

---

## 7) Quick Checklist
Before merging any PR:
- [ ] Follows module folder layout
- [ ] No cross-module repository usage
- [ ] DTOs are module-owned
- [ ] Entities don’t create cross-module JPA relations
- [ ] Naming standards followed (see `docs/naming.md`)
```
