# AUDIT_EVENT_STANDARD.md

**Status:** Authoritative standard — all audit implementation must conform to this document.
**Last Updated:** 2026-06-05

---

## 1. Final Audit Schema

### 1.1 Target `security_audit_logs` Table

```sql
CREATE TABLE security_audit_logs (
    -- Identity
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Actor (who performed the action)
    actor           VARCHAR(255) NOT NULL,         -- email or "SYSTEM" or "ANONYMOUS"
    user_id         UUID,                           -- FK to users.id (null for SYSTEM/ANONYMOUS)
    member_id       UUID,                           -- FK to members.id (null if actor is staff/system)
    session_id      VARCHAR(100),                   -- Spring Session ID (null for system actors)

    -- Action
    action          VARCHAR(100) NOT NULL,          -- Event code from Section 3
    permission_used VARCHAR(80),                    -- Permission that authorized the action (null for system)
    result          VARCHAR(20) NOT NULL            -- SUCCESS | FAILURE | DENIED
                        DEFAULT 'SUCCESS',

    -- Target entity
    entity_type     VARCHAR(100),                   -- e.g. "LoanApplication", "Member", "SavingsTransaction"
    entity_id       UUID,                           -- PK of the affected entity
    target          VARCHAR(255),                   -- Human-readable descriptor (module or entity name)

    -- Context
    ip_address      VARCHAR(45),                    -- IPv4 or IPv6 (null for system actors)
    user_agent      TEXT,                           -- HTTP User-Agent (null for system actors)

    -- Change data
    details         TEXT,                           -- Free-text description
    before_state    JSONB,                          -- Serialized entity state before change (nullable)
    after_state     JSONB,                          -- Serialized entity state after change (nullable)

    CONSTRAINT chk_audit_result CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED'))
);

-- Immutability trigger (already exists as make_audit_logs_append_only from V37)
-- Must be preserved. New columns are additive and do not affect the trigger.

-- Indexes for common query patterns
CREATE INDEX idx_audit_actor       ON security_audit_logs (actor);
CREATE INDEX idx_audit_user_id     ON security_audit_logs (user_id);
CREATE INDEX idx_audit_entity      ON security_audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_action      ON security_audit_logs (action);
CREATE INDEX idx_audit_created_at  ON security_audit_logs (created_at DESC);
CREATE INDEX idx_audit_result      ON security_audit_logs (result);
```

### 1.2 Migration Strategy for Existing Table

The `security_audit_logs` table is append-only (immutability trigger exists). Adding columns is safe — `ALTER TABLE ADD COLUMN` does not trigger `UPDATE` or `DELETE`.

```sql
-- Planned: V71__extend_audit_log_schema.sql
ALTER TABLE security_audit_logs
    ADD COLUMN IF NOT EXISTS user_id         UUID,
    ADD COLUMN IF NOT EXISTS member_id       UUID,
    ADD COLUMN IF NOT EXISTS session_id      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS permission_used VARCHAR(80),
    ADD COLUMN IF NOT EXISTS result          VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    ADD COLUMN IF NOT EXISTS entity_type     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS entity_id       UUID,
    ADD COLUMN IF NOT EXISTS user_agent      TEXT,
    ADD COLUMN IF NOT EXISTS before_state    JSONB,
    ADD COLUMN IF NOT EXISTS after_state     JSONB;

ALTER TABLE security_audit_logs
    ADD CONSTRAINT chk_audit_result CHECK (result IN ('SUCCESS', 'FAILURE', 'DENIED'));

CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON security_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON security_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_result     ON security_audit_logs (result);
```

**Backward compatibility:** All new columns are nullable (except `result` which defaults to `'SUCCESS'`). Existing rows remain valid.

---

## 2. Updated `SecurityAuditService` API

### 2.1 Target API

