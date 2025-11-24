# PDF SEARCHER - TEST DATA SPECIFICATION

**Version:** 1.0
**Date:** November 24, 2025

---

## 1. TEST DOCUMENT LIBRARY

### 1.1 Document Size Categories

| Category | Pages | File Size | Quantity Needed | Purpose |
|----------|-------|-----------|-----------------|---------|
| **Tiny** | 1-2 | 50-500 KB | 5 | Quick processing tests, smoke tests |
| **Small** | 3-10 | 500 KB - 2 MB | 10 | Standard workflow testing |
| **Medium** | 11-50 | 2-5 MB | 10 | Typical user documents |
| **Large** | 51-100 | 5-10 MB | 5 | Chunked processing tests |
| **Very Large** | 101-200 | 10-25 MB | 3 | Performance tests, stress tests |
| **Extreme** | 201-500 | 25-50 MB | 2 | Edge case testing |

**Total:** 35 base documents

### 1.2 Document Content Types

| Type | Description | Quantity | Use Case |
|------|-------------|----------|----------|
| **Legal Contracts** | Partnership agreements, NDAs | 5 | Similarity search validation |
| **Financial Reports** | Quarterly reports, fund statements | 5 | Metadata filtering tests |
| **Technical Manuals** | User guides, specifications | 5 | Complex layout tests |
| **Research Papers** | Academic papers, whitepapers | 5 | OCR accuracy tests |
| **Mixed Content** | Text + images + tables | 5 | Document AI integration |

### 1.3 Document Formats

| Format | Quantity | Purpose |
|--------|----------|---------|
| **Scanned PDFs** (image-based) | 10 | OCR accuracy testing |
| **Native PDFs** (text layer) | 20 | Fast processing baseline |
| **Mixed PDFs** (text + images) | 10 | Real-world scenarios |
| **Complex Layouts** (tables, columns, charts) | 5 | Layout handling |

### 1.4 Special Test Cases

| Test Case | File Description | Purpose |
|-----------|------------------|---------|
| **Encrypted PDF** | Password-protected document | Error handling |
| **Corrupted PDF** | Malformed file structure | Graceful failure |
| **Empty PDF** | 0-byte file | Validation testing |
| **Maximum Size** | 49.5 MB PDF (at limit) | Boundary testing |
| **Oversized** | 51 MB PDF (exceeds limit) | Rejection testing |
| **Special Characters** | Filename: `Test #1 (Final).pdf` | Filename handling |
| **Very Long Filename** | 260 characters | Truncation testing |
| **Unicode Filename** | `文档.pdf` | International support |
| **Non-English Content** | Spanish, French, Chinese | Multilingual testing |

---

## 2. SIMILARITY SEARCH TEST SETS

### 2.1 Known Similar Document Pairs

**Set A: High Similarity (>90%)**
- Document A1: "Partnership Agreement Template v1.0"
- Document A2: "Partnership Agreement Template v1.1" (minor edits)
- **Purpose:** Validate high similarity detection

**Set B: Medium Similarity (60-80%)**
- Document B1: "NDA Standard Form"
- Document B2: "NDA Mutual Agreement" (different structure, similar content)
- **Purpose:** Test scoring accuracy in mid-range

**Set C: Low Similarity (30-50%)**
- Document C1: "Q1 Financial Report 2024"
- Document C2: "Q2 Financial Report 2024" (same format, different data)
- **Purpose:** Validate low but relevant similarity

**Set D: No Similarity (<10%)**
- Document D1: "Legal Contract"
- Document D2: "Technical Manual"
- **Purpose:** Ensure dissimilar documents score low

**Set E: Partial Similarity**
- Document E1: "Complete Report (100 pages)"
- Document E2: "Executive Summary (10 pages)" (extracted from E1)
- **Purpose:** Test length ratio and partial matching

---

## 3. USER ACCOUNT TEST DATA

### 3.1 Test User Accounts

| User ID | Role | Email | Password | Document Count | Purpose |
|---------|------|-------|----------|----------------|---------|
| **user-test-01** | user | test1@example.com | TestPass123! | 0 | Empty state testing |
| **user-test-02** | user | test2@example.com | TestPass123! | 5 | Light user |
| **user-test-03** | user | test3@example.com | TestPass123! | 25 | Standard user |
| **user-test-04** | user | test4@example.com | TestPass123! | 100 | Heavy user |
| **user-test-05** | user | test5@example.com | TestPass123! | 10 | RLS testing (User A) |
| **user-test-06** | user | test6@example.com | TestPass123! | 10 | RLS testing (User B) |
| **admin-test-01** | admin | admin@example.com | AdminPass123! | 0 | Admin features (if applicable) |

### 3.2 Google OAuth Test Accounts

- **OAuth Test 1:** Use personal Google account for OAuth flow testing
- **OAuth Test 2:** Secondary Google account for concurrent session testing

---

## 4. METADATA TEST DATA

### 4.1 Law Firm Values
- Smith & Associates
- Johnson Legal Group
- Davis Law Partners
- (empty/null)
- Special Characters: "O'Brien & Co."
- Very Long: "International Corporate Business Law Firm of New York and Associates LLP"

### 4.2 Fund Manager Values
- ABC Capital Management
- XYZ Investment Partners
- Global Equity Fund
- (empty/null)
- Special: "Fund Manager #123"

### 4.3 Fund Admin Values
- Alpha Fund Services
- Beta Administration Co.
- (empty/null)

