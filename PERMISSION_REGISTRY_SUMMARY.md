# Permission Registry System - Executive Summary

**Date:** April 9, 2026  
**Prepared For:** Development & Admin Teams  
**Subject:** Complete audit of the permissions system and guide for managing accounting endpoints

---

## 📌 TL;DR (30 seconds)

Your system has a **two-layer permission management UI**:

1. **Permissions Registry** (`/permissions-registry`) → Shows all operations & their current access gates (read-only reference)
2. **Roles & Permissions** (`/roles-permissions`) → Lets admins assign/revoke permissions to roles (interactive UI)

**To grant ACCOUNTANT full accounting access:**
1. Create 3 new permission codes in the UI (ACCOUNTING_READ, WRITE, JOURNAL_POST)
2. Assign them to ACCOUNTANT role and save
3. Update backend Java code: replace hardcoded role checks with permission codes
4. Redeploy backend + frontend
5. Done! ACCOUNTANT users now have full GL access

---

## 🎯 What the System Does

### Permissions Registry UI (`/permissions-registry`)
- **View only** - informational reference for audits
- Shows ALL 150+ system operations grouped by module
- Each operation shows:
  - HTTP method (GET, POST, PUT, DELETE)
  - API endpoint path
  - **Access gate type** (who can access it?)
  - **Which roles currently have access**
- Search bar to find operations by name, code, or path
- Matrix view for spreadsheet-style role × permission visualization

### Roles & Permissions UI (`/roles-permissions`)
- **Interactive editor** - where admins manage access
- Left panel: List of all system roles (ACCOUNTANT, TREASURER, etc.)
- Right panel: Permission cards for the selected role
- Admins toggle permissions ON/OFF for each role
- Click SAVE → permissions update immediately
- Deputy roles auto-sync (e.g., DEPUTY_ACCOUNTANT follows ACCOUNTANT)

---

## 🏗️ How It Works Under the Hood

```
Admin clicks "SAVE" in Roles UI
    ↓
Frontend sends: PUT /api/v1/roles/{roleId}/permissions
    ↓
Backend updates: role_permissions table (database)
    ↓
Audit log records: Who changed what, when
    ↓
Next time that user logs in:
    • Their JWT gets new permissions list
    • Sidebar shows new menu items
    • API endpoints now allow access (if @PreAuthorize matches)
    ↓
User sees: Accounting page in sidebar ✓
```

**Key point:** Permission changes take effect on **next login/page refresh**, not immediately.

---

## 📊 Current Accounting Situation

### What's Already Permission-Based ✅
| Endpoint | Permission | Status |
|----------|-----------|--------|
| GET Trial Balance | `GL_TRIAL_BALANCE` | Already permission-gated ✓ |

### What's Still Hardcoded ❌
| Endpoint | Hardcoded To | Status |
|----------|-------------|--------|
| GET Chart of Accounts | `isAuthenticated()` | Open to all users |
| POST Create Account | `ROLE_SYSTEM_ADMIN` | Admin only |
| PUT Edit Account | `ROLE_SYSTEM_ADMIN` | Admin only |
| GET Journal Entries | `ROLE_SYSTEM_ADMIN`, `ROLE_TREASURER` | Specific roles hardcoded |
| POST Post Journal Entry | `ROLE_SYSTEM_ADMIN` | Admin only |

**Problem:** These hardcoded checks don't appear in the Permissions Registry UI, so admins can't assign them to other roles without code changes.

---

## ✅ 4-Step Fix: Full Accounting Access

### Step 1: Create Permissions (UI - 5 min)
Admin goes to Permissions Registry → "+ New Permission"
```
Code: ACCOUNTING_READ
Desc: "View general ledger accounts and journal entries"

Code: ACCOUNTING_WRITE
Desc: "Create, edit, delete GL accounts"

Code: ACCOUNTING_JOURNAL_POST
Desc: "Post manual journal entries to GL"
```

### Step 2: Assign to Role (UI - 2 min)
Admin goes to Roles & Permissions → select ACCOUNTANT → toggle ON:
- ACCOUNTING_READ ✓
- ACCOUNTING_WRITE ✓
- ACCOUNTING_JOURNAL_POST ✓
- GL_TRIAL_BALANCE ✓ (already exists)

Click Save → Updates database, auto-syncs DEPUTY_ACCOUNTANT

### Step 3: Update Backend Code (Development - 10 min)
Replace hardcoded checks in Java controller files:

