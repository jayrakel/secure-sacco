# Permission System Architecture & Flow Diagrams

## 🏗️ Overall System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SECURE-SACCO PERMISSION SYSTEM                         │
└──────────────────────────────────────────────────────────────────────────────┘

                              FRONTEND LAYER
┌─────────────────────────────┬─────────────────────────────┐
│   Permissions Registry UI   │  Roles & Permissions UI     │
│   (/permissions-registry)   │  (/roles-permissions)       │
│                             │                             │
│  • READ-ONLY view of all    │  • INTERACTIVE editor       │
│    system operations        │  • Assign/revoke perms      │
│  • Shows access gates       │  • Toggle switches          │
│  • Shows role coverage      │  • Search & filter          │
│  • Two views:               │  • SAVE → backend update    │
│    - Operations list        │  • Deputy auto-sync         │
│    - Matrix spreadsheet     │  • Success/error feedback   │
└─────────────────────────────┴─────────────────────────────┘
                              ↓ HTTP API Calls
                    ┌─────────────────────────┐
                    │  REST Backend (Spring)   │
                    │  (/api/v1/...)          │
                    ├─────────────────────────┤
                    │ GET /roles              │
                    │ GET /permissions        │
                    │ PUT /roles/:id/perms    │
                    │ GET /permissions (list) │
                    │ ... (all endpoints)     │
                    └─────────────────────────┘
                              ↓
                    DATABASE LAYER
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ roles table                                          │      │
│  │ ├─ id (UUID)                                         │      │
│  │ ├─ name (ACCOUNTANT, TREASURER, ...)                │      │
│  │ ├─ description                                       │      │
│  │ └─ created_at                                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                         ↕ M:M junction                         │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ role_permissions table                               │      │
│  │ ├─ role_id (FK → roles)                              │      │
│  │ ├─ permission_id (FK → permissions)                  │      │
│  │ └─ created_at                                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                         ↕ 1:M                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ permissions table                                    │      │
│  │ ├─ id (UUID)                                         │      │
│  │ ├─ code (ACCOUNTING_READ, ...)                       │      │
│  │ ├─ description                                       │      │
│  │ └─ created_at                                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ audit_log table                                      │      │
│  │ ├─ id, action, affected_entity, admin_user_id       │      │
│  │ ├─ old_value, new_value, timestamp                  │      │
│  │ └─ [Logs all permission changes]                     │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└────────────────────────────────────────────────────────────────┘

                    SECURITY ENFORCEMENT LAYER
┌─────────────────────────────────────────────────────────────────────┐
│  For each user request → controller method:                         │
│                                                                     │
│  1. Extract user from JWT token → look up roles                    │
│  2. Read @PreAuthorize("hasAuthority('PERMISSION_CODE')")          │
│  3. Query: Does user's role have this permission?                  │
│  4. If YES → allow, continue to business logic                     │
│     If NO  → return 403 Forbidden                                  │
│                                                                     │
│  Typical path:                                                     │
│  GET /api/v1/accounting/trial-balance                             │
│    @PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")              │
│      → Check: Does user.roles have GL_TRIAL_BALANCE perm?         │
│      → If yes: return trial balance data                          │
│      → If no: return 403 error                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Permission Assignment Flow

