# AGENTS.md — Secure SACCO Development Guide

Essential knowledge for AI agents working on this SACCO management system monorepo. Last updated: April 2026.

---

## Architecture Overview

**Monorepo Stack:** 
- Backend: Spring Boot 3.5 (Java 17), feature-modular design
- Frontend: React 19 + TypeScript + Vite (Tailwind CSS)
- Infra: Docker Compose (PostgreSQL 16, Redis 7.4)
- Database: Flyway migrations (versioned SQL)

**Key Principle:** Feature-first modules over technical layers. No cross-module repository access; modules communicate via services or domain events.

---

## Backend Structure (`backend/backend/`)

### Standard Module Layout
Every module lives under `src/main/java/com/jaytechwave/sacco/modules/<feature>/` and follows:
```
<module>/
├── api/                    # REST controllers + request handling
├── api/dto/               # Module-owned DTOs only
├── domain/                # JPA entities, module-specific enums, domain rules
├── repository/            # Spring Data JPA repositories
└── service/               # Business logic & orchestration
```

**Current modules:** `core`, `auth`, `users`, `roles`, `settings`, `members`, `savings`, `loans`, `payments`, `penalties`, `obligations`, `accounting`, `audit`, `meetings`, `reports`, `dashboard`

### Critical Rules (Non-Negotiables)

1. **No cross-module repository access**
   - ❌ `loans.service` directly calling `members.repository`
   - ✅ `loans.service` calling `members.service` instead

2. **DTOs are module-owned**
   - Create new DTOs in your module, don't reuse from others
   - Example: `members/api/dto/MemberResponse` stays in members

3. **Entities reference other modules by UUID, not JPA relationships**
   - ❌ `@ManyToOne MemberEntity member` in LoanEntity
   - ✅ `UUID memberId` field in LoanEntity

4. **Shared code lives only in `core/`**
   - Security filters, global exception handling, audit logging, pagination helpers, shared value objects (Money)

### Build & Test Commands

```bash
# Build with tests
mvn clean package

# Run specific test class
mvn test -Dtest=MemberServiceTest

# Code coverage (JaCoCo)
# Generates: target/site/jacoco/index.html
# Enforces 70% coverage on service classes (pom.xml:236-259)
mvn verify

# Security scanning (OWASP)
mvn dependency-check:check

# Run with Maven wrapper (no Maven install needed)
./mvnw clean package

# Start backend (requires Redis + Postgres running)
mvn spring-boot:run
```

### Data Access Patterns

- **Repositories:** Extend `JpaRepository<Entity, UUID>`
- **Pagination:** Use `Page<T>` with `Pageable` from Spring Data
- **Transactions:** `@Transactional` at service method level
- **Entities:** Use `OffsetDateTime` for timestamps, `BigDecimal` for money (NUMERIC(19,2) in DB)
- **Identifiers:** UUID primary keys everywhere; business keys (e.g., member_number) are separate fields

### Configuration & Profiles

- **Dev profile:** `application-dev.yml` - verbose logging, CORS for `http://localhost:5173`, dev encryption keys, MFA enabled
- **Production:** Override env vars: `APP_FIELD_ENCRYPTION_KEY`, `APP_PII_HMAC_KEY`, `NVD_API_KEY`
- **Redis session:** `@EnableRedisIndexedHttpSession` at startup; session invalidation is instant
- **Async ops:** `@EnableAsync` at startup; use `@Async` in service layer

### Key Dependencies & Patterns

- **JWT:** JJWT (0.12.6) for token signing; tokens validate against JWT secret
- **Password:** Argon2 via Spring Security (requires BouncyCastle at runtime)
- **MFA:** TOTP (Time-based One-Time Password) via `dev.samstevens.totp`
- **Payments:** M-Pesa integration via custom `DarajaApiService`
- **Email:** Resend (3.1.0) for transactional emails
- **Security audit:** Custom `SecurityAuditService` logs all sensitive actions

