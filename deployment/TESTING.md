# Concurrent Upload Testing Guide

This guide helps you verify that your system can handle many concurrent uploads without jobs getting stuck.

## Test Scenarios

We'll test three scenarios:
1. **Light load:** 5 users × 2 documents = 10 uploads
2. **Medium load:** 10 users × 3 documents = 30 uploads
3. **Heavy load:** 15 users × 5 documents = 75 uploads

## Prerequisites

### 1. Ensure System is Running

```bash
# Check if application is running
curl http://localhost:3000/api/health

# Check if systemd timer is running
sudo systemctl status pdf-search-cron.timer

# Check recent cron executions
sudo journalctl -u pdf-search-cron.service -n 5
```

### 2. Prepare Test Documents

You'll need sample PDF files for testing. You can:

```bash
# Option 1: Use existing PDFs
ls ~/Documents/*.pdf | head -10

# Option 2: Generate test PDFs (requires LaTeX)
mkdir -p test-pdfs
for i in {1..75}; do
  echo "Test Document $i" | ps2pdf - "test-pdfs/test-doc-$i.pdf"
done

# Option 3: Download sample PDFs
wget https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf \
  -O test-pdfs/sample.pdf
# Duplicate for testing
for i in {1..75}; do
  cp test-pdfs/sample.pdf "test-pdfs/doc-$i.pdf"
done
```

### 3. Get Authentication Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | jq -r '.token' > token.txt

# Or use cookie-based session (browser)
```

## Test 1: Light Load (10 Concurrent Uploads)

### Manual Testing (Browser)

1. **Open application in browser**
2. **Login with your account**
3. **Open upload page**
4. **Select 10 PDFs at once** (if UI supports bulk selection)
5. **Click Upload**
6. **Observe:**
   - Upload progress
   - Success messages
   - Document list updates

### Automated Testing (Script)

Create `test-concurrent-uploads.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
TOKEN=$(cat token.txt)
NUM_UPLOADS=${1:-10}
TEST_DIR="test-pdfs"

echo "=== Starting Concurrent Upload Test ==="
echo "Uploading $NUM_UPLOADS documents..."

# Function to upload a single document
upload_document() {
  local doc_num=$1
  local doc_path="$TEST_DIR/doc-$doc_num.pdf"

  if [ ! -f "$doc_path" ]; then
    echo "Error: $doc_path not found"
    return 1
  fi

  response=$(curl -s -w "\n%{http_code}" \
    -X POST "${SERVER_URL}/api/documents/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$doc_path" \
    -F "metadata={\"test\":\"concurrent\",\"doc_num\":$doc_num}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" = "200" ]; then
    doc_id=$(echo "$body" | jq -r '.id')
    echo "✅ Document $doc_num uploaded: $doc_id"
  else
    echo "❌ Document $doc_num failed: HTTP $http_code"
    echo "$body"
  fi
}

# Upload documents concurrently
echo "Starting uploads at $(date)"
for i in $(seq 1 $NUM_UPLOADS); do
  upload_document $i &
done

# Wait for all uploads to complete
wait

echo "All uploads initiated at $(date)"
echo ""

# Check queue status
echo "=== Queue Status ==="
curl -s -H "Authorization: Bearer $(cat .env.local | grep CRON_SECRET | cut -d= -f2)" \
  "${SERVER_URL}/api/cron/process-jobs" | jq '.queueStats'

echo ""
echo "=== Testing Complete ==="
echo "Monitor processing: watch -n 2 'curl -s -H \"Authorization: Bearer \$(cat .env.local | grep CRON_SECRET | cut -d= -f2)\" ${SERVER_URL}/api/cron/process-jobs | jq .queueStats'"
```

Run the test:
```bash
chmod +x test-concurrent-uploads.sh
./test-concurrent-uploads.sh 10
```

## Test 2: Medium Load (30 Concurrent Uploads)

```bash
./test-concurrent-uploads.sh 30
```

**Expected behavior:**
- First 12 uploads accepted immediately (UPLOAD_GLOBAL_LIMIT=12)
- Remaining 18 queue in memory, process as slots become available
- All 30 documents created in database
- Jobs queued for processing

**Verify:**
```bash
# Check queue after uploads
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs | jq '.queueStats'

# Expected:
# {
#   "queued": 30,      # All jobs waiting
#   "processing": 0,   # Processing will start on next cron run
#   "completed": X,
#   "failed": 0
# }

# Wait 1 minute for cron to trigger
sleep 60

# Check again - should see processing started
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs | jq '.queueStats'

# Expected:
# {
#   "queued": 20,      # Remaining jobs
#   "processing": 10,  # MAX_CONCURRENT_DOCUMENTS
#   "completed": X,
#   "failed": 0
# }
```

## Test 3: Heavy Load (75 Concurrent Uploads)

```bash
./test-concurrent-uploads.sh 75
```

**Expected behavior:**
- Upload throttling engages (only 12 concurrent)
- HTTP requests queue, some may timeout if client timeout is low
- All successfully uploaded documents create database records
- Jobs process in batches of 10 (MAX_CONCURRENT_DOCUMENTS)

**Monitor in real-time:**

```bash
# Terminal 1: Watch queue stats
watch -n 2 "curl -s -H 'Authorization: Bearer YOUR_CRON_SECRET' \
  http://localhost:3000/api/cron/process-jobs | jq '.queueStats'"

# Terminal 2: Watch systemd cron logs
sudo journalctl -u pdf-search-cron.service -f

