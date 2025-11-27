# Load Testing Guide

## Purpose

Validate your infrastructure can handle concurrent users before going to production.

This guide implements **Codex's recommendation** to run a controlled load test in staging.

---

## Pre-Test Checklist

### 1. Update Configuration

Start with conservative limits (recommended by Codex):

```bash
# Edit .env.local:

# Upload limits - Conservative start
UPLOAD_GLOBAL_LIMIT=12         # 12 concurrent uploads
UPLOAD_PER_USER_LIMIT=5        # Each user: 5 at once

# Processing limits - Control API costs
MAX_CONCURRENT_DOCUMENTS=10    # 10 concurrent OCR/embeddings
UNLIMITED_PROCESSING=false     # Keep false

# Delete limits
DELETE_GLOBAL_LIMIT=5
DELETE_PER_USER_LIMIT=3

# Connection pool (existing)
DB_POOL_MAX_CONNECTIONS=80
```

### 2. Prepare Monitoring

Open these dashboards in separate browser tabs:

**Local Monitoring:**
```bash
# Terminal 1: Watch health endpoint every 2 seconds
watch -n 2 'curl -s http://localhost:3000/api/health/pool | jq .'
```

**External Services:**
- [ ] Google Cloud Console → Document AI → Quotas
- [ ] Google Cloud Console → Vertex AI → Quotas
- [ ] Qdrant Dashboard → Metrics
- [ ] Supabase Dashboard → Database → Connections

### 3. Set Expectations

**What to watch for:**

✅ **Good Signs:**
- Upload success rate > 95%
- Connection pool utilization < 70%
- No external API rate limit errors (429)
- Processing queue moves steadily

⚠️ **Warning Signs:**
- Connection pool utilization > 80%
- Upload throttling with many waiting requests
- External API errors
- Memory/CPU spikes

❌ **Failure Indicators:**
- Upload success rate < 80%
- Database connection errors
- External API quota exhausted
- System unresponsive

---

## Running the Load Test

### Step 1: Start Your App

```bash
# Make sure app is running
npm run dev  # or npm start for production mode
```

### Step 2: Run the Load Test

```bash
# Run the concurrent users test
npm run test:load
```

**What happens:**
- 5 simulated users
- Each uploads 5 documents
- 25 total concurrent uploads
- Real-time progress logging
- System health check after test
- Automatic cleanup

**Expected Output:**
```
🚀 Starting load test: 5 users × 5 documents = 25 total uploads

📤 Initiating 25 concurrent uploads...

✅ [1234ms] User 1, Doc 1: Uploaded (abc-123)
✅ [1256ms] User 2, Doc 1: Uploaded (def-456)
...

═══════════════════════════════════════════════════════
📊 LOAD TEST RESULTS
═══════════════════════════════════════════════════════
Total Uploads:     25
Successful:        25 (100.0%)
Failed:            0
Total Time:        12500ms (12.5s)
Avg Time/Upload:   500ms
Min Upload Time:   1234ms
Max Upload Time:   3456ms
Avg Upload Time:   2100ms
═══════════════════════════════════════════════════════

📈 SYSTEM METRICS:
───────────────────────────────────────────────────────
Status:              healthy
Connection Pool:
  Active:            15
  Idle:              5
  Total:             20
  Utilization:       18.8%
  Max Connections:   80
Throttling:
  Upload Active:     0
  Upload Waiting:    0
  Upload Limit:      12
───────────────────────────────────────────────────────
```

### Step 3: Monitor Processing

After uploads complete, documents are queued for processing. Monitor:

```bash
# Check health endpoint to see processing progress
curl http://localhost:3000/api/health/pool | jq '.'
```

**Watch for:**
- Documents moving from "queued" to "processing" to "completed"
- Connection pool staying below 80% utilization
- No errors in server logs

---

## Interpreting Results

### Scenario 1: ✅ All Tests Pass (Success Rate 100%)

**Action:** Your infrastructure can handle the load!

**Next Steps:**
1. Keep current settings
2. Deploy to production
3. Monitor for first few days
4. Consider scaling up if you expect growth

---

### Scenario 2: ⚠️ Partial Success (Success Rate 80-95%)

**Likely Causes:**
- Upload throttling queuing requests (not a failure, just slow)
- Processing queue backing up
- Temporary external API delays

**Action:** Acceptable, but investigate warnings

**Next Steps:**
1. Check which uploads failed and why
2. If it's just throttling delays, that's OK (uploads eventually succeed)
3. If external API errors (429), reduce `MAX_CONCURRENT_DOCUMENTS`

---

### Scenario 3: ❌ Many Failures (Success Rate < 80%)

**Likely Causes:**
- External API quota exhausted
- Database connection pool exhausted
- Insufficient memory/CPU
- Network bandwidth limits