```
ADMIN USER ON ROLES & PERMISSIONS UI
│
├─ Select role: [ACCOUNTANT]
│  └─ Frontend fetches:
│     └─ GET /api/v1/roles → all roles
│     └─ GET /api/v1/permissions → all permissions
│
├─ Toggle permissions ON/OFF
│  ├─ ACCOUNTING_READ:        OFF → ON   ✓
│  ├─ ACCOUNTING_WRITE:       OFF → ON   ✓
│  ├─ ACCOUNTING_JOURNAL_POST: OFF → ON   ✓
│  └─ GL_TRIAL_BALANCE:       OFF → (unchanged) ✓
│
├─ Click SAVE button
│  └─ Frontend POST:
│     └─ PUT /api/v1/roles/{ACCOUNTANT_ID}/permissions
│        Body: { permissionIds: ["uuid1", "uuid2", "uuid3", "uuid4"] }
│
├─ Backend processes:
│  ├─ Validate user has ROLE_UPDATE permission ✓
│  ├─ Clear old role_permissions records for this role
│  ├─ Insert new role_permissions records (4 rows)
│  ├─ Write to audit_log: "ACCOUNTANT permissions updated by admin@..."
│  └─ Return 200 OK with updated role
│
├─ Frontend receives response:
│  ├─ Show success toast: "ACCOUNTANT permissions updated"
│  ├─ Check: Is this a principal role? (Yes → ACCOUNTANT is principal)
│  ├─ Auto-sync: PUT /api/v1/roles/{DEPUTY_ACCOUNTANT_ID}/permissions
│  │  └─ Same permissionIds array
│  ├─ Deputy role updated silently
│  └─ Show: "...and Deputy Accountant synced"
│
└─ Users with ACCOUNTANT role:
   ├─ On next page refresh/login:
   │  ├─ New accounting menu items appear in sidebar ✓
   │  ├─ Accounting buttons enabled in pages ✓
   │  └─ All endpoints now return data instead of 403 ✓
   └─ DEPUTY_ACCOUNTANT users also see same changes ✓
```

---

## 🔐 Request Authorization Flow

```
USER LOGS IN
│
├─ Backend issues JWT token with:
│  ├─ userId: "uuid-123"
│  ├─ username: "alice"
│  ├─ roles: ["ACCOUNTANT", "MEMBER"]
│  └─ permissions: ["ACCOUNTING_READ", "ACCOUNTING_WRITE", 
│                    "ACCOUNTING_JOURNAL_POST", "GL_TRIAL_BALANCE",
│                    "MEMBERS_READ", "MEMBERS_WRITE", ...]
│
├─ User navigates to /accounting/accounts
│  └─ Frontend requests: GET /api/v1/accounting/accounts
│     Headers: Authorization: Bearer <JWT_TOKEN>
│
├─ Backend receives request:
│  ├─ Extract token from header
│  ├─ Validate JWT signature ✓
│  ├─ Check expiration ✓
│  ├─ Create Authentication object with user details
│  └─ Pass to Spring Security filter chain
│
├─ Spring Security reads @PreAuthorize annotation:
│  ├─ @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
│  ├─ Check: 'ACCOUNTING_READ' in user.permissions?
│  │
│  ├─ Case 1: ✅ YES
│  │  ├─ Grant access
│  │  ├─ Execute controller method
│  │  └─ Return 200 with data
│  │
│  └─ Case 2: ❌ NO
│     ├─ Deny access
│     ├─ Spring Security throws AccessDeniedException
│     └─ Return 403 Forbidden
│
└─ Browser receives response
   ├─ If 200: Display data
   ├─ If 403: Show error page or hide UI control
   └─ If 401: Redirect to login
```

---

