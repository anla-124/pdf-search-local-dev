import { test, expect } from '@playwright/test'
import { getTestUserAuthHeaders } from '../helpers/auth'
import { createTestPDF, uploadTestDocument, deleteDocument } from '../helpers/api'

/**
 * Load Test: Realistic Team Usage Pattern
 *
 * Simulates 5 team members using the app concurrently
 * Each user performs a realistic mix of operations:
 * - Upload documents (2-3 each)
 * - Perform similarity searches
 * - Rename documents
 * - Edit metadata
 * - Delete documents
 *
 * This tests the full system under realistic production load
 */

test.describe('Load Test - Realistic Team Usage', () => {
  test('5 team members perform mixed operations concurrently', async ({ request }) => {
    const USERS_COUNT = 5
    const startTime = Date.now()

    console.log(`\n🚀 Starting realistic usage test: ${USERS_COUNT} concurrent team members\n`)

    const authHeaders = await getTestUserAuthHeaders()
    const allDocumentIds: string[] = []
    const results: any[] = []

    try {
      // Simulate 5 users performing realistic workflows concurrently
      const userWorkflows = []

      for (let userNum = 1; userNum <= USERS_COUNT; userNum++) {
        const workflow = simulateUserWorkflow(request, authHeaders, userNum, allDocumentIds, results)
        userWorkflows.push(workflow)
      }

      // Execute all user workflows concurrently
      console.log(`📤 Starting ${USERS_COUNT} concurrent user workflows...\n`)
      await Promise.all(userWorkflows)

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Analyze results
      const operations = results.length
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length

      console.log(`\n═══════════════════════════════════════════════════════`)
      console.log(`📊 REALISTIC USAGE TEST RESULTS`)
      console.log(`═══════════════════════════════════════════════════════`)
      console.log(`Concurrent Users:  ${USERS_COUNT}`)
      console.log(`Total Operations:  ${operations}`)
      console.log(`Successful:        ${successful} (${((successful/operations)*100).toFixed(1)}%)`)
      console.log(`Failed:            ${failed}`)
      console.log(`Total Time:        ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
      console.log(`Avg Time/Op:       ${(totalTime/operations).toFixed(0)}ms`)
      console.log(`═══════════════════════════════════════════════════════\n`)

      // Break down by operation type
      const byType = groupByType(results)
      console.log(`📈 OPERATION BREAKDOWN:`)
      console.log(`───────────────────────────────────────────────────────`)
      for (const [type, ops] of Object.entries(byType)) {
        const typeSuccessful = ops.filter((o: any) => o.success).length
        const typeTotal = ops.length
        const avgTime = ops.reduce((sum: number, o: any) => sum + o.duration, 0) / typeTotal
        console.log(`${type.padEnd(12)} ${typeSuccessful}/${typeTotal} success  avg: ${avgTime.toFixed(0)}ms`)
      }
      console.log(`───────────────────────────────────────────────────────\n`)

      // Check system health
      console.log(`🔍 Checking system health after load test...`)
      const healthResponse = await request.get('/api/health/pool')

      if (healthResponse.status() === 200) {
        const health = await healthResponse.json()

        console.log(`\n📈 SYSTEM METRICS:`)
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
          console.log(`  Delete Active:     ${health.throttling.delete.global.active}`)
          console.log(`  Delete Waiting:    ${health.throttling.delete.global.waiting}`)
        }
        console.log(`───────────────────────────────────────────────────────\n`)
      }

      // Assertions
      expect(successful).toBeGreaterThan(operations * 0.8) // At least 80% success rate
      console.log(`\n✅ Load test complete - system handled realistic team usage successfully\n`)

    } finally {
      // Cleanup: Delete all uploaded documents
      if (allDocumentIds.length > 0) {
        console.log(`🧹 Cleaning up ${allDocumentIds.length} documents...`)

        const deletePromises = allDocumentIds.map(id =>
          deleteDocument(request, authHeaders, id)
            .catch(error => console.warn(`⚠️ Failed to delete ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`))
        )

        await Promise.all(deletePromises)
        console.log(`✅ Cleanup complete\n`)
      }
    }
  })
})

/**
 * Simulate a realistic user workflow
 */
async function simulateUserWorkflow(
  request: any,
  authHeaders: Record<string, string>,
  userNum: number,
  allDocumentIds: string[],
  results: any[]
) {
  const userDocs: string[] = []

  try {
    // Step 1: Upload 2-3 documents
    const docsToUpload = 2 + Math.floor(Math.random() * 2) // 2 or 3 docs
    console.log(`[User ${userNum}] 📤 Uploading ${docsToUpload} documents...`)

    for (let i = 1; i <= docsToUpload; i++) {
      const opStart = Date.now()
      try {
        const pdfBuffer = createTestPDF(`User ${userNum} - Document ${i}`)
        const filename = `user${userNum}-doc${i}.pdf`

        const response = await uploadTestDocument(request, authHeaders, pdfBuffer, filename, {
          category: 'contract',
          department: `Team ${userNum}`
        })

        if (response.status() === 200) {
          const data = await response.json()
          userDocs.push(data.id)
          allDocumentIds.push(data.id)
          results.push({
            user: userNum,
            type: 'upload',
            success: true,
            duration: Date.now() - opStart
          })
          console.log(`[User ${userNum}] ✅ Uploaded: ${filename}`)
        } else {
          results.push({
            user: userNum,
            type: 'upload',
            success: false,
            duration: Date.now() - opStart,
            status: response.status()
          })
          console.log(`[User ${userNum}] ❌ Upload failed: ${response.status()}`)
        }
      } catch (error: any) {
        results.push({
          user: userNum,
          type: 'upload',
          success: false,
          duration: Date.now() - opStart,
          error: error.message
        })
        console.log(`[User ${userNum}] ❌ Upload error: ${error.message}`)
      }
    }

    // Small delay to let uploads process
    await new Promise(resolve => setTimeout(resolve, 500))

    // Step 2: Perform similarity search (if we have uploaded docs)
    if (userDocs.length > 0) {
      console.log(`[User ${userNum}] 🔍 Performing similarity search...`)
      const opStart = Date.now()
      try {
        const searchResponse = await request.post('/api/search', {
          headers: authHeaders,
          data: {
            query: `contract agreement user ${userNum}`,
            limit: 10
          }
        })

        results.push({
          user: userNum,
          type: 'search',
          success: searchResponse.status() === 200,
          duration: Date.now() - opStart,
          status: searchResponse.status()
        })

        if (searchResponse.status() === 200) {
          console.log(`[User ${userNum}] ✅ Search completed`)
        } else {
          console.log(`[User ${userNum}] ❌ Search failed: ${searchResponse.status()}`)
        }
      } catch (error: any) {
        results.push({
          user: userNum,
          type: 'search',
          success: false,
          duration: Date.now() - opStart,
          error: error.message
        })
        console.log(`[User ${userNum}] ❌ Search error: ${error.message}`)
      }
    }

    // Step 3: Rename a document
    if (userDocs.length > 0) {
      console.log(`[User ${userNum}] ✏️  Renaming document...`)
      const docToRename = userDocs[0]
      const opStart = Date.now()
      try {
        const renameResponse = await request.patch(`/api/documents/${docToRename}`, {
          headers: authHeaders,
          data: {
            title: `User ${userNum} - Renamed Contract ${Date.now()}`
          }
        })

        results.push({
          user: userNum,
          type: 'rename',
          success: renameResponse.status() === 200,
          duration: Date.now() - opStart,
          status: renameResponse.status()
        })

        if (renameResponse.status() === 200) {
          console.log(`[User ${userNum}] ✅ Renamed document`)
        } else {
          console.log(`[User ${userNum}] ❌ Rename failed: ${renameResponse.status()}`)
        }
      } catch (error: any) {
        results.push({
          user: userNum,
          type: 'rename',
          success: false,
          duration: Date.now() - opStart,
          error: error.message
        })
        console.log(`[User ${userNum}] ❌ Rename error: ${error.message}`)
      }
    }

    // Step 4: Update metadata
    if (userDocs.length > 1) {
      console.log(`[User ${userNum}] 📝 Updating metadata...`)
      const docToUpdate = userDocs[1]
      const opStart = Date.now()
      try {
        const metadataResponse = await request.patch(`/api/documents/${docToUpdate}`, {
          headers: authHeaders,
          data: {
            metadata: {
              status: 'reviewed',
              priority: 'high',
              reviewer: `User ${userNum}`
            }
          }
        })

        results.push({
          user: userNum,
          type: 'metadata',
          success: metadataResponse.status() === 200,
          duration: Date.now() - opStart,
          status: metadataResponse.status()
        })

        if (metadataResponse.status() === 200) {
          console.log(`[User ${userNum}] ✅ Updated metadata`)
        } else {
          console.log(`[User ${userNum}] ❌ Metadata update failed: ${metadataResponse.status()}`)
        }
      } catch (error: any) {
        results.push({
          user: userNum,
          type: 'metadata',
          success: false,
          duration: Date.now() - opStart,
          error: error.message
        })
        console.log(`[User ${userNum}] ❌ Metadata error: ${error.message}`)
      }
    }

  // Step 5: Delete one document (keeping others for similarity tests)
  if (userDocs.length > 0) {
    console.log(`[User ${userNum}] 🗑️  Deleting document...`)
    const docToDelete = userDocs[userDocs.length - 1] // Delete the last one
    if (!docToDelete) {
      console.log(`[User ${userNum}] ⚠️ No document found to delete`)
    } else {
      const opStart = Date.now()
      try {
        const deleteResponse = await deleteDocument(request, authHeaders, docToDelete)

        results.push({
          user: userNum,
          type: 'delete',
          success: deleteResponse.status() === 200,
          duration: Date.now() - opStart,
          status: deleteResponse.status()
        })

        if (deleteResponse.status() === 200) {
          // Remove from tracking arrays
          const userIdx = userDocs.indexOf(docToDelete)
          if (userIdx > -1) userDocs.splice(userIdx, 1)
          const allIdx = allDocumentIds.indexOf(docToDelete)
          if (allIdx > -1) allDocumentIds.splice(allIdx, 1)
          console.log(`[User ${userNum}] ✅ Deleted document`)
        } else {
          console.log(`[User ${userNum}] ❌ Delete failed: ${deleteResponse.status()}`)
        }
      } catch (error: any) {
        results.push({
          user: userNum,
          type: 'delete',
          success: false,
          duration: Date.now() - opStart,
          error: error.message
        })
        console.log(`[User ${userNum}] ❌ Delete error: ${error.message}`)
      }
    }
  }

    console.log(`[User ${userNum}] ✅ Workflow complete\n`)

  } catch (error: any) {
    console.log(`[User ${userNum}] ❌ Workflow failed: ${error.message}\n`)
  }
}

/**
 * Group results by operation type
 */
function groupByType(results: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {}

  for (const result of results) {
    const bucket = grouped[result.type] ?? (grouped[result.type] = [])
    bucket.push(result)
  }

  return grouped
}
