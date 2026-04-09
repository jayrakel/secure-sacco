# Permission Registry System - Complete Audit & Guide

**Last Updated:** April 9, 2026  
**Auditor:** System Audit  
**Purpose:** Understanding and using the Permissions Registry UI to manage roles, permissions, and access control

---

## 📋 Executive Summary

The **Permissions Registry** is a two-part system for managing access control in the SACCO application:

1. **Permissions Registry Page** (`/permissions-registry`) - **READ-ONLY** view of all system operations, their endpoints, access gates, and which roles have access
2. **Roles & Permissions Page** (`/roles-permissions`) - **INTERACTIVE** editor to assign/revoke permissions to/from roles

This document explains how the system works and walks you through **adding full accounting endpoints to roles** so you can control who gets access.

---

## 🎯 System Overview

### Permission Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERMISSION REGISTRY UI                        │
│                    (Read-Only Reference)                        │
│                                                                 │
│  Shows ALL operations with:                                    │
│  • Endpoint path (/api/v1/...)                                 │
│  • HTTP method (GET, POST, PUT, DELETE, PATCH)                 │
│  • Access gate (WHO can access it?)                            │
│  • Which roles currently have access                           │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              ROLES & PERMISSIONS EDITOR                          │
│           (Interactive Permission Assignment)                    │
│                                                                 │
│  • Select a role (ACCOUNTANT, TREASURER, etc.)                 │
│  • Toggle permissions ON/OFF                                   │
│  • SAVE changes → backend updates permissions                  │
│  • Users see updated controls on next page refresh             │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND ENFORCEMENT                            │
│              (@PreAuthorize annotations)                        │
│                                                                 │
│  Each endpoint decorated with security rule:                   │
│  • @PreAuthorize("hasAuthority('PERMISSION_CODE')")            │
│  • Enforces permission on every request                        │
│  • Returns 403 Forbidden if user lacks permission              │
└─────────────────────────────────────────────────────────────────┘
```

### Access Gate Types

| Gate Type | Meaning | Assignable? | Who Controls? |
|-----------|---------|-----------|---------------|
| **PERMISSION** | Requires a specific named permission | ✅ Yes | Via Roles & Permissions UI |
| **SYSTEM_ADMIN** | Hardcoded to ROLE_SYSTEM_ADMIN only | ❌ No | Immutable; backend must change |
| **AUTHENTICATED** | Any logged-in user can access | ✅ Implicit | Cannot be toggled |
| **MEMBER_ONLY** | Only ROLE_MEMBER can access | ✅ Implicit | Cannot be toggled |
| **PUBLIC** | No authentication required | ✅ Implicit | Cannot be toggled |

---

## 📊 Current Accounting Endpoints

### Today's State

Currently, **accounting endpoints have mixed access gates**:

| Endpoint | Method | Current Gate | Status | Path |
|----------|--------|-------------|--------|------|
| **Chart of Accounts** | GET | `isAuthenticated()` | 🟡 Open to all logged-in users | `/api/v1/accounting/accounts` |
| **Create Account** | POST | `ROLE_SYSTEM_ADMIN` | 🔴 System Admin only | `/api/v1/accounting/accounts` |
| **Update Account** | PUT | `ROLE_SYSTEM_ADMIN` | 🔴 System Admin only | `/api/v1/accounting/accounts/{id}` |
| **Manual GL Posting** | POST | `ROLE_SYSTEM_ADMIN` | 🔴 System Admin only | `/api/v1/accounting/journals` |
| **View Journal Entries** | GET | `hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_TREASURER')` | 🟡 Hardcoded roles | `/api/v1/accounting/journals` |
| **Trial Balance** | GET | `GL_TRIAL_BALANCE` permission | ✅ **Already permission-gated** | `/api/v1/accounting/trial-balance` |

### In the Registry

**Reports Module** contains one accounting endpoint:
```
✓ Trial Balance
  - Path: /api/v1/accounting/trial-balance
  - Method: GET
  - Gate: PERMISSION (GL_TRIAL_BALANCE)
  - Currently assigned to: (check the UI)
```

---

## 🔧 How to Use the Permission Registry UI

### Part 1: Explore the Registry (Read-Only)

**Access:** Main Sidebar → **Permissions Registry** (admin-only)

1. **View all operations** by module:
   - Members, Users & Roles, Loans, Savings, Reports, Meetings, Penalties, Sessions, Audit Log, System Admin

2. **Filter operations:**
   - Search bar: "trial balance", "accounting", "GL_TRIAL_BALANCE", etc.

