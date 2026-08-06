# Secure SACCO — Full System Audit Report
**Date:** March 7, 2026  
**Scope:** Frontend (React/TypeScript) · Backend (Spring Boot/Java) · Config & Infrastructure  
**Status:** Pre-fix. No changes have been made — this is an observation-only report.

---

## Executive Summary

The system is architecturally sound and has a well-designed feature set. However, the audit uncovered **22 distinct issues** across 7 categories, ranging from critical bugs that break functionality outright to UX gaps and consistency issues. The most severe are the **meetings API disconnect**, the **`updateUserRoles` missing from `user-api.ts`**, and the **M-Pesa registration payment flow that never confirms success**.

---

## Issue Index

| # | Severity | Category | Title |
|---|----------|----------|-------|
| 1 | 🔴 Critical | API Disconnect | `meetings-api.ts` uses raw `axios` instead of `apiClient` — sessions/CSRF broken |
| 2 | 🔴 Critical | Missing API Method | `user-api.ts` has no `updateUserRoles()` — Role Assignment modal crashes silently |
| 3 | 🔴 Critical | Payment UX | Registration fee payment has no success confirmation or auto-refresh |
| 4 | 🟠 High | Auth Logic | `handleResend` in `LoginPage.tsx` is a fake stub — never actually calls an API |
| 5 | 🟠 High | Auth Logic | `ActivationPage` wraps activation in `GuestRoute` — logged-in staff can't open links |
| 6 | 🟠 High | Routing | `savings` route uses relative path (`savings`) but all others use absolute (`/savings`) |
| 7 | 🟠 High | Routing | `my-loans`, `my-penalties`, `my-meetings`, `my-reports`, `loans`, `meetings` are all relative paths — inconsistent, can break deep links |
| 8 | 🟠 High | RBAC | `ProtectedRoute` checks `user.permissions` for `ROLE_SYSTEM_ADMIN` but this is a role, not a permission |
| 9 | 🟠 High | RBAC | `/loans` (LoanManagementPage) has no `requiredPermissions` guard — any authenticated user can access it |
| 10 | 🟡 Medium | UX / Data | `SavingsManagementPage` — Export button is wired to nothing (no handler function) |
| 11 | 🟡 Medium | UX / Data | `LoanManagementPage` search filters on `memberId` (UUID) not `memberNumber` — searches are unintuitive |
| 12 | 🟡 Medium | UX / Data | `DashboardLayout` breadcrumb map is incomplete — `/meetings`, `/my-loans`, `/my-penalties`, `/my-reports`, `/my-meetings` all fall through to default 'Dashboard' |
| 13 | 🟡 Medium | UX / Data | `SavingsRouteWrapper` uses a fragile role check — breaks if a member also has a staff role |
| 14 | 🟡 Medium | UX / Data | `MemberDashboardPage` "After paying, refresh the page" instruction — no auto-refresh or polling after STK push |
| 15 | 🟡 Medium | UX / Data | `MpesaDepositModal` calls `onSuccess()` immediately before Safaricom confirms payment — balance won't have updated |
| 16 | 🟡 Medium | Security Config | `application.yml` `same-site: Strict` on session cookie — will block cross-site callback flows (M-Pesa OAuth) |
| 17 | 🟡 Medium | Settings | `meetings` module is not in `MODULE_LABELS` in `SaccoSettingsPage` — the module toggle can't be enabled via UI |
| 18 | 🟡 Medium | Users | `UserListPage` "Add New User" button has no `onClick` handler — it does nothing when clicked |
| 19 | 🟡 Medium | Members | `member-api.ts` `getMembers()` fetches ALL members (default `size=10`) in `SavingsManagementPage` — only 10 members will appear in the autocomplete even for large SACCOs |
| 20 | 🟢 Low | UX Polish | `RolesPermissionsPage` uses `alert()` for success/failure — inconsistent with the rest of the app's UI patterns |
| 21 | 🟢 Low | UX Polish | `UserListPage` uses `alert()` and `window.confirm()` for destructive actions — inconsistent with the rest of the app |
| 22 | 🟢 Low | Code Quality | `LoginPage.tsx` hardcodes `SACCO_NAME` and `SACCO_TAGLINE` instead of pulling from `SettingsContext` |

