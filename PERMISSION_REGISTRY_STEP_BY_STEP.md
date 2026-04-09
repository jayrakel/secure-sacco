# Step-by-Step: Add Full Accounting Access Using Permission Registry UI

**Goal:** Grant ACCOUNTANT role full access to all accounting endpoints  
**Time:** ~10 minutes (UI) + redeploy time (backend/frontend)  
**Difficulty:** Medium (requires backend code changes)

---

## 🎬 Part 1: Create Permissions in UI (5 min)

### Step 1: Navigate to Permissions Registry

```
Dashboard
  └─ Left Sidebar
      └─ ⚙️ Administration (expand)
          └─ 🔐 Permissions Registry
```

**You should see:**
```
┌────────────────────────────────────────────────────────┐
│ 🔐 PERMISSIONS REGISTRY                               │
│ Every operation in the system · 150+ total             │
├────────────────────────────────────────────────────────┤
│ [🔍 Search operations, paths...] [View: Operations|Matrix]│
│ [+ New Permission]                                     │
├────────────────────────────────────────────────────────┤
│ Members (5 ops)                                        │
│ Users & Roles (8 ops)                                 │
│ Loans (12 ops)                                        │
│ ...                                                    │
│ Reports (6 ops) ← Find accounting here                │
│   - GET Trial Balance /api/v1/accounting/trial-balance│
│                      [GL_TRIAL_BALANCE permission ✓]  │
└────────────────────────────────────────────────────────┘
```

### Step 2: Search for Existing Accounting

In the search box, type `accounting`:

```
Search box: [accounting....................]
                           ↓ Results
Reports module:
  ▶ GET Trial Balance
    Path: /api/v1/accounting/trial-balance
    Gate: GL_TRIAL_BALANCE (permission-gated ✅)
    Granted to: (check which roles)
```

**Note:** Other accounting endpoints (accounts, journals) may not appear if they use hardcoded role checks.

### Step 3: Click "+ New Permission" Button

In the top-right of the Permissions Registry page:

```
[🔍 Search...] [View: Operations | Matrix] [+ New Permission]
                                              ↑ Click here
```

**Modal opens:**
```
┌─────────────────────────────────────────────┐
│ Add New Permission                          │
│ Define a new permission code to grant       │
├─────────────────────────────────────────────┤
│                                             │
│ Permission Code *                           │
│ [ACCOUNTING_READ...................]         │
│ (Stored uppercase with underscores)         │
│                                             │
│ Description                                 │
│ [View general ledger accounts.......]      │
│                                             │
│ ℹ️  To enforce it on an endpoint, add        │
│     @PreAuthorize("hasAuthority...') to     │
│     the backend controller & redeploy       │
│                                             │
│ [+ Create Permission]                       │
└─────────────────────────────────────────────┘
```

### Step 4: Create ACCOUNTING_READ

**Fill in:**
- **Code:** `ACCOUNTING_READ`
- **Description:** `View general ledger accounts and journal entries`

**Click:** `+ Create Permission`

✅ **Result:** Success toast appears, permission added to database

### Step 5: Repeat for Other Permissions

Create these three more:

1. **ACCOUNTING_WRITE**
   - Code: `ACCOUNTING_WRITE`
   - Desc: `Create, edit, and delete general ledger accounts`

2. **ACCOUNTING_JOURNAL_POST**
   - Code: `ACCOUNTING_JOURNAL_POST`
   - Desc: `Post manual journal entries to the general ledger`

3. *(Skip GL_TRIAL_BALANCE - already exists)*

**After creating all three:**
```
✅ ACCOUNTING_READ created
✅ ACCOUNTING_WRITE created
✅ ACCOUNTING_JOURNAL_POST created
✅ GL_TRIAL_BALANCE already exists
```

---

## 🎬 Part 2: Assign Permissions to ACCOUNTANT Role (3 min)

### Step 6: Navigate to Roles & Permissions