3. **View gates legend:**
   - Red badge = Admin Only (SYSTEM_ADMIN)
   - Violet badge = Permission-gated (can be assigned)
   - Cyan badge = Member Only (ROLE_MEMBER)
   - Slate badge = Any User (AUTHENTICATED)
   - Green badge = Public (no auth)

4. **See role coverage:**
   - Each permission shows which roles have it
   - Red text "No roles" = Permission exists but no role has it yet

5. **View operation details:**
   - Click any operation to see:
     - Full endpoint URL
     - HTTP method
     - Description
     - Which roles can access it
     - Backend gate type

6. **Matrix View:**
   - Toggle to "Matrix" for spreadsheet-style view
   - Rows = Permissions, Columns = Roles
   - ✓ green checkmark = Role has permission
   - ○ empty circle = Role doesn't have permission
   - "✓ always" = SYSTEM_ADMIN (cannot be toggled)

---

### Part 2: Assign Permissions to Roles

**Access:** Main Sidebar → **Roles & Permissions**

#### Step-by-Step: Add GL Accounting Access to ACCOUNTANT Role

**Scenario:** You want the ACCOUNTANT role to access accounting endpoints that are currently permission-gated.

1. **Open Roles & Permissions**
   - Click "Roles & Permissions" in sidebar
   - Left panel shows all roles: ACCOUNTANT, TREASURER, CASHIER, etc.

2. **Select the ACCOUNTANT role**
   - Click on "ACCOUNTANT" in the left panel
   - Right panel loads with all available permissions grouped by category

3. **Find accounting permissions**
   - Use the search box: type "GL_TRIAL_BALANCE"
   - Or scroll to the **Reports** group
   - You'll see: `GL_TRIAL_BALANCE` permission card

4. **Toggle the permission ON**
   - Click on the `GL_TRIAL_BALANCE` card (or its toggle switch)
   - Card background changes to show it's active
   - Count at top updates: e.g., "42 permissions active"

5. **SAVE changes**
   - Click the green "Save" button (top right)
   - Loading spinner appears briefly
   - Success message shows: "ACCOUNTANT permissions updated"
   - If ACCOUNTANT has a deputy role, it auto-syncs too

6. **Verify in Registry**
   - Go back to Permissions Registry
   - Search for "Trial Balance"
   - In the operation detail panel, verify ACCOUNTANT now appears under "Granted to Roles"

#### Adding Multiple Permissions at Once

If you want to give ACCOUNTANT full accounting access:

1. Select ACCOUNTANT role
2. Search for each accounting permission and toggle ON:
   - `GL_TRIAL_BALANCE` ✓ (already permission-gated)
3. Check backend to see if other accounting endpoints need permission gates added first (see "Backend Integration" section below)
4. Click Save

**Note:** Deputy roles are auto-synced when you save a principal role:
- Save **ACCOUNTANT** → **DEPUTY_ACCOUNTANT** gets same permissions
- Save **TREASURER** → **DEPUTY_TREASURER** gets same permissions
- Etc.

---

## 🔴 Current Accounting Gaps (Why you see hardcoded roles)

### Problem

Most accounting endpoints use **hardcoded role checks** instead of permission codes:

```java
// ❌ NOT permission-gated (hardcoded)
@GetMapping
@PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_TREASURER')")
public ResponseEntity<PagedResponse<JournalEntry>> getAllJournalEntries(...) { ... }

// ✅ Permission-gated (grantable to any role)
@GetMapping
@PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")
public ResponseEntity<TrialBalanceResponse> getTrialBalance(...) { ... }
```

### Endpoints Missing Permission Gates

| Endpoint | Current Gate | Should Be | File |
|----------|-------------|----------|------|
| `GET /api/v1/accounting/accounts` | `isAuthenticated()` | `ACCOUNTING_READ` | AccountController.java:29 |
| `POST /api/v1/accounting/accounts` | `ROLE_SYSTEM_ADMIN` | `ACCOUNTING_WRITE` | AccountController.java:22 |
| `PUT /api/v1/accounting/accounts/{id}` | `ROLE_SYSTEM_ADMIN` | `ACCOUNTING_WRITE` | AccountController.java:34 |
| `POST /api/v1/accounting/journals` | `ROLE_SYSTEM_ADMIN` | `ACCOUNTING_JOURNAL_POST` | JournalEntryController.java:24 |
| `GET /api/v1/accounting/journals` | `ROLE_SYSTEM_ADMIN`, `ROLE_TREASURER` | `ACCOUNTING_READ` | JournalEntryController.java:30 |

---

## 🛠️ Backend Integration: Adding Permission Gates

**If you want to make accounting endpoints fully permission-gated** (so they appear in Roles & Permissions UI and can be assigned to ANY role), follow these steps:

### Step 1: Create New Permission in Database

1. Go to **Roles & Permissions** UI
2. Click **+ New Permission** button
3. Enter permission code: `ACCOUNTING_READ` (uppercase, underscores)
4. Description: "View general ledger accounts and journal entries"
5. Click "Create Permission"

**Repeat for each permission:**
- `ACCOUNTING_WRITE` - "Create, edit, and post journal entries"
- `ACCOUNTING_JOURNAL_POST` - "Post manual journal entries"

### Step 2: Update Backend Annotations

**File:** `backend/src/main/java/com/jaytechwave/sacco/modules/accounting/api/controller/AccountController.java`

```java
@GetMapping
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")  // ← Change this
public ResponseEntity<List<AccountResponse>> getAllAccounts() {
    return ResponseEntity.ok(accountService.getAllAccounts());
}

@PostMapping
@PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")  // ← Change this
public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
    return ResponseEntity.ok(accountService.createAccount(request));
}

@PutMapping("/{id}")
@PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")  // ← Change this
public ResponseEntity<AccountResponse> updateAccount(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAccountRequest request) {
    return ResponseEntity.ok(accountService.updateAccount(id, request));
}
```

**File:** `backend/src/main/java/com/jaytechwave/sacco/modules/accounting/api/controller/JournalEntryController.java`

```java
@PostMapping
@PreAuthorize("hasAuthority('ACCOUNTING_JOURNAL_POST')")  // ← Change this
public ResponseEntity<JournalEntryResponse> createManualJournalEntry(@Valid @RequestBody CreateJournalEntryRequest request) {
    return ResponseEntity.ok(journalEntryService.postEntry(request));
}

@GetMapping
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")  // ← Change this
public ResponseEntity<PagedResponse<JournalEntryResponse>> getAllJournalEntries(
        @PageableDefault(size = 20, sort = "transactionDate", direction = Sort.Direction.DESC) Pageable pageable) {
    PageSizeValidator.validated(pageable);
    return ResponseEntity.ok(PagedResponse.from(
            journalEntryService.getAllJournalEntries(pageable)));
}
```

### Step 3: Update the Registry in Frontend

**File:** `frontend/src/features/users/pages/PermissionsRegistryPage.tsx`

Add new operations to the REGISTRY array under a new "Accounting" module:

```typescript
{
    id: 'accounting', label: 'Accounting', icon: <BookOpen size={14} />, color: 'slate',
    operations: [
        { id: 'accounting-chart-of-accounts',  label: 'View Chart of Accounts',     desc: 'Browse all general ledger accounts.',              method: 'GET',  path: '/api/v1/accounting/accounts',    gate: 'PERMISSION', permissionCode: 'ACCOUNTING_READ' },
        { id: 'accounting-create-account',     label: 'Create GL Account',         desc: 'Add a new general ledger account.',               method: 'POST', path: '/api/v1/accounting/accounts',    gate: 'PERMISSION', permissionCode: 'ACCOUNTING_WRITE' },
        { id: 'accounting-update-account',     label: 'Edit GL Account',           desc: 'Update account details and settings.',           method: 'PUT',  path: '/api/v1/accounting/accounts/:id', gate: 'PERMISSION', permissionCode: 'ACCOUNTING_WRITE' },
        { id: 'accounting-view-journals',      label: 'View Journal Entries',       desc: 'Review posted and draft journal transactions.',   method: 'GET',  path: '/api/v1/accounting/journals',       gate: 'PERMISSION', permissionCode: 'ACCOUNTING_READ' },
        { id: 'accounting-post-journals',      label: 'Post Manual GL Entry',       desc: 'Create and post manual journal entries.',         method: 'POST', path: '/api/v1/accounting/journals',       gate: 'PERMISSION', permissionCode: 'ACCOUNTING_JOURNAL_POST' },
        { id: 'accounting-trial-balance',      label: 'View Trial Balance',         desc: 'General ledger trial balance as of a date.',      method: 'GET',  path: '/api/v1/accounting/trial-balance',  gate: 'PERMISSION', permissionCode: 'GL_TRIAL_BALANCE' },
    ],
},
```

Also update `RolesPermissionsPage.tsx` permission metadata:

```typescript
// Accounting
ACCOUNTING_READ:           { label: 'View Accounting',         desc: 'Access general ledger accounts and journal entries.',   unlocks: 'Accounting page in sidebar',                   group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
ACCOUNTING_WRITE:          { label: 'Create/Edit Accounts',    desc: 'Create and edit general ledger accounts.',             unlocks: 'Accounting → Create / Edit buttons',           group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
ACCOUNTING_JOURNAL_POST:   { label: 'Post Journal Entries',    desc: 'Create and post manual journal transactions.',         unlocks: 'Accounting → Post Entry button',               group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
GL_TRIAL_BALANCE:          { label: 'Trial Balance',           desc: 'View the general ledger trial balance.',              unlocks: 'Accounting → Trial Balance tab',               group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
```