---

## Detailed Findings

---

### 🔴 Issue 1 — `meetings-api.ts` Uses Raw `axios` (CRITICAL)

**File:** `frontend/src/features/meetings/api/meetings-api.ts`

**What it does:**
The entire meetings API is built on a raw `axios` instance imported directly — not the shared `apiClient`.

```typescript
// BUG — raw axios, no session cookie, no CSRF token
import axios from 'axios';
const API = '/api/v1/meetings';
export const meetingsApi = {
    list: (): Promise<Meeting[]> => axios.get(API).then(r => r.data),
    ...
};
```

**Impact:**
- `withCredentials: true` is missing — the browser won't send the `SACCO_SESSION` cookie, so **every meetings API call will get a 401 Unauthorized**.
- The `X-XSRF-TOKEN` header won't be set — any `POST`/`PUT` mutations will be blocked by CSRF protection.
- This means **MeetingsManagementPage, MyMeetingsPage, and any meeting-related check-in/check-out is completely broken**.

**Fix:** Replace `axios` with the shared `apiClient` in that file.

---

### 🔴 Issue 2 — `updateUserRoles` Missing from `user-api.ts` (CRITICAL)

**File:** `frontend/src/features/users/api/user-api.ts`

**What it does:**
`UserListPage.tsx` calls `userApi.updateUserRoles(selectedUser.id, selectedRoleIds)` in `handleSaveRoles()`. This method does not exist in `user-api.ts`.

```typescript
// user-api.ts — this method is MISSING
export const userApi = {
    getAllUsers: async () => {...},
    createUser: async () => {...},
    updateUserStatus: async () => {...},
    deleteUser: async () => {...},
    // updateUserRoles is not here
};
```

**Impact:**
- TypeScript will show a compile error. At runtime, calling the non-existent method will throw, silently failing or producing an unhandled error.
- **Admins cannot reassign roles to users** — a core administrative function is broken.

**Fix:** Add `updateUserRoles` to `user-api.ts` pointing at the correct endpoint (e.g., `PUT /users/{id}/roles`).

---

### 🔴 Issue 3 — Registration Fee Payment Has No Success Confirmation (CRITICAL)

**File:** `frontend/src/features/dashboard/pages/MemberDashboardPage.tsx`

**What it does:**
The `<PaymentModal>` used for registration fee payment shows a success message but never calls `refreshUser()` or re-fetches member status. The only instruction is: *"After paying on your phone, refresh the page."*

**Impact:**
- After a member pays the registration fee and Safaricom processes it, the page still shows the "PENDING" registration screen.
- The member has no clear indication their payment was received.
- They must manually hard-refresh to see their activated account.

**Fix:** After the STK push succeeds, poll `/auth/me` (or add a `refreshUser()` call after a delay) to check if `memberStatus` flipped to `ACTIVE`.

---

### 🟠 Issue 4 — Resend Verification in `LoginPage` is a Fake Stub (HIGH)

**File:** `frontend/src/features/auth/pages/LoginPage.tsx`

**What it does:**
When a login error message contains `"verify your email"`, a "Resend Verification Link" button appears. Its handler is:

```typescript
const handleResend = async () => {
    if (!identifier) return;
    setResendStatus('Sending...');
    try {
        setTimeout(() => {
            setResendStatus('Sent! Check your inbox.'); // ← fake!
            setShowResend(false);
        }, 1000);
    } catch (err) {
        setResendStatus('Failed to send.');
    }
};
```

**Impact:**
- No API call is ever made. The user sees "Sent! Check your inbox." but nothing was actually sent.
- This is both a functional bug and a misleading UX experience.

**Fix:** Wire up a real API call, e.g., `apiClient.post('/auth/resend-verification', { email: identifier })`.

---

