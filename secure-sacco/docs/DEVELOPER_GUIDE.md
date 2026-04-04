# 🛠️ HOW TO MAKE CHANGES - DEVELOPER GUIDE

After completing the codebase audit, use this guide to make changes safely and effectively.

---

## ✅ Before You Code

### 1. Understand the Module Structure
```
backend/backend/src/main/java/com/jaytechwave/sacco/modules/<feature>/
├── api/              # REST controllers (@RestController)
├── api/dto/          # Module-specific DTOs (RequestDTO, ResponseDTO)
├── domain/           # JPA entities, enums, domain rules
├── repository/       # Spring Data repositories
└── service/          # Business logic (@Service)
```

### 2. Check Dependencies
- **Rule:** Use services from other modules, NOT repositories
- ✅ `loanService.getLoan()` 
- ❌ `loanRepository.findById()`

### 3. Verify No Cross-Module DTOs
- ✅ Create new DTOs in your module
- ❌ Don't reuse DTOs from other modules

---

## 📝 Making Changes by Type

### Type 1: Adding a New Feature to Existing Module

**Example:** Add a new endpoint to Loans module

**Steps:**
1. Create DTO in `loans/api/dto/NewFeatureRequest.java`
2. Add method to `loans/domain/service/LoanService.java`
3. Add endpoint to `loans/api/controller/LoanController.java`
4. Add repository method if needed in `loans/domain/repository/LoanRepository.java`
5. Write unit test in `backend/src/test/java/modules/loans/`

**Test:**
```bash
cd backend/backend
mvn test -Dtest=LoanServiceTest
```

---

### Type 2: Adding a New Database Migration

**Steps:**
1. Create file: `db/migration/V<NEXT>__<description>.sql`
   - Example: `V50__add_refinance_column.sql`
2. Write SQL (use IF NOT EXISTS for idempotency)
3. Run backend to auto-execute

**Template:**
```sql
-- File: V50__add_refinance_column.sql
ALTER TABLE loan_applications 
ADD COLUMN IF NOT EXISTS refinance_parent_id UUID 
REFERENCES loan_applications(id);

CREATE INDEX IF NOT EXISTS idx_loans_refinance_parent 
ON loan_applications(refinance_parent_id);
```

**Validation:**
```bash
mvn spring-boot:run
# Check logs: "Executing migration V50__add_refinance_column"
```

---

### Type 3: Adding a New Module

**Steps:**
1. Create directory: `modules/<new-feature>/`
2. Add subdirs: `api/`, `api/dto/`, `domain/`, `repository/`, `service/`
3. Create entity, repository, service, controller
4. Create DTOs for requests/responses
5. Create REST endpoints under `/api/v1/<plural-name>`

**Checklist:**
- ✅ No direct repository injection in other modules
- ✅ All DTOs in your module
- ✅ Entity references via UUID (not JPA relations)
- ✅ Audit logging for critical events
- ✅ Proper exception handling

---

### Type 4: Fixing a Bug

**Steps:**
1. Reproduce issue with test case
2. Write failing unit test
3. Fix code
4. Verify test passes
5. Run full test suite

**Example:**
```bash
# Write test that fails
mvn test -Dtest=PenaltyServiceTest#testPenaltyCalculation

# Fix the bug in PenaltyService.java

# Verify fix
mvn test -Dtest=PenaltyServiceTest#testPenaltyCalculation
```

---

### Type 5: Testing with Time-Traveler

**For Penalty Testing:**

```bash
# 1. Configure simulation
curl -X POST http://localhost:8080/api/v1/time-travel/configure \
  -d '{
    "startDate": "2026-04-01",
    "endDate": "2026-05-01",
    "daysPerTick": 1
  }'

# 2. Set target member (optional)
curl -X POST http://localhost:8080/api/v1/time-travel/set-target?memberId=<UUID>

# 3. Advance time
curl -X POST http://localhost:8080/api/v1/time-travel/advance?days=14

# 4. Verify penalties applied
curl http://localhost:8080/api/v1/penalties?memberNumber=<MEMBER>
```

---

## 🔒 Security Best Practices

### When Adding Endpoints

1. **Use @PreAuthorize for access control:**
```java
@PostMapping
@PreAuthorize("hasAuthority('LOANS_WRITE')")
public ResponseEntity<LoanResponse> createLoan(@RequestBody CreateLoanRequest req) {
    // ...
}
```

