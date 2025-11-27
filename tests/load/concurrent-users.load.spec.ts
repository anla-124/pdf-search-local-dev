import { test, expect } from '@playwright/test'
import { getTestUserAuthHeaders } from '../helpers/auth'
import { createTestPDF, uploadTestDocument, deleteDocument } from '../helpers/api'

/**
 * Load Test: Concurrent User Uploads
 *
 * Simulates 5 users uploading 5 documents each (25 total)
 * Tests infrastructure limits:
 * - Upload throttling
 * - Database connection pool
 * - External API rate limits (Document AI, Vertex AI, Qdrant)
 * - Processing queue capacity
 *
 * IMPORTANT: Run this in staging/test environment, NOT production!
 *
 * Monitor during test:
 * - curl http://localhost:3000/api/health/pool
 * - Watch external API dashboards (GCP, Qdrant)
 * - Monitor database connections
 * - Check storage bandwidth
 */

test.describe('Load Test - Concurrent Users', () => {
  test('5 users upload 5 documents each simultaneously', async ({ request }) => {
    const USERS_COUNT = 5
    const DOCS_PER_USER = 5
    const TOTAL_UPLOADS = USERS_COUNT * DOCS_PER_USER

    console.log(`\n🚀 Starting load test: ${USERS_COUNT} users × ${DOCS_PER_USER} documents = ${TOTAL_UPLOADS} total uploads\n`)

    // Get auth headers (simulating same user, but you could create multiple test users)
    const authHeaders = await getTestUserAuthHeaders()

    const documentIds: string[] = []
    const startTime = Date.now()

    try {
      // Create all upload promises (will execute concurrently)
      const uploadPromises = []

      for (let user = 1; user <= USERS_COUNT; user++) {
        for (let doc = 1; doc <= DOCS_PER_USER; doc++) {
          const pdfBuffer = createTestPDF(`Load test - User ${user}, Document ${doc}`)
          const filename = `load-test-user${user}-doc${doc}.pdf`

          // Create upload promise (doesn't start until Promise.all)
          const uploadPromise = uploadTestDocument(
            request,
            authHeaders,
            pdfBuffer,
            filename,
            { loadTest: true, user, doc }
          ).then(async response => {
            const uploadTime = Date.now() - startTime
            const status = response.status()

            if (status === 200) {
              const data = await response.json()
              documentIds.push(data.id)
              console.log(`✅ [${uploadTime}ms] User ${user}, Doc ${doc}: Uploaded (${data.id})`)
              return { success: true, user, doc, uploadTime, documentId: data.id }
            } else {
              console.log(`❌ [${uploadTime}ms] User ${user}, Doc ${doc}: Failed (${status})`)
              return { success: false, user, doc, uploadTime, status }
            }
          }).catch(error => {
            const uploadTime = Date.now() - startTime
            console.log(`❌ [${uploadTime}ms] User ${user}, Doc ${doc}: Error (${error.message})`)
            return { success: false, user, doc, uploadTime, error: error.message }
          })

          uploadPromises.push(uploadPromise)
        }
      }

      console.log(`📤 Initiating ${TOTAL_UPLOADS} concurrent uploads...\n`)

      // Execute all uploads concurrently
      const results = await Promise.all(uploadPromises)

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Analyze results
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      console.log(`\n═══════════════════════════════════════════════════════`)
      console.log(`📊 LOAD TEST RESULTS`)
      console.log(`═══════════════════════════════════════════════════════`)
      console.log(`Total Uploads:     ${TOTAL_UPLOADS}`)
      console.log(`Successful:        ${successful} (${((successful/TOTAL_UPLOADS)*100).toFixed(1)}%)`)
      console.log(`Failed:            ${failed}`)
      console.log(`Total Time:        ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
      console.log(`Avg Time/Upload:   ${(totalTime/TOTAL_UPLOADS).toFixed(0)}ms`)

      if (successful > 0) {
        const uploadTimes = results.filter(r => r.success).map(r => r.uploadTime)
        const minTime = Math.min(...uploadTimes)
        const maxTime = Math.max(...uploadTimes)
        const avgTime = uploadTimes.reduce((a, b) => a + b, 0) / uploadTimes.length

        console.log(`Min Upload Time:   ${minTime}ms`)
        console.log(`Max Upload Time:   ${maxTime}ms`)
        console.log(`Avg Upload Time:   ${avgTime.toFixed(0)}ms`)
      }
      console.log(`═══════════════════════════════════════════════════════\n`)

      // Check health endpoint
      console.log(`🔍 Checking system health after load test...\n`)
      const healthResponse = await request.get('/api/health/pool')

      if (healthResponse.status() === 200) {
        const health = await healthResponse.json()

        console.log(`📈 SYSTEM METRICS:`)
        console.log(`───────────────────────────────────────────────────────`)
        console.log(`Status:              ${health.status}`)

        if (health.connectionPool) {
          const pool = health.connectionPool
          console.log(`\nConnection Pool:`)
          console.log(`  Active:            ${pool.metrics.activeConnections}`)
          console.log(`  Idle:              ${pool.metrics.idleConnections}`)
          console.log(`  Total:             ${pool.metrics.totalConnections}`)
          console.log(`  Utilization:       ${pool.metrics.utilizationRate?.toFixed(1)}%`)
          console.log(`  Max Connections:   ${pool.config.maxConnections}`)
        }

        if (health.throttling) {
          console.log(`\nThrottling:`)
          console.log(`  Upload Active:     ${health.throttling.upload.global.active}`)
          console.log(`  Upload Waiting:    ${health.throttling.upload.global.waiting}`)
          console.log(`  Upload Limit:      ${health.throttling.upload.global.limit}`)
        }
        console.log(`───────────────────────────────────────────────────────\n`)
      }

      // Assertions
      expect(successful).toBeGreaterThan(0) // At least some uploads should succeed
      expect(successful).toBeGreaterThanOrEqual(TOTAL_UPLOADS * 0.8) // At least 80% success rate

      console.log(`\n⚠️  Note: Documents are queued for processing. Check /api/health/pool periodically to monitor processing queue.\n`)

    } finally {
      // Cleanup: Delete all uploaded documents
      if (documentIds.length > 0) {
        console.log(`🧹 Cleaning up ${documentIds.length} documents...\n`)

        const deletePromises = documentIds.map(id =>
          deleteDocument(request, authHeaders, id)
            .then(() => console.log(`  ✓ Deleted ${id}`))
            .catch(error => console.log(`  ✗ Failed to delete ${id}: ${error.message}`))
        )

        await Promise.all(deletePromises)
        console.log(`\n✅ Cleanup complete\n`)
      }
    }
  })

  test('Monitor health endpoint during load', async ({ request }) => {
    console.log(`\n📊 Monitoring /api/health/pool for 30 seconds...\n`)

    for (let i = 0; i < 6; i++) {
      const response = await request.get('/api/health/pool')

      if (response.status() === 200) {
        const health = await response.json()
        const timestamp = new Date()
          .toISOString()
          .split('T')[1]
          ?.split('.')[0] || ''

        console.log(`[${timestamp}] Status: ${health.status} | ` +
                   `Pool: ${health.connectionPool?.metrics?.activeConnections || 0} active | ` +
                   `Upload: ${health.throttling?.upload?.global?.active || 0}/${health.throttling?.upload?.global?.limit || 0}`)
      }

      if (i < 5) await new Promise(resolve => setTimeout(resolve, 5000))
    }

    console.log(`\n✅ Monitoring complete\n`)
  })
})
