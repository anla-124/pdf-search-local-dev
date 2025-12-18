# macOS Installation Guide (launchd)

This guide explains how to set up the external cron trigger using launchd on macOS.

## Installation Steps

### 1. Copy the launchd plist file

```bash
cd /Users/anla/Desktop/pdf-search/deployment/launchd

# Copy to LaunchAgents directory
cp com.pdfsearch.cron.plist ~/Library/LaunchAgents/
```

### 2. Load the service

```bash
# Load the service (starts immediately and on boot)
launchctl load ~/Library/LaunchAgents/com.pdfsearch.cron.plist

# Or use bootstrap (macOS 11+)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pdfsearch.cron.plist
```

### 3. Verify it's running

```bash
# Check if loaded
launchctl list | grep pdfsearch

# Should show:
# -       0       com.pdfsearch.cron

# View logs
tail -f /tmp/pdf-search-cron.log
tail -f /tmp/pdf-search-cron.error.log
```

### 4. Test manually

```bash
# Trigger once manually
launchctl start com.pdfsearch.cron

# Check logs
cat /tmp/pdf-search-cron.log
```

## Verify Installation

### Check if service is running

```bash
# List loaded services
launchctl list | grep pdfsearch

# Get service info
launchctl print gui/$(id -u)/com.pdfsearch.cron
```

### Monitor logs in real-time

```bash
# Watch success logs
tail -f /tmp/pdf-search-cron.log

# Watch error logs
tail -f /tmp/pdf-search-cron.error.log
```

## Troubleshooting

### Service not loading

```bash
# Unload first
launchctl unload ~/Library/LaunchAgents/com.pdfsearch.cron.plist

# Then reload
launchctl load ~/Library/LaunchAgents/com.pdfsearch.cron.plist
```

### Check for errors

```bash
# View error log
cat /tmp/pdf-search-cron.error.log

# Common issues:
# 1. App not running → Start with: npm run dev
# 2. Authorization error → Check CRON_SECRET in plist matches .env.local
# 3. Connection refused → Verify app is on http://localhost:3000
```

### Test endpoint directly

```bash
# Test the endpoint manually
curl -H "Authorization: Bearer dGiKi2ULMWMstWtAb0MZWq5NcCDkYxR8dS7hG4" \
     http://localhost:3000/api/cron/process-jobs | jq
```

## Uninstall

```bash
# Unload service
launchctl unload ~/Library/LaunchAgents/com.pdfsearch.cron.plist

# Or use bootout (macOS 11+)
launchctl bootout gui/$(id -u)/com.pdfsearch.cron

# Remove file
rm ~/Library/LaunchAgents/com.pdfsearch.cron.plist

# Clean up logs
rm /tmp/pdf-search-cron.log /tmp/pdf-search-cron.error.log
```

## Configuration

The service is configured to:
- Run every 60 seconds (`StartInterval`: 60)
- Start immediately when loaded (`RunAtLoad`: true)
- Log to `/tmp/pdf-search-cron.log`
- Error log to `/tmp/pdf-search-cron.error.log`

To change the interval, edit `com.pdfsearch.cron.plist` and change `StartInterval` value (in seconds).

## Alternative: Simple Cron (crontab)

If you prefer traditional cron instead of launchd:

```bash
# Edit crontab
crontab -e

# Add this line (runs every minute):
* * * * * /usr/bin/curl -s -H "Authorization: Bearer dGiKi2ULMWMstWtAb0MZWq5NcCDkYxR8dS7hG4" http://localhost:3000/api/cron/process-jobs >> /tmp/pdf-search-cron.log 2>&1

# Save and exit (Ctrl+O, Ctrl+X in nano)

# Verify cron job is installed
crontab -l
```

**Note:** macOS may require giving Terminal "Full Disk Access" in System Preferences → Security & Privacy → Privacy → Full Disk Access for cron to work reliably.

## Monitoring

### Check job execution

```bash
# Count successful runs in last hour
grep -c "Job processing completed" /tmp/pdf-search-cron.log

# View last 10 runs
tail -10 /tmp/pdf-search-cron.log
```

### Check queue stats

```bash
# Get current queue status
curl -s -H "Authorization: Bearer dGiKi2ULMWMstWtAb0MZWq5NcCDkYxR8dS7hG4" \
  http://localhost:3000/api/cron/process-jobs | jq '.queueStats'
```

## Next Steps

After installation:
1. Start your app: `npm run dev`
2. Upload test documents
3. Monitor logs: `tail -f /tmp/pdf-search-cron.log`
4. Verify jobs are processing

See [../TESTING.md](../TESTING.md) for concurrent upload testing.
