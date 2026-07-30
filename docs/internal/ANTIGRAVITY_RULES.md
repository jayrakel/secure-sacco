# ANTIGRAVITY_RULES.md

## Purpose

This repository contains a production-grade SACCO Management System.

All development work must prioritize:

1. Financial integrity
2. Security
3. Auditability
4. Authorization correctness
5. Backward compatibility
6. Maintainability

This is a financial platform. Correctness is more important than speed.

---

# System Context

The system is an enterprise SACCO platform with modules including, but not limited to:

* Members
* Savings
* Loans
* Accounting
* Payments
* Meetings
* Penalties
* Obligations
* Reports
* Audit
* Users
* Roles and Permissions
* Asset Management
* Expense Claims

The system contains an existing accounting engine and audit infrastructure.

New functionality must integrate with existing platform capabilities instead of duplicating them.

---

# Mandatory Project Documents

The following documents are considered part of the architecture:

* PROJECT_CONTEXT.md
* PBAC_AND_AUDIT_MIGRATION.md

When conflicts occur:

1. PROJECT_CONTEXT.md takes precedence.
2. PBAC_AND_AUDIT_MIGRATION.md takes precedence for authorization and audit work.
3. ANTIGRAVITY_RULES.md governs development workflow.

---

# Development Workflow Rules

## Discovery First

Before implementing any feature:

* Inspect relevant modules.
* Inspect existing services.
* Inspect existing entities.
* Inspect existing controllers.
* Inspect existing DTOs.
* Inspect existing repositories.
* Inspect existing frontend implementations.

Do not assume architecture.

Do not create duplicate functionality.

---

## Incremental Development

Implement changes in small, testable units.

Avoid large-scale rewrites unless explicitly requested.

Preserve backward compatibility whenever possible.

Do not modify unrelated modules.

---

# Git Workflow Rules

## Branch Protection

Never commit directly to main.

Never push directly to main.

All development must occur in feature branches.

Example:

git checkout -b feature/member-expense-claims

git checkout -b feature/asset-management

git checkout -b feature/pbac-migration

git checkout -b feature/unified-audit-logging

---

## Pull Request Requirement

All changes must be:

1. Committed to a feature branch
2. Pushed to the remote branch
3. Reviewed through a pull request
4. Merged only after validation

Main must remain deployable at all times.

---

# Architecture Rules

## Respect Existing Architecture

Do not introduce new architectural patterns without approval.

Do not introduce new frameworks without approval.

Follow existing module boundaries.

Extend existing modules before creating new infrastructure.

---

## Service Layer First

Business logic belongs in services.

Controllers should remain thin.

Repositories should remain focused on persistence.

Avoid business logic in controllers.

---

# Accounting Rules

## Financial Integrity

Every financial action must be traceable.

No silent balance changes.

No hidden account adjustments.

No bypassing accounting workflows.

---

## Accounting Integration

Any feature affecting money must integrate with the existing accounting module.

Financial operations must use the existing accounting infrastructure.

Avoid parallel accounting systems.

Avoid duplicate financial ledgers.

---

# Authorization Rules

Authorization is being migrated from RBAC to PBAC.

Permissions are the primary authorization mechanism.

Roles are collections of permissions.

Do not introduce new role-based authorization checks.

All new authorization work must align with PBAC_AND_AUDIT_MIGRATION.md.

---

# Audit Rules

Every significant system action must be auditable.

All new features must integrate with the centralized audit framework.

No custom audit formats.

Use the unified audit structure defined by PBAC_AND_AUDIT_MIGRATION.md.

When implementing features, always evaluate:

* What actions occur?
* What data changes?
* What audit events should be created?

Auditability is a first-class requirement.

---

# Security Rules

Validate all inputs.

Do not trust frontend validation.

Enforce authorization on the backend.

Protect sensitive operations.

Protect financial operations.

Protect administrative operations.

---

# Testing Requirements

All changes must include appropriate tests.

Where applicable:

* Unit tests
* Service tests
* Integration tests
* Authorization tests
* Audit verification tests

New functionality should be testable independently.

---

# API Standards

Follow existing API conventions.

Maintain consistent request structures.

Maintain consistent response structures.

Preserve existing error handling patterns.

Avoid introducing incompatible API behavior.

---

# Frontend Standards

Follow existing frontend architecture.

Reuse existing UI patterns where possible.

Respect permission requirements.

Do not expose functionality that the current user is not authorized to perform.

---

# Code Quality Rules

Prefer readability over cleverness.

Prefer maintainability over shortcuts.

Avoid duplication.

Reuse existing abstractions.

Follow existing naming conventions.

Follow existing package structure.

Keep implementations consistent with the surrounding codebase.

---

# Feature Implementation Process

For every new feature:

1. Discover existing architecture
2. Identify integration points
3. Produce implementation plan
4. Implement incrementally
5. Add tests
6. Add audit coverage
7. Verify authorization requirements
8. Verify backward compatibility

---

# Current Strategic Priorities

Current priorities are:

1. PBAC migration
2. Unified audit logging
3. Member Expense Claims module
4. Asset Management module
5. Payment integration enhancements
6. Production readiness

PBAC migration and audit standardization take precedence over new feature development.

---

# Golden Rule

Never assume.

Inspect first.

Integrate second.

Implement third.

Every change must preserve financial integrity, authorization correctness, and auditability.


# Work Management & Linear Workflow Rules

## Task-Driven Development

All work must be tied to a clearly defined task.

Before implementation:

1. Understand the task.
2. Inspect affected modules.
3. Produce an implementation plan.
4. Identify risks.
5. Identify impacted services.
6. Identify required permissions.
7. Identify required audit events.

Do not begin coding until the scope is understood.

---

## Task Lifecycle

Every task must follow:

BACKLOG
→ DISCOVERY
→ PLANNING
→ IMPLEMENTATION
→ TESTING
→ REVIEW
→ MERGED

No task may skip stages.

---

## Discovery Requirement

Before modifying code:

* Inspect existing implementation.
* Search for related functionality.
* Search for existing services.
* Search for existing entities.
* Search for existing endpoints.
* Search for existing permissions.
* Search for existing audit events.

Avoid creating duplicate functionality.

---

## Implementation Plans

Before major changes, produce:

### Objective

What is being solved?

### Affected Modules

Which modules will be modified?

### Database Impact

Will schema changes be required?

### API Impact

Will APIs change?

### Authorization Impact

Which permissions are required?

### Audit Impact

Which events must be audited?

### Risk Assessment

What existing functionality could be affected?

Only proceed after the plan is complete.

---

## Progress Tracking

For large initiatives maintain progress reports.

Example:

PBAC Migration

* [x] Discovery
* [x] Endpoint Inventory
* [ ] Permission Mapping
* [ ] Backend Refactor
* [ ] Frontend Refactor
* [ ] Testing
* [ ] Audit Verification

---

## Reporting Requirements

At the end of each task provide:

### Completed

What was completed.

### Files Modified

List all modified files.

### Permissions Added

List any permissions added.

### Audit Events Added

List any audit events added.

### Risks

Potential concerns.

### Next Recommended Task

What should be done next.

---

## Large Refactor Rule

For system-wide initiatives such as:

* PBAC Migration
* Unified Audit Logging
* Accounting Refactors
* Payment Refactors

The assistant must:

1. Perform discovery first.
2. Produce a migration report.
3. Break work into phases.
4. Execute phase-by-phase.
5. Verify after each phase.

Do not attempt large-scale rewrites in a single step.