### 4.4 Jurisdiction Values
- Delaware
- New York
- California
- Cayman Islands
- (empty/null)
- Non-standard: "Multi-Jurisdiction (DE, NY, CA)"

### 4.5 Metadata Combinations

| Test Case | Law Firm | Fund Manager | Fund Admin | Jurisdiction | Purpose |
|-----------|----------|--------------|------------|--------------|---------|
| **All Populated** | Smith & Associates | ABC Capital | Alpha Services | Delaware | Full metadata |
| **Partial 1** | Johnson Legal | (null) | (null) | (null) | Single field |
| **Partial 2** | Davis Law | XYZ Equity | (null) | New York | Two fields |
| **All Empty** | (null) | (null) | (null) | (null) | No metadata |
| **Special Chars** | O'Brien & Co. | Fund #123 | (null) | CA | Special handling |

---

## 5. SIMILARITY SEARCH PARAMETERS

### 5.1 Parameter Combinations

| Test Set | stage0_topK | stage1_topK | stage1_enabled | source_min_score | target_min_score | Purpose |
|----------|-------------|-------------|----------------|------------------|------------------|---------|
| **Default** | 600 | 250 | true | 0.7 | 0.7 | Baseline |
| **Small Set** | 100 | 250 | auto-skip | 0.7 | 0.7 | Auto-skip test |
| **Large Set** | 1000 | 500 | true | 0.7 | 0.7 | Large candidate set |
| **High Threshold** | 600 | 250 | true | 0.9 | 0.9 | Strict matching |
| **Low Threshold** | 600 | 250 | true | 0.3 | 0.3 | Broad matching |

### 5.2 Page Range Filters

| Test Case | Start Page | End Page | Purpose |
|-----------|------------|----------|---------|
| **Full Document** | (null) | (null) | Default behavior |
| **First 10 Pages** | 1 | 10 | Partial doc search |
| **Middle Section** | 20 | 30 | Mid-document |
| **Last Page Only** | 50 | 50 | Single page |
| **Invalid Range** | 30 | 20 | Error handling |

---

## 6. LOAD TESTING DATA

### 6.1 Concurrent User Scenarios

| Scenario | Users | Documents Each | Total Docs | Duration | Purpose |
|----------|-------|----------------|------------|----------|---------|
| **Light Load** | 10 | 1-2 | 15 | 10 min | Baseline |
| **Medium Load** | 50 | 1-3 | 100 | 20 min | Standard load |
| **Heavy Load** | 100 | 1-2 | 150 | 30 min | Stress test |
| **Burst** | 20 | 5 (simultaneous) | 100 | 5 min | Burst handling |

### 6.2 Mixed Operations Profile

For load testing, simulate realistic user behavior:
- 40% uploads
- 30% searches
- 20% view/list operations
- 10% delete/edit operations

---

## 7. EDGE CASES & ERROR CONDITIONS

### 7.1 Boundary Values

| Test Case | Value | Expected Result |
|-----------|-------|-----------------|
| Min file size | 1 KB | Success |
| Max file size | 49.9 MB | Success |
| Over max size | 50.1 MB | Rejected |
| Zero file size | 0 bytes | Rejected |
| Single page | 1 page | Success |
| Max tested pages | 500 pages | Success |

### 7.2 Invalid Inputs

| Input Type | Invalid Value | Expected Behavior |
|------------|---------------|-------------------|
| Filename | `../../../etc/passwd.pdf` | Path traversal blocked |
| Title | `<script>alert('XSS')</script>` | Script escaped |
| Metadata | SQL injection string | Sanitized |
| Search query | Empty string | Validation error |
| Page range | start > end | Validation error |

---

## 8. DATA PREPARATION CHECKLIST

### Before Testing Begins:

- [ ] Create all 35 base test documents
- [ ] Upload documents to test environment
- [ ] Create 7 test user accounts
- [ ] Populate user-test-04 with 100 documents
- [ ] Set up similarity test document pairs (A1-A2, B1-B2, etc.)
- [ ] Prepare metadata variations
- [ ] Verify special test cases (encrypted, corrupted PDFs)
- [ ] Generate load testing scripts with mixed operations
- [ ] Document all test data locations
- [ ] Create data cleanup scripts (for resetting test environment)

---

## 9. DATA STORAGE & ORGANIZATION

### Test Data Repository Structure:

```
test-data/
├── documents/
│   ├── tiny/        (1-2 pages)
│   ├── small/       (3-10 pages)
│   ├── medium/      (11-50 pages)
│   ├── large/       (51-100 pages)
│   ├── very-large/  (101-200 pages)
│   ├── extreme/     (201-500 pages)
│   └── special/     (encrypted, corrupted, etc.)
├── similarity-pairs/
│   ├── set-a/       (high similarity)
│   ├── set-b/       (medium similarity)
│   ├── set-c/       (low similarity)
│   ├── set-d/       (no similarity)
│   └── set-e/       (partial similarity)
└── load-testing/
    └── scripts/     (k6, Artillery scripts)
```

---

## 10. DATA SECURITY & CLEANUP

### Security Considerations:
- [ ] Use synthetic/dummy data only (no real user data)
- [ ] No confidential or sensitive content in test documents
- [ ] Test account passwords are strong and documented
- [ ] Test data clearly marked (e.g., filenames prefixed with "TEST_")

### Cleanup Procedures:
- [ ] Delete all test documents after testing
- [ ] Delete test user accounts (or mark as test)
- [ ] Clear Qdrant test collections
- [ ] Remove test files from storage
- [ ] Reset database to clean state (if applicable)

---

*END OF TEST DATA SPECIFICATION*
