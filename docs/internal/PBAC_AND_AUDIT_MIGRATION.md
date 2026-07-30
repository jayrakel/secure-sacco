# PBAC_AND_AUDIT_MIGRATION.md

## Objective

This project shall migrate from role-centric authorization to a Permission-Based Access Control (PBAC) model and implement a comprehensive, system-wide audit framework.

This is a financial system. Authorization, traceability, accountability, and auditability are first-class requirements.

No module, endpoint, service, action, workflow, scheduled task, integration, or user activity shall be exempt from authorization review or audit logging.

---

# Phase 1: Discovery (Mandatory)

Before making code changes:

1. Inspect every backend module.
2. Inspect every frontend feature.
3. Inspect every controller.
4. Inspect every endpoint.
5. Inspect every service.
6. Inspect every scheduled job.
7. Inspect every listener.
8. Inspect every integration.
9. Inspect every permission.
10. Inspect every role dependency.

Produce a migration report before implementation.

The report must include:

* Existing roles
* Existing permissions
* Role-to-permission mapping
* Endpoints without authorization
* Endpoints using role-based checks
* UI actions without permission checks
* Operations not currently audited
* Audit coverage gaps
* Recommended migration plan

No implementation may begin until discovery is complete.

---

# PBAC Architecture Requirements

Permissions are the primary authorization mechanism.

Roles exist only as collections of permissions.

Authorization decisions must be permission-based.

No endpoint shall depend directly on role names.

No service shall depend directly on role names.

No frontend component shall depend directly on role names.

All access decisions must be based on permissions.

Examples:

MEMBERS_VIEW

MEMBERS_CREATE

MEMBERS_EDIT

MEMBERS_DELETE

LOANS_VIEW

LOANS_APPROVE

LOANS_DISBURSE

SAVINGS_VIEW

SAVINGS_POST

ACCOUNTING_VIEW

ACCOUNTING_POST_JOURNAL

SETTINGS_EDIT

REPORTS_EXPORT

AUDIT_VIEW

etc.

---

# Authorization Coverage Requirements

Every backend controller endpoint must have explicit permission requirements.

Every frontend page must have permission requirements.

Every modal must have permission requirements.

Every button performing business actions must have permission requirements.

Every API operation must have permission requirements.

Every scheduled administrative operation must have permission requirements where applicable.

Every future module must follow the same standard.

No implicit access.

No inherited access without permission mapping.

No hidden administrative bypasses.

---

# Audit Logging Requirements

The audit system must become system-wide.

The goal is complete traceability.

Everything must be auditable.

The default assumption is:

"If an action occurred, it must be recorded."

Nothing is considered too small to audit.

---

# Audit Coverage Requirements

Audit all:

Authentication activities

* Login
* Logout
* Password reset
* Password change
* MFA actions
* Session creation
* Session termination

User management activities

* User creation
* User modification
* User activation
* User suspension
* User deletion
* Permission assignment
* Permission removal
* Role assignment
* Role removal

Member activities

* Creation
* Modification
* Status changes
* Profile updates

Savings activities

* Deposits
* Withdrawals
* Adjustments
* Reversals
* Corrections

Loan activities

* Applications
* Approvals
* Rejections
* Disbursements
* Repayments
* Restructuring
* Guarantor changes

Accounting activities

* Journal entries
* Account creation
* Account modification
* Manual postings
* Reversals

Meetings activities

* Creation
* Updates
* Attendance
* Closure

Penalty activities

* Accruals
* Waivers
* Payments

Obligation activities

* Creation
* Updates
* Compliance actions

Payment activities

* STK requests
* Payment confirmations
* Failed payments
* Reversals

Reports activities

* Report generation
* Report exports
* Statement downloads

Settings activities

* Any configuration change

Audit activities

* Audit searches
* Audit exports

Asset activities

* Creation
* Assignment
* Disposal
* Modification

Expense claim activities

* Submission
* Approval
* Rejection
* Settlement

System activities

* Scheduled jobs
* Background tasks
* Data migrations
* Seed operations
* Administrative maintenance actions

API activities

* Sensitive endpoint access
* Failed authorization attempts
* Permission violations

---

# Unified Audit Event Standard

All modules must use the same audit structure.

Every audit record must contain:

* Event ID
* Timestamp
* User ID
* Username
* Member ID (if applicable)
* Module
* Action
* Entity Type
* Entity ID
* Description
* Result
* IP Address
* User Agent
* Session Identifier
* Permission Used
* Before State
* After State

No module may create custom audit formats.

A single standard must be used across the entire platform.

---

# Audit Integrity Requirements

Audit records must be immutable.

Audit records must not be editable.

Audit records must not be deletable.

Audit records must survive upgrades and migrations.

Audit records must remain queryable and reportable.

---

# Service Layer Requirement

Auditing must not rely solely on controllers.

Critical service-layer operations must also be audited.

If a process bypasses a controller, it must still generate audit records.

Examples:

* Scheduled jobs
* Event listeners
* Internal services
* Background processing
* Integration callbacks

---

# Migration Rules

Do not rewrite working business logic unnecessarily.

Prefer incremental migration.

Migrate module-by-module.

Preserve backward compatibility where possible.

Create tests for all authorization changes.

Create tests for all audit functionality.

---

# Success Criteria

The migration is complete only when:

1. All authorization decisions are permission-based.
2. Every endpoint has permission protection.
3. Every significant user action is audited.
4. Every significant system action is audited.
5. Every audit event follows the unified standard.
6. No module remains outside PBAC.
7. No module remains outside the audit framework.

The system shall provide complete operational traceability across all modules.