### 🟠 Issue 5 — `ActivationPage` Wrapped in `GuestRoute` (HIGH)

**File:** `frontend/src/App.tsx`

**What it does:**
```tsx
<Route path="/activate" element={
    <GuestRoute>
        <ActivationPage />
    </GuestRoute>
} />
```

**Impact:**
- If a staff admin creates a new user and that user clicks their activation link while the admin is still logged in (same browser), `GuestRoute` will redirect to `/dashboard` and the activation page will never render.
- Activation links sent by email to new users who were already browsing the app will silently fail.

**Fix:** Remove the `GuestRoute` wrapper from the `/activate` route. The page already handles the token from search params and doesn't require any special session state.

---

### 🟠 Issue 6 & 7 — Inconsistent Route Path Styles (HIGH)

**File:** `frontend/src/App.tsx`

**What it does:**
Several routes inside the `<DashboardLayout>` wrapper use relative paths (no leading `/`), while others use absolute paths:

```tsx
{/* Absolute paths */}
<Route path="/dashboard" ... />
<Route path="/users" ... />
<Route path="/reports/arrears" ... />

{/* Relative paths — INCONSISTENT */}
<Route path="savings" ... />
<Route path="my-loans" ... />
<Route path="my-penalties" ... />
<Route path="meetings" ... />
<Route path="loans" ... />
<Route path="my-reports" ... />
<Route path="my-meetings" ... />
```

**Impact:**
- React Router v7 treats relative paths differently from absolute paths when nested inside layouts. Depending on the base URL structure, these can resolve to unexpected URLs or break deep-linking.
- The `PAGE_LABELS` map in `DashboardLayout` uses absolute paths like `/my-loans` — so breadcrumbs for all relative-path routes will show 'Dashboard' instead of the correct label.

**Fix:** Standardize all routes to use absolute paths with a leading `/`.

---

### 🟠 Issue 8 — `ProtectedRoute` RBAC Check Conflates Roles with Permissions (HIGH)

**File:** `frontend/src/shared/components/ProtectedRoute.tsx`

**What it does:**
```typescript
// Checks user.permissions for 'ROLE_SYSTEM_ADMIN'
if (user.permissions?.includes('ROLE_SYSTEM_ADMIN')) {
    return <>{children}</>;
}
```

**Impact:**
- `ROLE_SYSTEM_ADMIN` is a **role**, not a **permission**. Roles live in `user.roles[]`; permissions live in `user.permissions[]`.
- The backend's `/auth/me` endpoint returns `permissions` as the flattened list of `GrantedAuthority` strings (e.g., `USER_READ`, `ROLE_MEMBER`). For a System Admin, `ROLE_SYSTEM_ADMIN` will be in `roles[]` but not necessarily in `permissions[]` unless it is explicitly mapped as a permission.
- This means the System Admin bypass in `ProtectedRoute` may silently fail, forcing a redirect to `/dashboard` instead of granting access.
- Note: `HasPermission.tsx` has the same pattern and is also affected.

**Fix:** Change the check to `user.roles?.includes('ROLE_SYSTEM_ADMIN')` or verify the backend includes `ROLE_SYSTEM_ADMIN` as a granted authority in the permissions list.

---

### 🟠 Issue 9 — `/loans` (LoanManagementPage) Has No RBAC Guard (HIGH)

**File:** `frontend/src/App.tsx`

**What it does:**
```tsx
<Route path="loans" element={
    <ProtectedRoute>   {/* ← No requiredPermissions! */}
        <LoanManagementPage />
    </ProtectedRoute>
} />
```

**Impact:**
- Any logged-in user — including a pure `ROLE_MEMBER` — can navigate to `/loans` and see all loan applications system-wide, including other members' loan data.
- The page's action buttons (Verify, Approve, Disburse) are wrapped in `<HasPermission>`, so a member can't act. But they can still read all data.

**Fix:** Add `requiredPermissions={['LOANS_APPROVE', 'LOANS_COMMITTEE_APPROVE', 'LOANS_DISBURSE']}` to the route's `ProtectedRoute`.

