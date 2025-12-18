# Queue Monitoring Guide

This guide explains how to monitor your job queue and ensure jobs are processing correctly.

## Queue Statistics Endpoint

Your application already includes a built-in monitoring endpoint: `/api/cron/process-jobs`

### Accessing Queue Stats

```bash
# Get queue statistics
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/process-jobs

# Example response:
{
  "message": "Job processing completed",
  "jobsProcessed": 5,
  "jobsFailed": 0,
  "queueStats": {
    "queued": 2,
    "processing": 3,
    "completed": 150,
    "failed": 1,
    "cancelled": 0
  },
  "systemStatus": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

## Key Metrics to Watch

### 1. **Queued Jobs** (`queueStats.queued`)
- **What it is:** Jobs waiting to be processed
- **Normal:** 0-10 jobs (depending on upload frequency)
- **Warning:** 50+ jobs (backlog building up)
- **Action:** Check if processing is running, increase MAX_CONCURRENT_DOCUMENTS if needed

### 2. **Processing Jobs** (`queueStats.processing`)
- **What it is:** Jobs currently being processed
- **Normal:** 0-10 jobs (matches MAX_CONCURRENT_DOCUMENTS)
- **Warning:** Stuck at same number for >30 minutes
- **Action:** Check for stuck jobs (see troubleshooting below)

### 3. **Failed Jobs** (`queueStats.failed`)
- **What it is:** Jobs that failed after max retry attempts
- **Normal:** 0 jobs
- **Warning:** Any failed jobs
- **Action:** Investigate error details in database

### 4. **Jobs Processed** (`jobsProcessed`)
- **What it is:** Number of jobs processed in this run
- **Normal:** Varies based on queue depth
- **Warning:** Always 0 (nothing being processed)
- **Action:** Check if documents are uploading, verify cron is running

## Database Monitoring Queries

### View Current Queue State

```sql
-- Connect to your Supabase database
SELECT
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job
FROM document_jobs
WHERE status IN ('queued', 'processing')
GROUP BY status;
```

### Find Stuck Jobs

```sql
-- Jobs stuck in processing for >15 minutes
SELECT
  id,
  document_id,
  status,
  started_at,
  attempts,
  EXTRACT(EPOCH FROM (NOW() - started_at))/60 as stuck_duration_minutes,
  metadata->>'worker_id' as worker_id
FROM document_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '15 minutes'
  AND COALESCE(attempts, 0) < COALESCE(max_attempts, 3);
```

### View Failed Jobs

```sql
-- Jobs that failed permanently
SELECT
  dj.id,
  dj.document_id,
  d.title,
  dj.attempts,
  dj.error_message,
  dj.error_details,
  dj.updated_at
FROM document_jobs dj
LEFT JOIN documents d ON d.id = dj.document_id
WHERE dj.status = 'error'
ORDER BY dj.updated_at DESC
LIMIT 20;
```

### View Processing History

```sql
-- Jobs processed in last 24 hours
SELECT
  status,
  COUNT(*) as count,
  AVG(processing_time_ms)/1000 as avg_duration_seconds,
  MIN(processing_time_ms)/1000 as min_duration_seconds,
  MAX(processing_time_ms)/1000 as max_duration_seconds
FROM document_jobs
WHERE completed_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY status;
```

## Monitoring Dashboard (Optional)

### Simple Bash Monitoring Script

Create `monitor-queue.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Configuration
CRON_SECRET="${CRON_SECRET:-}"
SERVER_URL="${SERVER_URL:-http://localhost:3000}"

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET environment variable not set"
  exit 1
fi

# Fetch queue stats
response=$(curl -s -H "Authorization: Bearer $CRON_SECRET" \
  "${SERVER_URL}/api/cron/process-jobs")

# Parse and display
echo "=== Queue Status $(date) ==="
echo "$response" | jq '{
  queued: .queueStats.queued,
  processing: .queueStats.processing,
  completed: .queueStats.completed,
  failed: .queueStats.failed,
  systemStatus: .systemStatus
}'

# Alert if queue is backing up
queued=$(echo "$response" | jq -r '.queueStats.queued')
if [ "$queued" -gt 50 ]; then
  echo "⚠️  WARNING: Queue has $queued jobs waiting!"
fi

# Alert if there are failures
failed=$(echo "$response" | jq -r '.queueStats.failed')
if [ "$failed" -gt 0 ]; then
  echo "❌ ERROR: $failed failed jobs detected!"
fi
```

Usage:
```bash
chmod +x monitor-queue.sh
CRON_SECRET="your-secret" SERVER_URL="http://localhost:3000" ./monitor-queue.sh
```

### Continuous Monitoring (watch command)

```bash
# Monitor every 10 seconds
watch -n 10 "curl -s -H 'Authorization: Bearer YOUR_CRON_SECRET' \
  http://localhost:3000/api/cron/process-jobs | jq '.queueStats'"
```

## Troubleshooting

### Problem: Queue Keeps Growing

**Symptoms:**
- `queued` count increasing over time
- Jobs never enter `processing` status

**Causes:**
1. Cron timer not running
2. MAX_CONCURRENT_DOCUMENTS limit reached
3. Processing jobs stuck

**Solutions:**

```bash
# 1. Check if systemd timer is running
sudo systemctl status pdf-search-cron.timer

# 2. Check recent cron executions
sudo journalctl -u pdf-search-cron.service -n 20

# 3. Manually trigger processing
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/process-jobs

# 4. Check for stuck jobs in database (query above)
```

### Problem: Jobs Stuck in Processing

**Symptoms:**
- `processing` count stuck at same number
- Jobs not completing

**Causes:**
1. Worker crashed mid-processing
2. External API (Document AI) timing out
3. Database connection issues

**Solutions:**

```bash
# 1. Check application logs
tail -f logs/app.log | grep "document_id"

