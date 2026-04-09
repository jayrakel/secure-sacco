# One-Page Visual Summary - Permission Registry System

## 🎯 Your Question
*"How do I use the permission registry UI to add accounting endpoints to roles and assign access?"*

---

## 📊 The System at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    TWO UIs YOU USE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔍 PERMISSIONS REGISTRY                                   │
│     /permissions-registry (admin-only)                     │
│     • Shows ALL operations in the system                   │
│     • Shows which roles have each permission               │
│     • READ-ONLY (informational)                            │
│     • Use it to understand current setup                   │
│                                                             │
│  ⚙️  ROLES & PERMISSIONS                                   │
│     /roles-permissions (admin-only)                        │
│     • Assign/revoke permissions to roles                   │
│     • Toggle switches to grant access                      │
│     • INTERACTIVE (make changes here)                      │
│     • Changes take effect on next login                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Current Problem

```
ACCOUNTING ENDPOINTS

✅ Trial Balance          → permission-gated [GL_TRIAL_BALANCE] ✓
❌ Chart of Accounts     → hardcoded [isAuthenticated()] ✗
❌ Create Account        → hardcoded [ROLE_SYSTEM_ADMIN] ✗
❌ Edit Account          → hardcoded [ROLE_SYSTEM_ADMIN] ✗
❌ View Journal Entries  → hardcoded [SYSTEM_ADMIN or TREASURER] ✗
❌ Post Journal Entry    → hardcoded [ROLE_SYSTEM_ADMIN] ✗

Result: 5/6 endpoints can't be assigned via UI
Need: Developer code change + redeploy
```

---

## ✅ The Solution (4 Steps)

```
STEP 1: CREATE PERMISSIONS (UI)
┌─────────────────────────────────────────┐
│ Permissions Registry → [+ New Permission]│
├─────────────────────────────────────────┤
│ ✓ ACCOUNTING_READ                       │
│ ✓ ACCOUNTING_WRITE                      │
│ ✓ ACCOUNTING_JOURNAL_POST               │
│ (GL_TRIAL_BALANCE already exists)       │
└─────────────────────────────────────────┘
       ↓
STEP 2: ASSIGN TO ROLE (UI)
┌─────────────────────────────────────────┐
│ Roles & Permissions → Select ACCOUNTANT │
│ Toggle ON:                              │
│ ☑ ACCOUNTING_READ                       │
│ ☑ ACCOUNTING_WRITE                      │
│ ☑ ACCOUNTING_JOURNAL_POST               │
│ ☑ GL_TRIAL_BALANCE                      │
│ [Save] → Auto-syncs DEPUTY_ACCOUNTANT   │
└─────────────────────────────────────────┘
       ↓
STEP 3: UPDATE BACKEND CODE (Dev)
┌─────────────────────────────────────────┐
│ Replace in AccountController.java:      │
│ @PreAuthorize("ROLE_SYSTEM_ADMIN")      │
│ with                                    │
│ @PreAuthorize("ACCOUNTING_READ/WRITE")  │
│                                         │
│ Replace in JournalController.java:      │
│ Same pattern for journal endpoints      │
└─────────────────────────────────────────┘
       ↓
STEP 4: REDEPLOY & TEST
┌─────────────────────────────────────────┐
│ mvn clean package                       │
│ npm run build                           │
│ Deploy to production                    │
│ Test with ACCOUNTANT user               │
│ ✓ All accounting features visible       │
└─────────────────────────────────────────┘
```

---

## 🔄 How Permission Assignment Works

```
Admin toggles ACCOUNTING_READ ON in UI
              ↓
Frontend sends: PUT /api/v1/roles/{ACCOUNTANT}/permissions
              ↓
Backend updates: role_permissions table
              ↓
Writes to: audit_log (who changed what, when)
              ↓
Next time ACCOUNTANT user logs in:
• JWT token includes ACCOUNTING_READ
• Accounting page appears in sidebar ✓
• API endpoints allow access ✓
              ↓
Non-ACCOUNTANT users:
• Don't have ACCOUNTING_READ permission
• Accounting page hidden
• API returns 403 Forbidden ✓
```