---

### 🟡 Issue 10 — Export Button in `SavingsManagementPage` Does Nothing (MEDIUM)

**File:** `frontend/src/features/savings/pages/SavingsManagementPage.tsx`

**What it does:**
```tsx
<button className="text-slate-600 hover:text-slate-800 text-sm font-medium flex items-center gap-1">
    <Download size={16} /> Export
</button>
```

There is no `onClick` handler. The button renders and is clickable, but nothing happens.

**Impact:** Staff cannot export a member's savings statement. Feature appears complete but is dead.

**Fix:** Implement a CSV export handler similar to the one in `MemberPersonalReportsPage.tsx` (`exportSavingsCSV`).

---

### 🟡 Issue 11 — Loan Search Filters on UUID Not Member Number (MEDIUM)

**File:** `frontend/src/features/loans/pages/LoanManagementPage.tsx`

**What it does:**
```typescript
const q = search.trim().toLowerCase();
rows = rows.filter(r =>
    r.memberId?.toLowerCase().includes(q) ||  // ← UUID, useless in practice
    r.productName?.toLowerCase().includes(q)
);
```

**Impact:**
- Staff searching for a member's loan by name or member number (e.g., `SAC-0000001`) will get no results.
- `memberId` is a UUID like `550e8400-e29b-41d4-a716-446655440000` — not human-readable.

**Fix:** The backend `LoanApplicationResponse` DTO should return `memberNumber` and `memberName`. If available, search on those. Otherwise, the backend DTO needs to include them.

---

### 🟡 Issue 12 — `DashboardLayout` Breadcrumb Map Incomplete (MEDIUM)

**File:** `frontend/src/shared/layouts/DashboardLayout.tsx`

**What it does:**
`PAGE_LABELS` is missing entries for several routes:

```typescript
const PAGE_LABELS: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/users': 'User Management',
    // MISSING: '/my-loans', '/my-penalties', '/my-meetings', '/my-reports'
    // MISSING: '/meetings', '/loans'
};
```

**Impact:**
- Any member navigating to `My Loans`, `My Penalties`, `My Meetings`, `My Reports` will see the breadcrumb/title display as `"Dashboard"` instead of the correct page name.
- Staff navigating to `Meetings` or `Loans` will also see `"Dashboard"`.

**Fix:** Add the missing entries to `PAGE_LABELS`.

---

### 🟡 Issue 13 — `SavingsRouteWrapper` Role Check is Fragile (MEDIUM)

**File:** `frontend/src/App.tsx`

**What it does:**
```typescript
const isOnlyMember = user?.roles?.includes('ROLE_MEMBER') &&
    !user?.roles?.some(r => r !== 'ROLE_MEMBER');
```

**Impact:**
- This logic is duplicated across two places (here and `DashboardRouter`). `DashboardRouter` uses `.every(r => r === 'ROLE_MEMBER')` which is the cleaner approach.
- The `SavingsRouteWrapper` version (`includes` + negated `some`) achieves the same result but is harder to read and more prone to logic errors during maintenance.
- If a member is granted an additional role (e.g., `ROLE_TREASURER`), they should see `SavingsManagementPage`, but only if `SAVINGS_READ` permission is present. The `HasPermission` wrapper handles this, but only after the `isOnlyMember` check fails — there is no fallback for a user who has `ROLE_MEMBER` + a staff role but lacks `SAVINGS_READ`.

**Fix:** Unify the role detection logic. Use the same pattern as `DashboardRouter`.

---

### 🟡 Issue 14 & 15 — M-Pesa Flows Resolve Too Early (MEDIUM)

**Files:**  
- `frontend/src/features/dashboard/pages/MemberDashboardPage.tsx`  
- `frontend/src/features/savings/components/MpesaDepositModal.tsx`

**What it does:**
- `MpesaDepositModal.tsx` calls `onSuccess()` (which refreshes the savings statement) immediately after the STK push initiates — before Safaricom has processed the transaction.
- `MemberDashboardPage.tsx` after registration fee STK push: shows a message and closes. Never auto-refreshes member status.