**Action:** Reduce limits immediately

**Recovery Steps:**
```bash
# Reduce to safe levels:
UPLOAD_GLOBAL_LIMIT=5
UPLOAD_PER_USER_LIMIT=3
MAX_CONCURRENT_DOCUMENTS=5
```

Then investigate:
1. Check external API quotas (Document AI, Vertex AI)
2. Check database connection errors
3. Check server resource usage (RAM, CPU)
4. Consider infrastructure upgrades

---

## Fine-Tuning Based on Results

### If Connection Pool Utilization > 70%

Current: `DB_POOL_MAX_CONNECTIONS=80`

**Options:**
1. Increase pool size: `DB_POOL_MAX_CONNECTIONS=120`
2. OR reduce processing: `MAX_CONCURRENT_DOCUMENTS=8`

**Trade-off:** More connections = more memory, but handles more load

---

### If External API Rate Limits Hit

**Symptoms:** 429 errors in logs, "quota exceeded" messages

**Action:** Reduce concurrent processing
```bash
MAX_CONCURRENT_DOCUMENTS=8  # Reduce from 10
# OR add delay between batches
```

**Long-term:** Upgrade external API quotas if needed

---

### If Upload Throttling Delays Users

**Symptoms:** Many uploads in "waiting" state, slow upload times

**Current:** `UPLOAD_GLOBAL_LIMIT=12`

**Options:**
1. Increase if infrastructure can handle it: `UPLOAD_GLOBAL_LIMIT=20`
2. OR accept queueing (uploads will succeed, just slower)

**Trade-off:** More concurrent uploads = more bandwidth/memory

---

## Production Deployment Strategy

Based on Codex's advice, here's the rollout plan:

### Phase 1: Conservative Start (Week 1)
```bash
UPLOAD_GLOBAL_LIMIT=10
UPLOAD_PER_USER_LIMIT=5
MAX_CONCURRENT_DOCUMENTS=10
```

**Monitor:**
- Peak usage times
- Success rates
- External API costs
- User complaints about speed

---

### Phase 2: Scale Based on Data (Week 2-3)

**If no issues in Phase 1:**
```bash
UPLOAD_GLOBAL_LIMIT=15
MAX_CONCURRENT_DOCUMENTS=15
```

**If issues in Phase 1:**
```bash
UPLOAD_GLOBAL_LIMIT=8
MAX_CONCURRENT_DOCUMENTS=8
```

---

### Phase 3: Optimization (Month 2+)

**Once you have production data:**
- Analyze peak traffic patterns
- Identify bottlenecks
- Adjust limits based on real usage
- Consider infrastructure upgrades if needed

---

## Key Metrics to Monitor in Production

### Daily Checks
1. Upload success rate (should be > 95%)
2. Average processing time
3. External API costs

### Weekly Checks
1. Peak concurrent users
2. Database connection pool utilization
3. Storage bandwidth usage

### Monthly Checks
1. Infrastructure costs vs usage
2. User growth trends
3. Performance degradation patterns

---

## Emergency Procedures

### If System Becomes Unresponsive

**Immediate Action:**
```bash
# Reduce all limits to minimum:
UPLOAD_GLOBAL_LIMIT=2
UPLOAD_PER_USER_LIMIT=1
MAX_CONCURRENT_DOCUMENTS=3
DELETE_GLOBAL_LIMIT=2
DELETE_PER_USER_LIMIT=1
```

Then restart the application.

### If External API Quota Exhausted

**Immediate:**
1. Stop processing: `MAX_CONCURRENT_DOCUMENTS=0` (blocks new processing)
2. Wait for quota reset (usually hourly or daily)
3. Resume with lower limits

### If Database Connection Errors

**Check:**
```bash
curl http://localhost:3000/api/health/pool
```

**If pool exhausted:**
1. Wait for idle connections to free up
2. Reduce processing limits
3. Check for connection leaks (shouldn't happen with proper pool management)

---

## Summary

Following Codex's advice:

1. ✅ **Start conservative** (limits around 10-12)
2. ✅ **Run load test** in staging first
3. ✅ **Monitor everything** during test
4. ✅ **Validate** external API quotas hold up
5. ✅ **Scale gradually** based on real data

**Don't:**
- ❌ Deploy with unlimited concurrency untested
- ❌ Skip monitoring during load test
- ❌ Ignore external API costs
- ❌ Scale up without validating infrastructure

**Remember:** It's better to have users wait a few seconds in a queue than to crash the system for everyone!

---

## Questions?

If you see unexpected behavior during load testing, check:
1. Server logs for errors
2. External API dashboards for rate limits
3. Database connection pool metrics
4. System resources (RAM, CPU)

Good luck! 🚀