```
Dashboard
  └─ Left Sidebar
      └─ ⚙️ Administration (expand)
          └─ 👥 Roles & Permissions
```

**You should see:**
```
┌──────────────────┬──────────────────────────────────┐
│ System Roles     │ Permission Editor                │
├──────────────────┼──────────────────────────────────┤
│ CHAIRPERSON      │ (Select a role to begin)         │
│ VICE_CHAIRPERSON │                                  │
│ TREASURER        │ Search... [Save]                 │
│ DEPUTY_TREASURER │                                  │
│ ACCOUNTANT       │ ← Click this one                 │
│ DEPUTY_ACCOUNTANT│                                  │
│ CASHIER          │                                  │
│ ...              │                                  │
│                  │                                  │
└──────────────────┴──────────────────────────────────┘
```

### Step 7: Click ACCOUNTANT Role

**Left panel:**
```
[ACCOUNTANT]  ← Click here
42 perms
```

**Right panel loads:**
```
┌──────────────────────────────────────────┐
│ ACCOUNTANT                               │
│ 42 permissions active                    │
│ 🔄 Saving auto-syncs Deputy Accountant   │
│                                          │
│ Search: [🔍........................]      │
│                        [Save]            │
├──────────────────────────────────────────┤
│ Members (3/6 active)                     │
│  □ MEMBERS_READ ▼ View member list       │
│  ☑ MEMBERS_WRITE ▼ Create/edit members   │
│  ☑ MEMBER_STATUS_CHANGE                  │
│                                          │
│ Accounting (0/4 active)                  │
│  □ ACCOUNTING_READ                       │
│    View general ledger accounts...       │
│    ▶ Accounting page in sidebar          │
│  □ ACCOUNTING_WRITE                      │
│    Create, edit accounts                 │
│    ▶ Create/Edit buttons                 │
│  □ ACCOUNTING_JOURNAL_POST               │
│    Post manual journal entries           │
│    ▶ GL Posting button                   │
│  ☑ GL_TRIAL_BALANCE                      │
│    View trial balance                    │
│    ▶ Accounting tab                      │
│                                          │
└──────────────────────────────────────────┘
```

### Step 8: Toggle ON All Accounting Permissions

**Click the checkboxes/cards:**

```
Accounting (0/4 active) → (4/4 active)
  ☑ ACCOUNTING_READ         ← Click to toggle ON
  ☑ ACCOUNTING_WRITE        ← Click to toggle ON
  ☑ ACCOUNTING_JOURNAL_POST ← Click to toggle ON
  ☑ GL_TRIAL_BALANCE        ← Already ON, leave it
```

**Visual feedback:**
- Cards turn from gray → colored (blue/amber)
- Counter updates: "0/4 active" → "4/4 active"
- "Unsaved changes" badge appears at top

### Step 9: Click SAVE Button

**Top right:**
```
[Save] ← Click here (now enabled because you have unsaved changes)
```

**Loading state:**
```
┌─────────────────────────────────┐
│ ✓ Saved                         │
│ ACCOUNTANT permissions updated. │
│ Deputy Accountant auto-synced   │
└─────────────────────────────────┘
```

**What happened:**
- ✅ ACCOUNTANT role saved with all 4 accounting permissions
- ✅ DEPUTY_ACCOUNTANT automatically synced with same permissions
- ✅ Both roles can now access accounting endpoints (once backend is updated)

---

## 🎬 Part 3: Update Backend Code (5 min)

### Step 10: Edit AccountController.java

**File location:**
```
backend/backend/src/main/java/com/jaytechwave/sacco/modules/accounting/api/controller/AccountController.java
```

**Current code (line 28-30):**
```java
@GetMapping
@PreAuthorize("isAuthenticated()") // TBD: Add specific 'ACCOUNTING_READ' permission later
public ResponseEntity<List<AccountResponse>> getAllAccounts() {
```

**Change to:**
```java
@GetMapping
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")
public ResponseEntity<List<AccountResponse>> getAllAccounts() {
```