```java
public interface AuditEventBuilder {

    /**
     * Standard request-scoped event (actor and IP extracted from SecurityContext + HttpRequest).
     */
    void logEvent(String action,
                  String entityType,
                  UUID   entityId,
                  String target,
                  String details);

    /**
     * Standard request-scoped event with state snapshots.
     */
    void logEvent(String action,
                  String entityType,
                  UUID   entityId,
                  String target,
                  String details,
                  Object beforeState,
                  Object afterState);

    /**
     * System-actor event (scheduled jobs, event listeners, background tasks).
     * actor = "SYSTEM", ip = null, userAgent = null, session = null.
     */
    void logSystemEvent(String action,
                        String entityType,
                        UUID   entityId,
                        String target,
                        String details,
                        AuditResult result);

    /**
     * Explicit-actor event (login failures, unauthenticated flows, password reset).
     */
    void logExplicitEvent(String actor,
                          UUID   userId,
                          String action,
                          String entityType,
                          UUID   entityId,
                          String target,
                          String ipAddress,
                          String userAgent,
                          String sessionId,
                          String details,
                          AuditResult result);
}

public enum AuditResult {
    SUCCESS, FAILURE, DENIED
}
```

### 2.2 Legacy Method Compatibility

The existing `logEvent(action, target, details)` and `logEventWithActorAndIp(actor, action, target, ip, details)` methods are retained and internally delegate to the new API with `entityType = null`, `entityId = null`, and `result = SUCCESS`. This allows existing call sites to continue working while new call sites adopt the enriched API.

---

## 3. Event Naming Convention

### 3.1 Format

```
{DOMAIN}_{VERB}
```

- **DOMAIN** — uppercase module noun (e.g. `LOAN`, `SAVINGS`, `MEMBER`)
- **VERB** — past-tense action in uppercase (e.g. `CREATED`, `APPROVED`, `FAILED`)
- Separator: single underscore `_`
- All uppercase, no spaces, no hyphens

**Examples:** `LOAN_DISBURSED`, `SAVINGS_DEPOSIT_POSTED`, `MEMBER_STATUS_CHANGED`

**Anti-patterns (do not use):**
- `loan-disbursed` — hyphens not allowed
- `LOAN_DISBURSE` — use past tense
- `DISBURSE_LOAN` — verb first not allowed
- `loanDisbursed` — camelCase not allowed

### 3.2 Complete Event Code Registry

#### Authentication & Session

| Event Code | Trigger | Result Values |
|---|---|---|
| `LOGIN_SUCCESS` | Successful login | SUCCESS |
| `LOGIN_FAILURE` | Bad credentials | FAILURE |
| `LOGOUT` | User logout | SUCCESS |
| `SESSION_EXPIRED` | Session timeout | SUCCESS |
| `MFA_VERIFIED` | MFA code accepted | SUCCESS |
| `MFA_FAILED` | MFA code rejected | FAILURE |
| `PASSWORD_CHANGED` | Password change success | SUCCESS |
| `PASSWORD_CHANGE_FAILED` | Password change rejected | FAILURE |
| `PASSWORD_RESET_REQUESTED` | Reset link requested | SUCCESS |
| `PASSWORD_RESET_COMPLETED` | Password reset via token | SUCCESS |
| `ACCOUNT_LOCKED` | Account locked after failures | SUCCESS |

#### User Management

| Event Code | entityType | Trigger |
|---|---|---|
| `USER_CREATED` | `User` | New user created |
| `USER_UPDATED` | `User` | User profile updated |
| `USER_DELETED` | `User` | User deleted |
| `USER_STATUS_CHANGED` | `User` | Status changed |
| `USER_EMAIL_CHANGED` | `User` | Email updated |
| `USER_ROLES_UPDATED` | `User` | Role assignment changed |
| `USER_ACTIVATED` | `User` | Account activated via link |

#### Role & Permission Management

| Event Code | entityType | Trigger |
|---|---|---|
| `ROLE_CREATED` | `Role` | New role created |
| `ROLE_UPDATED` | `Role` | Role name/description updated |
| `ROLE_DELETED` | `Role` | Role deleted |
| `PERMISSIONS_UPDATED` | `Role` | Role's permission set changed |

#### Members

