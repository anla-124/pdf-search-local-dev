# Production Monitoring Guide

## Critical Metrics Dashboard

### 1. Job Processing Metrics

**Query stuck jobs:**
```sql
SELECT * FROM stuck_jobs_monitoring;
```

**Real-time processing status:**
```sql
SELECT
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/60) as avg_age_minutes
FROM document_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY status;
```

**Job success rate (last hour):**
```sql
SELECT
  COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate_pct,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
  COUNT(CASE WHEN metadata->>'recovered' = 'true' THEN 1 END) as recovered_count
FROM document_jobs
WHERE completed_at > NOW() - INTERVAL '1 hour' OR created_at > NOW() - INTERVAL '1 hour';
```

### 2. Database Connection Pool

**Check pool utilization:**
```sql
SELECT
  count(*),
  state,
  wait_event_type,
  wait_event
FROM pg_stat_activity
WHERE datname = 'postgres'
GROUP BY state, wait_event_type, wait_event
ORDER BY count(*) DESC;
```

**Active connections:**
```sql
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';
```

### 3. Performance Metrics

**Job processing duration percentiles:**
```sql
SELECT
  percentile_cont(0.50) WITHIN GROUP (ORDER BY processing_time_ms) as p50_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY processing_time_ms) as p95_ms,
  percentile_cont(0.99) WITHIN GROUP (ORDER BY processing_time_ms) as p99_ms,
  AVG(processing_time_ms) as avg_ms,
  COUNT(*) as total_jobs
FROM document_jobs
WHERE status = 'completed'
  AND completed_at > NOW() - INTERVAL '1 hour';
```

**Slow jobs (> 10 minutes):**
```sql
SELECT
  id,
  document_id,
  processing_time_ms / 60000.0 as duration_minutes,
  attempts,
  metadata->>'worker_id' as worker_id
FROM document_jobs
WHERE status = 'completed'
  AND processing_time_ms > 600000
  AND completed_at > NOW() - INTERVAL '24 hours'
ORDER BY processing_time_ms DESC
LIMIT 20;
```

### 4. Error Tracking

**Recent failures with details:**
```sql
SELECT
  id,
  document_id,
  error_message,
  attempts,
  max_attempts,
  created_at,
  completed_at
FROM document_jobs
WHERE status = 'failed'
  AND completed_at > NOW() - INTERVAL '24 hours'
ORDER BY completed_at DESC
LIMIT 50;
```

**Error rate by type:**
```sql
SELECT
  substring(error_message from 1 for 100) as error_prefix,
  COUNT(*) as occurrence_count,
  MAX(completed_at) as last_occurrence
FROM document_jobs
WHERE status = 'failed'
  AND completed_at > NOW() - INTERVAL '24 hours'
GROUP BY substring(error_message from 1 for 100)
ORDER BY occurrence_count DESC;
```

## Alert Thresholds

### Critical Alerts (Page immediately)

1. **Stuck Jobs > 5**
   ```sql
   SELECT COUNT(*) FROM stuck_jobs_monitoring;
   ```
   Alert if: count > 5

2. **Success Rate < 90%**
   ```sql
   SELECT (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0))
   FROM document_jobs
   WHERE created_at > NOW() - INTERVAL '1 hour';
   ```
   Alert if: success_rate < 90

3. **DB Connection Pool > 70%**
   ```sql
   SELECT count(*) * 100.0 / 80 as utilization_pct
   FROM pg_stat_activity
   WHERE datname = 'postgres';
   ```
   Alert if: utilization_pct > 70

### Warning Alerts (Review within 1 hour)

1. **Average Job Duration > 5 minutes**
   ```sql
   SELECT AVG(processing_time_ms) / 60000.0 as avg_minutes
   FROM document_jobs
   WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour';
   ```
   Alert if: avg_minutes > 5

2. **Failed Jobs > 10 per hour**
   ```sql
   SELECT COUNT(*)
   FROM document_jobs
   WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '1 hour';
   ```
   Alert if: count > 10

3. **Queue Depth > 50**
   ```sql
   SELECT COUNT(*) FROM document_jobs WHERE status = 'queued';
   ```
   Alert if: count > 50

## Health Check Endpoints

### API Health Check
```bash
curl http://localhost:3000/api/health/pool
```