---

## 🎨 Access Gate Types (Color Coded)

```
🟣 PERMISSION (Violet)
   Grantable via UI
   Can assign to any role
   Example: ACCOUNTING_READ

🔴 ADMIN_ONLY (Red)
   Hardcoded to SYSTEM_ADMIN only
   Cannot be assigned to other roles
   Need code change to modify

⚪ AUTHENTICATED (Slate)
   Any logged-in user can access
   Not toggleable

🔵 MEMBER_ONLY (Cyan)
   Only ROLE_MEMBER users
   Not toggleable

🟢 PUBLIC (Green)
   No authentication required
   Rare (login, forgot password, etc.)
```

---

## 📋 Current Accounting Status

| Endpoint | Currently | After Fix |
|----------|-----------|-----------|
| Chart of Accounts | ❌ Open to all | ✅ Gated by ACCOUNTING_READ |
| Create Account | ❌ Admin only | ✅ Gated by ACCOUNTING_WRITE |
| Edit Account | ❌ Admin only | ✅ Gated by ACCOUNTING_WRITE |
| View Journals | ❌ Admin/Treasurer | ✅ Gated by ACCOUNTING_READ |
| Post Journal | ❌ Admin only | ✅ Gated by ACCOUNTING_JOURNAL_POST |
| Trial Balance | ✅ GL_TRIAL_BALANCE | ✅ GL_TRIAL_BALANCE (no change) |

---

## 🎯 Role-Based Access Example

```
BEFORE FIX:
│
├─ ACCOUNTANT Role
│  ├─ MEMBERS_READ ✓
│  ├─ REPORTS_READ ✓
│  ├─ ACCOUNTING: ❌ Cannot assign accounting perms
│  │  └─ Reason: Only hardcoded to SYSTEM_ADMIN
│  └─ Need: Code change by developer
│
└─ SYSTEM_ADMIN Role (only)
   └─ Full accounting access ✓


AFTER FIX:
│
├─ ACCOUNTANT Role
│  ├─ MEMBERS_READ ✓
│  ├─ REPORTS_READ ✓
│  ├─ ACCOUNTING: ✅ CAN ASSIGN!
│  │  ├─ ACCOUNTING_READ ✓
│  │  ├─ ACCOUNTING_WRITE ✓
│  │  ├─ ACCOUNTING_JOURNAL_POST ✓
│  │  └─ GL_TRIAL_BALANCE ✓
│  └─ No code change needed!
│
└─ SYSTEM_ADMIN Role
   └─ Full accounting access ✓ (still)


Any admin can now:
  ✓ Grant accounting to any role
  ✓ Revoke accounting from any role
  ✓ No developer involvement needed
  ✓ Changes effective on next login
```

---

## 📱 The Two UIs (Side by Side)

```
PERMISSIONS REGISTRY UI          ROLES & PERMISSIONS UI
/permissions-registry            /roles-permissions

┌──────────────────────┐        ┌──────────────────────┐
│ All Operations View  │        │ Role Editor          │
│                      │        │                      │
│ Members (5 ops)      │        │ ┌──────────────────┐ │
│ • List Members    ✓  │        │ │ Left Panel:      │ │
│ • Create Member   ✓  │        │ │ • Select role    │ │
│ • ...                │        │ └──────────────────┘ │
│                      │        │ ┌──────────────────┐ │
│ Accounting (6 ops)   │        │ │ Right Panel:     │ │
│ • Trial Balance   ✓  │        │ │ • Toggle perms   │ │
│ • Chart of Accts  ❌ │        │ │ • [Save]         │ │
│ • ...                │        │ └──────────────────┘ │
│                      │        │                      │
│ [Matrix View]        │        │ Accounting (4/4)     │
│ • Spreadsheet style  │        │ ☑ ACCOUNTING_READ   │
│ • Role × Permission  │        │ ☑ ACCOUNTING_WRITE  │
│                      │        │ ☑ ACCOUNTING_POST   │
│ [Search]             │        │ ☑ GL_TRIAL_BALANCE  │
│ • Find operations    │        │                      │
│                      │        │ [✓ Save]             │
└──────────────────────┘        └──────────────────────┘

READ-ONLY               INTERACTIVE
(informational)         (make changes)
```

