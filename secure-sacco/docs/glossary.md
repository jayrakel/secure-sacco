# glossary.md
# SACCO Management System Glossary (Dictionary)

## Change Control (DCR Required)
This file is a controlled dictionary. Any edits MUST be made through a **Dictionary Change Request (DCR)**:
- Proposed change (add/update/remove term)
- Rationale + impacted modules
- Backward compatibility notes (DB/API/UI)
- Approval record (who approved + date)
- Version bump entry (append to Changelog section)

---

## 1) Core Entities

### SACCO
Savings and Credit Cooperative Organization.

### Member
A person registered to the SACCO with a unique **member_number**. May own accounts, apply for loans, and transact.

### Member Number
A SACCO-issued human-readable unique identifier for a member (distinct from UUID `id`).

### User
A system login identity (staff/admin) used to access the platform. Users are authorized via roles.

### Role
A collection of permissions granted to users. Users receive permissions only through roles.

### Permission
A fine-grained capability code (e.g., `MEMBERS_READ`, `LOANS_WRITE`). Used for server-side authorization checks.

### Session
A server-side authenticated context stored in Redis (Spring Session). Allows instant invalidation for security/compliance.

---

## 2) Identifiers & Keys

### UUID (id)
System primary key for most tables/entities. Used in APIs and internal references.

### Business Key
A human/business identifier such as `member_number` or `loan_number`, used in statements and staff workflows.

---

## 3) Accounts & Money Concepts (for later modules)

### Account
A financial container associated with a member (e.g., savings, deposits, shares). Exact types depend on SACCO products.

### Product
A configurable offering (e.g., savings product, loan product) that defines rules like interest, fees, and limits.

### Transaction
A recorded money movement event that affects balances. Often tied to journal entries.

### Ledger / Journal Entry
Accounting representation of a transaction using debit/credit postings. (Only if accounting/GL is in scope.)

### Charge / Fee
A configured cost applied due to an action or condition (e.g., loan processing fee).

### Penalty
A charge applied due to a violation/condition (e.g., late repayment).

---

## 4) Loans (for later modules)

### Loan Application
A request by a member for a loan, captured for review and approval workflow.

### Loan
An approved and disbursed credit agreement, typically with repayment schedule and interest rules.

### Disbursement
The act of releasing loan funds to the member (cash/bank/mobile money).

### Repayment
A payment made by a member to reduce loan outstanding principal/interest/fees/penalties.

### Guarantor
A person (often another member) who guarantees a borrower’s repayment obligations.

### Collateral
An asset pledged as security for a loan.

---

## 5) Operational & Governance (for later modules)

### Branch
A physical/organizational unit of the SACCO for operations and staffing.

### Audit Log
Immutable record of critical actions (who did what, when, and from where) for compliance.

---

## Changelog
- v0.1: Initial glossary created.