# Terminal 3: Watch application logs
tail -f logs/app.log | grep "Job processing"
```

## Verification Checklist

After each test, verify:

### ✅ All Uploads Succeeded

```sql
-- Check document count
SELECT COUNT(*) FROM documents
WHERE metadata->>'test' = 'concurrent';

-- Should match number of uploads (10, 30, or 75)
```

### ✅ All Jobs Created

```sql
-- Check job count
SELECT COUNT(*) FROM document_jobs
WHERE document_id IN (
  SELECT id FROM documents
  WHERE metadata->>'test' = 'concurrent'
);

-- Should match document count
```

### ✅ No Jobs Stuck

```sql
-- Check for stuck jobs (>15 minutes in processing)
SELECT
  id,
  document_id,
  status,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_stuck
FROM document_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '15 minutes'
  AND document_id IN (
    SELECT id FROM documents
    WHERE metadata->>'test' = 'concurrent'
  );

-- Should return 0 rows (no stuck jobs)
```

### ✅ Processing Completes

```bash
# Wait for all jobs to complete (may take 10-30 minutes for 75 documents)
while true; do
  queued=$(curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
    http://localhost:3000/api/cron/process-jobs | jq -r '.queueStats.queued')
  processing=$(curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
    http://localhost:3000/api/cron/process-jobs | jq -r '.queueStats.processing')

  echo "$(date): Queued=$queued, Processing=$processing"

  if [ "$queued" = "0" ] && [ "$processing" = "0" ]; then
    echo "All jobs completed!"
    break
  fi

  sleep 10
done
```

### ✅ All Jobs Completed Successfully

```sql
-- Check final status
SELECT
  status,
  COUNT(*) as count
FROM document_jobs
WHERE document_id IN (
  SELECT id FROM documents
  WHERE metadata->>'test' = 'concurrent'
)
GROUP BY status;

-- Expected:
-- status    | count
-- ----------+-------
-- completed | 75
-- failed    | 0
```

## Troubleshooting Test Failures

### Problem: Some Uploads Return 429 (Too Many Requests)

**Cause:** Upload throttling limit reached

**Solution:** This is expected behavior. Uploads will queue and process when slots available.

**Verify:**
```bash
# Check if documents were created despite 429 errors
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/documents | jq 'length'
```

### Problem: Jobs Stay in 'queued' Status

**Cause:** Cron trigger not running or failed

**Solution:**

```bash
# 1. Check if systemd timer is active
sudo systemctl is-active pdf-search-cron.timer

# 2. Manually trigger processing
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs

# 3. Check for errors
sudo journalctl -u pdf-search-cron.service -n 20
```

### Problem: Jobs Get Stuck in 'processing'

**Cause:** Worker crashed or external API timeout

**Solution:**

```bash
# Find stuck jobs
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs | jq '.stuckJobs'

# Wait 15 minutes for automatic recovery, or manually trigger:
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs
```

### Problem: High Failure Rate

**Cause:** Invalid PDFs, API errors, or configuration issues

**Solution:**

```sql
-- Find error details
SELECT
  dj.id,
  d.title,
  dj.error_message,
  dj.attempts
FROM document_jobs dj
JOIN documents d ON d.id = dj.document_id
WHERE dj.status = 'error'
  AND d.metadata->>'test' = 'concurrent'
ORDER BY dj.updated_at DESC
LIMIT 10;
```

## Performance Benchmarks

After testing, you should see:

### Upload Performance

| Test | Documents | Expected Upload Time | Throttling |
|------|-----------|---------------------|------------|
| Light | 10 | < 5 seconds | None (under limit) |
| Medium | 30 | 10-30 seconds | Light (12/30) |
| Heavy | 75 | 30-90 seconds | Heavy (12/75) |

### Processing Performance

| Test | Documents | Expected Processing Time | Notes |
|------|-----------|-------------------------|-------|
| Light | 10 | 5-30 minutes | All at once (10 workers) |
| Medium | 30 | 15-90 minutes | 3 batches of 10 |
| Heavy | 75 | 40-225 minutes | 7-8 batches of 10 |

**Factors affecting processing time:**
- Document size (larger = slower)
- Document complexity (tables, images = slower)
- External API latency (Document AI, Vertex AI)

## Cleanup After Testing

```sql
-- Delete test documents
DELETE FROM documents
WHERE metadata->>'test' = 'concurrent';

-- Delete test jobs (cascade will handle this automatically)

-- Vacuum to reclaim space
VACUUM ANALYZE documents;
VACUUM ANALYZE document_jobs;
```

```bash
# Delete test PDFs
rm -rf test-pdfs/
rm token.txt
```

## Success Criteria

Your system passes if:

- ✅ All uploads complete successfully (or queue gracefully)
- ✅ All documents create database records
- ✅ All jobs process without getting stuck
- ✅ No jobs remain in 'queued' after processing completes
- ✅ No permanent failures (status='error')
- ✅ Processing completes within expected timeframes
- ✅ System remains responsive during load
- ✅ No database connection errors
- ✅ Cron continues triggering every minute

## Next Steps

After successful testing:

1. **Monitor in production:**
   - Set up daily queue checks
   - Watch for failed jobs
   - Monitor processing times

2. **Tune performance if needed:**
   - Increase MAX_CONCURRENT_DOCUMENTS if you have capacity
   - Adjust UPLOAD_GLOBAL_LIMIT based on actual load
   - Consider DB connection pool adjustments

3. **Document your baselines:**
   - Average upload time
   - Average processing time per document
   - Typical queue depth
   - Peak load times

This helps you detect anomalies quickly.