| Event Code | entityType | Trigger |
|---|---|---|
| `MEMBER_CREATED` | `Member` | Member registered |
| `MEMBER_UPDATED` | `Member` | Member details updated |
| `MEMBER_STATUS_CHANGED` | `Member` | Status changed |
| `MEMBER_DELETED` | `Member` | Member soft-deleted |

#### Savings

| Event Code | entityType | Trigger |
|---|---|---|
| `SAVINGS_DEPOSIT_POSTED` | `SavingsTransaction` | Manual deposit posted |
| `SAVINGS_WITHDRAWAL_POSTED` | `SavingsTransaction` | Manual withdrawal posted |
| `SAVINGS_MPESA_INITIATED` | `SavingsTransaction` | M-Pesa STK push started |
| `SAVINGS_MPESA_CONFIRMED` | `SavingsTransaction` | M-Pesa payment confirmed |
| `SAVINGS_MPESA_FAILED` | `SavingsTransaction` | M-Pesa payment failed |

#### Loans

| Event Code | entityType | Trigger |
|---|---|---|
| `LOAN_APPLIED` | `LoanApplication` | Application created |
| `LOAN_SUBMITTED` | `LoanApplication` | Application submitted for review |
| `LOAN_VERIFIED` | `LoanApplication` | Loan officer verified |
| `LOAN_APPROVED` | `LoanApplication` | Committee approved |
| `LOAN_REJECTED` | `LoanApplication` | Application rejected |
| `LOAN_DISBURSED` | `LoanApplication` | Loan disbursed |
| `LOAN_REFINANCED` | `LoanApplication` | Loan refinanced |
| `LOAN_GUARANTOR_ADDED` | `LoanApplication` | Guarantor added |
| `LOAN_GUARANTOR_REMOVED` | `LoanApplication` | Guarantor removed |
| `LOAN_REPAYMENT_INITIATED` | `LoanRepayment` | Repayment STK started |
| `LOAN_REPAYMENT_COMPLETED` | `LoanRepayment` | Repayment confirmed |
| `LOAN_REPAYMENT_FAILED` | `LoanRepayment` | Repayment failed |
| `LOAN_FEE_PAID` | `LoanApplication` | Application fee paid |
| `LOAN_OVERDUE_DETECTED` | `LoanApplication` | Schedule job found overdue loan |

#### Accounting

| Event Code | entityType | Trigger |
|---|---|---|
| `JOURNAL_ENTRY_POSTED` | `JournalEntry` | Manual GL journal posted |
| `GL_ACCOUNT_CREATED` | `Account` | New GL account created |
| `GL_ACCOUNT_UPDATED` | `Account` | GL account modified |

#### Payments

| Event Code | entityType | Trigger |
|---|---|---|
| `PAYMENT_INITIATED` | `Payment` | STK push sent |
| `PAYMENT_COMPLETED` | `Payment` | Payment confirmed |
| `PAYMENT_FAILED` | `Payment` | Payment failed |
| `PAYMENT_POLLING_RUN` | — | `PendingPaymentPollingJob` executed |

#### Penalties

| Event Code | entityType | Trigger |
|---|---|---|
| `PENALTY_APPLIED` | `Penalty` | Penalty created |
| `PENALTY_WAIVED` | `Penalty` | Penalty waived |
| `PENALTY_ADJUSTED` | `Penalty` | Penalty amount adjusted |
| `PENALTY_REPAID` | `PenaltyRepayment` | Penalty repaid |
| `PENALTY_REPAYMENT_FAILED` | `PenaltyRepayment` | Penalty repayment failed |
| `PENALTY_ACCRUAL_RUN` | — | `PenaltyJob` executed |

#### Meetings

