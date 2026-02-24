# Dictionary Change Request (DCR) Template

Use this template to propose any change to `docs/glossary.md`.
No glossary changes are allowed without an approved DCR.

---

## DCR Metadata
- **DCR ID:** DCR-___
- **Title:** (Term — change summary)
- **Requester:** (name)
- **Date:** (YYYY-MM-DD)
- **Status:** Draft / In Review / Approved / Rejected / Implemented

---

## 1) Term(s) Affected
List the exact glossary term headings that will change.

Example:
- Member Number
- Loan Application

---

## 2) Current Definition (Copy/Paste)
Paste the exact current text from `docs/glossary.md` that will be changed.

---

## 3) Proposed Definition (Copy/Paste)
Paste the full proposed replacement text.

---

## 4) Reason for Change
Why is this needed?
- clarity
- new feature
- naming consistency
- regulatory requirement
- customer request

---

## 5) Impact Analysis
Check all that apply and describe impact.

### Backend (Spring Boot)
- [ ] API contract changes (DTO fields, request/response)
- [ ] Domain model/entity changes
- [ ] Service logic changes
- [ ] Security/authorization changes

Details:

### Database (PostgreSQL)
- [ ] New migration required
- [ ] Table/column rename
- [ ] Constraints/index changes
- [ ] Data backfill/migration needed

Details:

### Frontend (React)
- [ ] UI label changes
- [ ] API client changes
- [ ] Form field/name changes

Details:

### Reports/Exports
- [ ] Report naming/output changes
- [ ] CSV/PDF export changes

Details:

### Documentation
- [ ] Other docs reference updates

Details:

---

## 6) Backward Compatibility Plan
If anything is renamed or meaning changes:
- how old data/APIs remain supported
- deprecation plan (if needed)

---

## 7) Approval
- **Reviewed by:** ______________________
- **Decision:** Approved / Rejected
- **Decision date:** _____________________
- **Notes:** _____________________________

---

## 8) Implementation Checklist
- [ ] Update `docs/glossary.md` (reference DCR ID in commit/PR)
- [ ] Implement backend changes (if any)
- [ ] Implement database migration (if any)
- [ ] Implement frontend changes (if any)
- [ ] Update tests
- [ ] Update related docs