## 🗂️ Permission Gate Types Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    GATE TYPE COMPARISON                                 │
├──────────────────────┬──────────────────────────────────────────────────┤
│ Gate Type            │ Code in @PreAuthorize                             │
├──────────────────────┼──────────────────────────────────────────────────┤
│ SYSTEM_ADMIN         │ @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')") │
│                      │                                                   │
│ Characteristics:     │ • Only SYSTEM_ADMIN role can access              │
│ • Hardcoded          │ • Cannot be granted to other roles               │
│ • Not toggleable     │ • Code change + redeploy required to change      │
│ • Rare/privileged    │ • Usually for database init, system migration    │
│                      │                                                   │
│ Who can change it?   │ → DEVELOPER only (code change needed)            │
├──────────────────────┼──────────────────────────────────────────────────┤
│ PERMISSION           │ @PreAuthorize("hasAuthority('ACCOUNTING_READ')")  │
│                      │                                                   │
│ Characteristics:     │ • Any role with this permission can access       │
│ • Dynamic            │ • Can be granted/revoked without code change     │
│ • Toggleable         │ • Appears in Roles & Permissions UI              │
│ • Common             │ • Used for 95% of operations                     │
│                      │                                                   │
│ Who can change it?   │ → ADMIN via Roles & Permissions UI               │
├──────────────────────┼──────────────────────────────────────────────────┤
│ AUTHENTICATED        │ @PreAuthorize("isAuthenticated()")                │
│                      │                                                   │
│ Characteristics:     │ • Any logged-in user can access                  │
│ • Open to all users  │ • Not shown in Roles & Permissions UI            │
│ • Not toggleable     │ • No permission code                             │
│ • Rare               │ • Usually for public-ish endpoints               │
│                      │                                                   │
│ Who can change it?   │ → DEVELOPER only (code change needed)            │
├──────────────────────┼──────────────────────────────────────────────────┤
│ MEMBER_ONLY          │ @PreAuthorize("hasRole('ROLE_MEMBER')")          │
│                      │                                                   │
│ Characteristics:     │ • Only users with MEMBER role                    │
│ • Hardcoded role     │ • Self-service: members access own data          │
│ • Not toggleable     │ • Cannot be granted to staff roles               │
│ • Common             │ • Usually for member self-service features       │
│                      │                                                   │
│ Who can change it?   │ → DEVELOPER only (code change needed)            │
├──────────────────────┼──────────────────────────────────────────────────┤
│ PUBLIC               │ (no @PreAuthorize, or permitAll())                │
│                      │                                                   │
│ Characteristics:     │ • No authentication required                     │
│ • Open to anyone     │ • Not shown in Roles & Permissions UI            │
│ • Not toggleable     │ • Usually for login, forgot password, etc        │
│ • Rare               │                                                   │
│                      │                                                   │
│ Who can change it?   │ → DEVELOPER only (code change needed)            │
└──────────────────────┴──────────────────────────────────────────────────┘
```

---

## 📊 Accounting Endpoints: Before vs After

### BEFORE (Current State - Hardcoded)

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND ANNOTATIONS (Hardcoded role checks)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GET  /api/v1/accounting/accounts                               │
│      @PreAuthorize("isAuthenticated()")  ← Open to all users   │
│                                                                 │
│ POST /api/v1/accounting/accounts                               │
│      @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")        │
│                                                                 │
│ PUT  /api/v1/accounting/accounts/:id                           │
│      @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")        │
│                                                                 │
│ GET  /api/v1/accounting/journals                               │
│      @PreAuthorize("hasAnyAuthority('ROLE_SYSTEM_ADMIN',       │
│                                     'ROLE_TREASURER')")        │
│                                                                 │
│ POST /api/v1/accounting/journals                               │
│      @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMIN')")        │
│                                                                 │
│ GET  /api/v1/accounting/trial-balance                          │
│      @PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")  ✓      │
│      ↑ Only this one is permission-gated!                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PERMISSIONS REGISTRY UI                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Only shows:                                                    │
│  • Trial Balance (Reports module)  ← GL_TRIAL_BALANCE          │
│                                                                 │
│ Missing from UI:                                               │
│  • Chart of Accounts                                           │
│  • Create/Update Account                                       │
│  • Journal Entries                                             │
│  • Post Manual Entry                                           │
│                                                                 │
│ Reason: These use hardcoded role checks, not permissions       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ROLES & PERMISSIONS UI                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Visible permissions:                                           │
│  • GL_TRIAL_BALANCE  ✓  (can toggle on/off)                    │
│                                                                 │
│ Not visible:                                                   │
│  • ACCOUNTING_READ  (doesn't exist)                            │
│  • ACCOUNTING_WRITE  (doesn't exist)                           │
│  • ACCOUNTING_JOURNAL_POST  (doesn't exist)                    │
│                                                                 │
│ Problem:                                                       │
│  • Admin can't grant accounting access to ACCOUNTANT role      │
│  • Must hardcode roles in Java, redeploy to change             │
│  • Only SYSTEM_ADMIN + TREASURER hardcoded for journals        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

RESULT: ❌ Accounting access is inflexible and hard to audit
```

