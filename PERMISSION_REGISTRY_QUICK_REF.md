# Permission Registry UI - Quick Reference Card

## 🎯 Two Main Pages

### 1. PERMISSIONS REGISTRY (`/permissions-registry`)
**Purpose:** View all system operations and their access gates  
**Access:** Sidebar → "Permissions Registry" (Admin only)  
**Readonly:** ✅ Yes - informational only

```
┌─────────────────────────────────────┐
│ PERMISSIONS REGISTRY                │
├─────────────────────────────────────┤
│ [Operations] [Matrix]               │  ← View toggle
├─────────────────────────────────────┤
│ 🔍 Search... [Legend with gates]    │
├─────────────────────────────────────┤
│ Members (5 ops) ▼                   │
│  ├─ GET /api/v1/members             │
│  │  ▶ MEMBERS_READ                  │  ← Click for details
│  ├─ POST /api/v1/members            │
│  ├─ PUT /api/v1/members/:id         │
│  └─ ...                             │
│                                      │
│ Accounting (6 ops) ▼                │
│  ├─ GET /api/v1/accounting/...      │
│  ├─ POST /api/v1/accounting/...     │
│  └─ ...                             │
└─────────────────────────────────────┘
       Detail Panel (when selected)
         • Endpoint + method
         • Which roles have access
         • Gate type explanation
```

**What You See:**
- **Operations List:** Grouped by module (Members, Loans, Accounting, etc.)
- **Search:** Filter by name, permission code, or API path
- **Method Badge:** GET (green), POST (blue), PUT (amber), DELETE (red)
- **Gate Badge:** Shows access gate type
- **Role Pills:** Which roles currently have this permission
- **Red "No roles":** Permission exists but not assigned to anyone

**Matrix View:**
- Rows = Permissions, Columns = Roles
- ✓ = Role has permission
- ○ = Role doesn't have permission  
- "✓ always" = SYSTEM_ADMIN (unchangeable)

---

### 2. ROLES & PERMISSIONS (`/roles-permissions`)
**Purpose:** Assign/revoke permissions to/from roles  
**Access:** Sidebar → "Roles & Permissions" (Admin only)  
**Interactive:** ✅ Yes - make changes, save

```
┌────────────────┬──────────────────────────────┐
│ System Roles   │ Permission Editor             │
├────────────────┼──────────────────────────────┤
│ ACCOUNTANT     │ [ACCOUNTANT - 42 perms]      │
│ TREASURER      │ 🔍 Search...   [Save]        │
│ CASHIER        ├──────────────────────────────┤
│ LOAN_OFFICER   │ Members (3/6 active)         │
│ SECRETARY      │  ┌──────────────────────┐    │
│ ...            │  │ 🎚 MEMBERS_READ      │    │
│                │  │ View member list      │    │
│                │  │ ▶ Members page        │    │
│                │  └──────────────────────┘    │
│                │  ┌──────────────────────┐    │
│ ↑ Has deputy?  │  │ 🎚 MEMBERS_WRITE     │    │
│ 🔄 Auto-sync   │  │ Create/edit members   │    │
│                │  │ ▶ Create/Edit btns   │    │
│                │  └──────────────────────┘    │
│                │                              │
│                │ Accounting (1/4 active)      │
│                │  ┌──────────────────────┐    │
│                │  │   GL_TRIAL_BALANCE   │    │
│                │  │ View trial balance    │    │
│                │  │ ▶ Accounting tab     │    │
│                │  └──────────────────────┘    │
│                │                              │
│                │ [💾 Save Permissions]        │
└────────────────┴──────────────────────────────┘
```

---

## 📋 Current Accounting Endpoints

| Endpoint | Method | Currently Gated By | Status in Registry |
|----------|--------|------------------|-------------------|
| Chart of Accounts | GET | `isAuthenticated()` | ❌ **Not shown** (too open) |
| Create Account | POST | `ROLE_SYSTEM_ADMIN` | ❌ **Not shown** (hardcoded) |
| Update Account | PUT | `ROLE_SYSTEM_ADMIN` | ❌ **Not shown** (hardcoded) |
| Journal Entries | GET | `ROLE_SYSTEM_ADMIN` or `ROLE_TREASURER` | ❌ **Not shown** (hardcoded roles) |
| Post Journal Entry | POST | `ROLE_SYSTEM_ADMIN` | ❌ **Not shown** (hardcoded) |
| **Trial Balance** | GET | `GL_TRIAL_BALANCE` | ✅ **In Registry** (Reports module) |

---

## ⚙️ 4-Step Workflow: Add Accounting to Roles

### Step 1️⃣: Create Permission Codes (UI)
```
Roles & Permissions → [+ New Permission]
  Code: ACCOUNTING_READ
  Desc: "View general ledger accounts and journal entries"

Repeat for:
  - ACCOUNTING_WRITE
  - ACCOUNTING_JOURNAL_POST
```

### Step 2️⃣: Assign to Role (UI)
```
Roles & Permissions
  → Select ACCOUNTANT
  → Toggle ON:
    • ACCOUNTING_READ
    • ACCOUNTING_WRITE
    • ACCOUNTING_JOURNAL_POST
    • GL_TRIAL_BALANCE
  → [Save]
```

### Step 3️⃣: Update Backend Code (Git)
```java
// accountController.java, line 29
- @PreAuthorize("isAuthenticated()")
+ @PreAuthorize("hasAuthority('ACCOUNTING_READ')")

// journalController.java, line 30
- @PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_TREASURER')")
+ @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
```

### Step 4️⃣: Update Registry & Redeploy (Git)
```
Permissions Registry page:
  Add new "Accounting" module with operations

Redeploy backend + frontend
  → Users log in again
  → See new accounting controls
```