| Event Code | entityType | Trigger |
|---|---|---|
| `MEETING_CREATED` | `Meeting` | Meeting created |
| `MEETING_UPDATED` | `Meeting` | Meeting updated |
| `MEETING_CANCELED` | `Meeting` | Meeting canceled |
| `MEETING_COMPLETED` | `Meeting` | Meeting completed |
| `MEETING_ATTENDANCE_RECORDED` | `MeetingAttendance` | Attendance marked |
| `MEETING_PENALTY_APPLIED` | `Penalty` | Attendance penalty applied |
| `MEETING_ATTENDANCE_SEED_RUN` | — | `MeetingAttendanceSeedJob` executed |
| `MEETING_AUTO_COMPLETE_RUN` | — | `MeetingAutoCompleteJob` executed |

#### Obligations

| Event Code | entityType | Trigger |
|---|---|---|
| `OBLIGATION_CREATED` | `SavingsObligation` | Obligation created |
| `OBLIGATION_UPDATED` | `SavingsObligation` | Obligation terms updated |
| `OBLIGATION_STATUS_CHANGED` | `SavingsObligation` | Obligation paused/resumed |
| `OBLIGATION_EVALUATION_RUN` | — | `ObligationEvaluationJob` executed |
| `OBLIGATION_PERIOD_EVALUATED` | `ObligationPeriod` | Period compliance recorded |

#### Reports

| Event Code | entityType | Trigger |
|---|---|---|
| `REPORT_ACCESSED` | — | Any staff report viewed |
| `MEMBER_STATEMENT_ACCESSED` | `Member` | Member statement viewed |
| `LOAN_ARREARS_REPORT_ACCESSED` | — | Arrears report viewed |
| `INCOME_REPORT_ACCESSED` | — | Income report viewed |

#### Audit

| Event Code | entityType | Trigger |
|---|---|---|
| `AUDIT_LOG_SEARCHED` | — | Audit log queried |

#### Settings

| Event Code | entityType | Trigger |
|---|---|---|
| `SETTINGS_INITIALIZED` | `SaccoSettings` | Settings first-created |
| `SETTINGS_UPDATED` | `SaccoSettings` | General settings saved |
| `SECURITY_POLICY_UPDATED` | `SaccoSettings` | Security policy changed |
| `FEATURE_FLAGS_UPDATED` | `SaccoSettings` | Feature flags toggled |

#### Expense Claims

| Event Code | entityType | Trigger |
|---|---|---|
| `EXPENSE_CLAIM_SUBMITTED` | `ExpenseClaim` | Claim submitted |
| `EXPENSE_CLAIM_APPROVED` | `ExpenseClaim` | Claim approved |
| `EXPENSE_CLAIM_REJECTED` | `ExpenseClaim` | Claim rejected |
| `EXPENSE_CLAIM_REIMBURSED` | `ExpenseClaim` | Claim reimbursed via savings |

#### Assets

| Event Code | entityType | Trigger |
|---|---|---|
| `ASSET_CREATED` | `SaccoAsset` | Asset registered |
| `ASSET_STATUS_CHANGED` | `SaccoAsset` | Status changed |
| `ASSET_DISPOSED` | `SaccoAsset` | Asset disposed/written-off |

---

## 4. Retention Strategy

### 4.1 Policy

| Tier | Age | Action |
|---|---|---|
| **Hot** | 0–90 days | Fully queryable, indexed, in primary table |
| **Warm** | 91 days–2 years | Queryable but partitioned/compressed (future: PostgreSQL table partitioning by `created_at`) |
| **Cold** | 2–7 years | Archived to compressed storage (S3 or equivalent), queryable via COPY FROM |
| **Purge** | > 7 years | Deleted — satisfies Kenya's data retention requirements under the Data Protection Act 2019 |

### 4.2 Implementation

- **Short-term (now):** No partitioning. Single table with `created_at DESC` index. Acceptable up to ~10M rows.
- **Medium-term:** Implement PostgreSQL range partitioning by `created_at` per year.
- **Do not delete rows** from the primary table — immutability trigger prevents it anyway.
- **Backup:** `security_audit_logs` must be included in every database backup with a minimum 7-year backup retention.

### 4.3 Access Controls

- Read access requires `AUDIT_LOG_READ` permission.
- No application layer exposes DELETE or UPDATE operations on audit logs.
- Direct database access to audit logs requires two-person authorization in production.