Expected response:
```json
{
  "status": "healthy",
  "pool": {
    "total": 80,
    "idle": 70,
    "active": 10
  }
}
```

### Job Queue Health
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  http://localhost:3000/api/cron/process-jobs
```

## Production Deployment Checklist

- [ ] Database migrations applied (stuck job recovery)
- [ ] MAX_CONCURRENT_DOCUMENTS set appropriately (10 for current setup)
- [ ] DB_POOL_MAX_CONNECTIONS = 80
- [ ] Monitoring alerts configured
- [ ] Log aggregation setup (Datadog/Cloudwatch/etc)
- [ ] Error tracking configured (Sentry/Rollbar/etc)
- [ ] Backup cron job configured (every 5 minutes)
- [ ] Stuck job monitoring dashboard setup
- [ ] On-call rotation configured

## Runbook: Common Issues

### Issue: Stuck Jobs Accumulating

**Symptoms:** `stuck_jobs_monitoring` view shows growing count

**Resolution:**
1. Check if workers are running: `ps aux | grep node`
2. Review worker logs for errors
3. Jobs will auto-recover after 15 minutes
4. Manual recovery if needed:
   ```sql
   UPDATE document_jobs
   SET status = 'queued', started_at = NULL
   WHERE status = 'processing'
     AND started_at < NOW() - INTERVAL '15 minutes';
   ```

### Issue: High Failure Rate

**Symptoms:** Success rate < 90%

**Resolution:**
1. Check recent errors: Run error tracking query
2. Common causes:
   - External API (Google Cloud) issues → Check status page
   - Memory issues → Check Node.js memory usage
   - Database connection issues → Check pool metrics
3. Review error logs for specific document IDs
4. Retry failed jobs if transient:
   ```sql
   UPDATE document_jobs
   SET status = 'queued', attempts = 0
   WHERE status = 'failed'
     AND error_message LIKE '%timeout%';
   ```

### Issue: Database Connection Pool Exhaustion

**Symptoms:** "Too many connections" errors, pool utilization > 90%

**Resolution:**
1. Immediate: Reduce MAX_CONCURRENT_DOCUMENTS to 5
2. Check for connection leaks:
   ```sql
   SELECT state, count(*)
   FROM pg_stat_activity
   WHERE datname = 'postgres'
   GROUP BY state;
   ```
3. Restart application to clear connections
4. Long-term: Increase DB_POOL_MAX_CONNECTIONS if infrastructure supports it

### Issue: Slow Job Processing

**Symptoms:** P95 duration > 10 minutes

**Resolution:**
1. Identify slow documents:
   ```sql
   SELECT d.id, d.title, d.file_size, dj.processing_time_ms / 60000.0 as minutes
   FROM document_jobs dj
   JOIN documents d ON d.id = dj.document_id
   WHERE dj.processing_time_ms > 600000
   ORDER BY dj.processing_time_ms DESC
   LIMIT 10;
   ```
2. Check if large files → Adjust LARGE_DOCUMENT_THRESHOLD_MB
3. Check if Document AI slow → Review Google Cloud status
4. Consider increasing timeout if legitimate long-running jobs

## Maintenance Windows

### Weekly Tasks
- Review error logs and patterns
- Check stuck job trends
- Validate backup cron jobs running
- Review slow query logs

### Monthly Tasks
- Analyze job processing duration trends
- Review and optimize MAX_CONCURRENT_DOCUMENTS
- Database vacuum and analyze
- Review and archive old job records (> 90 days)

## Scaling Guidelines

**When to scale up:**

1. **Increase MAX_CONCURRENT_DOCUMENTS** when:
   - Queue depth consistently > 20
   - Worker CPU usage < 60%
   - DB connection pool usage < 50%
   - Memory usage < 60%

2. **Increase DB_POOL_MAX_CONNECTIONS** when:
   - Pool utilization consistently > 70%
   - Have increased MAX_CONCURRENT_DOCUMENTS
   - Database can handle more connections

3. **Add more workers** when:
   - Single worker CPU at 100%
   - Queue depth > 50
   - Have spare database capacity

**Current Limits:**
- MAX_CONCURRENT_DOCUMENTS: 10
- DB_POOL_MAX_CONNECTIONS: 80
- JOB_TIMEOUT_MS: 30 minutes
- Stuck job threshold: 15 minutes