**Before:**
```java
@PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
```

**After:**
```java
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")
```

### Step 4: Redeploy (Operations - varies)
- `mvn clean package` → build new backend
- `npm run build` → build new frontend
- Deploy to production
- Users log in again → see new permissions

---

## 💡 Key Concepts

### Permission-Gated (Good) vs. Hardcoded (Bad)

**Permission-Gated:**
```java
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")
public ResponseEntity<Accounts> getAccounts() { ... }
```
- ✅ Can assign to any role via UI
- ✅ No code change needed to grant access
- ✅ Appears in Permissions Registry
- ✅ Flexible & auditable

**Hardcoded:**
```java
@PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
public ResponseEntity<Accounts> getAccounts() { ... }
```
- ❌ Only SYSTEM_ADMIN can access
- ❌ Code change + redeploy needed to allow others
- ❌ Doesn't appear in Registry (or appears as "Admin Only")
- ❌ Hard to audit & maintain

### Permissions vs. Roles

**Permissions** = Fine-grained actions
- ACCOUNTING_READ, ACCOUNTING_WRITE, MEMBERS_READ, etc.
- Can be toggled per role
- 54 total permissions in the system

**Roles** = Groups of permissions
- ACCOUNTANT, TREASURER, CASHIER, etc.
- Each role has multiple permissions
- 7 built-in roles + custom roles possible

**Example:**
```
ACCOUNTANT role has permissions:
  ├─ ACCOUNTING_READ
  ├─ ACCOUNTING_WRITE
  ├─ GL_TRIAL_BALANCE
  ├─ REPORTS_READ
  ├─ MEMBERS_READ
  └─ ... (and others)
```

### Principal & Deputy Auto-Sync

Some roles come in pairs:
- ACCOUNTANT ↔ DEPUTY_ACCOUNTANT
- TREASURER ↔ DEPUTY_TREASURER
- CASHIER ↔ DEPUTY_CASHIER
- etc.

**How it works:**
1. Admin saves permissions for ACCOUNTANT
2. System automatically gives DEPUTY_ACCOUNTANT the same permissions
3. No need to edit both separately

**Why?** Deputies need same authority as principals when principal is absent.

---

## 🔐 Security Model

### Request Flow
```
1. User logs in
   → Backend looks up user's roles
   → Looks up all permissions for those roles
   → Creates JWT with permissions list

2. User makes API request
   → JWT sent in Authorization header
   → Backend reads @PreAuthorize("hasAuthority('PERMISSION')")
   → Checks if user's permissions include it
   → If yes → allow request
   → If no → return 403 Forbidden

3. User sees:
   → Sidebar shows menu items they have permission for
   → Buttons disabled for operations they can't do
   → API returns 403 if they try anyway
```

### Access Gate Types

| Gate | Meaning | Who Can Change |
|------|---------|---|
| `PERMISSION` | Requires specific permission code | Admin via UI |
| `SYSTEM_ADMIN` | Only ROLE_SYSTEM_ADMIN | Developer (code change) |
| `AUTHENTICATED` | Any logged-in user | Developer (code change) |
| `MEMBER_ONLY` | Only ROLE_MEMBER users | Developer (code change) |
| `PUBLIC` | No auth required | Developer (code change) |

---

## 📋 Current Permissions (54 Total)

### By Category
- **Members:** 6 permissions (READ, WRITE, CREATE, UPDATE, STATUS_CHANGE, etc.)
- **Users:** 3 permissions (READ, CREATE, UPDATE)
- **Roles:** 3 permissions (READ, CREATE, UPDATE)
- **Loans:** 4 permissions (READ, APPROVE, COMMITTEE_APPROVE, DISBURSE)
- **Savings:** 4 permissions (READ, MANUAL_POST, OBLIGATIONS_MANAGE, OBLIGATIONS_READ)
- **Reports:** 2 permissions (READ, GL_TRIAL_BALANCE)
- **Meetings:** 3 permissions (READ, MANAGE, ATTENDANCE_RECORD)
- **Penalties:** 2 permissions (WAIVE_ADJUST, MANAGE_RULES)
- **Sessions:** 2 permissions (READ, REVOKE)
- **Admin:** 3 permissions (AUDIT_LOG_READ, PENALTIES_MANAGE_RULES, DATA_MIGRATION)
- **Accounting (to be added):** 4 permissions (READ, WRITE, JOURNAL_POST, GL_TRIAL_BALANCE)

---

## 📁 Files You Need to Know