### Error Handling

**GlobalExceptionHandler** returns consistent JSON:
```json
{
  "timestamp": "2026-02-22T00:00:00+03:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/v1/members"
}
```

Map exceptions to HTTP status in order:
1. `@Valid` violations → 400 + field errors
2. `IllegalArgumentException` → 400 (business logic)
3. `IllegalStateException` → 409 (state conflict)
4. `NoSuchElementException` → 404 (entity not found)
5. Unhandled exceptions → 500 + request ID for debugging

---

## Frontend Structure (`frontend/`)

### Technology Stack
- **Framework:** React 19 (latest)
- **Build tool:** Vite 7.3 with `npm run build` → optimized dist/
- **Testing:** Vitest 3.0 + React Testing Library
- **Styling:** Tailwind CSS 4.2 with `@tailwindcss/vite`
- **Routing:** React Router v7
- **HTTP:** Axios 1.13 for API calls
- **Icons:** Lucide React

### Module Organization (matches backend)
```
frontend/src/features/
├── auth/              # Login, MFA, session management
├── members/           # Member profiles, KYC
├── savings/           # Savings accounts, transactions
├── loans/             # Loan applications, repayment
├── payments/          # Payment processing
├── meetings/          # Member meetings
├── reports/           # Reporting views
└── ...other features

shared/
├── api/               # Axios client setup, typed endpoints
├── components/        # Reusable UI buttons, inputs, modals
├── layouts/           # Main layout wrappers
└── utils/             # Date formatting, validation helpers
```

### Build & Run Commands

```bash
# Install dependencies
npm ci

# Dev server (HMR on http://localhost:5173)
npm run dev

# Build for production (output: dist/)
npm run build

# Run tests once
npm test

# Lint all files
npm lint

# Preview production build locally
npm preview
```

### API Client Pattern

- **Base URL:** Configured at build time via `VITE_API_BASE_URL` env var (default: `http://localhost:8080`)
- **Endpoints:** Typed using TypeScript interfaces
- **Auth:** JWT tokens stored in cookies (httpOnly + Secure in prod)
- **Error handling:** Centralized Axios interceptor for 401/403 redirects

### Naming Conventions

- **Components:** PascalCase (`MemberList.tsx`, `LoanForm.tsx`)
- **Folders:** kebab-case (`member-profile/`, `loan-approval/`)
- **Variables/Functions:** camelCase (`memberList`, `fetchMembers()`)
- **API fields:** camelCase matching backend JSON (`memberNumber`, not `member_number`)

---

## Naming & Data Standards

### Database (PostgreSQL)

- **Tables:** snake_case, plural (`members`, `loan_applications`, `savings_transactions`)
- **Columns:** snake_case (`first_name`, `member_number`, `created_at`)
- **Primary keys:** `id uuid DEFAULT gen_random_uuid()`
- **Indexes:** `idx_<table>_<column>` (e.g., `idx_members_member_number`)
- **Constraints:** `uq_<table>_<column>`, `fk_<table>_<ref_table>_<column>`
- **Enums:** UPPER_SNAKE_CASE values (`ACTIVE`, `DORMANT`, `EXITED`)

### Backend (Java)

- **Packages:** `com.jaytechwave.sacco.<module>.<layer>`
- **Classes:** PascalCase with suffix (`MemberEntity`, `MemberService`, `MemberController`)
- **Fields/methods:** camelCase (`memberNumber`, `isActive`)
- **REST paths:** `/api/v1/<plural-noun>` in kebab-case (`/api/v1/members`, `/api/v1/loan-applications`)
- **DTOs:** `CreateMemberRequest`, `UpdateMemberRequest`, `MemberResponse`

### Business Identifiers

- **Member Number:** `{PREFIX}/{YEAR}/{SEQUENCE_PADDED}` (e.g., `BVL/2026/0000001`)
  - PREFIX: 3 letters (configured in settings)
  - YEAR: current year (e.g., 2026)
  - SEQUENCE: zero-padded 7 digits (never resets)
  - Generated by `MemberNumberGeneratorService`