### AFTER (Desired State - Permission-Based)

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND ANNOTATIONS (Permission codes)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GET  /api/v1/accounting/accounts                               │
│      @PreAuthorize("hasAuthority('ACCOUNTING_READ')")  ✓       │
│                                                                 │
│ POST /api/v1/accounting/accounts                               │
│      @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")  ✓      │
│                                                                 │
│ PUT  /api/v1/accounting/accounts/:id                           │
│      @PreAuthorize("hasAuthority('ACCOUNTING_WRITE')")  ✓      │
│                                                                 │
│ GET  /api/v1/accounting/journals                               │
│      @PreAuthorize("hasAuthority('ACCOUNTING_READ')")  ✓       │
│                                                                 │
│ POST /api/v1/accounting/journals                               │
│      @PreAuthorize("hasAuthority('ACCOUNTING_JOURNAL_POST')")✓ │
│                                                                 │
│ GET  /api/v1/accounting/trial-balance                          │
│      @PreAuthorize("hasAuthority('GL_TRIAL_BALANCE')")  ✓      │
│                                                                 │
│ All endpoints now permission-based! (no hardcoded roles)       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PERMISSIONS REGISTRY UI                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Accounting (6 ops) ▼                                           │
│  ├─ GET  Chart of Accounts        [ACCOUNTING_READ]            │
│  ├─ POST Create GL Account        [ACCOUNTING_WRITE]           │
│  ├─ PUT  Edit GL Account          [ACCOUNTING_WRITE]           │
│  ├─ GET  View Journal Entries      [ACCOUNTING_READ]           │
│  ├─ POST Post Manual Entry         [ACCOUNTING_JOURNAL_POST]   │
│  └─ GET  Trial Balance             [GL_TRIAL_BALANCE]          │
│                                                                 │
│ ✓ All 6 operations visible                                     │
│ ✓ Can search and filter                                        │
│ ✓ Can see which roles have each permission                     │
│ ✓ Matrix view shows role → permission assignments             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ROLES & PERMISSIONS UI                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Accounting Permissions (all toggleable):                        │
│                                                                 │
│  ☑ ACCOUNTING_READ                                             │
│    View GL accounts and journal entries                        │
│    ▶ Accounting page in sidebar                               │
│                                                                 │
│  ☑ ACCOUNTING_WRITE                                            │
│    Create and edit GL accounts                                │
│    ▶ Create/Edit buttons in Accounting page                   │
│                                                                 │
│  ☑ ACCOUNTING_JOURNAL_POST                                     │
│    Post manual journal entries to GL                          │
│    ▶ Post Entry button in Accounting page                     │
│                                                                 │
│  ☑ GL_TRIAL_BALANCE                                            │
│    View trial balance as of a date                            │
│    ▶ Trial Balance tab in Accounting page                     │
│                                                                 │
│ ✓ Admin can grant any permission to any role                   │
│ ✓ Changes take effect on next user login/refresh               │
│ ✓ No code redeploy needed for permission changes               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

RESULT: ✅ Accounting access is flexible, auditable, and admin-managed
```

---

## 📈 Permission Workflow Timeline

```
Monday 9:00 AM
├─ Admin logs into system
├─ Goes to: Roles & Permissions
├─ Selects: ACCOUNTANT role
├─ Toggles ON: ACCOUNTING_READ, WRITE, JOURNAL_POST
├─ Clicks: [Save]
│  └─ API Call: PUT /api/v1/roles/{ACCOUNTANT_ID}/permissions
│     Backend:
│     ├─ Updates role_permissions table
│     ├─ Writes to audit_log
│     ├─ Auto-syncs DEPUTY_ACCOUNTANT
│     └─ Returns 200 OK
└─ Success toast: "ACCOUNTANT permissions updated"

Monday 9:01 AM
├─ Alice (ACCOUNTANT user) is still logged in
├─ Her JWT token still has old permission list
├─ Accounting page still hidden in sidebar
└─ (She needs to refresh or log back in)