---

## 5. How System Actors Identify Themselves

Scheduled jobs and event listeners cannot use the Spring Security context (no authenticated user). They must identify themselves using a structured actor convention.

### 5.1 Actor Naming Convention

```
SYSTEM:{JobOrListenerClassName}
```

**Examples:**

| Component | `actor` Value |
|---|---|
| `PenaltyJob` | `SYSTEM:PenaltyJob` |
| `LoanScheduleJob` | `SYSTEM:LoanScheduleJob` |
| `PendingPaymentPollingJob` | `SYSTEM:PendingPaymentPollingJob` |
| `MeetingAttendanceSeedJob` | `SYSTEM:MeetingAttendanceSeedJob` |
| `MeetingAutoCompleteJob` | `SYSTEM:MeetingAutoCompleteJob` |
| `ObligationEvaluationJob` | `SYSTEM:ObligationEvaluationJob` |
| `SavingsPaymentListener` | `SYSTEM:SavingsPaymentListener` |
| `MemberPaymentListener` | `SYSTEM:MemberPaymentListener` |
| `LoanPenaltyEventListener` | `SYSTEM:LoanPenaltyEventListener` |
| `PenaltyPaymentListener` | `SYSTEM:PenaltyPaymentListener` |

### 5.2 System Event Required Fields

| Field | Value |
|---|---|
| `actor` | `SYSTEM:{ClassName}` |
| `user_id` | `null` |
| `member_id` | `null` (unless event targets a specific member) |
| `session_id` | `null` |
| `ip_address` | `null` |
| `user_agent` | `null` |
| `permission_used` | `null` |
| `result` | `SUCCESS` or `FAILURE` |
| `entity_type` | Relevant entity type, or `null` for bulk runs |
| `entity_id` | Relevant entity UUID, or `null` for bulk runs |
| `details` | Summary: count processed, count failed, duration |

### 5.3 Bulk Job Event Pattern

For jobs that process many records, log one **summary event per run** rather than one event per record. Only log per-record events for failures.

```java
// ✅ Correct — one summary per run
securityAuditService.logSystemEvent(
    "PENALTY_ACCRUAL_RUN",
    null, null,
    "PenaltyJob",
    String.format("Processed %d loans. Applied %d penalties. Failed: %d. Duration: %dms",
                  processed, applied, failed, duration),
    failed > 0 ? AuditResult.FAILURE : AuditResult.SUCCESS
);

// ✅ Also correct — log each failure individually
securityAuditService.logSystemEvent(
    "PENALTY_ACCRUAL_FAILED",
    "LoanApplication",
    loan.getId(),
    "PenaltyJob",
    "Exception: " + e.getMessage(),
    AuditResult.FAILURE
);
```

---

## 6. `before_state` / `after_state` Capture Rules

### 6.1 When to Capture State

| Category | Capture? | Notes |
|---|---|---|
| Financial mutations (savings, loans, penalties, expenses) | ✅ Yes | Both before and after |
| Status transitions (member status, loan status, obligation status) | ✅ Yes | Both before and after |
| Settings changes | ✅ Yes | Both before and after |
| Permission/role changes | ✅ Yes | Before = old set, After = new set |
| Read-only access events (reports, audit log search) | ❌ No | Not applicable |
| System job summary events | ❌ No | Use `details` field instead |

### 6.2 Format

State must be serialized as a **flat JSON object** — not a full entity tree. Include only the fields that changed plus the entity's ID and a timestamp.

```json
// before_state example for a savings deposit:
{ "id": "uuid", "balance": "1250.00", "status": "ACTIVE" }

// after_state example:
{ "id": "uuid", "balance": "1750.00", "status": "ACTIVE" }
```

### 6.3 PII Handling

- **Do not store** `passwordHash`, raw MSISDN, or national ID numbers in state snapshots.
- Amounts, status values, and UUIDs are safe to store.
- Email and phone may be stored — they are already present in the `actor` field.