---

## Development Workflows

### Starting Fresh (First Time)

```bash
# 1. Start PostgreSQL + Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Run backend (auto-runs Flyway migrations)
cd secure-sacco/backend/backend
mvn spring-boot:run

# 3. In another terminal, start frontend
cd secure-sacco/frontend
npm install
npm run dev
```

Backend runs on `http://localhost:8080/swagger-ui/` (OpenAPI docs)
Frontend runs on `http://localhost:5173`

### Database Migrations

- **Framework:** Flyway (auto-runs on app startup)
- **Location:** `backend/backend/src/main/resources/db/migration/`
- **Naming:** `V<number>__<description>.sql` (e.g., `V4__add_loan_products.sql`)
- **Rules:**
  - Migrations are immutable once deployed
  - Use `CREATE TABLE IF NOT EXISTS` for idempotency in dev
  - Reference existing constraints/indexes before modifying
  - Always include rollback steps in comments (manual recovery)

### Adding a New Module

1. Create folder: `modules/<new-feature>/`
2. Add subdirectories: `api/`, `api/dto/`, `domain/`, `repository/`, `service/`
3. Create controller, service, entity, and repository
4. Add REST endpoints under `/api/v1/<plural-feature>`
5. Create new Flyway migration for schema
6. Add feature flag entry in `settings` module (if optional)

### Testing

- **Unit tests:** `*Test.java` (no database, mock repositories)
- **Integration tests:** `*Tests.java` (uses Testcontainers for real PostgreSQL)
- **Test command:** `mvn test` (runs both)
- **Coverage requirement:** 70% on service layer classes (enforced in pom.xml, see plugins section)
- **Frontend tests:** `vitest run` with React Testing Library queries

### Debugging

- **Backend logs:** `logging.level` in `application-dev.yml` (set to DEBUG for Spring Security, CORS issues)
- **Frontend errors:** Browser console + React DevTools
- **Request tracking:** Check request ID in error responses for tracing
- **Database queries:** Enable Flyway INFO logs to see schema changes; use `pgAdmin` or `psql` directly

---

## Key Integration Points

### M-Pesa Mobile Money

- **Service:** `PaymentService` + `DarajaApiService` (Safaricom Daraja API)
- **Config (dev):** `application-dev.yml:7-14` (sandbox credentials)
- **Callback:** External M-Pesa callbacks routed through ngrok in dev; production uses fixed domain
- **Pattern:** Async STK push → customer confirms → callback webhook updates payment status

### Email Notifications

- **Provider:** Resend (transactional email)
- **Use cases:** Password reset, account activation, loan approval
- **Config:** API key via environment variable (not in repo)

### User Sessions & Authorization

- **Session storage:** Redis (Spring Session, `@EnableRedisIndexedHttpSession`)
- **Auth scheme:** JWT for stateless APIs, session cookies for web UI
- **Roles & permissions:** `RBAC` model — users assigned roles, roles contain permission codes
- **Permission format:** `<MODULE>_<ACTION>` (e.g., `MEMBERS_READ`, `LOANS_WRITE`)
- **Enforce:** `@PreAuthorize("hasAuthority('MEMBERS_READ')")` on controller methods

### Audit & Compliance

- **Audit service:** `SecurityAuditService` in `core/`
- **Logged events:** Login attempts, role changes, sensitive data access, payment confirmations
- **Immutability:** Audit records never modified (append-only design)
- **GDPR:** Encrypted PII fields using `APP_FIELD_ENCRYPTION_KEY`

---

## Common Patterns & Anti-Patterns

### ✅ Correct Patterns

1. **Service-to-service communication:**
   ```java
   @RequiredArgsConstructor
   @Service
   public class LoanService {
       private final MemberService memberService;  // ✅ Use service
       
       public void approveLoan(UUID loanId, UUID memberId) {
           Member member = memberService.getMember(memberId);
           // ... approval logic
       }
   }
   ```

