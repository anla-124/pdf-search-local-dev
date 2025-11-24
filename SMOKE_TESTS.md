# PDF SEARCHER - SMOKE TEST SUITE

**Version:** 1.0
**Date:** November 24, 2025
**Execution Time:** ~15 minutes
**Purpose:** Quick validation after each deployment

---

## OVERVIEW

Smoke tests are a subset of critical test cases that verify core functionality is working. These tests should be run:
- After every deployment
- Before starting full regression testing
- As a sanity check

**Pass Criteria:** ALL smoke tests must pass (100%) before proceeding.

---

## SMOKE TEST CASES

### 1. Authentication (3 minutes)

**ST-001: User Can Log In**
- Navigate to login page
- Click "Sign in with Google"
- Complete authentication
- ✅ PASS: User redirected to dashboard

**ST-002: Session Persists**
- After login, refresh page
- ✅ PASS: User remains logged in

**ST-003: User Can Log Out**
- Click logout button
- ✅ PASS: User logged out, redirected to login

---

### 2. Document Upload & Processing (5 minutes)

**ST-004: Upload Single Document**
- Upload 5-page test PDF
- ✅ PASS: File uploads, document appears in list with "queued" status

**ST-005: Document Processing Completes**
- Wait for processing to complete
- ✅ PASS: Status changes to "completed", page count displayed

**ST-006: View Document in List**
- Check document list
- ✅ PASS: Uploaded document visible, metadata correct

---

### 3. Similarity Search (4 minutes)

**ST-007: Search Returns Results**
- Select completed document
- Click "Find Similar Documents"
- ✅ PASS: Search completes <10s, results displayed

**ST-008: Search Results Display Correctly**
- Verify results table shows:
  - Document titles
  - Scores (source, target)
  - Page ranges
- ✅ PASS: All data displayed correctly

---

### 4. Document Management (2 minutes)

**ST-009: Download Document**
- Click "Download" on document
- ✅ PASS: PDF downloads successfully

**ST-010: Delete Document**
- Click "Delete" on test document
- Confirm deletion
- ✅ PASS: Document removed from list

---

### 5. Health Checks (1 minute)

**ST-011: API Health Endpoint**
- Call `GET /api/health`
- ✅ PASS: Returns 200 OK

**ST-012: Database Connectivity**
- Call `GET /api/health/pool`
- ✅ PASS: Returns connection pool metrics

---

### 6. RLS Security Check (30 seconds)

**ST-013: User Isolation**
- User A uploads document
- User B logs in
- ✅ PASS: User B cannot see User A's document

---

## SMOKE TEST CHECKLIST

Use this checklist for quick validation:

- [ ] **ST-001:** User can log in
- [ ] **ST-002:** Session persists across page refresh
- [ ] **ST-003:** User can log out
- [ ] **ST-004:** Single document upload succeeds
- [ ] **ST-005:** Document processing completes
- [ ] **ST-006:** Document visible in list
- [ ] **ST-007:** Similarity search returns results
- [ ] **ST-008:** Search results display correctly
- [ ] **ST-009:** Document download works
- [ ] **ST-010:** Document deletion works
- [ ] **ST-011:** Health endpoint responds
- [ ] **ST-012:** Database connectivity confirmed
- [ ] **ST-013:** RLS enforced (user isolation)

---

## EXECUTION INSTRUCTIONS

### Prerequisites:
- Test environment URL
- 2 test user accounts (User A, User B)
- 1 sample PDF (5-10 pages)

### Steps:
1. Run smoke tests in order
2. Mark pass/fail for each
3. If ANY test fails:
   - **STOP** - Do not proceed
   - Log defect
   - Fix issue
   - Re-run ALL smoke tests
4. If all pass:
   - **PROCEED** with full testing or deployment

---

## AUTOMATED SMOKE TEST SCRIPT

```typescript
// Example Playwright smoke test
import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('ST-001: User can log in', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign in with Google');
    // ... auth flow
    await expect(page).toHaveURL('/dashboard');
  });

  test('ST-004: Upload document', async ({ page }) => {
    await page.setInputFiles('input[type="file"]', 'test.pdf');
    await expect(page.locator('text=queued')).toBeVisible();
  });

  // ... more tests
});
```

---

*END OF SMOKE TESTS*
