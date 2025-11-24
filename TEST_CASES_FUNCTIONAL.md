# PDF SEARCHER - FUNCTIONAL TEST CASES

**Version:** 1.0
**Date:** November 24, 2025
**Total Test Cases:** 145

---

## TABLE OF CONTENTS
1. [Document Upload](#1-document-upload-20-test-cases)
2. [Document Processing Pipeline](#2-document-processing-pipeline-15-test-cases)
3. [Document List & Management](#3-document-list--management-25-test-cases)
4. [Similarity Search - General](#4-similarity-search---general-25-test-cases)
5. [Similarity Search - Selected](#5-similarity-search---selected-10-test-cases)
6. [Document Comparison (Draftable)](#6-document-comparison-draftable-10-test-cases)
7. [Authentication & Authorization](#7-authentication--authorization-30-test-cases)
8. [Health & Monitoring](#8-health--monitoring-10-test-cases)

---

## 1. DOCUMENT UPLOAD (20 Test Cases)

### TC-UP-001: Upload Single Small PDF
**Priority:** P0
**Preconditions:** User logged in, on dashboard
**Test Steps:**
1. Click "Upload Document" button
2. Select a 1-page PDF file (50 KB)
3. Click "Upload"

**Expected Results:**
- File uploads successfully
- Progress bar shows 100%
- Document appears in list with "queued" status
- Success notification displayed

**Actual Result:** _____
**Status:** _____
**Notes:** _____

---

### TC-UP-002: Upload Single Large PDF (Near Limit)
**Priority:** P1
**Preconditions:** User logged in
**Test Steps:**
1. Click "Upload Document"
2. Select a PDF file ~49 MB
3. Complete upload

**Expected Results:**
- Upload succeeds
- Processing queued
- File stored in Supabase Storage

**Actual Result:** _____
**Status:** _____

---

### TC-UP-003: Upload PDF Exceeding 50 MB Limit
**Priority:** P1
**Preconditions:** User logged in
**Test Steps:**
1. Attempt to upload 51 MB PDF

**Expected Results:**
- Upload rejected
- Error message: "File size exceeds 50 MB limit"
- File not uploaded to storage

**Actual Result:** _____
**Status:** _____

---

### TC-UP-004: Upload Non-PDF File
**Priority:** P1
**Preconditions:** User logged in
**Test Steps:**
1. Attempt to upload .docx file
2. Attempt to upload .jpg file

**Expected Results:**
- Upload rejected for both
- Error: "Only PDF files are supported"
- No file stored

**Actual Result:** _____
**Status:** _____

---

### TC-UP-005: Batch Upload - 5 Documents Simultaneously
**Priority:** P0
**Preconditions:** User logged in
**Test Steps:**
1. Select 5 PDF files (various sizes: 1 MB, 2 MB, 5 MB, 10 MB, 15 MB)
2. Upload all at once

**Expected Results:**
- All 5 files upload successfully
- Each shows individual progress
- All appear in document list
- All transition to "queued" or "processing" status

**Actual Result:** _____
**Status:** _____

---

### TC-UP-006: Upload with Metadata - All Fields Populated
**Priority:** P1
**Preconditions:** User logged in
**Test Steps:**
1. Upload PDF
2. Fill in metadata:
   - Law Firm: "Smith & Associates"
   - Fund Manager: "ABC Capital"
   - Fund Admin: "XYZ Admin"
   - Jurisdiction: "Delaware"
3. Submit

**Expected Results:**
- Metadata saved with document
- Metadata searchable later
- Metadata appears in document details

**Actual Result:** _____
**Status:** _____

---

### TC-UP-007: Upload with Partial Metadata
**Priority:** P2
**Preconditions:** User logged in
**Test Steps:**
1. Upload PDF
2. Fill only Law Firm field
3. Leave other fields empty
4. Submit

**Expected Results:**
- Upload succeeds
- Law Firm saved
- Other fields remain null
- No validation errors

**Actual Result:** _____
**Status:** _____

---

### TC-UP-008: Upload with Special Characters in Filename
**Priority:** P2
**Test Steps:**
1. Upload file named: "Contract #2024 (Final).pdf"
2. Upload file named: "Document & Agreement.pdf"

**Expected Results:**
- Both uploads succeed
- Filenames handled correctly in storage
- Special characters preserved or sanitized appropriately

**Actual Result:** _____
**Status:** _____

---

### TC-UP-009: Rate Limiting - Upload (Free Tier)
**Priority:** P1
**Preconditions:** Free tier account, MAX_CONCURRENT_DOCUMENTS=1
**Test Steps:**
1. Upload 3 documents simultaneously

**Expected Results:**
- First upload proceeds
- Second and third uploads queued or rejected with "Rate limit exceeded" (429)
- Uploads proceed serially

**Actual Result:** _____
**Status:** _____

---

### TC-UP-010: Concurrent Upload from Multiple Users
**Priority:** P2
**Test Steps:**
1. User A uploads document
2. User B uploads document simultaneously

**Expected Results:**
- Both uploads succeed
- No race conditions
- Each user sees only their own document

**Actual Result:** _____
**Status:** _____

---

### TC-UP-011: Upload with Very Long Filename (255+ chars)
**Priority:** P3
**Test Steps:**
1. Rename PDF to have 260-character filename
2. Upload

**Expected Results:**
- Filename truncated or error displayed
- Upload succeeds with truncated/sanitized name

**Actual Result:** _____
**Status:** _____

---

### TC-UP-012: Upload Duplicate Document
**Priority:** P2
**Test Steps:**
1. Upload "Contract.pdf"
2. Upload same "Contract.pdf" again

**Expected Results:**
- Both uploads succeed
- Second file renamed (e.g., "Contract (1).pdf") or timestamped
- No overwrite of first file

**Actual Result:** _____
**Status:** _____

---

### TC-UP-013: Cancel Upload Mid-Transfer
**Priority:** P2
**Test Steps:**
1. Start uploading large file (20 MB)
2. Click cancel while progress is at 50%

**Expected Results:**
- Upload cancelled
- Partial file not stored
- Document not created in database

**Actual Result:** _____
**Status:** _____

---

### TC-UP-014: Upload with Network Interruption
**Priority:** P2
**Test Steps:**
1. Start upload
2. Disable network mid-transfer
3. Re-enable network

**Expected Results:**
- Upload fails with network error
- Retry option available
- Partial upload cleaned up

**Actual Result:** _____
**Status:** _____

---

### TC-UP-015: Upload - Drag and Drop Interface
**Priority:** P2
**Test Steps:**
1. Drag PDF file from desktop
2. Drop onto upload area

**Expected Results:**
- File accepted
- Upload begins immediately
- Same as click-to-upload behavior

**Actual Result:** _____
**Status:** _____

---

### TC-UP-016: Upload - Multiple Files Drag and Drop
**Priority:** P2
**Test Steps:**
1. Select 5 PDFs
2. Drag and drop all onto upload area

**Expected Results:**
- All 5 files accepted
- Batch upload begins
- All files process

**Actual Result:** _____
**Status:** _____

---

### TC-UP-017: Upload Encrypted/Password-Protected PDF
**Priority:** P2
**Test Steps:**
1. Upload password-protected PDF

**Expected Results:**
- Upload succeeds
- Processing fails gracefully with error: "Unable to process encrypted PDFs"
- Document marked as "failed"

**Actual Result:** _____
**Status:** _____

---

### TC-UP-018: Upload Corrupted PDF
**Priority:** P2
**Test Steps:**
1. Upload corrupted/malformed PDF file

**Expected Results:**
- Upload may succeed (file transfer)
- Processing fails with appropriate error
- Document marked as "failed"

**Actual Result:** _____
**Status:** _____

---

### TC-UP-019: Upload Scanned PDF (Image-Based)
**Priority:** P1
**Test Steps:**
1. Upload scanned document (images only, no text layer)

**Expected Results:**
- Upload succeeds
- Document AI OCR extracts text
- Processing completes
- Text searchable

**Actual Result:** _____
**Status:** _____

---

### TC-UP-020: Upload Native PDF (Text-Based)
**Priority:** P1
**Test Steps:**
1. Upload native PDF with text layer

**Expected Results:**
- Upload succeeds
- Text extracted successfully
- Processing faster than scanned PDF
- High OCR accuracy

**Actual Result:** _____
**Status:** _____

---

## 2. DOCUMENT PROCESSING PIPELINE (15 Test Cases)

### TC-PROC-001: End-to-End Processing - Small Document
**Priority:** P0
**Preconditions:** User uploaded 5-page PDF
**Test Steps:**
1. Monitor processing status
2. Verify each stage: OCR → Chunking → Embeddings → Indexing

**Expected Results:**
- Status transitions: queued → processing → completed
- All stages complete successfully
- Document searchable after completion
- Processing time <2 minutes

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-002: End-to-End Processing - Large Document (100+ pages)
**Priority:** P1
**Test Steps:**
1. Upload 100-page PDF (10 MB)
2. Monitor processing

**Expected Results:**
- Processing completes successfully
- Chunked processing used (>15 pages)
- Processing time <10 minutes
- All chunks generated correctly

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-003: Processing - Very Large Document (200+ pages)
**Priority:** P1
**Test Steps:**
1. Upload 250-page PDF (25 MB)

**Expected Results:**
- Processing completes
- Memory managed efficiently
- Processing time <20 minutes
- All 250 pages indexed

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-004: Processing - Document at 50 MB Limit
**Priority:** P1
**Test Steps:**
1. Upload 49.5 MB PDF

**Expected Results:**
- Processing succeeds
- Timeout not reached (30 min limit)
- All content extracted

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-005: Cancel Processing - Early Stage
**Priority:** P1
**Test Steps:**
1. Upload document
2. Click "Cancel" during OCR stage

**Expected Results:**
- Processing stops immediately
- Document status: "cancelled"
- Partial data cleaned up (Supabase, Qdrant, Storage)
- No orphaned records

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-006: Cancel Processing - During Embedding Generation
**Priority:** P1
**Test Steps:**
1. Upload document
2. Cancel during embedding generation (mid-stage)

**Expected Results:**
- Processing cancelled
- Partial embeddings deleted
- Qdrant cleanup executed
- Storage file removed

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-007: Retry Failed Processing
**Priority:** P1
**Preconditions:** Document failed processing
**Test Steps:**
1. Click "Retry" on failed document

**Expected Results:**
- Processing restarts from beginning
- Status: queued → processing
- Attempts counter incremented
- If successful, status becomes "completed"

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-008: Max Retry Attempts Exhausted
**Priority:** P1
**Test Steps:**
1. Cause processing to fail
2. Retry 3 times (default max_attempts)

**Expected Results:**
- After 3rd failure, retry button disabled
- Status permanently "failed"
- Error message displayed
- Manual intervention required

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-009: Processing Timeout (30 min)
**Priority:** P1
**Test Steps:**
1. Upload document that takes >30 minutes
   (simulate with delayed Document AI response)

**Expected Results:**
- Job times out at 30 minutes
- Status: "failed" with error "Job timeout"
- Job released from processing
- Retry available

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-010: Concurrent Processing - 3 Documents
**Priority:** P0
**Preconditions:** Paid tier, MAX_CONCURRENT_DOCUMENTS=10
**Test Steps:**
1. Upload 3 documents simultaneously
2. Monitor all 3 processing in parallel

**Expected Results:**
- All 3 process concurrently
- No race conditions
- All complete successfully
- Processing times similar

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-011: Concurrent Processing - 10 Documents (Paid Tier)
**Priority:** P1
**Test Steps:**
1. Upload 10 documents at once

**Expected Results:**
- All 10 process in parallel
- Database connection pool remains healthy (<70% usage)
- No connection exhaustion
- All complete successfully

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-012: Processing - Document AI OCR Accuracy
**Priority:** P2
**Test Steps:**
1. Upload known document with measurable text
2. Compare extracted text to original

**Expected Results:**
- OCR accuracy >95% for typed text
- OCR accuracy >90% for scanned text
- Page numbers detected correctly

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-013: Processing - Chunk Count Accuracy
**Priority:** P2
**Test Steps:**
1. Upload 20-page document
2. Verify chunk count after processing

**Expected Results:**
- Chunk count matches expected (based on paragraph count)
- No duplicate chunks
- No missing content
- Character counts accurate

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-014: Processing - Centroid Computation
**Priority:** P2
**Test Steps:**
1. Upload document
2. Verify centroid embedding generated

**Expected Results:**
- Centroid stored in documents.centroid_embedding
- 768 dimensions
- Used for Stage 0 similarity search

**Actual Result:** _____
**Status:** _____

---

### TC-PROC-015: Processing - Complex Layout (Tables, Columns)
**Priority:** P2
**Test Steps:**
1. Upload PDF with multi-column layout and tables

**Expected Results:**
- Content extracted in correct reading order
- Tables handled appropriately
- No garbled text

**Actual Result:** _____
**Status:** _____

---

## 3. DOCUMENT LIST & MANAGEMENT (25 Test Cases)

### TC-LIST-001: View Document List - Empty State
**Priority:** P2
**Preconditions:** New user, no documents
**Test Steps:**
1. Navigate to dashboard

**Expected Results:**
- Empty state message displayed
- "Upload Document" CTA prominent
- No errors

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-002: View Document List - With Documents
**Priority:** P0
**Preconditions:** User has 5 uploaded documents
**Test Steps:**
1. View dashboard

**Expected Results:**
- All 5 documents displayed
- Columns: Title, Status, Pages, Date, Actions
- Correct status for each document
- Sorted by date (newest first by default)

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-003: Pagination - Navigate Pages
**Priority:** P1
**Preconditions:** User has 25 documents (10 per page)
**Test Steps:**
1. View page 1
2. Click "Next" to page 2
3. Click "Previous" back to page 1
4. Jump to page 3

**Expected Results:**
- Correct 10 documents per page
- Navigation works smoothly
- Page numbers accurate
- No duplicate documents across pages

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-004: Search Documents by Title
**Priority:** P1
**Test Steps:**
1. Type "Contract" in search box
2. Press Enter

**Expected Results:**
- Only documents with "Contract" in title/filename shown
- Search is case-insensitive
- Results update in real-time
- Count displayed: "5 documents found"

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-005: Filter by Status - Completed
**Priority:** P1
**Test Steps:**
1. Select "Completed" from status filter dropdown

**Expected Results:**
- Only completed documents shown
- Processing/failed/queued documents hidden
- Filter persists across page navigation

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-006: Filter by Status - Processing
**Priority:** P1
**Test Steps:**
1. Select "Processing" status filter

**Expected Results:**
- Only currently processing documents shown
- Real-time status updates (polling)
- Progress indicators visible

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-007: Filter by Status - Failed
**Priority:** P1
**Test Steps:**
1. Select "Failed" status filter

**Expected Results:**
- Only failed documents shown
- Error messages visible
- Retry button available for each

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-008: Filter by Metadata - Law Firm
**Priority:** P2
**Test Steps:**
1. Select "Smith & Associates" from Law Firm filter

**Expected Results:**
- Only documents with that law firm shown
- Count updated
- Other metadata filters still available

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-009: Combined Filters - Status + Metadata
**Priority:** P2
**Test Steps:**
1. Filter by Status: "Completed"
2. Add filter: Law Firm: "ABC Law"

**Expected Results:**
- Only completed documents from ABC Law shown
- Both filters applied (AND logic)
- Can clear individual filters

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-010: Sort by Title (A-Z)
**Priority:** P2
**Test Steps:**
1. Click "Title" column header

**Expected Results:**
- Documents sorted alphabetically A→Z
- Click again: reverse to Z→A
- Sort indicator (arrow) displayed

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-011: Sort by Date Created
**Priority:** P2
**Test Steps:**
1. Click "Date" column header

**Expected Results:**
- Sorted newest first (default)
- Click again: oldest first
- Date format consistent

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-012: Sort by Page Count
**Priority:** P3
**Test Steps:**
1. Click "Pages" column header

**Expected Results:**
- Sorted by page count (ascending/descending)
- Accurate page counts displayed

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-013: Rename Document
**Priority:** P1
**Test Steps:**
1. Click "Edit" on document
2. Change title from "Contract" to "Contract - Final Version"
3. Save

**Expected Results:**
- Title updated in database
- Filename in storage updated
- Storage path updated (user_id/new-filename.pdf)
- Change reflected immediately in list

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-014: Edit Metadata
**Priority:** P1
**Test Steps:**
1. Click "Edit" on document
2. Update Law Firm to "New Firm LLC"
3. Save

**Expected Results:**
- Metadata updated in database
- Metadata propagated to Qdrant vectors
- Searchable by new metadata

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-015: Delete Single Document
**Priority:** P0
**Test Steps:**
1. Click "Delete" on document
2. Confirm deletion

**Expected Results:**
- Document deleted from database (documents table)
- Embeddings deleted (document_embeddings table)
- Content deleted (document_content table)
- Vectors deleted from Qdrant
- File deleted from Storage
- Document removed from list

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-016: Delete with Confirmation Cancel
**Priority:** P2
**Test Steps:**
1. Click "Delete"
2. Click "Cancel" on confirmation

**Expected Results:**
- Deletion cancelled
- Document remains in list
- No data deleted

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-017: Bulk Delete - Multiple Documents
**Priority:** P1
**Test Steps:**
1. Select 5 documents using checkboxes
2. Click "Delete Selected"
3. Confirm

**Expected Results:**
- All 5 documents deleted
- Complete cleanup for all (database, Qdrant, storage)
- Batch operation efficient (not 5 separate deletes)

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-018: Download Document
**Priority:** P1
**Test Steps:**
1. Click "Download" on document

**Expected Results:**
- PDF downloaded from storage
- Filename preserved
- File opens correctly

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-019: View Document Details
**Priority:** P2
**Test Steps:**
1. Click on document title

**Expected Results:**
- Detail view opens
- Shows: title, filename, size, pages, status, metadata, created date
- Actions available: Edit, Delete, Download, Compare

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-020: Real-Time Status Updates
**Priority:** P1
**Preconditions:** Document currently processing
**Test Steps:**
1. Observe document in list
2. Wait for processing to complete (don't refresh)

**Expected Results:**
- Status updates automatically (polling 25-35s)
- Progress updates if available
- Transitions to "completed" without page refresh

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-021: Empty Search Results
**Priority:** P2
**Test Steps:**
1. Search for "XYZ123NonExistent"

**Expected Results:**
- "No documents found" message
- Clear search button visible
- Can return to full list

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-022: Clear All Filters
**Priority:** P2
**Test Steps:**
1. Apply multiple filters (status, metadata)
2. Click "Clear Filters" button

**Expected Results:**
- All filters removed
- Full document list displayed
- Search box cleared

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-023: Column Resizing
**Priority:** P3
**Test Steps:**
1. Drag column divider to resize

**Expected Results:**
- Column width adjusts
- Content adapts (wraps or ellipsis)
- Resize persists (localStorage)

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-024: Dark Mode Toggle
**Priority:** P2
**Test Steps:**
1. Toggle to dark mode

**Expected Results:**
- All UI elements adapt
- Readable contrast maintained
- Preference saved

**Actual Result:** _____
**Status:** _____

---

### TC-LIST-025: Mobile Responsive View
**Priority:** P2
**Test Steps:**
1. View dashboard on mobile device (or 375px width)

**Expected Results:**
- Table converts to card view
- All actions accessible
- No horizontal scroll
- Touch-friendly targets

**Actual Result:** _____
**Status:** _____

---

## 4. SIMILARITY SEARCH - GENERAL (25 Test Cases)

### TC-SEARCH-001: Basic Similarity Search
**Priority:** P0
**Preconditions:** User has 10+ completed documents
**Test Steps:**
1. Select source document
2. Click "Find Similar Documents"
3. Use default parameters

**Expected Results:**
- Search completes <5 seconds
- Results displayed with:
  - Target document title
  - Source score (0-100%)
  - Target score (0-100%)
  - Length ratio
  - Top matching sections with page ranges
- Sorted by score (highest first)

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-002: Verify 3-Stage Pipeline Execution
**Priority:** P1
**Test Steps:**
1. Run similarity search
2. Check logs for stage execution

**Expected Results:**
- Stage 0: Centroid retrieval executed (600 candidates)
- Stage 1: Chunk prefilter executed (if >250 from Stage 0)
- Stage 2: Adaptive scoring executed
- Bidirectional matching performed
- Non-max suppression applied

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-003: Stage 0 - Centroid Candidate Retrieval
**Priority:** P1
**Test Steps:**
1. Perform search with stage0_topK=200

**Expected Results:**
- Exactly 200 candidates retrieved from Qdrant
- Uses document centroid embeddings
- Applies user_id filter (RLS)
- Fast execution (<1 second)

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-004: Stage 1 - Auto-Skip Logic
**Priority:** P1
**Test Steps:**
1. Search with stage0_topK=100 (less than stage1_topK default 250)

**Expected Results:**
- Stage 1 automatically skipped (log message)
- Proceeds directly to Stage 2
- Search still returns accurate results

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-005: Stage 1 - Chunk-Level Prefilter
**Priority:** P1
**Test Steps:**
1. Search with stage0_topK=600, stage1_topK=250

**Expected Results:**
- Stage 1 executes
- Narrows 600 candidates to 250
- Uses ANN search on chunk embeddings
- Dynamic neighborsPerChunk (36-60)

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-006: Stage 2 - Bidirectional Matching
**Priority:** P1
**Test Steps:**
1. Run search on asymmetric documents (short source, long target)

**Expected Results:**
- Both source→target and target→source scores calculated
- Length ratio computed
- Scores differ appropriately
- Asymmetry handled correctly

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-007: Stage 2 - Section Detection
**Priority:** P1
**Test Steps:**
1. Search document with known similar sections

**Expected Results:**
- Top sections identified
- Page ranges accurate
- Matching text displayed
- Non-max suppression prevents overlaps

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-008: Search with Page Range Filter - Source
**Priority:** P1
**Test Steps:**
1. Search with sourcePageRange: {start_page: 5, end_page: 10}

**Expected Results:**
- Only pages 5-10 of source considered
- Rest of source ignored
- Results reflect page range constraint

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-009: Search with Metadata Filter - Law Firm
**Priority:** P1
**Test Steps:**
1. Add filter: Law Firm = "ABC Law"
2. Run search

**Expected Results:**
- Only documents from ABC Law in results
- Metadata filter applied at Stage 0 (Qdrant)
- Efficient filtering (not post-search)

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-010: Search with Multiple Metadata Filters
**Priority:** P2
**Test Steps:**
1. Filter: Law Firm = "ABC" AND Fund Manager = "XYZ Capital"

**Expected Results:**
- Both filters applied (AND logic)
- Only documents matching both criteria
- Results count accurate

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-011: Search with Min Score Thresholds
**Priority:** P1
**Test Steps:**
1. Set source_min_score = 80%
2. Set target_min_score = 70%

**Expected Results:**
- Only results with source ≥80% AND target ≥70% shown
- Lower scoring matches excluded
- Empty results if no matches meet threshold

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-012: Search with topK Limit
**Priority:** P2
**Test Steps:**
1. Set topK = 10

**Expected Results:**
- Maximum 10 results returned
- Top 10 by score
- Even if more matches exist

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-013: Search Returns Zero Results
**Priority:** P2
**Test Steps:**
1. Search unique document with no similar content

**Expected Results:**
- "No similar documents found" message
- Empty results table
- No errors

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-014: Search - Character-Based Scoring Accuracy
**Priority:** P1
**Test Steps:**
1. Search with known similar documents
2. Verify score calculation

**Expected Results:**
- Scores based on character overlap (not chunk)
- More accurate than chunk-based scoring
- Scores range 0-100%

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-015: Search - Length Ratio Calculation
**Priority:** P2
**Test Steps:**
1. Search short doc vs long doc

**Expected Results:**
- Length ratio = source_chars / target_chars
- Ratio displayed (e.g., "1:2.5")
- Helps identify partial matches

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-016: Search Performance - Response Time
**Priority:** P1
**Test Steps:**
1. Search with default parameters
2. Measure time from click to results displayed

**Expected Results:**
- Search completes <5 seconds (P95)
- UI remains responsive
- Loading indicator displayed

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-017: Search with Large Result Set (500+ candidates)
**Priority:** P2
**Test Steps:**
1. Search generic document likely to match many
2. Set stage0_topK=500

**Expected Results:**
- All 500 candidates processed
- Stage 2 handles large set efficiently
- Results returned within timeout
- Top matches accurate

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-018: Search - Concurrent Searches (Multiple Users)
**Priority:** P2
**Test Steps:**
1. User A runs search
2. User B runs search simultaneously

**Expected Results:**
- Both searches complete successfully
- No interference between searches
- Each user sees only their results
- Performance not degraded

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-019: Search - Export Results
**Priority:** P3
**Test Steps:**
1. Run search
2. Click "Export" button

**Expected Results:**
- Results downloaded as CSV or JSON
- All data included (scores, sections, page ranges)
- Filename includes source document name and date

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-020: Search - Save Search Parameters
**Priority:** P3
**Test Steps:**
1. Adjust multiple search parameters
2. Save as "My Custom Search"

**Expected Results:**
- Parameters saved to profile
- Can reload saved search
- Parameters pre-filled

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-021: Search - Sort Results by Score
**Priority:** P2
**Test Steps:**
1. Run search
2. Click column headers to sort

**Expected Results:**
- Can sort by: sourceScore, targetScore, lengthRatio
- Ascending/descending toggle
- Sort persists during session

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-022: Search - View Match Details
**Priority:** P1
**Test Steps:**
1. Run search
2. Click "View Details" on result

**Expected Results:**
- Modal shows:
  - Full matching text
  - Page numbers
  - Score breakdown
  - Compare button (Draftable)

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-023: Search on Recently Uploaded Document
**Priority:** P1
**Test Steps:**
1. Upload document
2. Wait for processing to complete
3. Immediately search

**Expected Results:**
- Document available for search
- Results accurate
- Centroid computed correctly

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-024: Search Document Not Yet Completed
**Priority:** P1
**Test Steps:**
1. Try to search document still processing

**Expected Results:**
- Error: "Document not ready for search"
- Suggestion to wait for processing
- Status indicator shown

**Actual Result:** _____
**Status:** _____

---

### TC-SEARCH-025: Search with Adjusted Stage 2 Workers
**Priority:** P2
**Preconditions:** SIMILARITY_STAGE2_WORKERS=1 (test env)
**Test Steps:**
1. Run search
2. Compare performance to default (8 workers)

**Expected Results:**
- Search completes (slower with 1 worker)
- Results identical
- Worker configuration respected

**Actual Result:** _____
**Status:** _____

---

## 5. SIMILARITY SEARCH - SELECTED (10 Test Cases)

### TC-SEL-001: Selected Search - Choose 3 Target Documents
**Priority:** P1
**Test Steps:**
1. Select source document
2. Click "Compare with Selected"
3. Choose 3 target documents
4. Run search

**Expected Results:**
- Search runs only against 3 selected targets
- All 3 targets in results (even if 0% match)
- Faster than general search (smaller candidate set)

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-002: Selected Search - Include Zero-Score Matches
**Priority:** P1
**Test Steps:**
1. Select source + 5 targets
2. Run search
3. Verify results

**Expected Results:**
- All 5 targets in results
- Some may have 0% score
- Useful for completeness checking

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-003: Selected Search - Many Targets (20+)
**Priority:** P2
**Test Steps:**
1. Select 25 target documents

**Expected Results:**
- All 25 processed
- Results for all 25
- Performance acceptable (<30 seconds)

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-004: Selected Search with Page Range + Metadata Filters
**Priority:** P2
**Test Steps:**
1. Selected search with 5 targets
2. Add sourcePageRange filter
3. Add metadata filter

**Expected Results:**
- Filters applied correctly
- Only relevant sections compared
- Metadata constraints respected

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-005: Selected Search - Search Interface UX
**Priority:** P2
**Test Steps:**
1. Navigate to selected search mode

**Expected Results:**
- Clear UI for selecting targets
- Search button disabled until targets selected
- Can deselect targets
- Count of selected shown

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-006: Selected Search - Results Table
**Priority:** P1
**Test Steps:**
1. Run selected search

**Expected Results:**
- Table shows all selected targets
- Columns: Document, Source Score, Target Score, Length Ratio
- Sorted by score
- Can export results

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-007: Selected Search vs General Search - Result Comparison
**Priority:** P2
**Test Steps:**
1. Run general search
2. Run selected search with top 5 from general search

**Expected Results:**
- Scores should match for same documents
- Selected search faster (smaller Stage 0)
- Results consistent

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-008: Selected Search - Empty Selection
**Priority:** P2
**Test Steps:**
1. Click "Compare with Selected"
2. Don't select any targets
3. Try to run search

**Expected Results:**
- Error: "Please select at least one target document"
- Search button disabled
- Guidance displayed

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-009: Selected Search - Target Selection Persists
**Priority:** P3
**Test Steps:**
1. Select 5 targets
2. Navigate away
3. Return to selected search

**Expected Results:**
- Selection cleared (or)
- Selection persisted in session storage

**Actual Result:** _____
**Status:** _____

---

### TC-SEL-010: Selected Search - Bulk Actions on Results
**Priority:** P3
**Test Steps:**
1. Run selected search
2. Select multiple results
3. Click "Compare All Selected" (Draftable)

**Expected Results:**
- Bulk comparison initiated
- Multiple Draftable comparisons created
- Links provided for each

**Actual Result:** _____
**Status:** _____

---

## 6. DOCUMENT COMPARISON (DRAFTABLE) (10 Test Cases)

### TC-DRAFT-001: Create Comparison - Two Documents
**Priority:** P1
**Test Steps:**
1. Select source document
2. Select target document
3. Click "Compare with Draftable"

**Expected Results:**
- API call to Draftable succeeds
- Comparison created
- Signed URL returned (1-hour expiry)
- URL opens in new tab
- Side-by-side comparison displayed

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-002: Comparison from Search Results
**Priority:** P1
**Test Steps:**
1. Run similarity search
2. Click "Compare" on a result

**Expected Results:**
- Comparison created for source + target
- Opens in new tab
- No errors

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-003: Comparison - Signed URL Expiry
**Priority:** P2
**Test Steps:**
1. Create comparison
2. Wait >1 hour
3. Try to access URL

**Expected Results:**
- URL expires after 1 hour
- Draftable error page shown
- Option to create new comparison

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-004: Comparison - Invalid Document Format
**Priority:** P2
**Test Steps:**
1. Attempt to compare documents
   (note: all are PDFs, so this tests error handling)

**Expected Results:**
- Only PDF comparison supported
- Error if non-PDF somehow attempted

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-005: Comparison - Large Documents
**Priority:** P2
**Test Steps:**
1. Compare two 200-page documents

**Expected Results:**
- Comparison succeeds
- May take longer (30s timeout in code)
- Draftable handles large files

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-006: Comparison - Draftable API Timeout
**Priority:** P2
**Test Steps:**
1. Simulate Draftable API slow response (>30s)

**Expected Results:**
- Request times out gracefully
- Error message: "Comparison timed out"
- Retry option available

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-007: Comparison - Draftable API Error
**Priority:** P2
**Test Steps:**
1. Simulate Draftable 500 error

**Expected Results:**
- Error caught and logged
- User-friendly error message
- No app crash

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-008: Comparison - Missing Draftable Credentials
**Priority:** P2
**Preconditions:** DRAFTABLE_AUTH_TOKEN not set
**Test Steps:**
1. Try to create comparison

**Expected Results:**
- Error: "Draftable not configured"
- Feature disabled or error shown
- Graceful degradation

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-009: Multiple Comparisons in Sequence
**Priority:** P2
**Test Steps:**
1. Create comparison A vs B
2. Create comparison A vs C
3. Create comparison B vs C

**Expected Results:**
- All 3 comparisons succeed
- Unique URLs for each
- No conflicts

**Actual Result:** _____
**Status:** _____

---

### TC-DRAFT-010: Comparison - Audit Logging
**Priority:** P3
**Test Steps:**
1. Create comparison
2. Check user_activity_logs

**Expected Results:**
- Activity logged with:
  - Action: "document_comparison"
  - Resource: both document IDs
  - Timestamp
  - User ID

**Actual Result:** _____
**Status:** _____

---

## 7. AUTHENTICATION & AUTHORIZATION (30 Test Cases)

### TC-AUTH-001: Sign Up with Google OAuth
**Priority:** P0
**Test Steps:**
1. Click "Sign in with Google"
2. Complete Google authentication
3. Grant permissions

**Expected Results:**
- Redirected to Google login
- After auth, redirected to dashboard
- User created in Supabase auth.users
- User record in public.users
- Session token set

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-002: Sign In with Google OAuth (Existing User)
**Priority:** P0
**Test Steps:**
1. Sign in with previously registered Google account

**Expected Results:**
- Authentication succeeds
- Redirected to dashboard
- User's documents loaded
- Session active

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-003: Sign Up with Email/Password (Local Dev Only)
**Priority:** P1
**Preconditions:** Running on localhost
**Test Steps:**
1. Enter email and password
2. Click "Sign Up"

**Expected Results:**
- User created
- Verification email sent (if configured)
- Can log in with credentials

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-004: Sign In with Email/Password (Local Dev)
**Priority:** P1
**Test Steps:**
1. Enter valid email/password
2. Click "Sign In"

**Expected Results:**
- Authentication succeeds
- Dashboard loads
- Session active

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-005: Sign In - Invalid Credentials
**Priority:** P1
**Test Steps:**
1. Enter wrong password

**Expected Results:**
- Error: "Invalid email or password"
- User remains on login page
- No session created

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-006: Email/Password Hidden in Production
**Priority:** P1
**Preconditions:** Production environment (not localhost)
**Test Steps:**
1. Load login page

**Expected Results:**
- Only "Sign in with Google" button visible
- Email/password form hidden
- Environment detection working

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-007: Session Persistence
**Priority:** P1
**Test Steps:**
1. Log in
2. Close browser
3. Reopen and navigate to app

**Expected Results:**
- User still logged in
- Session restored
- Dashboard loads without re-authentication

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-008: Session Expiration
**Priority:** P1
**Test Steps:**
1. Log in
2. Wait for session to expire (Supabase default: 1 hour)
3. Try to access protected route

**Expected Results:**
- Redirected to login page
- Message: "Session expired, please log in again"

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-009: Logout
**Priority:** P1
**Test Steps:**
1. Log in
2. Click "Logout"

**Expected Results:**
- Session destroyed
- Redirected to login page
- Cannot access dashboard without re-login

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-010: Protected Route Access (Unauthenticated)
**Priority:** P0
**Test Steps:**
1. Access /dashboard without logging in

**Expected Results:**
- Redirected to /login
- Error: "Please log in to access this page"
- After login, redirected to originally requested page

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-011: API Endpoint Protection (No Auth Token)
**Priority:** P0
**Test Steps:**
1. Call `GET /api/documents` without auth header

**Expected Results:**
- 401 Unauthorized response
- Error: "Authentication required"
- No data returned

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-012: RLS Policy - User Can Only See Own Documents
**Priority:** P0
**Test Steps:**
1. User A logs in
2. User A uploads document
3. User B logs in
4. User B views document list

**Expected Results:**
- User A sees only their document
- User B sees zero documents (or only theirs)
- User B cannot access User A's document ID directly

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-013: RLS Policy - Direct Document ID Access Blocked
**Priority:** P0
**Test Steps:**
1. User A gets document ID: "abc-123"
2. User B tries `GET /api/documents/abc-123`

**Expected Results:**
- 403 Forbidden or 404 Not Found
- RLS blocks access
- No data leaked

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-014: RLS Policy - Service Role Bypass
**Priority:** P1
**Test Steps:**
1. Cron job claims job with service_role client

**Expected Results:**
- Service role can access all documents
- Job claiming succeeds across all users
- RLS bypassed correctly

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-015: RLS Policy - Embeddings Table
**Priority:** P1
**Test Steps:**
1. User A creates embeddings
2. User B queries document_embeddings table

**Expected Results:**
- User B cannot see User A's embeddings
- RLS enforced via JOIN to documents table

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-016: RLS Policy - Document Jobs
**Priority:** P1
**Test Steps:**
1. User A has processing job
2. User B queries document_jobs

**Expected Results:**
- User B cannot see User A's jobs
- user_id filter enforced

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-017: Storage RLS - Upload
**Priority:** P1
**Test Steps:**
1. User A uploads file to storage

**Expected Results:**
- File stored in user_id folder: `{user_id}/filename.pdf`
- RLS policy allows upload only to own folder

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-018: Storage RLS - Download Own File
**Priority:** P1
**Test Steps:**
1. User A downloads their uploaded file

**Expected Results:**
- Download succeeds
- Signed URL generated
- File accessible

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-019: Storage RLS - Download Other User's File
**Priority:** P0
**Test Steps:**
1. User B tries to download User A's file

**Expected Results:**
- 403 Forbidden
- RLS blocks access
- No file download

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-020: Storage RLS - Service Role Access
**Priority:** P1
**Test Steps:**
1. Cron job downloads file for processing

**Expected Results:**
- Service role can access all files
- Processing succeeds

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-021: Token Refresh
**Priority:** P2
**Test Steps:**
1. Log in
2. Stay logged in for >50 minutes (near expiry)

**Expected Results:**
- Token automatically refreshed
- No logout
- Seamless experience

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-022: Concurrent Sessions
**Priority:** P2
**Test Steps:**
1. Log in on Chrome
2. Log in on Firefox (same user)

**Expected Results:**
- Both sessions active
- Independent sessions
- No conflicts

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-023: OAuth State Parameter Validation
**Priority:** P2
**Test Steps:**
1. Initiate Google OAuth
2. Tamper with state parameter
3. Complete flow

**Expected Results:**
- State mismatch detected
- Authentication rejected
- CSRF protection working

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-024: OAuth Callback Error Handling
**Priority:** P2
**Test Steps:**
1. Simulate OAuth error callback

**Expected Results:**
- Error caught gracefully
- User-friendly error message
- Can retry login

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-025: Password Reset (Email/Password, Local Dev)
**Priority:** P2
**Test Steps:**
1. Click "Forgot Password"
2. Enter email
3. Check email for reset link
4. Reset password

**Expected Results:**
- Reset email received
- Link works
- Password updated
- Can log in with new password

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-026: Rate Limiting - Login Attempts
**Priority:** P2
**Test Steps:**
1. Attempt login 10 times with wrong password

**Expected Results:**
- After 5 failed attempts, rate limited
- Temporary lockout (5 minutes)
- Error: "Too many attempts, try again later"

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-027: User Profile Completion
**Priority:** P3
**Test Steps:**
1. First-time user logs in
2. Prompted to complete profile (if applicable)

**Expected Results:**
- Profile form displayed
- Can save name, preferences
- Optional step

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-028: Multi-Factor Authentication (if enabled)
**Priority:** P3
**Test Steps:**
1. Enable MFA in profile
2. Log out and log in again

**Expected Results:**
- Prompted for MFA code
- Authentication succeeds with code
- Session created

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-029: Account Deletion
**Priority:** P3
**Test Steps:**
1. Log in
2. Navigate to settings
3. Delete account

**Expected Results:**
- Confirmation required
- All user data deleted (documents, embeddings, vectors)
- User record deleted from auth.users
- Cannot log in anymore

**Actual Result:** _____
**Status:** _____

---

### TC-AUTH-030: Anonymous/Public Access Blocked
**Priority:** P0
**Test Steps:**
1. Access any route without authentication

**Expected Results:**
- All routes require authentication
- No public access
- Redirected to login

**Actual Result:** _____
**Status:** _____

---

## 8. HEALTH & MONITORING (10 Test Cases)

### TC-HEALTH-001: Basic Health Check Endpoint
**Priority:** P1
**Test Steps:**
1. Call `GET /api/health`

**Expected Results:**
- 200 OK response
- JSON: `{ status: "healthy", timestamp: "..." }`
- Response time <100ms

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-002: Connection Pool Health
**Priority:** P1
**Test Steps:**
1. Call `GET /api/health/pool`

**Expected Results:**
- Returns:
  - Total connections
  - Idle connections
  - Active connections
  - Utilization percentage
  - Throttling state
  - Qdrant queue status

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-003: Stuck Jobs Monitoring View
**Priority:** P1
**Test Steps:**
1. Query `SELECT * FROM stuck_jobs_monitoring;`

**Expected Results:**
- Returns jobs processing >15 minutes
- Shows: job ID, duration, worker_id, recovery status
- Accurate data

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-004: Database Connectivity Check
**Priority:** P1
**Test Steps:**
1. Health endpoint queries database

**Expected Results:**
- If DB unreachable, health check fails
- Error response
- Clear error message

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-005: Qdrant Connectivity Check
**Priority:** P1
**Test Steps:**
1. Health endpoint checks Qdrant

**Expected Results:**
- If Qdrant down, health degraded
- Partial health status
- Retry queue status

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-006: Activity Logging - Upload Action
**Priority:** P2
**Test Steps:**
1. Upload document
2. Query `user_activity_logs` table

**Expected Results:**
- Action logged: "document_upload"
- Resource ID: document UUID
- Metadata: filename, size
- Timestamp accurate

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-007: Activity Logging - Search Action
**Priority:** P2
**Test Steps:**
1. Perform similarity search
2. Check activity logs

**Expected Results:**
- Action: "similarity_search"
- Metadata: source_id, filters, result_count
- Duration logged

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-008: Activity Logging - Delete Action
**Priority:** P2
**Test Steps:**
1. Delete document
2. Check logs

**Expected Results:**
- Action: "document_delete"
- Resource: deleted document ID
- Logged before deletion (audit trail)

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-009: Cleanup Old Activity Logs Function
**Priority:** P2
**Test Steps:**
1. Execute `SELECT cleanup_old_activity_logs();`

**Expected Results:**
- Deletes logs >90 days old
- Returns count of deleted rows
- Recent logs preserved

**Actual Result:** _____
**Status:** _____

---

### TC-HEALTH-010: Health Check - External Service Status
**Priority:** P2
**Test Steps:**
1. Call health endpoint
2. Check external service status (if implemented)

**Expected Results:**
- Shows Document AI status
- Shows Vertex AI status
- Shows Qdrant status
- Shows Storage status

**Actual Result:** _____
**Status:** _____

---

## TEST CASE SUMMARY

| Feature Area | Test Cases | P0 | P1 | P2 | P3 |
|--------------|------------|----|----|----|----|
| Document Upload | 20 | 2 | 9 | 8 | 1 |
| Processing Pipeline | 15 | 2 | 8 | 5 | 0 |
| Document List & Management | 25 | 1 | 10 | 12 | 2 |
| Similarity Search - General | 25 | 1 | 12 | 10 | 2 |
| Similarity Search - Selected | 10 | 0 | 5 | 4 | 1 |
| Document Comparison | 10 | 0 | 3 | 6 | 1 |
| Authentication & Authorization | 30 | 7 | 13 | 9 | 1 |
| Health & Monitoring | 10 | 0 | 6 | 4 | 0 |
| **TOTAL** | **145** | **13** | **66** | **58** | **8** |

---

## TEST EXECUTION TEMPLATE

For each test case, record:
- **Actual Result**: What actually happened
- **Status**: ✅ Pass | ❌ Fail | ⏸️ Blocked | ⏭️ Skipped
- **Notes**: Any observations, screenshots, or additional context
- **Defect ID**: Link to defect if test failed

---

*END OF FUNCTIONAL TEST CASES*