2. **DTO isolation per module:**
   ```
   loans/api/dto/CreateLoanRequest.java      // ✅ Loan-specific DTO
   loans/api/dto/LoanResponse.java
   members/api/dto/MemberResponse.java       // ✅ Member DTO (different module)
   ```

3. **Entity references via UUID:**
   ```java
   @Entity
   public class LoanEntity {
       @Column(name = "member_id")
       private UUID memberId;  // ✅ Reference by ID only
   }
   ```

### ❌ Anti-Patterns

1. **Cross-module repository injection:**
   ```java
   // ❌ WRONG
   @Service
   public class LoanService {
       private final MemberRepository memberRepository;  // ❌ Direct repo access
   }
   ```

2. **Shared DTOs across modules:**
   ```java
   // ❌ WRONG
   public class LoanResponse extends MemberResponse { }  // ❌ DTO inheritance
   ```

3. **JPA relationships across modules:**
   ```java
   // ❌ WRONG
   @Entity
   public class LoanEntity {
       @ManyToOne
       private MemberEntity member;  // ❌ Cross-module relationship
   }
   ```

---

## Testing Strategy

### Backend

- **Unit tests (fast):** Mock all external dependencies, test business logic in isolation
  ```java
  @Test
  void shouldCreateMember() {
      when(memberRepository.save(any())).thenReturn(member);
      MemberResponse response = service.createMember(request);
      assertThat(response.id()).isNotNull();
  }
  ```

- **Integration tests (slower):** Use Testcontainers for real PostgreSQL
  ```java
  @Testcontainers
  @SpringBootTest
  class MemberRepositoryIntegrationTest {
      @Container
      static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");
  }
  ```

- **Test data seeding:** Use HTTP client scripts in `backend/*.http` (REST client plugin in IDE) for manual testing

### Frontend

- **Render tests:** Use React Testing Library to query by role/label, not implementation details
  ```typescript
  it('should display member form', () => {
      render(<MemberForm />);
      expect(screen.getByRole('textbox', { name: /member number/i })).toBeInTheDocument();
  });
  ```

---

## Docker & Deployment

### Local Development

```bash
# Start infrastructure (PostgreSQL + Redis)
cd infra
docker compose -f docker-compose.yml up -d

# View logs
docker compose logs -f postgres
docker compose logs -f redis

# Stop
docker compose down
```

### Building Images

- **Backend:** Multi-stage build (Maven → JAR → Alpine JRE)
  - Runs as non-root `sacco` user
  - JVM tuned for containers (`-XX:+UseContainerSupport`, `-XX:MaxRAMPercentage=75.0`)
  
- **Frontend:** Multi-stage build (Node → Vite build → Nginx)
  - Built assets served by Nginx
  - `VITE_API_BASE_URL` baked in at build time

### Production Checklist

- [ ] Set `APP_FIELD_ENCRYPTION_KEY` and `APP_PII_HMAC_KEY` env vars
- [ ] Configure `NVD_API_KEY` for OWASP dependency scanning
- [ ] Enable HTTPS (all cookies marked `Secure`)
- [ ] Set `same-site: Strict` for session cookies
- [ ] Rotate JWT secret regularly
- [ ] Monitor audit logs for unauthorized access
- [ ] Test database backup/restore (scripts in `scripts/`)

---

## Learning Resources in Repo

- **Architecture:** `docs/project-structure.md` (definitive module layout)
- **Naming:** `docs/naming.md` (synchronized across DB/Java/API/Frontend)
- **Glossary:** `docs/glossary.md` (business term definitions + DCR process)
- **Setup:** `README.md` at repo root (prerequisites, quick start)
- **Restore:** `docs/RESTORE.md` (database recovery procedures)
- **Tests:** `backend/backend/src/test/java/` (example patterns for new tests)