**Current code (line 21-25):**
```java
@PostMapping
@PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')") // Usually only admins create accounts
public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
```

**Change to:**
```java
@PostMapping
@PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest request) {
```

**Current code (line 33-38):**
```java
@PutMapping("/{id}")
@PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
public ResponseEntity<AccountResponse> updateAccount(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAccountRequest request) {
```

**Change to:**
```java
@PutMapping("/{id}")
@PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")
public ResponseEntity<AccountResponse> updateAccount(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateAccountRequest request) {
```

### Step 11: Edit JournalEntryController.java

**File location:**
```
backend/backend/src/main/java/com/jaytechwave/sacco/modules/accounting/api/controller/JournalEntryController.java
```

**Current code (line 23-26):**
```java
@PostMapping
@PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")
public ResponseEntity<JournalEntryResponse> createManualJournalEntry(@Valid @RequestBody CreateJournalEntryRequest request) {
```

**Change to:**
```java
@PostMapping
@PreAuthorize("hasAuthority('ACCOUNTING_JOURNAL_POST')")
public ResponseEntity<JournalEntryResponse> createManualJournalEntry(@Valid @RequestBody CreateJournalEntryRequest request) {
```

**Current code (line 29-31):**
```java
@GetMapping
@PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN', 'ROLE_TREASURER')")
public ResponseEntity<PagedResponse<JournalEntryResponse>> getAllJournalEntries(
```

**Change to:**
```java
@GetMapping
@PreAuthorize("hasAuthority('ACCOUNTING_READ')")
public ResponseEntity<PagedResponse<JournalEntryResponse>> getAllJournalEntries(
```

### Step 12: Update Frontend Registry

**File location:**
```
frontend/src/features/users/pages/PermissionsRegistryPage.tsx
```

**Find the REGISTRY array (around line 42) and add after Reports module:**

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

**Also add import at top (line 4):**
```typescript
import {
    // ... existing imports ...
    BookOpen,  // ← Add this
} from 'lucide-react';
```

**File:** `frontend/src/features/users/pages/RolesPermissionsPage.tsx`

**Add to PERM_META object (around line 50):**

```typescript
// Accounting
ACCOUNTING_READ:           { label: 'View Accounting',         desc: 'Access general ledger accounts and journal entries.',   unlocks: 'Accounting page in sidebar',                   group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
ACCOUNTING_WRITE:          { label: 'Create/Edit Accounts',    desc: 'Create and edit general ledger accounts.',             unlocks: 'Accounting → Create / Edit buttons',           group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
ACCOUNTING_JOURNAL_POST:   { label: 'Post Journal Entries',    desc: 'Create and post manual journal transactions.',         unlocks: 'Accounting → Post Entry button',               group: 'Accounting', groupIcon: <BookOpen size={13} />,     groupColor: 'slate'   },
```

**Add import at top (line 5):**
```typescript
import {
    // ... existing imports ...
    BookOpen,  // ← Add this
} from 'lucide-react';
```

---

## 🎬 Part 4: Redeploy & Test (10 min)

### Step 13: Rebuild Backend

**Terminal:**
```bash
cd backend/backend
mvn clean package
```

**Expected output:**
```
[INFO] Building jar: target/sacco-application-0.0.1-SNAPSHOT.jar
[INFO] BUILD SUCCESS
```

### Step 14: Restart Backend Service

```bash
# Stop current service (if running)
pkill -f sacco-application

# Start new version
java -jar backend/backend/target/sacco-application-0.0.1-SNAPSHOT.jar &
```

**Verify it's running:**
```
curl http://localhost:8080/api/v1/health
# Should return: {"status":"UP"}
```

### Step 15: Rebuild Frontend

**Terminal:**
```bash
cd frontend
npm run build
```

**Expected output:**
```
✓ 1234 modules transformed
dist/index.html                    12.34 kB
dist/assets/index.abc123.js       456.78 kB
```