Monday 9:05 AM
├─ Alice refreshes browser (Ctrl+R)
├─ Frontend reloads, refetches user profile
├─ Backend checks role_permissions table again
├─ Alice's JWT is reissued with NEW permissions
├─ Including: ACCOUNTING_READ, WRITE, JOURNAL_POST
└─ Sidebar now shows Accounting page ✓

Monday 9:06 AM
├─ Alice clicks: Sidebar → Accounting → Chart of Accounts
├─ Frontend requests: GET /api/v1/accounting/accounts
├─ Backend checks JWT: ✓ has ACCOUNTING_READ permission
├─ Execute controller logic
├─ Return account list
└─ Alice sees: Chart of Accounts table ✓

Monday 9:10 AM
├─ Admin checks: Audit Log
├─ Sees: "Role ACCOUNTANT permissions updated by admin@..."
│        Timestamp: 2026-04-09 09:00:15
│        Changed by: System Admin
│        Permissions added: ACCOUNTING_READ, ACCOUNTING_WRITE, ACCOUNTING_JOURNAL_POST
└─ Audit trail complete ✓

Monday 3:00 PM
├─ New accounting regulations arrive
├─ Admin decides: ACCOUNTANT should NOT be able to DELETE accounts
├─ But currently ACCOUNTING_WRITE includes delete permission
├─ Admin options:
│  A. Remove ACCOUNTING_WRITE entirely (blocks create + edit + delete)
│  B. Request developer to split into finer permissions:
│     └─ ACCOUNTING_CREATE, ACCOUNTING_EDIT, ACCOUNTING_DELETE
│     └─ This requires code changes + redeploy
└─ Business decision made
```

---

## 🔗 Data Flow: From Permission Toggle to Request

```
USER CLICKS TOGGLE IN ROLES UI
│
├─ Frontend state update
│  └─ editedIds.add(permissionId)
│
├─ User clicks [Save]
│  └─ prepareRequestPayload():
│     ├─ Collect all permission IDs from editedIds
│     └─ Build request body: { permissionIds: ["uuid1", "uuid2", ...] }
│
├─ Network request
│  └─ PUT /api/v1/roles/{roleId}/permissions
│     Headers:
│       Authorization: Bearer eyJhbGc... (JWT)
│       Content-Type: application/json
│     Body: { permissionIds: [...] }
│
├─ Backend: RoleController.updateRolePermissions()
│  ├─ @PreAuthorize("hasAuthority('ROLE_UPDATE')")
│  ├─ Validate: User has ROLE_UPDATE permission ✓
│  ├─ Validate: Requested role exists ✓
│  ├─ Validate: All permission IDs exist ✓
│  │
│  ├─ RoleService.updateRolePermissions()
│     ├─ Delete: role_permissions WHERE role_id = {roleId}
│     ├─ For each permissionId:
│     │  └─ Insert: role_permissions (role_id, permission_id)
│     │
│     ├─ Write to audit_log:
│     │  ├─ action: "ROLE_PERMISSIONS_UPDATED"
│     │  ├─ affected_entity: Role ACCOUNTANT
│     │  ├─ performed_by: User admin@...
│     │  ├─ old_value: [previously assigned perms]
│     │  ├─ new_value: [newly assigned perms]
│     │  ├─ timestamp: NOW()
│     │  └─ Inserted into audit_log table
│     │
│     └─ Return: Updated Role object with new permissions
│
├─ Backend: Return 200 OK
│  └─ Response body: Updated role with full permission list
│
├─ Frontend: onSuccess callback
│  ├─ Update local state: setRoles([...])
│  ├─ Show success toast: "ACCOUNTANT permissions updated"
│  ├─ Clear unsaved changes flag
│  └─ If deputy exists: Auto-sync (repeat PUT for deputy role)
│
└─ END OF PERMISSION ASSIGNMENT
   
   NOW WHEN USER WITH THIS ROLE LOGS IN:
   │
   ├─ Login endpoint hits AuthService.authenticate()
   │  └─ Lookup user → lookup user roles → lookup role permissions
   │     SELECT permissions WHERE role_id IN (SELECT role_id FROM user_roles WHERE user_id = ?)
   │
   ├─ Build JWT token with permissions array
   │  └─ JWT payload:
   │     {
   │       "userId": "user-uuid",
   │       "username": "alice",
   │       "roles": ["ACCOUNTANT", "MEMBER"],
   │       "permissions": [
   │         "ACCOUNTING_READ",
   │         "ACCOUNTING_WRITE",
   │         "ACCOUNTING_JOURNAL_POST",
   │         "GL_TRIAL_BALANCE",
   │         ... (other role permissions)
   │       ],
   │       "iat": 1712673615,
   │       "exp": 1712677215
   │     }
   │
   ├─ Return JWT to frontend
   │  └─ Frontend stores in localStorage / sessionStorage
   │
   ├─ Frontend stores in Authorization header for all requests
   │  └─ Future requests:
   │     Authorization: Bearer eyJhbGc...
   │
   └─ Backend validates token on each request
      ├─ Extract permissions from token
      ├─ Check @PreAuthorize("hasAuthority('ACCOUNTING_READ')")
      ├─ If user.permissions contains 'ACCOUNTING_READ' → Allow ✓
      └─ If not → Return 403 Forbidden ✗