---

## ⚡ Timeline: Monday Morning

```
9:00 AM
├─ Admin: Assign ACCOUNTING_READ to ACCOUNTANT
│  └─ [Save]
│     └─ Database updated

9:01 AM
├─ Alice (ACCOUNTANT user): Still logged in
│  └─ Still has old permissions (Accounting hidden)

9:05 AM
├─ Alice: Refreshes browser
│  └─ Gets new JWT with ACCOUNTING_READ
│     └─ Sidebar now shows Accounting page ✓

9:06 AM
├─ Alice: Clicks "Accounting → Chart of Accounts"
│  └─ GET /accounting/accounts
│     └─ Backend checks: Has ACCOUNTING_READ? ✓
│        └─ Returns account list ✓

9:10 AM
├─ Admin: Checks audit log
│  └─ Sees: "ACCOUNTANT permissions updated by admin@...
│     Timestamp: 2026-04-09 09:00:15
│     Added: ACCOUNTING_READ, ACCOUNTING_WRITE, ACCOUNTING_POST"
```

---

## 🔐 Security Check at Request Time

```
Alice (has ACCOUNTING_READ):
├─ Request: GET /accounting/accounts
├─ JWT: { permissions: [..., 'ACCOUNTING_READ', ...] }
├─ Backend: Checks @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
├─ Decision: 'ACCOUNTING_READ' in permissions? YES ✓
└─ Result: 200 OK + account list

Bob (no ACCOUNTING_READ):
├─ Request: GET /accounting/accounts
├─ JWT: { permissions: [...] } (no ACCOUNTING_READ)
├─ Backend: Checks @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
├─ Decision: 'ACCOUNTING_READ' in permissions? NO ✗
└─ Result: 403 Forbidden
```

---

## ✅ Verification Checklist

After implementing:
- [ ] Permissions Registry shows all 6 accounting operations
- [ ] All 6 show "PERMISSION" gate (not "ADMIN_ONLY")
- [ ] ACCOUNTING_READ, WRITE, JOURNAL_POST exist in database
- [ ] ACCOUNTANT role has all 4 accounting permissions enabled
- [ ] DEPUTY_ACCOUNTANT auto-synced with same permissions
- [ ] User with ACCOUNTANT role can access all accounting pages
- [ ] User without ACCOUNTING_READ gets 403 error
- [ ] Audit log shows permission change

---

## 🚀 Time Required

```
Task                           Time
─────────────────────────────────────
1. Create permissions (UI)     5 min
2. Assign to role (UI)         3 min
3. Update backend code         10 min
4. Build & redeploy            15-30 min
5. Test                        10 min
─────────────────────────────────────
TOTAL                          45-60 min
```

---

## 📁 Documents Available

All detailed in folder:  
`C:\Users\JAY\OneDrive\Desktop\secure-sacco\`

1. **PERMISSION_REGISTRY_README.md** ← Start here
2. **PERMISSION_REGISTRY_SUMMARY.md** ← Full overview
3. **PERMISSION_REGISTRY_QUICK_REF.md** ← Visual reference
4. **PERMISSION_REGISTRY_STEP_BY_STEP.md** ← Implementation
5. **PERMISSION_REGISTRY_AUDIT.md** ← Technical deep dive
6. **PERMISSION_REGISTRY_ARCHITECTURE.md** ← System design
7. **PERMISSION_REGISTRY_INDEX.md** ← Navigation guide

---

**Ready to implement?**  
→ Follow PERMISSION_REGISTRY_STEP_BY_STEP.md  

**Want more detail?**  
→ Read PERMISSION_REGISTRY_SUMMARY.md  

**Need to troubleshoot?**  
→ Check PERMISSION_REGISTRY_AUDIT.md  

---

✅ **You now have everything needed to add full accounting access using the Permission Registry UI!**