### Step 4: Redeploy Backend & Frontend

```bash
# Backend (Java Spring Boot)
cd backend/backend
mvn clean package
java -jar target/sacco-application-0.0.1-SNAPSHOT.jar

# Frontend (React Vite)
cd frontend
npm run build
# Deploy dist/ folder
```

### Step 5: Test & Verify

1. **Log in as System Admin**
2. Go to **Permissions Registry** → search "accounting"
3. Verify new operations appear with "PERMISSION" gate
4. Go to **Roles & Permissions**
5. Select **ACCOUNTANT** role
6. Find and toggle on:
   - ACCOUNTING_READ
   - ACCOUNTING_WRITE
   - ACCOUNTING_JOURNAL_POST
7. Click Save
8. Log out, log in as a user with ACCOUNTANT role
9. Verify:
   - Accounting pages now visible in sidebar
   - Can view accounts ✓
   - Can see trial balance ✓
   - Cannot post journals (if you didn't grant ACCOUNTING_JOURNAL_POST) → 403 error

---

## 📱 Frontend UI Locations

### Permissions Registry (`/permissions-registry`)
- **Access:** Admin sidebar → "Permissions Registry"
- **Purpose:** Read-only audit of all operations and their current role assignments
- **Features:**
  - Operations view: Full list grouped by module
  - Matrix view: Role × Permission spreadsheet
  - Search bar to filter by name, code, or endpoint path
  - Shows "No roles" alert for unassigned permissions
  - Detail panel shows who has each permission

### Roles & Permissions (`/roles-permissions`)
- **Access:** Admin sidebar → "Roles & Permissions"
- **Purpose:** Interactive editor to grant/revoke permissions
- **Features:**
  - Left panel: Role selector with count of active permissions
  - Right panel: Permission cards grouped by category
  - Toggle switches to add/remove permissions
  - Save button to persist changes
  - Deputy auto-sync for principal/deputy role pairs
  - Search to filter permissions within a role

---

## 👥 Built-in Roles & Their Purpose

| Role | Purpose | Deputy | Auto-Synced? |
|------|---------|--------|-------------|
| **SYSTEM_ADMIN** | Full system access (immutable) | N/A | ❌ |
| **CHAIRPERSON** | Board chair / leadership | DEPUTY_CHAIRPERSON | ✅ Yes |
| **TREASURER** | Financial oversight | DEPUTY_TREASURER | ✅ Yes |
| **ACCOUNTANT** | Accounting & GL management | DEPUTY_ACCOUNTANT | ✅ Yes |
| **CASHIER** | Day-to-day cash handling | DEPUTY_CASHIER | ✅ Yes |
| **LOAN_OFFICER** | Loan processing & approval | DEPUTY_LOAN_OFFICER | ✅ Yes |
| **SECRETARY** | Admin & minutes | DEPUTY_SECRETARY | ✅ Yes |

---

## 📋 Permission Categories (54 Total)

### Members (6)
- MEMBERS_READ, MEMBERS_WRITE, MEMBER_READ, MEMBER_CREATE, MEMBER_UPDATE, MEMBER_STATUS_CHANGE

### Users (3)
- USER_READ, USER_CREATE, USER_UPDATE

### Roles (3)
- ROLE_READ, ROLE_CREATE, ROLE_UPDATE

### Loans (4)
- LOANS_READ, LOANS_APPROVE, LOANS_COMMITTEE_APPROVE, LOANS_DISBURSE

### Savings (4)
- SAVINGS_READ, SAVINGS_MANUAL_POST, SAVINGS_OBLIGATIONS_MANAGE, SAVINGS_OBLIGATIONS_READ

### Reports (2)
- REPORTS_READ, GL_TRIAL_BALANCE

### Meetings (3)
- MEETINGS_READ, MEETINGS_MANAGE, ATTENDANCE_RECORD

### Penalties (1)
- PENALTIES_WAIVE_ADJUST, PENALTIES_MANAGE_RULES

### Sessions (2)
- SESSION_READ, SESSION_REVOKE

### Admin (3)
- AUDIT_LOG_READ, PENALTIES_MANAGE_RULES, DATA_MIGRATION

### Accounting (4) ← *These would be added after backend changes*
- ACCOUNTING_READ, ACCOUNTING_WRITE, ACCOUNTING_JOURNAL_POST, GL_TRIAL_BALANCE

---

## 🔐 Security Best Practices

1. **Principle of Least Privilege**
   - Only grant permissions users actually need
   - Remove permissions when roles change

2. **Principal + Deputy Pattern**
   - Assign to principal role (e.g., ACCOUNTANT)
   - Deputy auto-syncs (e.g., DEPUTY_ACCOUNTANT)
   - One-click management for both

3. **Immutable System Admin**
   - ROLE_SYSTEM_ADMIN has all permissions always
   - Cannot be restricted (hardcoded in code)
   - Use for emergencies only

4. **Permission-gated vs. Hardcoded**
   - **Permission-gated:** Can be granted/revoked via UI
   - **Hardcoded:** Backend code change + redeploy required
   - Always prefer permission-gated for flexibility

5. **Audit Trail**
   - All permission changes logged to audit_log table
   - Go to **Audit Log** page to review who changed what

---

## ⚡ Quick Workflow: "I want ACCOUNTANT to access full GL"

1. **Identify missing permissions:**
   - Currently only GL_TRIAL_BALANCE is permission-gated
   - Create new permissions: ACCOUNTING_READ, ACCOUNTING_WRITE, ACCOUNTING_JOURNAL_POST

2. **In UI:**
   - Go to Roles & Permissions
   - Create new permissions via "+ New Permission" button
   - Assign to ACCOUNTANT role
   - Save

3. **In backend:**
   - Replace hardcoded role checks with new permission codes
   - Update AccountController.java and JournalEntryController.java
   - Redeploy

4. **Update registry:**
   - Add new operations to frontend REGISTRY
   - Map permissions in RolesPermissionsPage.tsx

5. **Test:**
   - Log in as ACCOUNTANT user
   - Verify access to all accounting endpoints
   - Check audit log for permission changes

---

## 📚 File References

### Frontend
- **Permissions Registry UI:** `/frontend/src/features/users/pages/PermissionsRegistryPage.tsx` (608 lines)
- **Roles & Permissions UI:** `/frontend/src/features/users/pages/RolesPermissionsPage.tsx` (540 lines)
- **Role API Client:** `/frontend/src/features/users/api/role-api.ts`
- **Accounting Pages:** `/frontend/src/features/accounting/pages/*`

### Backend
- **Account Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/AccountController.java`
- **Journal Entry Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/JournalEntryController.java`
- **Trial Balance Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/TrialBalanceController.java`
- **Role Service:** `/backend/backend/src/main/java/.../roles/domain/service/RoleService.java`
- **Permission Repository:** `/backend/backend/src/main/java/.../roles/domain/repository/PermissionRepository.java`

### Database
- **permissions table:** Stores permission codes + descriptions
- **role_permissions table:** Junction table mapping roles ↔ permissions
- **audit_log table:** Records all permission changes with timestamp + user

---

## ✅ Checklist: Setting Up Full Accounting Access

- [ ] Understand the two-UI system (Registry = read-only, Roles & Permissions = interactive)
- [ ] Explore Permissions Registry to see current accounting endpoints
- [ ] Identify which accounting endpoints are hardcoded vs. permission-gated
- [ ] Create new permission codes (ACCOUNTING_READ, etc.) in UI or database
- [ ] Assign permissions to ACCOUNTANT role via Roles & Permissions UI
- [ ] Update backend @PreAuthorize annotations with new permission codes
- [ ] Update frontend Registry with new operations
- [ ] Redeploy backend and frontend
- [ ] Test accounting access with ACCOUNTANT user
- [ ] Verify audit log shows all permission changes
- [ ] Document role assignments for compliance/audit

---

## 🆘 Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Permission not appearing in Roles UI | Database permission doesn't exist | Create via "+ New Permission" button or SQL INSERT |
| User can't access endpoint despite having permission | Permission not deployed in backend | Check @PreAuthorize uses correct permission code, redeploy |
| 403 Forbidden when accessing endpoint | User lacks required permission | Go to Roles & Permissions, grant permission to user's role |
| Changes not taking effect | Frontend cache or session | Hard refresh (Ctrl+Shift+R) or log out/in |
| Deputy role not syncing | Saving non-principal role | Ensure you save the principal (not deputy) first |

---

## 📞 Support

For questions about:
- **UI usage:** Check this audit document or open Permissions Registry → hover over info icons
- **Backend permissions:** Review @PreAuthorize annotations in controller files
- **Database:** Check audit_log table for permission change history
- **Role assignments:** Contact System Admin (SYSTEM_ADMIN role)

---

**End of Audit Document**