2. **Add audit logging for sensitive actions:**
```java
securityAuditService.logEvent(
    "LOAN_CREATED",
    loan.getMemberId().toString(),
    "Loan created for amount: " + loan.getPrincipalAmount()
);
```

3. **Validate input with @Valid:**
```java
@PostMapping
public ResponseEntity<LoanResponse> createLoan(@Valid @RequestBody CreateLoanRequest req) {
    // Validation happens automatically
}
```

4. **Use DTOs (never return raw entities):**
```java
// ✅ CORRECT
return ResponseEntity.ok(LoanResponse.fromEntity(loan));

// ❌ WRONG
return ResponseEntity.ok(loan); // Entity exposed directly
```

---

## 📊 Database Changes Checklist

### Before Writing Migrations

- ✅ Is the table name snake_case and plural? (`loan_schedules`)
- ✅ Are columns snake_case? (`principal_due`, not `principalDue`)
- ✅ Does the entity field use camelCase? (`principalDue`)
- ✅ Are there proper constraints? (FK, UK, NOT NULL)
- ✅ Are indexes on frequently-queried columns?
- ✅ Is the migration idempotent? (use IF NOT EXISTS)
- ✅ Does it handle rollback? (add comment with manual steps)

---

## 🧪 Testing Requirements

### Before Committing

```bash
# 1. Unit tests pass
mvn test

# 2. Code coverage OK (70% min on services)
mvn verify  # Generates target/site/jacoco/index.html

# 3. Security check
mvn dependency-check:check

# 4. Compilation clean
mvn clean compile

# 5. Full build
mvn clean package
```

---

## 🚀 Local Development Workflow

### Start Everything

```bash
# Terminal 1: Start infrastructure
cd infra
docker compose -f docker-compose.yml up -d

# Terminal 2: Start backend
cd backend/backend
mvn spring-boot:run

# Terminal 3: Start frontend
cd frontend
npm run dev
```

### Verify Startup

```bash
# Backend health
curl http://localhost:8080/actuator/health

# Frontend
open http://localhost:5173

# Database
psql -h localhost -U postgres -d sacco_db
```

---

## 🐛 Debugging Tips

### View Logs with Time-Travel Activity
```bash
tail -f backend/backend/target/logs/spring.log | grep "⏱️"
```

### Check Schedule Progression
```bash
# View current virtual date
curl http://localhost:8080/api/v1/time-travel/status | jq .virtualDate

# View loan schedule
curl http://localhost:8080/api/v1/loans/schedule?memberNumber=BVL-2022-000001 | jq .
```

### Database Queries
```bash
psql -h localhost -U postgres -d sacco_db
> SELECT * FROM loan_schedule_items WHERE status = 'OVERDUE';
> SELECT * FROM penalties WHERE member_id = '<UUID>';
```

---

## ✅ Code Review Checklist

Before pushing changes, verify:

- ✅ Code compiles without errors
- ✅ All tests pass
- ✅ Code coverage maintained (70%+ on services)
- ✅ No hardcoded passwords/secrets
- ✅ DTOs in correct module
- ✅ Services, not repositories used cross-module
- ✅ Entities use UUID + business keys
- ✅ Transactional boundaries correct
- ✅ Security annotations present
- ✅ Audit logging for sensitive actions
- ✅ Javadoc on public methods
- ✅ No unnecessary imports
- ✅ Follows naming conventions

---

## 📖 Related Documentation

- **AGENTS.md** — Project guidelines & patterns
- **CODEBASE_AUDIT_REPORT.md** — Full architecture audit
- **SYSTEM_WIDE_TIME_TRAVEL_UPDATE.md** — Time-traveler usage
- **docs/naming.md** — Naming conventions
- **docs/glossary.md** — Business terms

---

## 🆘 Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| `java.sql.SQLException: Connection refused` | Start PostgreSQL: `docker compose up -d postgres` |
| `RedisConnectionException` | Start Redis: `docker compose up -d redis` |
| `@Transactional not working` | Ensure method is public + class is Spring bean |
| `DTO validation fails silently` | Add `@Valid` to controller parameter |
| `Repository not found` | Extend `JpaRepository<Entity, UUID>` |
| `Time-travel resets on restart` | Expected (in-memory); configure via API |
| `M-Pesa callbacks not received` | Check ngrok URL + IP whitelist |

---

## 🎯 You Are Now Ready To:

✅ Add new features confidently  
✅ Fix bugs systematically  
✅ Write proper tests  
✅ Handle security correctly  
✅ Manage databases safely  
✅ Debug issues effectively  

**Happy Coding!** 🚀