### Step 16: Deploy Frontend

```bash
# Copy dist to web server
cp -r frontend/dist /var/www/sacco-app/
# Or: Upload dist/ to your hosting platform
```

### Step 17: Test with ACCOUNTANT User

1. **Log in as a user with ACCOUNTANT role**

2. **Verify sidebar shows new accounting page:**
   ```
   Left sidebar should show:
   📊 Reports
     ├─ Financial Overview
     ├─ Collections
     └─ Trial Balance
   📑 Accounting ← NEW!
     ├─ Chart of Accounts
     ├─ Journal Entries
     ├─ Manual GL Posting
     └─ Trial Balance
   ```

3. **Test each endpoint:**

   **✅ GET /accounting/accounts**
   ```
   Click: Accounting → Chart of Accounts
   Expected: See list of accounts ✓
   ```

   **✅ GET /accounting/journals**
   ```
   Click: Accounting → Journal Entries
   Expected: See list of journal entries ✓
   ```

   **✅ POST /accounting/journals (if you granted ACCOUNTING_JOURNAL_POST)**
   ```
   Click: Accounting → Manual GL Posting
   Expected: See form to post new entry ✓
   ```

   **✅ GET /accounting/trial-balance**
   ```
   Click: Accounting → Trial Balance
   Expected: See trial balance report ✓
   ```

4. **Test access control (log in as user WITHOUT accounting permissions):**
   ```
   If you deny ACCOUNTING_READ from another role:
   Accounting page should be hidden from sidebar ✓
   Or show 403 error when navigating directly ✓
   ```

---

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Permissions Registry page shows new "Accounting" module
- [ ] All 6 accounting operations visible in registry (5 new + 1 existing trial balance)
- [ ] Accounting operations show "PERMISSION" gate (not "ADMIN_ONLY")
- [ ] Roles & Permissions shows new permission codes: ACCOUNTING_READ, WRITE, JOURNAL_POST
- [ ] ACCOUNTANT role has all 4 accounting permissions enabled
- [ ] DEPUTY_ACCOUNTANT has same permissions (auto-synced)
- [ ] User with ACCOUNTANT role can:
  - [ ] Access `/accounting/accounts` (GET) ✓
  - [ ] Create new account (POST) ✓
  - [ ] Edit account (PUT) ✓
  - [ ] View journals (GET) ✓
  - [ ] Post manual entry (POST) ✓
  - [ ] View trial balance (GET) ✓
- [ ] User WITHOUT accounting permissions gets 403 error or hidden UI
- [ ] Audit log shows all permission changes with timestamp + admin user
- [ ] No hardcoded role references in @PreAuthorize annotations (all use hasAuthority)

---

## 🎉 You're Done!

Full accounting access is now:
- ✅ Permission-based (not hardcoded)
- ✅ Assignable to any role via UI
- ✅ Visible in Permissions Registry for auditing
- ✅ Applied to ACCOUNTANT (and auto-synced to DEPUTY_ACCOUNTANT)
- ✅ Enforced on every backend request

---

## 📸 Visual Summary

### Before
```
Backend:        Hardcoded role checks
                ❌ Not in Permission Registry
                ❌ Can't assign to other roles
                ❌ Must change code to adjust

Roles UI:       No accounting permissions visible
                ❌ Can't toggle on/off for roles

Frontend:       Some accounting hidden
                ❌ Only SYSTEM_ADMIN + TREASURER see it
```

### After
```
Backend:        Permission-based checks
                ✅ In Permission Registry
                ✅ Can assign to any role
                ✅ Can toggle on/off without code change

Roles UI:       Accounting permissions visible
                ✅ Can toggle for any role

Frontend:       Full accounting visible
                ✅ ACCOUNTANT sees it all
                ✅ Sidebar shows menu items
                ✅ Buttons appear in pages
```

---

**End of Step-by-Step Guide**  
**Questions?** Check the Audit or Quick Reference documents!