### Frontend (React/TypeScript)
- **Permissions Registry:** `/frontend/src/features/users/pages/PermissionsRegistryPage.tsx` (608 lines)
- **Roles & Permissions:** `/frontend/src/features/users/pages/RolesPermissionsPage.tsx` (540 lines)
- **API Client:** `/frontend/src/features/users/api/role-api.ts`

### Backend (Java Spring Boot)
- **Account Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/AccountController.java`
- **Journal Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/JournalEntryController.java`
- **Trial Balance Controller:** `/backend/backend/src/main/java/.../accounting/api/controller/TrialBalanceController.java`
- **Role Service:** `/backend/backend/src/main/java/.../roles/domain/service/RoleService.java`

### Database
- **permissions table:** Stores permission codes + descriptions
- **role_permissions table:** Links roles ↔ permissions (M:M)
- **audit_log table:** Records all changes

---

## 🎓 Documentation Provided

I've created 4 comprehensive guides for you:

1. **PERMISSION_REGISTRY_AUDIT.md** (7,000+ words)
   - Complete system overview
   - Current accounting endpoints status
   - How gates work
   - Backend integration instructions
   - Security best practices
   - Troubleshooting

2. **PERMISSION_REGISTRY_QUICK_REF.md** (2,000+ words)
   - Visual quick reference cards
   - Side-by-side UI comparisons
   - Accounting workflow example
   - Common mistakes & fixes
   - Verification checklist

3. **PERMISSION_REGISTRY_STEP_BY_STEP.md** (3,000+ words)
   - Step-by-step walkthrough with screenshots
   - Create permissions in UI (5 min)
   - Assign to roles (3 min)
   - Update backend code (10 min)
   - Redeploy & test (10 min)
   - Visual code examples

4. **PERMISSION_REGISTRY_ARCHITECTURE.md** (4,000+ words)
   - System architecture diagrams
   - Request flow diagrams
   - Database schema
   - Before/after comparisons
   - Data flow visualizations

---

## 🚀 Next Steps

### For Admins
1. **Explore** Permissions Registry to understand current setup
2. **Verify** which accounting endpoints are visible
3. **Decide** which roles should have accounting access
4. **Wait** for developers to complete backend changes

### For Developers
1. **Review** the Audit document (sections on backend integration)
2. **Create** new permission codes using the UI
3. **Update** @PreAuthorize annotations in accounting controllers
4. **Add** new operations to the registry in frontend
5. **Test** with accounting access granted to a test role
6. **Deploy** when ready

### For Operations
1. **Backup** database before making changes
2. **Monitor** audit log for all permission changes
3. **Communicate** to users that accounting access might change
4. **Coordinate** with dev team on deployment timing
5. **Test** in staging environment first

---

## ⚠️ Important Reminders

- **Permission changes take effect on next login/refresh**, not immediately
- **Deputy roles auto-sync** - always save principal role, not deputy
- **Backend code is required** - UI changes alone won't work without @PreAuthorize updates
- **Audit log is your friend** - check it after every permission change
- **SYSTEM_ADMIN role is immutable** - cannot restrict it, only code change helps
- **Test in staging first** - especially complex permission setups

---

## 📞 Getting Help

- **How to use UI?** → See QUICK_REF or STEP_BY_STEP guides
- **What's the architecture?** → See ARCHITECTURE guide
- **Backend code questions?** → See AUDIT document (Backend Integration section)
- **General questions?** → Start with AUDIT document (Executive Summary)

---

## ✨ Summary

You have a **robust, flexible permission system** that lets admins grant/revoke access without code changes (for permission-gated operations). The Permissions Registry UI is your **audit trail & configuration center**.

To unlock full accounting access, you need to:
1. **Move from hardcoded checks to permission-based checks** (backend code)
2. **Create new permission codes** (UI)
3. **Assign to roles** (UI)
4. **Redeploy** (operations)

After that, any admin can manage accounting access without involving developers.

---

**Document collection created by: System Audit**  
**All files located in:** `C:\Users\JAY\OneDrive\Desktop\secure-sacco\`

**Files:**
- ✅ PERMISSION_REGISTRY_AUDIT.md
- ✅ PERMISSION_REGISTRY_QUICK_REF.md
- ✅ PERMISSION_REGISTRY_STEP_BY_STEP.md
- ✅ PERMISSION_REGISTRY_ARCHITECTURE.md
- ✅ PERMISSION_REGISTRY_SUMMARY.md (this file)