**Impact:**
- Savings balance and statement will not reflect the deposit yet (Daraja callback takes 5–30 seconds typically).
- Members see a stale balance after topping up.
- After registration fee payment, members stay stuck on the "PENDING" screen indefinitely unless they manually refresh.

**Fix:** After STK push, either poll `/auth/me` (for registration) or poll the balance endpoint with a 5-second delay. Add clear user instruction: "Refresh in ~30 seconds after entering your PIN."

---

### 🟡 Issue 16 — `same-site: Strict` Blocks M-Pesa Callback Cookies (MEDIUM)

**File:** `backend/src/main/resources/application.yml`

**What it does:**
```yaml
server:
  servlet:
    session:
      cookie:
        same-site: Strict
```

**Impact:**
- `SameSite=Strict` means the session cookie will not be sent on any cross-site request, including redirects.
- M-Pesa Daraja callbacks arrive from Safaricom's servers. While callbacks are server-to-server (so no cookie needed there), if any OAuth or webhook redirect requires the user's session to be attached (for context), this will fail.
- In production with a separate API domain (`api.securesacco.com`), if the frontend (`app.securesacco.com`) triggers an M-Pesa flow that redirects through Safaricom and back, the session cookie may not be sent on the return trip.
- The `dev` profile already overrides this to `Lax` — but production does not.

**Fix:** Change production `same-site` to `Lax` unless there is a specific threat model requiring `Strict`.

---

### 🟡 Issue 17 — `meetings` Module Not in Settings Module Toggle (MEDIUM)

**File:** `frontend/src/features/settings/pages/SaccoSettingsPage.tsx`

**What it does:**
```typescript
const MODULE_LABELS: Record<string, { label: string; desc: string }> = {
    members: { ... },
    loans:   { ... },
    savings: { ... },
    reports: { ... },
    // 'meetings' is MISSING
};
```