---

## 🎨 Access Gate Color Coding

| Gate Type | Badge Color | Meaning | Assignable? |
|-----------|------------|---------|-----------|
| Permission | 🟣 Violet | Requires specific permission code | ✅ Yes, via UI |
| Admin Only | 🔴 Red | ROLE_SYSTEM_ADMIN only | ❌ Hardcoded |
| Any User | ⚪ Slate | All logged-in users | ✅ Implicit |
| Member Only | 🔵 Cyan | ROLE_MEMBER only | ✅ Implicit |
| Public | 🟢 Green | No auth needed | ✅ Implicit |

---

## 🔄 Principal ↔ Deputy Auto-Sync

When you save permissions for a **principal** role, the **deputy** is auto-synced:

| Principal | Deputy | Auto-Sync? |
|-----------|--------|-----------|
| CHAIRPERSON | DEPUTY_CHAIRPERSON | ✅ Yes |
| TREASURER | DEPUTY_TREASURER | ✅ Yes |
| ACCOUNTANT | DEPUTY_ACCOUNTANT | ✅ Yes |
| CASHIER | DEPUTY_CASHIER | ✅ Yes |
| LOAN_OFFICER | DEPUTY_LOAN_OFFICER | ✅ Yes |
| SECRETARY | DEPUTY_SECRETARY | ✅ Yes |

**How it works:**
```
You save ACCOUNTANT with 42 permissions
  → System silently saves DEPUTY_ACCOUNTANT with same 42
  → Success message: "ACCOUNTANT saved and Deputy Accountant synced"
```

---

## 📊 Accounting Access Example

### Current State ❌
```
Role: ACCOUNTANT
Can access: Trial Balance only
  ├─ /accounting/trial-balance ✅ (GL_TRIAL_BALANCE permission)
  └─ Cannot view:
    ├─ Chart of Accounts ❌ (missing ACCOUNTING_READ)
    ├─ Journal Entries ❌ (missing ACCOUNTING_READ)
    └─ Post Entry ❌ (missing ACCOUNTING_JOURNAL_POST)
```

### After Setup ✅
```
Role: ACCOUNTANT
Permissions granted:
  ├─ ACCOUNTING_READ
  ├─ ACCOUNTING_WRITE
  ├─ ACCOUNTING_JOURNAL_POST
  └─ GL_TRIAL_BALANCE

Can access:
  ├─ GET /api/v1/accounting/accounts ✅
  ├─ POST /api/v1/accounting/accounts ✅
  ├─ PUT /api/v1/accounting/accounts/:id ✅
  ├─ GET /api/v1/accounting/journals ✅
  ├─ POST /api/v1/accounting/journals ✅
  └─ GET /api/v1/accounting/trial-balance ✅
```

---

## 🔍 How to Find Accounting Operations

### Method 1: Search in Registry
```
Permissions Registry → [🔍 Search]
  Type: "accounting"
  Results:
  • Trial Balance (Reports module) ← Already permission-gated
  • Others showing as ADMIN_ONLY ← Need to convert
```

### Method 2: Search by Permission Code
```
[🔍 Search] → "GL_TRIAL_BALANCE"
  Results:
  • Trial Balance
    - Gate: GL_TRIAL_BALANCE
    - Currently granted to: [see here which roles have it]
```

### Method 3: View Matrix
```
Permissions Registry → [Matrix] tab
  Look for rows:
  • GL_TRIAL_BALANCE ← Already in matrix
  • ACCOUNTING_READ ← After you create it
  • ACCOUNTING_WRITE ← After you create it

  Columns: ACCOUNTANT, TREASURER, etc.
  Click to see who has what
```

---

## ❌ Common Mistakes

| Mistake | Why Bad | Fix |
|--------|--------|-----|
| Assigning to deputy role | Deputy gets out of sync with principal | Always assign to principal, let deputy sync auto |
| Only saving one accounting permission | User still can't access endpoints with other perms | Grant all 4: READ, WRITE, JOURNAL_POST, GL_TRIAL_BALANCE |
| Forgetting to redeploy backend | New perms in UI but endpoints still check old role | Run `mvn clean package` + redeploy Java app |
| Granting ROLE_SYSTEM_ADMIN everything | Creates security debt, hard to debug | Use specific roles + specific permissions instead |
| Not checking audit log | Don't know who changed what | Go to Audit Log page after each change |

---

## ✅ Verification Checklist

After setting up accounting access:

- [ ] Permissions Registry shows all 6 accounting operations
- [ ] Matrix view shows ACCOUNTING_READ, WRITE, JOURNAL_POST in rows
- [ ] ACCOUNTANT role shows 4 accounting permissions enabled
- [ ] Backend code uses `@PreAuthorize("hasAuthority('ACCOUNTING_READ')")` not hardcoded roles
- [ ] User with ACCOUNTANT role can:
  - [ ] View accounts list (GET /accounting/accounts)
  - [ ] Post journal entry (POST /accounting/journals)
  - [ ] See trial balance (GET /accounting/trial-balance)
  - [ ] ❌ Cannot create account (unless also has ACCOUNTING_WRITE)
- [ ] Audit log shows permission change timestamp + who made it
- [ ] DEPUTY_ACCOUNTANT has same permissions as ACCOUNTANT

---

## 🚀 Now You Know!

✅ How the permission system works  
✅ Where to find current accounting permissions  
✅ How to create new permissions  
✅ How to assign permissions to roles  
✅ What backend changes are needed  
✅ How to verify everything works  

**Next:** Go to `/permissions-registry` and explore! 🔐