```

---

## 📱 UI Component Hierarchy

```
ROLES & PERMISSIONS PAGE
│
├─ Header
│  ├─ Title: "Roles & Permissions"
│  └─ Help text: "Grant/revoke permissions per role..."
│
├─ Two-Column Layout
│  │
│  ├─ LEFT: Role Selector Panel
│  │  ├─ Title: "System Roles"
│  │  ├─ Role List:
│  │  │  ├─ CHAIRPERSON (description) [42 perms]
│  │  │  ├─ TREASURER (description) [48 perms]
│  │  │  ├─ ACCOUNTANT [42 perms] ← SELECTED
│  │  │  ├─ CASHIER (description) [38 perms]
│  │  │  └─ ...
│  │  │
│  │  └─ ℹ️ Roles with 🔄 icon have auto-syncing deputies
│  │
│  └─ RIGHT: Permission Editor Panel
│     ├─ Panel Header:
│     │  ├─ Title: "ACCOUNTANT"
│     │  ├─ Status badge: "42 permissions active"
│     │  ├─ Notice: "🔄 Saving auto-syncs Deputy Accountant"
│     │  ├─ Search box: [🔍 Search permissions...]
│     │  └─ [Save] button
│     │
│     ├─ Permission Groups (tabbed/scrollable):
│     │  ├─ Members (3/6 active)
│     │  │  ├─ [🎚 OFF] MEMBERS_READ
│     │  │  │          View member list
│     │  │  │          ▶ Members page in sidebar
│     │  │  │
│     │  │  ├─ [🎚 ON] MEMBERS_WRITE
│     │  │  │         Create/edit members
│     │  │  │         ▶ Members → Create/Edit buttons
│     │  │  │
│     │  │  └─ [🎚 ON] MEMBER_STATUS_CHANGE
│     │  │         Change member status
│     │  │         ▶ Members → suspend/activate
│     │  │
│     │  ├─ Accounting (4/4 active)
│     │  │  ├─ [🎚 ON] ACCOUNTING_READ
│     │  │  ├─ [🎚 ON] ACCOUNTING_WRITE
│     │  │  ├─ [🎚 ON] ACCOUNTING_JOURNAL_POST
│     │  │  └─ [🎚 ON] GL_TRIAL_BALANCE
│     │  │
│     │  ├─ Loans (2/4 active)
│     │  │  └─ ...
│     │  │
│     │  └─ ... (more groups)
│     │
│     └─ Info Box:
│        └─ 💡 "Permissions take effect on next login/refresh"
│
└─ Success Toast (temporary)
   └─ "✅ ACCOUNTANT permissions updated & Deputy Accountant synced"
```

---

**End of Architecture & Flow Diagrams**