# 2. Find stuck jobs (15+ minutes)
psql $DATABASE_URL -c "
SELECT id, document_id, started_at,
       EXTRACT(EPOCH FROM (NOW() - started_at))/60 as minutes_stuck
FROM document_jobs
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '15 minutes';"

# 3. Stuck jobs will be auto-recovered on next cron run
# Or manually trigger recovery:
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     http://localhost:3000/api/cron/process-jobs
```

### Problem: High Failure Rate

**Symptoms:**
- `failed` count increasing
- `queueStats.failed` > 0

**Causes:**
1. Document AI API errors
2. Invalid PDFs
3. Storage access issues
4. Database errors

**Solutions:**

```sql
-- Find recent failures and error messages
SELECT
  dj.id,
  d.title,
  dj.error_message,
  dj.error_details->>'error' as error_details,
  dj.attempts,
  dj.updated_at
FROM document_jobs dj
LEFT JOIN documents d ON d.id = dj.document_id
WHERE dj.status = 'error'
ORDER BY dj.updated_at DESC
LIMIT 10;
```

Common errors and fixes:
- **"Processing timeout"** → Document too large, increase JOB_TIMEOUT_MS
- **"Document AI quota exceeded"** → Rate limit hit, wait or upgrade quota
- **"Storage file not found"** → File deleted before processing, check storage
- **"Database connection"** → Connection pool exhausted, check DB_POOL_MAX_CONNECTIONS

## Alerting (Optional)

### Email Alerts with Mailgun

```bash
#!/bin/bash
# alert-on-failures.sh

CRON_SECRET="${CRON_SECRET:-}"
SERVER_URL="${SERVER_URL:-http://localhost:3000}"
MAILGUN_API_KEY="${MAILGUN_API_KEY:-}"
MAILGUN_DOMAIN="${MAILGUN_DOMAIN:-}"
ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"

response=$(curl -s -H "Authorization: Bearer $CRON_SECRET" "${SERVER_URL}/api/cron/process-jobs")
failed=$(echo "$response" | jq -r '.queueStats.failed')

if [ "$failed" -gt 0 ]; then
  curl -s --user "api:$MAILGUN_API_KEY" \
    "https://api.mailgun.net/v3/$MAILGUN_DOMAIN/messages" \
    -F from="PDF Search Alerts <alerts@$MAILGUN_DOMAIN>" \
    -F to="$ALERT_EMAIL" \
    -F subject="⚠️ PDF Search: $failed Failed Jobs" \
    -F text="Queue has $failed failed jobs. Check logs for details."
fi
```

### Slack Alerts

```bash
#!/bin/bash
# alert-to-slack.sh

SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
response=$(curl -s -H "Authorization: Bearer $CRON_SECRET" "${SERVER_URL}/api/cron/process-jobs")
failed=$(echo "$response" | jq -r '.queueStats.failed')
queued=$(echo "$response" | jq -r '.queueStats.queued')

if [ "$failed" -gt 0 ] || [ "$queued" -gt 50 ]; then
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"⚠️ PDF Search Alert\n• Failed: $failed\n• Queued: $queued\"}" \
    "$SLACK_WEBHOOK"
fi
```

## Performance Benchmarks

### Expected Processing Rates

| Document Size | Processing Time | Throughput (with 10 workers) |
|---------------|-----------------|------------------------------|
| Small (<1MB, <20 pages) | 1-3 minutes | 200-600 docs/hour |
| Medium (1-10MB, 20-100 pages) | 5-15 minutes | 40-120 docs/hour |
| Large (10-50MB, 100-200 pages) | 15-30 minutes | 20-40 docs/hour |

### Healthy Queue Metrics

| Metric | Healthy Range | Action Needed |
|--------|---------------|---------------|
| Queued | 0-10 | None |
| Queued | 10-50 | Monitor |
| Queued | 50+ | Investigate backlog |
| Processing | 1-10 | Normal |
| Processing | 0 for >5 min | Check if cron running |
| Processing | >10 | Stuck jobs likely |
| Failed | 0 | Normal |
| Failed | 1-5 | Investigate errors |
| Failed | 5+ | Critical - check logs |

## Logging

### Application Logs

Your application logs job processing events:

```bash
# Follow logs
tail -f logs/app.log

# Filter for job processing
tail -f logs/app.log | grep "Job processing"

# Find errors
tail -f logs/app.log | grep "ERROR"
```

### Systemd Journal (if using systemd timer)

```bash
# Follow cron trigger logs
sudo journalctl -u pdf-search-cron.service -f

# Show last 24 hours
sudo journalctl -u pdf-search-cron.service --since "24 hours ago"

# Count successful runs today
sudo journalctl -u pdf-search-cron.service --since today | grep -c "Job processing completed"
```

## Health Check Endpoint

You can also create a simple health check:

```bash
# Check if API is responding
curl http://localhost:3000/api/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

## Summary Checklist

Daily monitoring tasks:
- [ ] Check queue stats for backlog (`queued` count)
- [ ] Verify cron timer is running (systemd status)
- [ ] Review failed jobs (database query)
- [ ] Check application logs for errors

Weekly monitoring tasks:
- [ ] Review processing performance (avg duration)
- [ ] Check disk space for logs
- [ ] Verify no jobs stuck >24 hours
- [ ] Clean up old completed jobs (database maintenance)

Monthly monitoring tasks:
- [ ] Review total throughput trends
- [ ] Check database growth
- [ ] Audit failed jobs patterns
- [ ] Update documentation if needed