**Impact:**
- There is no UI toggle for the `meetings` module. An admin cannot enable or disable it from the settings page.
- The `Sidebar.tsx` checks `settings.enabledModules?.meetings` for showing/hiding meetings nav items. If this is never set to `true` in settings (because there's no toggle), the meetings nav item may not appear at all — even after meetings features are fully built.

**Fix:** Add `meetings` to `MODULE_LABELS` in `SaccoSettingsPage`.

---

### 🟡 Issue 18 — "Add New User" Button Has No `onClick` Handler (MEDIUM)

**File:** `frontend/src/features/users/pages/UserListPage.tsx`

**What it does:**
```tsx
<HasPermission permission="USER_CREATE">
    <button className="bg-slate-900 hover:bg-emerald-600 text-white ...">
        <Plus size={18} />
        Add New User
    </button>
</HasPermission>
```

No `onClick` prop is attached. `userApi.createUser()` exists in the API layer but there is no modal or form to invoke it.

**Impact:** Admins cannot create new users from the UI. The `USER_CREATE` permission is checked correctly, the button is visible to those who have it, but it does nothing.

**Fix:** Create a `CreateUserModal` (similar to `CreateMemberModal`) and wire it to the button.

---

### 🟡 Issue 19 — Member Autocomplete Only Shows 10 Results (MEDIUM)

**File:** `frontend/src/features/savings/pages/SavingsManagementPage.tsx`

**What it does:**
```typescript
const response = await memberApi.getMembers();
// getMembers() defaults: page=0, size=10
const membersArray = response.content || [];
setMembers(membersArray.filter((m: Member) => m.status === 'ACTIVE'));
```

**Impact:**
- For a SACCO with more than 10 members, the search dropdown will only ever show results from the first 10 members in the database.
- Staff trying to find member #152 by name will get no results if they aren't in the first 10.

**Fix:** Either increase the page size significantly (e.g., `size=1000`) on load, or switch to a server-side search that passes `q` to the API on each keystroke.

---

### 🟢 Issue 20 & 21 — `alert()` / `window.confirm()` Usage (LOW)

**Files:**  
- `frontend/src/features/users/pages/RolesPermissionsPage.tsx`  
- `frontend/src/features/users/pages/UserListPage.tsx`

**What it does:**
Several actions use native browser `alert()` and `window.confirm()`:
- `handleSavePermissions` → `alert("Permissions updated successfully!")`
- `handleCreateRole` → `alert(...)`
- `handleDelete` → `window.confirm("Are you sure...")`
- `handleStatusToggle` → `alert("Failed to update user status")`

**Impact:**
- Inconsistent UX. The rest of the app uses inline state banners for feedback.
- `window.confirm` blocks the JS thread and is considered poor practice in modern SPAs.
- On some mobile browsers and embedded webviews, `alert` / `confirm` may be suppressed entirely.

**Fix:** Replace with inline error/success state messages or a lightweight toast/modal pattern already used elsewhere.

---

### 🟢 Issue 22 — `LoginPage` Hardcodes SACCO Name/Tagline (LOW)

**File:** `frontend/src/features/auth/pages/LoginPage.tsx`

**What it does:**
```typescript
const SACCO_NAME = "Secure SACCO";
const SACCO_TAGLINE = "Secure, Transparent, and Automated Management.";
```

**Impact:**
- When an admin configures a custom SACCO name in Settings (e.g., "Umoja Savings & Credit"), the Login page still shows "Secure SACCO".
- This is inconsistent with the Sidebar which correctly reads `settings?.saccoName`.
- The login page is publicly visible (first impression for all users) — getting the branding wrong here matters.

**Note:** The settings endpoint is publicly accessible? It should be guarded since the Login page is pre-auth. This needs a public-facing settings endpoint or a hardcoded fallback.

**Fix:** Either expose a public `/api/v1/settings/public` endpoint returning SACCO name only, and fetch it on the login page, or accept the hardcoded fallback as intentional until post-login.

---

## Summary Table by Area

| Area | Critical | High | Medium | Low |
|------|----------|------|--------|-----|
| API Layer | 1 (meetings axios) | 1 (missing method) | 1 (member page size) | — |
| Auth & Activation | — | 2 | — | 1 |
| Routing | — | 2 | — | — |
| RBAC | — | 2 | — | — |
| Payment Flows | 1 | — | 2 | — |
| UX / Data Display | — | — | 4 | 2 |
| Config / Security | — | — | 1 | — |
| **Totals** | **2** | **7** | **8** | **3** |

---

## Recommended Fix Priority

### Phase 1 — Fix Now (Blockers)
1. **Issue 1** — Fix `meetings-api.ts` to use `apiClient`
2. **Issue 2** — Add `updateUserRoles` to `user-api.ts`
3. **Issue 9** — Add RBAC guard to `/loans` route
4. **Issue 7 & 6** — Normalize all route paths to absolute paths
5. **Issue 8** — Fix `ROLE_SYSTEM_ADMIN` check in `ProtectedRoute` and `HasPermission`

### Phase 2 — High Priority UX Fixes
6. **Issue 3** — Registration payment auto-refresh
7. **Issue 4** — Wire real resend verification API
8. **Issue 5** — Remove `GuestRoute` from activation route
9. **Issue 10** — Add Export handler to `SavingsManagementPage`
10. **Issue 18** — Add `CreateUserModal` + wire "Add New User" button

### Phase 3 — Polish & Correctness
11. **Issue 11** — Fix loan search to use member number/name
12. **Issue 12** — Complete `DashboardLayout` breadcrumb map
13. **Issue 14 & 15** — Improve M-Pesa post-payment feedback
14. **Issue 17** — Add `meetings` to settings module toggles
15. **Issue 19** — Fix member autocomplete pagination
16. **Issue 20 & 21** — Replace `alert()` / `confirm()` with UI patterns
17. **Issue 22** — Pull SACCO name from settings on login page
18. **Issue 16** — Review `same-site` cookie setting for production

---

*End of Audit Report — awaiting your decision on which fixes to proceed with.*

